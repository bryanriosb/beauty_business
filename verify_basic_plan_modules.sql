-- Verificación: Confirmar que plan básico tiene acceso a products e inventory
SELECT
  'Verificación de acceso a módulos - Plan Básico' as check_title,
  CASE
    WHEN COUNT(*) = 2 THEN '✅ CORRECTO: Plan básico tiene acceso a products e inventory'
    ELSE '❌ ERROR: Plan básico NO tiene acceso completo a products e inventory'
  END as status,
  COUNT(*) as modules_with_access,
  STRING_AGG(pm.code, ', ') as modules_list
FROM plan_module_access pma
JOIN plans p ON pma.plan_id = p.id
JOIN plan_modules pm ON pma.module_id = pm.id
WHERE p.code = 'basic'
  AND pm.code IN ('products', 'inventory')
  AND pma.can_read = true;

-- Detalle de módulos disponibles para plan básico
SELECT
  'Módulos disponibles para Plan Básico' as section,
  pm.code as module_code,
  pm.name as module_name,
  pma.can_read,
  pma.can_write,
  pma.can_delete,
  pma.custom_permissions
FROM plan_module_access pma
JOIN plans p ON pma.plan_id = p.id
JOIN plan_modules pm ON pma.module_id = pm.id
WHERE p.code = 'basic'
ORDER BY pm.code;