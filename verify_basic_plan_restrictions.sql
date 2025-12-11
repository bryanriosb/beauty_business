-- Verificación final: Confirmar que productos e inventario están DESACTIVADOS para plan básico
SELECT
  'Verificación de restricciones - Plan Básico' as check_title,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ CORRECTO: Plan básico NO tiene acceso a products e inventory'
    ELSE '❌ ERROR: Plan básico SÍ tiene acceso a products e inventory'
  END as status,
  COUNT(*) as restricted_modules_found,
  CASE
    WHEN COUNT(*) > 0 THEN STRING_AGG(pm.code, ', ')
    ELSE 'Ninguno'
  END as modules_with_access
FROM plan_module_access pma
JOIN plans p ON pma.plan_id = p.id
JOIN plan_modules pm ON pma.module_id = pm.id
WHERE p.code = 'basic'
  AND pm.code IN ('products', 'inventory');

-- Verificar configuración de restricciones por código
SELECT
  'Configuración de restricciones por código' as section,
  'products' as module,
  CASE
    WHEN 'products' = ANY(ARRAY(SELECT unnest(enum_range(null::module_restriction_type)))) THEN 'Restringido'
    ELSE 'Disponible para todos'
  END as restriction_status;

-- Verificar que la configuración funciona para diferentes planes
SELECT
  'Prueba de acceso por plan' as section,
  p.code as plan_code,
  CASE
    WHEN p.code IN ('professional', 'enterprise', 'trial') THEN '✅ Debe tener acceso'
    WHEN p.code = 'basic' THEN '❌ NO debe tener acceso'
    WHEN p.code = 'free' THEN '❌ NO debe tener acceso'
    ELSE '❓ Verificar configuración'
  END as expected_access,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM plan_module_access pma
      JOIN plan_modules pm ON pma.module_id = pm.id
      WHERE pma.plan_id = p.id AND pm.code = 'products'
    ) THEN 'Sí tiene acceso'
    ELSE 'No tiene acceso'
  END as current_access_products,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM plan_module_access pma
      JOIN plan_modules pm ON pma.module_id = pm.id
      WHERE pma.plan_id = p.id AND pm.code = 'inventory'
    ) THEN 'Sí tiene acceso'
    ELSE 'No tiene acceso'
  END as current_access_inventory
FROM plans p
WHERE p.code IN ('free', 'basic', 'professional', 'enterprise', 'trial')
ORDER BY p.sort_order;