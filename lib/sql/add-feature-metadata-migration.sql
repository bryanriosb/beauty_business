-- Migration: Add feature metadata storage to plan_module_access
-- This allows storing feature permission metadata (name, description, required plans) in the database
-- instead of hardcoding it in TypeScript

-- Add a new column to store feature metadata
ALTER TABLE plan_module_access
ADD COLUMN IF NOT EXISTS features_metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN plan_module_access.features_metadata IS 'Stores metadata for custom permissions: {feature_key: {name, description, requiredPlan}}';

-- Example structure for features_metadata:
-- {
--   "whatsapp_notifications": {
--     "name": "Notificaciones de WhatsApp",
--     "description": "Enviar recordatorios y notificaciones por WhatsApp",
--     "requiredPlan": ["pro", "enterprise"]
--   },
--   "custom_feature": {
--     "name": "Mi función personalizada",
--     "description": "Descripción de la función",
--     "requiredPlan": ["enterprise"]
--   }
-- }

-- Migrate existing hardcoded metadata to database for appointments module
DO $$
DECLARE
  v_services_module_id UUID;
BEGIN
  -- Get services module ID
  SELECT id INTO v_services_module_id
  FROM plan_modules
  WHERE code = 'services' AND is_active = true
  LIMIT 1;

  IF v_services_module_id IS NOT NULL THENº
    -- Update all plan_module_access records with metadata
    UPDATE plan_module_access
    SET 
      features_metadata = jsonb_build_object(
        'supply_management', jsonb_build_object(
          'name', 'Gestión de insumos',
          'description', 'Habilita la capacidad de gestionar productos de tipo insumo con gestión de inventario y descuento automático de cantidades al completar servicios',
          'requiredPlan', jsonb_build_array('pro', 'enterprise')
        )
      ),
      custom_permissions = jsonb_build_object(
        'supply_management', true
      )
    WHERE module_id = v_services_module_id;
  END IF;
END $$;

-- Create index for JSONB queries on features_metadata
CREATE INDEX IF NOT EXISTS idx_plan_module_access_features_metadata ON plan_module_access USING gin (features_metadata);

-- Create a helper function to get feature metadata
CREATE OR REPLACE FUNCTION get_feature_metadata(
  p_business_account_id UUID,
  p_module_code TEXT,
  p_feature_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_metadata JSONB;
BEGIN
  SELECT pma.features_metadata->p_feature_key INTO v_metadata
  FROM plan_module_access pma
  JOIN plans p ON p.id = pma.plan_id
  JOIN business_accounts ba ON ba.plan_id = p.id
  JOIN plan_modules pm ON pm.id = pma.module_id
  WHERE ba.id = p_business_account_id
    AND pm.code = p_module_code
    AND pm.is_active = true
  LIMIT 1;

  RETURN COALESCE(v_metadata, '{}'::jsonb);
END;
$$;

COMMENT ON FUNCTION get_feature_metadata IS 'Get metadata for a specific feature permission from the database';