-- Verificar si hay datos para el dashboard company admin
SELECT
  'VERIFICACIÓN: Datos para Company Dashboard' as check_title,
  COUNT(*) as total_appointments,
  COUNT(DISTINCT business_id) as unique_businesses,
  COALESCE(SUM(total_price_cents), 0) as total_revenue_cents,
  ROUND(COALESCE(SUM(total_price_cents), 0) / 100.0, 2) as total_revenue
FROM appointments
WHERE status = 'COMPLETED'
  AND start_time >= CURRENT_DATE - INTERVAL '30 days'
  AND start_time <= CURRENT_DATE + INTERVAL '1 day';

-- Verificar distribución por estado de citas
SELECT
  'Distribución de citas por estado' as check_title,
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 1) as percentage
FROM appointments
WHERE start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY status
ORDER BY count DESC;

-- Verificar si hay negocios con citas
SELECT
  'Negocios con citas recientes' as check_title,
  b.name as business_name,
  COUNT(a.id) as appointments_count,
  COALESCE(SUM(a.total_price_cents), 0) as revenue_cents,
  ROUND(COALESCE(SUM(a.total_price_cents), 0) / 100.0, 2) as revenue
FROM businesses b
LEFT JOIN appointments a ON a.business_id = b.id
  AND a.status = 'COMPLETED'
  AND a.start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY b.id, b.name
HAVING COUNT(a.id) > 0
ORDER BY revenue DESC
LIMIT 5;