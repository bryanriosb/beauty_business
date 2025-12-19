-- =====================================================
-- TABLA: signature_requests
-- Almacena solicitudes de firma para historias clínicas
-- =====================================================

CREATE TABLE IF NOT EXISTS signature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES medical_records (id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers (id) ON DELETE CASCADE,
    token VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'cancelled', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NULL,
    opened_at TIMESTAMPTZ DEFAULT NULL,
    viewed_at TIMESTAMPTZ DEFAULT NULL,
    signed_at TIMESTAMPTZ DEFAULT NULL,
    signature_ip VARCHAR(45) DEFAULT NULL,
    view_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES users_profile (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_signature_requests_token ON signature_requests (token);
CREATE INDEX IF NOT EXISTS idx_signature_requests_submission ON signature_requests (submission_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_business ON signature_requests (business_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_customer ON signature_requests (customer_id);
CREATE INDEX IF NOT EXISTS idx_signature_requests_status ON signature_requests (status);
CREATE INDEX IF NOT EXISTS idx_signature_requests_expires ON signature_requests (expires_at);

-- Configurar RLS
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS signature_requests_all ON signature_requests;
CREATE POLICY signature_requests_all ON signature_requests FOR ALL USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_signature_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_signature_requests_updated ON signature_requests;
CREATE TRIGGER trg_signature_requests_updated BEFORE UPDATE ON signature_requests
    FOR EACH ROW EXECUTE FUNCTION update_signature_requests_updated_at();