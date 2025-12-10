-- Subscription & Payments Migration
-- Mercado Pago integration for recurring payments

-- =====================================================
-- 1. UPDATE PLANS TABLE - Add pricing fields
-- =====================================================

ALTER TABLE plans
ADD COLUMN IF NOT EXISTS monthly_price_cents INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS yearly_price_cents INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS yearly_discount_percent INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS mp_plan_monthly_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS mp_plan_yearly_id VARCHAR(100);

COMMENT ON COLUMN plans.monthly_price_cents IS 'Monthly subscription price in cents';
COMMENT ON COLUMN plans.yearly_price_cents IS 'Yearly subscription price in cents (usually discounted)';
COMMENT ON COLUMN plans.yearly_discount_percent IS 'Discount percentage for yearly billing';
COMMENT ON COLUMN plans.mp_plan_monthly_id IS 'Mercado Pago preapproval_plan ID for monthly billing';
COMMENT ON COLUMN plans.mp_plan_yearly_id IS 'Mercado Pago preapproval_plan ID for yearly billing';

-- Migrate existing price_cents to monthly_price_cents
UPDATE plans
SET monthly_price_cents = price_cents,
    yearly_price_cents = CASE
      WHEN price_cents > 0 THEN (price_cents * 12 * 0.8)::INTEGER -- 20% discount for yearly
      ELSE 0
    END,
    yearly_discount_percent = 20
WHERE monthly_price_cents = 0;

-- =====================================================
-- 2. UPDATE BUSINESS_ACCOUNTS TABLE - Add subscription fields
-- =====================================================

DO $$
BEGIN
  -- Add subscription payment fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_accounts' AND column_name = 'mp_subscription_id') THEN
    ALTER TABLE business_accounts ADD COLUMN mp_subscription_id VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_accounts' AND column_name = 'mp_customer_id') THEN
    ALTER TABLE business_accounts ADD COLUMN mp_customer_id VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_accounts' AND column_name = 'billing_cycle') THEN
    ALTER TABLE business_accounts ADD COLUMN billing_cycle VARCHAR(20) DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_accounts' AND column_name = 'subscription_expires_at') THEN
    ALTER TABLE business_accounts ADD COLUMN subscription_expires_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_accounts' AND column_name = 'last_payment_at') THEN
    ALTER TABLE business_accounts ADD COLUMN last_payment_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_accounts' AND column_name = 'payment_status') THEN
    ALTER TABLE business_accounts ADD COLUMN payment_status VARCHAR(20) DEFAULT 'none' CHECK (payment_status IN ('none', 'active', 'pending', 'failed', 'cancelled', 'paused'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_accounts' AND column_name = 'payment_method_last4') THEN
    ALTER TABLE business_accounts ADD COLUMN payment_method_last4 VARCHAR(4);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'business_accounts' AND column_name = 'payment_method_brand') THEN
    ALTER TABLE business_accounts ADD COLUMN payment_method_brand VARCHAR(50);
  END IF;
END $$;

-- =====================================================
-- 3. CREATE PAYMENT_HISTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
  mp_payment_id VARCHAR(100),
  mp_subscription_id VARCHAR(100),
  amount_cents INTEGER NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'COP',
  status VARCHAR(30) NOT NULL CHECK (status IN ('pending', 'approved', 'authorized', 'in_process', 'in_mediation', 'rejected', 'cancelled', 'refunded', 'charged_back')),
  status_detail VARCHAR(100),
  payment_type VARCHAR(50),
  payment_method VARCHAR(50),
  installments INTEGER DEFAULT 1,
  description TEXT,
  external_reference VARCHAR(100),
  payer_email VARCHAR(255),
  failure_reason TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_business_account ON payment_history(business_account_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_mp_payment_id ON payment_history(mp_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_mp_subscription_id ON payment_history(mp_subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created_at ON payment_history(created_at DESC);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_payment_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_payment_history_updated_at ON payment_history;
CREATE TRIGGER trigger_payment_history_updated_at
  BEFORE UPDATE ON payment_history
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_history_updated_at();

-- =====================================================
-- 4. CREATE SUBSCRIPTION_EVENTS TABLE (Webhook logs)
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  mp_event_id VARCHAR(100),
  mp_subscription_id VARCHAR(100),
  mp_payment_id VARCHAR(100),
  business_account_id UUID REFERENCES business_accounts(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);
CREATE INDEX IF NOT EXISTS idx_subscription_events_mp_subscription ON subscription_events(mp_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_processed ON subscription_events(processed);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created_at ON subscription_events(created_at DESC);

-- =====================================================
-- 5. FUNCTION: Check subscription access with grace period
-- =====================================================

CREATE OR REPLACE FUNCTION check_subscription_access(p_business_account_id UUID, p_grace_days INTEGER DEFAULT 2)
RETURNS TABLE (
  has_access BOOLEAN,
  is_in_grace_period BOOLEAN,
  days_until_expiry INTEGER,
  subscription_status VARCHAR,
  reason VARCHAR
) AS $$
DECLARE
  v_account RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_grace_end TIMESTAMPTZ;
BEGIN
  SELECT
    ba.status,
    ba.subscription_plan,
    ba.payment_status,
    ba.subscription_expires_at,
    ba.trial_ends_at,
    p.code as plan_code
  INTO v_account
  FROM business_accounts ba
  LEFT JOIN plans p ON ba.plan_id = p.id
  WHERE ba.id = p_business_account_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, FALSE, 0, 'not_found'::VARCHAR, 'Account not found'::VARCHAR;
    RETURN;
  END IF;

  -- Free plan always has access
  IF v_account.plan_code = 'free' OR v_account.subscription_plan = 'free' THEN
    RETURN QUERY SELECT TRUE, FALSE, NULL::INTEGER, 'free'::VARCHAR, 'Free plan'::VARCHAR;
    RETURN;
  END IF;

  -- Trial period
  IF v_account.status = 'trial' AND v_account.trial_ends_at IS NOT NULL THEN
    IF v_account.trial_ends_at > v_now THEN
      RETURN QUERY SELECT TRUE, FALSE, EXTRACT(DAY FROM v_account.trial_ends_at - v_now)::INTEGER, 'trial'::VARCHAR, 'Trial active'::VARCHAR;
      RETURN;
    ELSE
      RETURN QUERY SELECT FALSE, FALSE, 0, 'trial_expired'::VARCHAR, 'Trial period expired'::VARCHAR;
      RETURN;
    END IF;
  END IF;

  -- Paid subscription
  IF v_account.subscription_expires_at IS NULL THEN
    RETURN QUERY SELECT FALSE, FALSE, 0, 'no_subscription'::VARCHAR, 'No active subscription'::VARCHAR;
    RETURN;
  END IF;

  v_grace_end := v_account.subscription_expires_at + (p_grace_days || ' days')::INTERVAL;

  IF v_account.subscription_expires_at > v_now THEN
    -- Active subscription
    RETURN QUERY SELECT TRUE, FALSE, EXTRACT(DAY FROM v_account.subscription_expires_at - v_now)::INTEGER, 'active'::VARCHAR, 'Subscription active'::VARCHAR;
  ELSIF v_grace_end > v_now THEN
    -- In grace period
    RETURN QUERY SELECT TRUE, TRUE, EXTRACT(DAY FROM v_grace_end - v_now)::INTEGER, 'grace_period'::VARCHAR, 'In grace period'::VARCHAR;
  ELSE
    -- Expired
    RETURN QUERY SELECT FALSE, FALSE, 0, 'expired'::VARCHAR, 'Subscription expired'::VARCHAR;
  END IF;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. FUNCTION: Process subscription payment
-- =====================================================

CREATE OR REPLACE FUNCTION process_subscription_payment(
  p_business_account_id UUID,
  p_billing_cycle VARCHAR,
  p_mp_payment_id VARCHAR,
  p_amount_cents INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Calculate new expiration date
  IF p_billing_cycle = 'yearly' THEN
    v_expires_at := NOW() + INTERVAL '1 year';
  ELSE
    v_expires_at := NOW() + INTERVAL '1 month';
  END IF;

  -- Update business account
  UPDATE business_accounts
  SET
    payment_status = 'active',
    last_payment_at = NOW(),
    subscription_expires_at = v_expires_at,
    status = 'active',
    updated_at = NOW()
  WHERE id = p_business_account_id;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. Update existing plans with monthly/yearly pricing
-- =====================================================

UPDATE plans SET
  monthly_price_cents = CASE code
    WHEN 'free' THEN 0
    WHEN 'basic' THEN 4900000  -- $49,000 COP
    WHEN 'pro' THEN 9900000    -- $99,000 COP
    WHEN 'enterprise' THEN 19900000  -- $199,000 COP
    WHEN 'trial' THEN 0
    ELSE price_cents
  END,
  yearly_price_cents = CASE code
    WHEN 'free' THEN 0
    WHEN 'basic' THEN 47040000    -- $49,000 * 12 * 0.80 = $470,400 COP (20% off)
    WHEN 'pro' THEN 95040000      -- $99,000 * 12 * 0.80 = $950,400 COP
    WHEN 'enterprise' THEN 191040000  -- $199,000 * 12 * 0.80 = $1,910,400 COP
    WHEN 'trial' THEN 0
    ELSE (price_cents * 12 * 0.8)::INTEGER
  END,
  yearly_discount_percent = 20
WHERE code IN ('free', 'basic', 'pro', 'enterprise', 'trial');

-- =====================================================
-- 8. Indexes for subscription queries
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_business_accounts_mp_subscription ON business_accounts(mp_subscription_id);
CREATE INDEX IF NOT EXISTS idx_business_accounts_payment_status ON business_accounts(payment_status);
CREATE INDEX IF NOT EXISTS idx_business_accounts_subscription_expires ON business_accounts(subscription_expires_at);

-- =====================================================
-- 9. CREATE SAVED_CARDS TABLE (Customer saved payment methods)
-- =====================================================

CREATE TABLE IF NOT EXISTS saved_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
  mp_card_id VARCHAR(100) NOT NULL,
  mp_customer_id VARCHAR(100) NOT NULL,
  last_four_digits VARCHAR(4) NOT NULL,
  first_six_digits VARCHAR(6) NOT NULL,
  expiration_month INTEGER NOT NULL,
  expiration_year INTEGER NOT NULL,
  card_brand VARCHAR(50) NOT NULL,
  card_type VARCHAR(50) NOT NULL,
  cardholder_name VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_cards_business_account ON saved_cards(business_account_id);
CREATE INDEX IF NOT EXISTS idx_saved_cards_mp_customer ON saved_cards(mp_customer_id);
CREATE INDEX IF NOT EXISTS idx_saved_cards_is_default ON saved_cards(is_default);
CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_cards_mp_card_unique ON saved_cards(mp_card_id);

CREATE OR REPLACE FUNCTION update_saved_cards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_saved_cards_updated_at ON saved_cards;
CREATE TRIGGER trigger_saved_cards_updated_at
  BEFORE UPDATE ON saved_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_cards_updated_at();

CREATE OR REPLACE FUNCTION ensure_single_default_card()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = TRUE THEN
    UPDATE saved_cards
    SET is_default = FALSE
    WHERE business_account_id = NEW.business_account_id
      AND id != NEW.id
      AND is_default = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ensure_single_default_card ON saved_cards;
CREATE TRIGGER trigger_ensure_single_default_card
  BEFORE INSERT OR UPDATE OF is_default ON saved_cards
  FOR EACH ROW
  WHEN (NEW.is_default = TRUE)
  EXECUTE FUNCTION ensure_single_default_card();
