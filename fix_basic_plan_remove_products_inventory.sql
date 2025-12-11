-- Script para remover acceso incorrecto a productos e inventario del plan básico
-- Estos módulos ahora están restringidos por configuración y no deben estar en plan_module_access

DO $$
DECLARE
  v_basic_plan_id UUID;
  v_products_module_id UUID;
  v_inventory_module_id UUID;
BEGIN
  -- Obtener IDs dinámicamente desde la BD
  SELECT id INTO v_basic_plan_id FROM plans WHERE code = 'basic';
  SELECT id INTO v_products_module_id FROM plan_modules WHERE code = 'products';
  SELECT id INTO v_inventory_module_id FROM plan_modules WHERE code = 'inventory';

  -- Remover acceso a products del plan básico (ya que ahora está restringido por config)
  IF v_products_module_id IS NOT NULL THEN
    DELETE FROM plan_module_access
    WHERE plan_id = v_basic_plan_id AND module_id = v_products_module_id;
    RAISE NOTICE '✅ Removido acceso a products del plan básico';
  END IF;

  -- Remover acceso a inventory del plan básico (ya que ahora está restringido por config)
  IF v_inventory_module_id IS NOT NULL THEN
    DELETE FROM plan_module_access
    WHERE plan_id = v_basic_plan_id AND module_id = v_inventory_module_id;
    RAISE NOTICE '✅ Removido acceso a inventory del plan básico';
  END IF;

  -- Verificación final
  RAISE NOTICE '📊 Verificación: Plan básico ahora tiene acceso a % módulos', (
    SELECT COUNT(*) FROM plan_module_access pma
    WHERE pma.plan_id = v_basic_plan_id
  );
END $$;