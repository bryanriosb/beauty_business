-- Migration to add granular feature permissions to plan_module_access
-- This uses the existing custom_permissions JSONB field to store feature-level permissions

-- Example structure for custom_permissions JSONB:
-- {
--   "whatsapp_notifications": true,
--   "specialist_assignment": true,
--   "price_editing": false,
--   "supply_management": true,
--   "goals_management": false,
--   "view_charts": true,
--   "export_data": true
-- }

-- This migration updates existing plan_module_access records with granular permissions

DO $$
DECLARE
  v_free_plan_id UUID;
  v_basic_plan_id UUID;
  v_pro_plan_id UUID;
  v_enterprise_plan_id UUID;
  v_appointments_module_id UUID;
  v_services_module_id UUID;
  v_specialists_module_id UUID;
  v_reports_module_id UUID;
BEGIN
  -- Get plan IDs
  SELECT id INTO v_free_plan_id FROM plans WHERE code = 'free';
  SELECT id INTO v_basic_plan_id FROM plans WHERE code = 'basic';
  SELECT id INTO v_pro_plan_id FROM plans WHERE code = 'pro';
  SELECT id INTO v_enterprise_plan_id FROM plans WHERE code = 'enterprise';

  -- Get module IDs
  SELECT id INTO v_appointments_module_id FROM plan_modules WHERE code = 'appointments';
  SELECT id INTO v_services_module_id FROM plan_modules WHERE code = 'services';
  SELECT id INTO v_specialists_module_id FROM plan_modules WHERE code = 'specialists';
  SELECT id INTO v_reports_module_id FROM plan_modules WHERE code = 'reports';

  -- ==================================================
  -- FREE PLAN - Most features disabled
  -- ==================================================

  -- Appointments module for FREE plan
  IF v_free_plan_id IS NOT NULL AND v_appointments_module_id IS NOT NULL THEN
    UPDATE plan_module_access
    SET custom_permissions = jsonb_build_object(
      'whatsapp_notifications', false,
      'specialist_assignment', false,
      'price_editing', false
    )
    WHERE plan_id = v_free_plan_id AND module_id = v_appointments_module_id;
  END IF;

  -- Services module for FREE plan
  IF v_free_plan_id IS NOT NULL AND v_services_module_id IS NOT NULL THEN
    UPDATE plan_module_access
    SET custom_permissions = jsonb_build_object(
      'supply_management', false,
      'price_editing_in_appointment', false
    )
    WHERE plan_id = v_free_plan_id AND module_id = v_services_module_id;
  END IF;

  -- Specialists module for FREE plan
  IF v_free_plan_id IS NOT NULL AND v_specialists_module_id IS NOT NULL THEN
    UPDATE plan_module_access
    SET custom_permissions = jsonb_build_object(
      'goals_management', false
    )
    WHERE plan_id = v_free_plan_id AND module_id = v_specialists_module_id;
  END IF;

  -- Reports module for FREE plan (only basic cards, no charts, no export)
  IF v_free_plan_id IS NOT NULL AND v_reports_module_id IS NOT NULL THEN
    UPDATE plan_module_access
    SET custom_permissions = jsonb_build_object(
      'view_charts', false,
      'view_revenue', true,
      'view_appointments', true,
      'view_services', true,
      'view_specialists', true,
      'view_customers', false,
      'view_supplies', false,
      'view_portfolio', false,
      'export_data', false
    )
    WHERE plan_id = v_free_plan_id AND module_id = v_reports_module_id;
  END IF;

  -- ==================================================
  -- BASIC PLAN - Same as free for most features
  -- ==================================================

  -- Appointments module for BASIC plan
  IF v_basic_plan_id IS NOT NULL AND v_appointments_module_id IS NOT NULL THEN
    UPDATE plan_module_access
    SET custom_permissions = jsonb_build_object(
      'whatsapp_notifications', false,
      'specialist_assignment', false,
      'price_editing', false
    )
    WHERE plan_id = v_basic_plan_id AND module_id = v_appointments_module_id;
  END IF;

  -- Services module for BASIC plan
  IF v_basic_plan_id IS NOT NULL AND v_services_module_id IS NOT NULL THEN
    UPDATE plan_module_access
    SET custom_permissions = jsonb_build_object(
      'supply_management', false,
      'price_editing_in_appointment', false
    )
    WHERE plan_id = v_basic_plan_id AND module_id = v_services_module_id;
  END IF;

  -- Specialists module for BASIC plan
  IF v_basic_plan_id IS NOT NULL AND v_specialists_module_id IS NOT NULL THEN
    UPDATE plan_module_access
    SET custom_permissions = jsonb_build_object(
      'goals_management', false
    )
    WHERE plan_id = v_basic_plan_id AND module_id = v_specialists_module_id;
  END IF;

  -- Reports module for BASIC plan (same as free)
  IF v_basic_plan_id IS NOT NULL AND v_reports_module_id IS NOT NULL THEN
    UPDATE plan_module_access
    SET custom_permissions = jsonb_build_object(
      'view_charts', false,
      'view_revenue', true,
      'view_appointments', true,
      'view_services', true,
      'view_specialists', true,
      'view_customers', false,
      'view_supplies', false,
      'view_portfolio', false,
      'export_data', false
    )
    WHERE plan_id = v_basic_plan_id AND module_id = v_reports_module_id;
  END IF;

  -- ==================================================
  -- PRO PLAN - Most features enabled
  -- ==================================================

  -- Appointments module for PRO plan
  IF v_pro_plan_id IS NOT NULL AND v_appointments_module_id IS NOT NULL THEN
    UPDATE plan_module_access
    SET custom_permissions = jsonb_build_object(
      'whatsapp_notifications', true,
      'specialist_assignment', true,
      'price_editing', true
    )
    WHERE plan_id = v_pro_plan_id AND module_id = v_appointments_module_id;
  END IF;

  -- Services module for PRO plan
  IF v_pro_plan_id IS NOT NULL AND v_services_module_id IS NOT NULL THEN
    UPDATE plan_module_access
    SET custom_permissions = jsonb_build_object(
      'supply_management', true,
      'price_editing_in_appointment', true
    )
    WHERE plan_id = v_pro_plan_id AND module_id = v_services_module_id;
  END IF;

  -- Specialists module for PRO plan
  IF v_pro_plan_id IS NOT NULL AND v_specialists_module_id IS NOT NULL THEN
    UPDATE plan_module_access
    SET custom_permissions = jsonb_build_object(
      'goals_management', true
    )
    WHERE plan_id = v_pro_plan_id AND module_id = v_specialists_module_id;
  END IF;

  -- Reports module for PRO plan (charts, export, but no portfolio)
  IF v_pro_plan_id IS NOT NULL AND v_reports_module_id IS NOT NULL THEN
    UPDATE plan_module_access
    SET custom_permissions = jsonb_build_object(
      'view_charts', true,
      'view_revenue', true,
      'view_appointments', true,
      'view_services', true,
      'view_specialists', true,
      'view_customers', true,
      'view_supplies', true,
      'view_portfolio', false,
      'export_data', true
    )
    WHERE plan_id = v_pro_plan_id AND module_id = v_reports_module_id;
  END IF;

  -- ==================================================
  -- ENTERPRISE PLAN - All features enabled
  -- ==================================================

  -- Appointments module for ENTERPRISE plan
  IF v_enterprise_plan_id IS NOT NULL AND v_appointments_module_id IS NOT NULL THEN
    UPDATE plan_module_access
    SET custom_permissions = jsonb_build_object(
      'whatsapp_notifications', true,
      'specialist_assignment', true,
      'price_editing', true
    )
    WHERE plan_id = v_enterprise_plan_id AND module_id = v_appointments_module_id;
  END IF;

  -- Services module for ENTERPRISE plan
  IF v_enterprise_plan_id IS NOT NULL AND v_services_module_id IS NOT NULL THEN
    UPDATE plan_module_access
    SET custom_permissions = jsonb_build_object(
      'supply_management', true,
      'price_editing_in_appointment', true
    )
    WHERE plan_id = v_enterprise_plan_id AND module_id = v_services_module_id;
  END IF;

  -- Specialists module for ENTERPRISE plan
  IF v_enterprise_plan_id IS NOT NULL AND v_specialists_module_id IS NOT NULL THEN
    UPDATE plan_module_access
    SET custom_permissions = jsonb_build_object(
      'goals_management', true
    )
    WHERE plan_id = v_enterprise_plan_id AND module_id = v_specialists_module_id;
  END IF;

  -- Reports module for ENTERPRISE plan (everything enabled)
  IF v_enterprise_plan_id IS NOT NULL AND v_reports_module_id IS NOT NULL THEN
    UPDATE plan_module_access
    SET custom_permissions = jsonb_build_object(
      'view_charts', true,
      'view_revenue', true,
      'view_appointments', true,
      'view_services', true,
      'view_specialists', true,
      'view_customers', true,
      'view_supplies', true,
      'view_portfolio', true,
      'export_data', true
    )
    WHERE plan_id = v_enterprise_plan_id AND module_id = v_reports_module_id;
  END IF;

  RAISE NOTICE 'Feature permissions migration completed successfully';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error during migration: %', SQLERRM;
    RAISE;
END $$;

-- Create a helper function to check feature permission
CREATE OR REPLACE FUNCTION check_feature_permission(
  p_business_account_id UUID,
  p_module_code TEXT,
  p_feature_key TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := FALSE;
BEGIN
  SELECT
    COALESCE(
      (pma.custom_permissions->p_feature_key)::BOOLEAN,
      FALSE
    )
  INTO v_has_permission
  FROM business_accounts ba
  JOIN plans p ON p.id = ba.plan_id
  JOIN plan_module_access pma ON pma.plan_id = p.id
  JOIN plan_modules pm ON pm.id = pma.module_id
  WHERE ba.id = p_business_account_id
    AND pm.code = p_module_code;

  RETURN COALESCE(v_has_permission, FALSE);
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for better performance on custom_permissions queries
CREATE INDEX IF NOT EXISTS idx_plan_module_access_custom_permissions
ON plan_module_access USING GIN (custom_permissions);

COMMENT ON FUNCTION check_feature_permission IS
'Check if a business account has permission for a specific feature within a module. Returns FALSE if not found.';
