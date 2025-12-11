-- Verificar datos para el dashboard de company admin
-- Ejecutar en Supabase SQL Editor o psql

-- 1. Verificar servicios existentes
SELECT
  'SERVICIOS TOTALES' as metric,
  COUNT(*) as value
FROM services;

-- 2. Verificar citas completadas
SELECT
  'CITAS COMPLETADAS TOTALES' as metric,
  COUNT(*) as value
FROM appointments
WHERE status = 'COMPLETED';

-- 3. Verificar appointment_services
SELECT
  'APPOINTMENT_SERVICES TOTALES' as metric,
  COUNT(*) as value
FROM appointment_services;

-- 4. Verificar negocios con citas
SELECT
  'NEGOCIOS CON CITAS' as metric,
  COUNT(DISTINCT business_id) as value
FROM appointments
WHERE status = 'COMPLETED';

-- 5. Verificar business_accounts en trial
SELECT
  'BUSINESS ACCOUNTS EN TRIAL' as metric,
  COUNT(*) as value
FROM business_accounts
WHERE status = 'trial' AND trial_ends_at > CURRENT_TIMESTAMP;

-- 6. Servicios más populares (últimos 30 días)
SELECT
  s.name as service_name,
  COUNT(as2.*) as total_appointments,
  ROUND(SUM(as2.price_cents) / 100.0, 2) as total_revenue
FROM appointment_services as2
JOIN services s ON s.id = as2.service_id
JOIN appointments a ON a.id = as2.appointment_id
WHERE a.status = 'COMPLETED'
  AND a.start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.id, s.name
ORDER BY total_appointments DESC
LIMIT 10;

-- 7. Negocios con más ingresos (últimos 30 días)
SELECT
  b.name as business_name,
  ba.status as account_status,
  ba.trial_ends_at,
  COUNT(a.*) as total_appointments,
  ROUND(SUM(a.total_price_cents) / 100.0, 2) as total_revenue
FROM appointments a
JOIN businesses b ON b.id = a.business_id
JOIN business_accounts ba ON ba.id = b.business_account_id
WHERE a.status = 'COMPLETED'
  AND a.start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY b.id, b.name, ba.status, ba.trial_ends_at
ORDER BY total_revenue DESC
LIMIT 10;