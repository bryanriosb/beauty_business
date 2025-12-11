-- Verificar datos básicos para company dashboard
SELECT
  'TOTAL CITAS COMPLETADAS (últimos 30 días)' as metric,
  COUNT(*) as value
FROM appointments
WHERE status = 'COMPLETED'
  AND start_time >= CURRENT_DATE - INTERVAL '30 days';

SELECT
  'NEGOCIOS ACTIVOS' as metric,
  COUNT(DISTINCT business_id) as value
FROM appointments
WHERE status = 'COMPLETED'
  AND start_time >= CURRENT_DATE - INTERVAL '30 days';

SELECT
  'INGRESOS TOTALES (últimos 30 días)' as metric,
  ROUND(SUM(total_price_cents) / 100.0, 2) as value
FROM appointments
WHERE status = 'COMPLETED'
  AND start_time >= CURRENT_DATE - INTERVAL '30 days';

-- Verificar si hay datos en el rango de fechas actual
SELECT
  'CITAS EN RANGO ACTUAL (este mes)' as metric,
  COUNT(*) as value,
  MIN(start_time) as earliest_date,
  MAX(start_time) as latest_date
FROM appointments
WHERE status = 'COMPLETED'
  AND start_time >= DATE_TRUNC('month', CURRENT_DATE)
  AND start_time < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';