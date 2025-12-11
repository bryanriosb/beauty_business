-- Remover módulos 'products' e 'inventory' del plan básico
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
  
  -- Remover acceso a products del plan básico
  IF v_basic_plan_id IS NOT NULL AND v_products_module_id IS NOT NULL THEN
    DELETE FROM plan_module_access 
    WHERE plan_id = v_basic_plan_id AND module_id = v_products_module_id;
    RAISE NOTICE 'Removed products module from basic plan';
  END IF;
  
  -- Remover acceso a inventory del plan básico
  IF v_basic_plan_id IS NOT NULL AND v_inventory_module_id IS NOT NULL THEN
    DELETE FROM plan_module_access 
    WHERE plan_id = v_basic_plan_id AND module_id = v_inventory_module_id;
    RAISE NOTICE 'Removed inventory module from basic plan';
  END IF;
END $$;
