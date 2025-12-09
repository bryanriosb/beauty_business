-- Trial System Migration
-- Implementa el sistema de planes de prueba con verificación lazy

-- =====================================================
-- 1. CREAR TABLA DE CONFIGURACIÓN DEL SISTEMA
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Trigger para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_system_settings_updated_at ON system_settings;
CREATE TRIGGER trigger_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- =====================================================
-- 2. INSERTAR CONFIGURACIÓN DE TRIAL POR DEFECTO
-- =====================================================

INSERT INTO system_settings (key, value, description) VALUES
  ('trial_config', '{
    "default_trial_days": 14,
    "post_trial_plan_code": "free",
    "trial_plan_code": "trial",
    "allow_trial_extension": true,
    "max_trial_extensions": 1,
    "extension_days": 7
  }'::jsonb, 'Configuración del período de prueba para nuevas cuentas')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 3. AGREGAR COLUMNA custom_trial_days A business_accounts
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_accounts' AND column_name = 'custom_trial_days'
  ) THEN
    ALTER TABLE business_accounts ADD COLUMN custom_trial_days INTEGER;
    COMMENT ON COLUMN business_accounts.custom_trial_days IS 'Días de trial personalizados (NULL = usar configuración global)';
  END IF;
END $$;

-- =====================================================
-- 4. CREAR PLAN TRIAL
-- =====================================================

INSERT INTO plans (code, name, description, price_cents, billing_period, status, max_businesses, max_users_per_business, max_specialists_per_business, features, sort_order) VALUES
  ('trial', 'Prueba Gratuita', 'Acceso completo durante el período de prueba', 0, 'monthly', 'active', 3, 10, 10,
   '{
     "max_appointments_per_month": null,
     "max_products": null,
     "max_services": null,
     "max_customers": null,
     "max_storage_mb": 5000,
     "has_custom_branding": false,
     "has_priority_support": false,
     "has_api_access": false
   }'::jsonb,
   -1)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  features = EXCLUDED.features;

-- =====================================================
-- 5. ASIGNAR TODOS LOS MÓDULOS AL PLAN TRIAL
-- =====================================================

DO $$
DECLARE
  v_plan_id UUID;
BEGIN
  SELECT id INTO v_plan_id FROM plans WHERE code = 'trial';

  IF v_plan_id IS NOT NULL THEN
    DELETE FROM plan_module_access WHERE plan_id = v_plan_id;

    PERFORM assign_modules_to_plan(
      v_plan_id,
      ARRAY['dashboard', 'appointments', 'services', 'products', 'inventory',
            'customers', 'specialists', 'invoices', 'reports', 'commissions',
            'medical_records', 'ai_assistant', 'whatsapp', 'settings'],
      true, true, true
    );
  END IF;
END $$;

-- =====================================================
-- 6. FUNCIÓN PARA VERIFICAR Y ACTUALIZAR TRIAL EXPIRADO
-- =====================================================

CREATE OR REPLACE FUNCTION check_and_update_expired_trial(
  p_business_account_id UUID
) RETURNS TABLE (
  was_expired BOOLEAN,
  new_plan_id UUID,
  new_plan_code VARCHAR,
  new_status VARCHAR
) AS $$
DECLARE
  v_account RECORD;
  v_trial_config JSONB;
  v_post_trial_plan_code VARCHAR;
  v_new_plan_id UUID;
BEGIN
  -- Obtener la cuenta
  SELECT ba.*, p.code as plan_code
  INTO v_account
  FROM business_accounts ba
  LEFT JOIN plans p ON ba.plan_id = p.id
  WHERE ba.id = p_business_account_id;

  -- Si no está en trial o no tiene fecha de expiración, no hacer nada
  IF v_account.status != 'trial' OR v_account.trial_ends_at IS NULL THEN
    RETURN QUERY SELECT false, v_account.plan_id, v_account.plan_code::VARCHAR, v_account.status::VARCHAR;
    RETURN;
  END IF;

  -- Si el trial no ha expirado, no hacer nada
  IF v_account.trial_ends_at > NOW() THEN
    RETURN QUERY SELECT false, v_account.plan_id, v_account.plan_code::VARCHAR, v_account.status::VARCHAR;
    RETURN;
  END IF;

  -- Trial expirado: obtener configuración y plan post-trial
  SELECT value INTO v_trial_config FROM system_settings WHERE key = 'trial_config';
  v_post_trial_plan_code := COALESCE(v_trial_config->>'post_trial_plan_code', 'free');

  SELECT id INTO v_new_plan_id FROM plans WHERE code = v_post_trial_plan_code AND status = 'active';

  -- Actualizar la cuenta
  UPDATE business_accounts
  SET
    status = 'active',
    plan_id = v_new_plan_id,
    updated_at = NOW()
  WHERE id = p_business_account_id;

  RETURN QUERY SELECT true, v_new_plan_id, v_post_trial_plan_code::VARCHAR, 'active'::VARCHAR;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. FUNCIÓN PARA CALCULAR FECHA DE FIN DE TRIAL
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_trial_end_date(
  p_custom_trial_days INTEGER DEFAULT NULL
) RETURNS TIMESTAMPTZ AS $$
DECLARE
  v_trial_config JSONB;
  v_trial_days INTEGER;
BEGIN
  -- Si hay días personalizados, usarlos
  IF p_custom_trial_days IS NOT NULL THEN
    RETURN NOW() + (p_custom_trial_days || ' days')::INTERVAL;
  END IF;

  -- Obtener configuración global
  SELECT value INTO v_trial_config FROM system_settings WHERE key = 'trial_config';
  v_trial_days := COALESCE((v_trial_config->>'default_trial_days')::INTEGER, 14);

  RETURN NOW() + (v_trial_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. FUNCIÓN PARA INICIAR TRIAL EN UNA CUENTA
-- =====================================================

CREATE OR REPLACE FUNCTION start_trial_for_account(
  p_business_account_id UUID,
  p_custom_trial_days INTEGER DEFAULT NULL
) RETURNS TABLE (
  success BOOLEAN,
  trial_ends_at TIMESTAMPTZ,
  plan_id UUID
) AS $$
DECLARE
  v_trial_plan_id UUID;
  v_trial_end TIMESTAMPTZ;
BEGIN
  -- Obtener plan trial
  SELECT id INTO v_trial_plan_id FROM plans WHERE code = 'trial' AND status = 'active';

  IF v_trial_plan_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, NULL::UUID;
    RETURN;
  END IF;

  -- Calcular fecha de fin
  v_trial_end := calculate_trial_end_date(p_custom_trial_days);

  -- Actualizar cuenta
  UPDATE business_accounts
  SET
    status = 'trial',
    plan_id = v_trial_plan_id,
    trial_ends_at = v_trial_end,
    custom_trial_days = p_custom_trial_days,
    updated_at = NOW()
  WHERE id = p_business_account_id;

  RETURN QUERY SELECT true, v_trial_end, v_trial_plan_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. ACTUALIZAR FUNCIÓN can_create_business_in_account
-- =====================================================
-- Esta función ahora usa plan_id en vez de subscription_plan hardcodeado

CREATE OR REPLACE FUNCTION can_create_business_in_account(account_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_count INTEGER;
  v_max_businesses INTEGER;
BEGIN
  -- Obtener max_businesses del plan asignado
  SELECT p.max_businesses INTO v_max_businesses
  FROM business_accounts ba
  JOIN plans p ON ba.plan_id = p.id
  WHERE ba.id = account_uuid;

  -- Si no tiene plan asignado, no puede crear
  IF v_max_businesses IS NULL THEN
    RETURN false;
  END IF;

  -- Contar negocios actuales
  SELECT COUNT(*) INTO v_current_count
  FROM businesses
  WHERE business_account_id = account_uuid;

  RETURN v_current_count < v_max_businesses;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 10. COMENTARIOS DE DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE system_settings IS 'Configuración global del sistema';
COMMENT ON FUNCTION check_and_update_expired_trial IS 'Verifica si un trial expiró y actualiza al plan post-trial (verificación lazy)';
COMMENT ON FUNCTION calculate_trial_end_date IS 'Calcula la fecha de fin de trial basado en días personalizados o configuración global';
COMMENT ON FUNCTION start_trial_for_account IS 'Inicia un período de trial para una cuenta de negocio';
COMMENT ON FUNCTION can_create_business_in_account IS 'Verifica si una cuenta puede crear más negocios según el límite de su plan';
