-- VERIFICACIÓN COMPLETA: Todos los módulos gestionados desde BD
SELECT
  'VERIFICACIÓN: Sistema 100% dependiente de BD' as check_title,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PERFECTO: Ningún módulo hardcodeado'
    ELSE '❌ ERROR: Aún hay módulos hardcodeados en código'
  END as status,
  'Todos los módulos deben estar en plan_module_access, no en constantes' as explanation;

-- Verificar que TODOS los módulos activos estén en al menos un plan
SELECT
  'Módulos sin asignar a ningún plan' as issue,
  pm.code as module_code,
  pm.name as module_name
FROM plan_modules pm
WHERE pm.is_active = true
  AND pm.id NOT IN (
    SELECT DISTINCT pma.module_id
    FROM plan_module_access pma
  );

-- Resumen por plan
SELECT
  'Resumen de módulos por plan' as summary,
  p.code as plan_code,
  COUNT(pma.id) as total_modules,
  STRING_AGG(pm.code, ', ' ORDER BY pm.code) as modules_list
FROM plans p
LEFT JOIN plan_module_access pma ON p.id = pma.plan_id
LEFT JOIN plan_modules pm ON pma.module_id = pm.id
WHERE p.code IN ('free', 'basic', 'professional', 'enterprise', 'trial')
GROUP BY p.id, p.code, p.sort_order
ORDER BY p.sort_order;

-- Verificar configuración específica del plan básico
SELECT
  'Configuración Plan Básico' as check,
  CASE
    WHEN COUNT(*) = 7 THEN '✅ CORRECTO: 7 módulos básicos'
    ELSE '❌ ERROR: Configuración incorrecta'
  END as status,
  COUNT(*) as modules_count,
  STRING_AGG(pm.code, ', ' ORDER BY pm.code) as modules
FROM plan_module_access pma
JOIN plans p ON pma.plan_id = p.id
JOIN plan_modules pm ON pma.module_id = pm.id
WHERE p.code = 'basic';