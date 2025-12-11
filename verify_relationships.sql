-- Verificar relaciones entre tablas para company dashboard

-- 1. Verificar que las citas tienen business_id válido
SELECT
  'CITAS CON BUSINESS_ID VÁLIDO' as check,
  COUNT(*) as total_citas,
  COUNT(CASE WHEN a.business_id IS NOT NULL THEN 1 END) as citas_con_business,
  COUNT(CASE WHEN b.id IS NOT NULL THEN 1 END) as citas_con_business_valido
FROM appointments a
LEFT JOIN businesses b ON a.business_id = b.id
WHERE a.status = 'COMPLETED'
  AND a.start_time >= CURRENT_DATE - INTERVAL '30 days';

-- 2. Verificar que los businesses tienen business_account_id
SELECT
  'BUSINESSES CON BUSINESS_ACCOUNT_ID' as check,
  COUNT(*) as total_businesses,
  COUNT(CASE WHEN business_account_id IS NOT NULL THEN 1 END) as businesses_con_account
FROM businesses;

-- 3. Verificar distribución de citas por business account
SELECT
  'CITAS POR BUSINESS ACCOUNT' as check,
  ba.company_name,
  COUNT(a.id) as citas_completadas,
  ROUND(SUM(a.total_price_cents) / 100.0, 2) as ingresos_totales
FROM business_accounts ba
LEFT JOIN businesses b ON ba.id = b.business_account_id
LEFT JOIN appointments a ON b.id = a.business_id
  AND a.status = 'COMPLETED'
  AND a.start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY ba.id, ba.company_name
ORDER BY ingresos_totales DESC NULLS LAST;

-- 4. Simular exactamente la consulta del dashboard
SELECT
  'SIMULACIÓN CONSULTA DASHBOARD' as check,
  COUNT(a.id) as citas_encontradas,
  COUNT(DISTINCT a.business_id) as businesses_unicos,
  COUNT(DISTINCT b.business_account_id) as business_accounts_unicos,
  ROUND(SUM(a.total_price_cents) / 100.0, 2) as ingresos_totales
FROM appointments a
INNER JOIN businesses b ON a.business_id = b.id
WHERE a.status = 'COMPLETED'
  AND a.start_time >= CURRENT_DATE - INTERVAL '30 days'
  AND a.start_time <= CURRENT_DATE + INTERVAL '1 day';