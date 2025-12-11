-- Configuración completa: Sistema 100% dependiente de BD
-- Solo módulos en plan_module_access son accesibles

DO $$
DECLARE
  v_basic_plan_id UUID;
  v_pro_plan_id UUID;
  v_enterprise_plan_id UUID;
  v_trial_plan_id UUID;
  v_free_plan_id UUID;

  -- MÓDULOS COMPLETOS POR PLAN (100% gestionado desde BD)

  -- FREE: Acceso mínimo para empezar
  v_free_modules TEXT[] := ARRAY['dashboard', 'appointments', 'services', 'customers', 'invoices'];

  -- BASIC: Funcionalidades básicas sin productos/inventario
  v_basic_modules TEXT[] := ARRAY['dashboard', 'appointments', 'services', 'customers', 'specialists', 'invoices', 'reports'];

  -- PROFESSIONAL: Funcionalidades completas de negocio
  v_pro_modules TEXT[] := ARRAY['dashboard', 'appointments', 'services', 'products', 'inventory', 'customers', 'specialists', 'medical_records', 'commissions', 'reports', 'invoices'];

  -- ENTERPRISE: Todo incluido + configuraciones avanzadas
  v_enterprise_modules TEXT[] := ARRAY['dashboard', 'appointments', 'services', 'products', 'inventory', 'customers', 'specialists', 'medical_records', 'commissions', 'reports', 'invoices', 'ai_assistant', 'whatsapp', 'settings'];

  -- TRIAL: Acceso completo para evaluación
  v_trial_modules TEXT[] := ARRAY['dashboard', 'appointments', 'services', 'products', 'inventory', 'customers', 'specialists', 'medical_records', 'commissions', 'reports', 'invoices', 'ai_assistant', 'whatsapp', 'settings'];
BEGIN
  -- Obtener IDs de planes
  SELECT id INTO v_basic_plan_id FROM plans WHERE code = 'basic';
  SELECT id INTO v_pro_plan_id FROM plans WHERE code = 'professional';
  SELECT id INTO v_enterprise_plan_id FROM plans WHERE code = 'enterprise';
  SELECT id INTO v_trial_plan_id FROM plans WHERE code = 'trial';
  SELECT id INTO v_free_plan_id FROM plans WHERE code = 'free';

  -- Limpiar configuraciones existentes
  DELETE FROM plan_module_access WHERE plan_id IN (v_basic_plan_id, v_pro_plan_id, v_enterprise_plan_id, v_trial_plan_id, v_free_plan_id);

  -- Configurar plan BASIC (solo módulos básicos)
  INSERT INTO plan_module_access (plan_id, module_id, can_read, can_write, can_delete, custom_permissions)
  SELECT v_basic_plan_id, pm.id, true, true, true, NULL
  FROM plan_modules pm
  WHERE pm.code = ANY(v_basic_modules) AND pm.is_active = true;

  -- Configurar plan PROFESSIONAL
  INSERT INTO plan_module_access (plan_id, module_id, can_read, can_write, can_delete, custom_permissions)
  SELECT v_pro_plan_id, pm.id, true, true, true, NULL
  FROM plan_modules pm
  WHERE pm.code = ANY(v_pro_modules) AND pm.is_active = true;

  -- Configurar plan ENTERPRISE
  INSERT INTO plan_module_access (plan_id, module_id, can_read, can_write, can_delete, custom_permissions)
  SELECT v_enterprise_plan_id, pm.id, true, true, true, NULL
  FROM plan_modules pm
  WHERE pm.code = ANY(v_enterprise_modules) AND pm.is_active = true;

  -- Configurar plan TRIAL (acceso completo)
  INSERT INTO plan_module_access (plan_id, module_id, can_read, can_write, can_delete, custom_permissions)
  SELECT v_trial_plan_id, pm.id, true, true, true, NULL
  FROM plan_modules pm
  WHERE pm.code = ANY(v_trial_modules) AND pm.is_active = true;

  -- Configurar plan FREE (mínimo)
  INSERT INTO plan_module_access (plan_id, module_id, can_read, can_write, can_delete, custom_permissions)
  SELECT v_free_plan_id, pm.id, true, true, true, NULL
  FROM plan_modules pm
  WHERE pm.code = ANY(v_free_modules) AND pm.is_active = true;

  RAISE NOTICE '✅ Configuración completa: Sistema ahora 100%% dependiente de BD';
  RAISE NOTICE '📊 Plan BASIC: % módulos', array_length(v_basic_modules, 1);
  RAISE NOTICE '📊 Plan PRO: % módulos', array_length(v_pro_modules, 1);
  RAISE NOTICE '📊 Plan ENTERPRISE: % módulos', array_length(v_enterprise_modules, 1);
  RAISE NOTICE '📊 Plan TRIAL: % módulos', array_length(v_trial_modules, 1);
  RAISE NOTICE '📊 Plan FREE: % módulos', array_length(v_free_modules, 1);
END $$;