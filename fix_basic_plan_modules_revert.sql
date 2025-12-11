-- Revertir la corrección incorrecta: Agregar módulos 'products' e 'inventory' de vuelta al plan básico
DO $$
DECLARE
  v_basic_plan_id UUID;
  v_products_module_id UUID;
  v_inventory_module_id UUID;
BEGIN
  -- Obtener IDs
  SELECT id INTO v_basic_plan_id FROM plans WHERE code = 'basic';
  SELECT id INTO v_products_module_id FROM plan_modules WHERE code = 'products';
  SELECT id INTO v_inventory_module_id FROM plan_modules WHERE code = 'inventory';
  
  -- Agregar acceso a products al plan básico
  IF v_basic_plan_id IS NOT NULL AND v_products_module_id IS NOT NULL THEN
    INSERT INTO plan_module_access (plan_id, module_id, can_read, can_write, can_delete)
    VALUES (v_basic_plan_id, v_products_module_id, true, true, true)
    ON CONFLICT (plan_id, module_id) DO NOTHING;
    RAISE NOTICE 'Added products module to basic plan';
  END IF;
  
  -- Agregar acceso a inventory al plan básico
  IF v_basic_plan_id IS NOT NULL AND v_inventory_module_id IS NOT NULL THEN
    INSERT INTO plan_module_access (plan_id, module_id, can_read, can_write, can_delete)
    VALUES (v_basic_plan_id, v_inventory_module_id, true, true, true)
    ON CONFLICT (plan_id, module_id) DO NOTHING;
    RAISE NOTICE 'Added inventory module to basic plan';
  END IF;
END $$;
