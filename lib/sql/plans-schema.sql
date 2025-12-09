-- Plans Management Schema
-- Run this migration to create the plans system tables

-- Create plans table
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  billing_period VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly', 'lifetime')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
  max_businesses INTEGER NOT NULL DEFAULT 1,
  max_users_per_business INTEGER NOT NULL DEFAULT 5,
  max_specialists_per_business INTEGER NOT NULL DEFAULT 3,
  features JSONB NOT NULL DEFAULT '{
    "has_ai_assistant": false,
    "has_whatsapp_integration": false,
    "has_reports": false,
    "has_inventory": false,
    "has_commissions": false,
    "has_medical_records": false,
    "has_invoicing": false,
    "has_custom_branding": false,
    "max_appointments_per_month": null,
    "max_products": null,
    "max_services": null
  }'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create plan_modules table (defines available modules in the system)
CREATE TABLE IF NOT EXISTS plan_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon_key VARCHAR(50),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create plan_module_access table (relates plans to modules with permissions)
CREATE TABLE IF NOT EXISTS plan_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES plan_modules(id) ON DELETE CASCADE,
  can_read BOOLEAN NOT NULL DEFAULT true,
  can_write BOOLEAN NOT NULL DEFAULT true,
  can_delete BOOLEAN NOT NULL DEFAULT true,
  custom_permissions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_id, module_id)
);

-- Add plan_id to business_accounts if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_accounts' AND column_name = 'plan_id'
  ) THEN
    ALTER TABLE business_accounts ADD COLUMN plan_id UUID REFERENCES plans(id);
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_plans_status ON plans(status);
CREATE INDEX IF NOT EXISTS idx_plans_code ON plans(code);
CREATE INDEX IF NOT EXISTS idx_plan_modules_code ON plan_modules(code);
CREATE INDEX IF NOT EXISTS idx_plan_modules_is_active ON plan_modules(is_active);
CREATE INDEX IF NOT EXISTS idx_plan_module_access_plan_id ON plan_module_access(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_module_access_module_id ON plan_module_access(module_id);
CREATE INDEX IF NOT EXISTS idx_business_accounts_plan_id ON business_accounts(plan_id);

-- Create trigger to update updated_at on plans
CREATE OR REPLACE FUNCTION update_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_plans_updated_at ON plans;
CREATE TRIGGER trigger_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_plans_updated_at();

-- Insert default modules (these represent the main features of the app)
INSERT INTO plan_modules (code, name, description, icon_key, is_active) VALUES
  ('dashboard', 'Tablero', 'Panel principal con métricas', 'LayoutDashboard', true),
  ('appointments', 'Citas', 'Gestión de citas y agenda', 'Calendar', true),
  ('services', 'Servicios', 'Catálogo de servicios', 'Scissors', true),
  ('products', 'Productos', 'Gestión de productos', 'Package', true),
  ('inventory', 'Inventario', 'Control de inventario', 'Warehouse', true),
  ('specialists', 'Especialistas', 'Gestión del equipo', 'UserCircle', true),
  ('customers', 'Clientes', 'Base de clientes', 'Users', true),
  ('medical_records', 'Historias Clínicas', 'Registros médicos', 'ClipboardList', true),
  ('commissions', 'Comisiones', 'Sistema de comisiones', 'Percent', true),
  ('reports', 'Reportes', 'Informes y analíticas', 'BarChart3', true),
  ('invoices', 'Facturas', 'Facturación', 'FileStack', true),
  ('ai_assistant', 'Asistente IA', 'Asistente con inteligencia artificial', 'Bot', true),
  ('whatsapp', 'WhatsApp', 'Integración con WhatsApp', 'MessageSquare', true)
ON CONFLICT (code) DO NOTHING;

-- Insert default plans
INSERT INTO plans (code, name, description, price_cents, billing_period, status, max_businesses, max_users_per_business, max_specialists_per_business, features, sort_order) VALUES
  ('free', 'Gratuito', 'Plan básico para empezar', 0, 'monthly', 'active', 1, 2, 2,
   '{"has_ai_assistant": false, "has_whatsapp_integration": false, "has_reports": false, "has_inventory": false, "has_commissions": false, "has_medical_records": false, "has_invoicing": false, "has_custom_branding": false, "max_appointments_per_month": 50, "max_products": 20, "max_services": 10}'::jsonb,
   0),
  ('basic', 'Básico', 'Plan para pequeños negocios', 4900000, 'monthly', 'active', 1, 5, 5,
   '{"has_ai_assistant": false, "has_whatsapp_integration": false, "has_reports": true, "has_inventory": true, "has_commissions": false, "has_medical_records": false, "has_invoicing": true, "has_custom_branding": false, "max_appointments_per_month": 200, "max_products": 100, "max_services": 50}'::jsonb,
   1),
  ('pro', 'Profesional', 'Para negocios en crecimiento', 9900000, 'monthly', 'active', 3, 10, 10,
   '{"has_ai_assistant": true, "has_whatsapp_integration": true, "has_reports": true, "has_inventory": true, "has_commissions": true, "has_medical_records": true, "has_invoicing": true, "has_custom_branding": false, "max_appointments_per_month": null, "max_products": null, "max_services": null}'::jsonb,
   2),
  ('enterprise', 'Empresarial', 'Solución completa para grandes empresas', 19900000, 'monthly', 'active', 10, 50, 50,
   '{"has_ai_assistant": true, "has_whatsapp_integration": true, "has_reports": true, "has_inventory": true, "has_commissions": true, "has_medical_records": true, "has_invoicing": true, "has_custom_branding": true, "max_appointments_per_month": null, "max_products": null, "max_services": null}'::jsonb,
   3)
ON CONFLICT (code) DO NOTHING;
