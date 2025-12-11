-- Tabla de configuración de comisiones
CREATE TABLE IF NOT EXISTS commission_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  specialist_id UUID REFERENCES specialists(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  commission_type VARCHAR(20) NOT NULL CHECK (commission_type IN ('percentage', 'fixed')),
  commission_value DECIMAL(10, 2) NOT NULL CHECK (commission_value >= 0),
  commission_basis VARCHAR(30) NOT NULL DEFAULT 'service_total' CHECK (commission_basis IN ('service_total', 'appointment_total')),
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para commission_configs
CREATE INDEX IF NOT EXISTS idx_commission_configs_business ON commission_configs(business_id);
CREATE INDEX IF NOT EXISTS idx_commission_configs_specialist ON commission_configs(specialist_id);
CREATE INDEX IF NOT EXISTS idx_commission_configs_default ON commission_configs(business_id, is_default) WHERE is_default = true;

-- Tabla de comisiones por especialista
CREATE TABLE IF NOT EXISTS specialist_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  specialist_id UUID NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  commission_config_id UUID REFERENCES commission_configs(id) ON DELETE SET NULL,
  service_total_cents INTEGER NOT NULL DEFAULT 0,
  appointment_total_cents INTEGER NOT NULL DEFAULT 0,
  commission_cents INTEGER NOT NULL DEFAULT 0,
  commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para specialist_commissions
CREATE INDEX IF NOT EXISTS idx_specialist_commissions_business ON specialist_commissions(business_id);
CREATE INDEX IF NOT EXISTS idx_specialist_commissions_specialist ON specialist_commissions(specialist_id);
CREATE INDEX IF NOT EXISTS idx_specialist_commissions_appointment ON specialist_commissions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_specialist_commissions_status ON specialist_commissions(status);
CREATE INDEX IF NOT EXISTS idx_specialist_commissions_created ON specialist_commissions(created_at);

-- Restricción única para evitar comisiones duplicadas por cita
CREATE UNIQUE INDEX IF NOT EXISTS idx_specialist_commissions_unique_appointment
ON specialist_commissions(appointment_id, specialist_id);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_commission_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_commission_configs_updated_at
  BEFORE UPDATE ON commission_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_updated_at();

CREATE TRIGGER tr_specialist_commissions_updated_at
  BEFORE UPDATE ON specialist_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_updated_at();

-- RLS Policies
ALTER TABLE commission_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialist_commissions ENABLE ROW LEVEL SECURITY;

-- Política para commission_configs (solo acceso por business_id)
CREATE POLICY commission_configs_business_access ON commission_configs
  FOR ALL
  USING (true);

-- Política para specialist_commissions
CREATE POLICY specialist_commissions_business_access ON specialist_commissions
  FOR ALL
  USING (true);
