-- Script para restaurar acceso a módulos products e inventory en plan básico
-- Obtiene IDs dinámicamente desde la BD para evitar hardcodeo

DO $$
DECLARE
  v_basic_plan_id UUID;
  v_products_module_id UUID;
  v_inventory_module_id UUID;
  v_existing_products_access UUID;
  v_existing_inventory_access UUID;
BEGIN
  -- Obtener IDs dinámicamente desde la BD
  SELECT id INTO v_basic_plan_id FROM plans WHERE code = 'basic';
  SELECT id INTO v_products_module_id FROM plan_modules WHERE code = 'products';
  SELECT id INTO v_inventory_module_id FROM plan_modules WHERE code = 'inventory';

  -- Verificar si ya existen registros
  SELECT id INTO v_existing_products_access
  FROM plan_module_access
  WHERE plan_id = v_basic_plan_id AND module_id = v_products_module_id;

  SELECT id INTO v_existing_inventory_access
  FROM plan_module_access
  WHERE plan_id = v_basic_plan_id AND module_id = v_inventory_module_id;

  -- Agregar products si no existe
  IF v_existing_products_access IS NULL AND v_products_module_id IS NOT NULL THEN
    INSERT INTO plan_module_access (plan_id, module_id, can_read, can_write, can_delete, custom_permissions)
    VALUES (v_basic_plan_id, v_products_module_id, true, true, true, NULL);
    RAISE NOTICE '✅ Agregado acceso a products para plan básico';
  ELSE
    RAISE NOTICE 'ℹ️  Acceso a products ya existe para plan básico';
  END IF;

  -- Agregar inventory si no existe
  IF v_existing_inventory_access IS NULL AND v_inventory_module_id IS NOT NULL THEN
    INSERT INTO plan_module_access (plan_id, module_id, can_read, can_write, can_delete, custom_permissions)
    VALUES (v_basic_plan_id, v_inventory_module_id, true, true, true, NULL);
    RAISE NOTICE '✅ Agregado acceso a inventory para plan básico';
  ELSE
    RAISE NOTICE 'ℹ️  Acceso a inventory ya existe para plan básico';
  END IF;

  -- Verificación final
  RAISE NOTICE '📊 Verificación: Plan básico tiene acceso a % módulos', (
    SELECT COUNT(*) FROM plan_module_access pma
    WHERE pma.plan_id = v_basic_plan_id
  );
END $$;