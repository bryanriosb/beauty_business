-- Crear datos de prueba para dashboard company admin
-- Ejecutar en Supabase SQL Editor

-- 1. Crear servicios de prueba si no existen
INSERT INTO services (id, business_id, name, duration_minutes, price_cents, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  b.id,
  s.service_name,
  s.duration,
  s.price,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM businesses b
CROSS JOIN (
  VALUES
    ('Corte de Cabello', 60, 50000),
    ('Tinte Completo', 120, 150000),
    ('Manicura', 45, 35000),
    ('Pedicura', 60, 45000),
    ('Tratamiento Facial', 90, 80000),
    ('Depilación', 30, 25000)
) AS s(service_name, duration, price)
WHERE b.id IN (
  SELECT DISTINCT business_id
  FROM appointments
  LIMIT 2
)
ON CONFLICT DO NOTHING;

-- 2. Crear citas completadas de los últimos 30 días
INSERT INTO appointments (id, business_id, status, start_time, end_time, total_price_cents, created_at, updated_at)
SELECT
  gen_random_uuid(),
  b.id,
  'COMPLETED',
  CURRENT_TIMESTAMP - (random() * interval '30 days'),
  CURRENT_TIMESTAMP - (random() * interval '30 days') + interval '1 hour',
  (random() * 100000 + 20000)::int,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM businesses b
CROSS JOIN generate_series(1, 20) AS gs(i)
WHERE b.id IN (
  SELECT DISTINCT business_id
  FROM appointments
  LIMIT 2
)
ON CONFLICT DO NOTHING;

-- 3. Crear appointment_services para relacionar citas con servicios
INSERT INTO appointment_services (id, appointment_id, service_id, price_cents, start_time, end_time, created_at)
SELECT
  gen_random_uuid(),
  a.id,
  s.id,
  s.price_cents,
  a.start_time,
  a.end_time,
  CURRENT_TIMESTAMP
FROM appointments a
CROSS JOIN services s
WHERE a.business_id = s.business_id
  AND a.status = 'COMPLETED'
  AND random() < 0.7 -- Solo algunos servicios por cita
ON CONFLICT DO NOTHING;

-- 4. Actualizar total_price_cents de appointments basado en appointment_services
UPDATE appointments
SET total_price_cents = (
  SELECT COALESCE(SUM(price_cents), 0)
  FROM appointment_services
  WHERE appointment_id = appointments.id
)
WHERE status = 'COMPLETED';

-- 5. Marcar algunos business_accounts como trial
UPDATE business_accounts
SET
  status = 'trial',
  trial_ends_at = CURRENT_TIMESTAMP + interval '14 days'
WHERE id IN (
  SELECT DISTINCT business_account_id
  FROM businesses
  LIMIT 1
);

-- Verificar datos creados
SELECT
  'SERVICIOS CREADOS' as status,
  COUNT(*) as total
FROM services;

SELECT
  'CITAS COMPLETADAS' as status,
  COUNT(*) as total
FROM appointments
WHERE status = 'COMPLETED';

SELECT
  'APPOINTMENT_SERVICES CREADOS' as status,
  COUNT(*) as total
FROM appointment_services;

SELECT
  'BUSINESS ACCOUNTS EN TRIAL' as status,
  COUNT(*) as total
FROM business_accounts
WHERE status = 'trial' AND trial_ends_at > CURRENT_TIMESTAMP;