-- DIAGNÓSTICO COMPLETO: ¿Por qué no hay datos en company dashboard?

-- 1. Verificar si hay citas en general
SELECT
  'TOTAL CITAS EN BD' as check,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed,
  MIN(start_time) as earliest_date,
  MAX(start_time) as latest_date
FROM appointments;

-- 2. Verificar citas en el último mes
SELECT
  'CITAS ÚLTIMO MES' as check,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed
FROM appointments
WHERE start_time >= CURRENT_DATE - INTERVAL '30 days';

-- 3. Verificar si hay negocios
SELECT
  'NEGOCIOS ACTIVOS' as check,
  COUNT(*) as total_businesses,
  COUNT(DISTINCT business_account_id) as unique_accounts
FROM businesses;

-- 4. Verificar estructura de la consulta que hace el dashboard
SELECT
  'SIMULACIÓN CONSULTA DASHBOARD' as check,
  COUNT(a.id) as appointments_found,
  COUNT(DISTINCT a.business_id) as businesses_with_data,
  ROUND(SUM(a.total_price_cents) / 100.0, 2) as total_revenue
FROM appointments a
JOIN businesses b ON a.business_id = b.id
WHERE a.status = 'COMPLETED'
  AND a.start_time >= CURRENT_DATE - INTERVAL '30 days'
  AND a.start_time <= CURRENT_DATE + INTERVAL '1 day';

-- 5. Verificar permisos de módulos para company_admin
SELECT
  'MÓDULOS ACCESIBLES PARA COMPANY_ADMIN' as check,
  COUNT(*) as accessible_modules
FROM plan_module_access pma
WHERE pma.plan_id IN (
  SELECT id FROM plans WHERE code IN ('trial', 'enterprise')
);