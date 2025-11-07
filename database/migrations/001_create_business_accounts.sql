-- Crear tabla business_accounts
CREATE TABLE IF NOT EXISTS business_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(50),
  legal_name VARCHAR(255),
  billing_address TEXT,
  billing_city VARCHAR(100),
  billing_state VARCHAR(100),
  billing_postal_code VARCHAR(20),
  billing_country VARCHAR(2) NOT NULL DEFAULT 'CO',
  contact_name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  subscription_plan VARCHAR(20) NOT NULL DEFAULT 'trial' CHECK (subscription_plan IN ('trial', 'free', 'basic', 'pro', 'enterprise')),
  status VARCHAR(20) NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'suspended', 'cancelled', 'trial')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Índices para business_accounts
CREATE INDEX idx_business_accounts_created_by ON business_accounts(created_by);
CREATE INDEX idx_business_accounts_status ON business_accounts(status);
CREATE INDEX idx_business_accounts_subscription_plan ON business_accounts(subscription_plan);
CREATE INDEX idx_business_accounts_tax_id ON business_accounts(tax_id) WHERE tax_id IS NOT NULL;
CREATE INDEX idx_business_accounts_contact_email ON business_accounts(contact_email);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_business_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_business_accounts_updated_at
  BEFORE UPDATE ON business_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_business_accounts_updated_at();

-- RLS (Row Level Security) - DESHABILITADO TEMPORALMENTE
-- TODO: Habilitar y configurar correctamente cuando el sistema esté estable
-- ALTER TABLE business_accounts ENABLE ROW LEVEL SECURITY;

-- Comentarios
COMMENT ON TABLE business_accounts IS 'Cuentas de negocio (empresas matrices) que agrupan uno o más negocios/sucursales';
COMMENT ON COLUMN business_accounts.tax_id IS 'NIT o RUT para Colombia';
COMMENT ON COLUMN business_accounts.billing_country IS 'Código ISO 3166-1 alpha-2';
COMMENT ON COLUMN business_accounts.settings IS 'Configuraciones personalizadas en formato JSON';
