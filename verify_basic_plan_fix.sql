-- Verificar que el plan básico ahora tiene acceso a products e inventory
SELECT 
  p.code as plan_code, 
  pm.code as module_code,
  CASE WHEN pma.plan_id IS NOT NULL THEN 'HAS_ACCESS' ELSE 'NO_ACCESS' END as access_status
FROM plans p 
CROSS JOIN plan_modules pm 
LEFT JOIN plan_module_access pma ON p.id = pma.plan_id AND pm.id = pma.module_id
WHERE p.code = 'basic' 
  AND pm.code IN ('products', 'inventory', 'appointments', 'services', 'customers', 'reports', 'invoices')
ORDER BY pm.code;

-- Verificar configuración completa de módulos por plan
SELECT 
  p.code as plan_code,
  COUNT(pma.module_id) as total_modules,
  STRING_AGG(pm.code, ', ' ORDER BY pm.code) as modules
FROM plans p 
LEFT JOIN plan_module_access pma ON p.id = pma.plan_id
LEFT JOIN plan_modules pm ON pma.module_id = pm.id
GROUP BY p.id, p.code
ORDER BY p.sort_order;
