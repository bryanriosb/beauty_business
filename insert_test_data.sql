-- Insertar datos de prueba básicos para testing del dashboard
-- Ejecutar directamente en Supabase SQL Editor

-- 1. Crear servicios básicos si no existen
INSERT INTO services (id, business_id, name, duration_minutes, price_cents, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  b.id,
  s.name,
  s.duration,
  s.price,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM businesses b
CROSS JOIN (
  VALUES
    ('Corte de Cabello', 60, 50000),
    ('Manicura', 45, 35000),
    ('Pedicura', 60, 45000),
    ('Tinte', 120, 80000)
) AS s(name, duration, price)
ON CONFLICT DO NOTHING;

-- 2. Crear citas completadas recientes
INSERT INTO appointments (id, business_id, status, start_time, end_time, total_price_cents, created_at, updated_at)
SELECT
  gen_random_uuid(),
  b.id,
  'COMPLETED',
  CURRENT_TIMESTAMP - (random() * interval '30 days'),
  CURRENT_TIMESTAMP - (random() * interval '30 days') + interval '1 hour',
  (random() * 50000 + 30000)::int,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM businesses b
CROSS JOIN generate_series(1, 10) AS gs(i)
ON CONFLICT DO NOTHING;

-- 3. Crear appointment_services
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
  AND random() < 0.8
ON CONFLICT DO NOTHING;

-- 4. Actualizar total_price_cents basado en appointment_services
UPDATE appointments
SET total_price_cents = COALESCE((
  SELECT SUM(price_cents)
  FROM appointment_services
  WHERE appointment_id = appointments.id
), total_price_cents)
WHERE status = 'COMPLETED';

-- 5. Marcar algunos business accounts como trial
UPDATE business_accounts
SET
  status = 'trial',
  trial_ends_at = CURRENT_TIMESTAMP + interval '14 days'
WHERE id IN (
  SELECT DISTINCT business_account_id
  FROM businesses
  LIMIT 2
);

-- Verificar datos
SELECT '✅ SERVICIOS' as status, COUNT(*) as count FROM services;
SELECT '✅ CITAS COMPLETADAS' as status, COUNT(*) as count FROM appointments WHERE status = 'COMPLETED';
SELECT '✅ APPOINTMENT_SERVICES' as status, COUNT(*) as count FROM appointment_services;
SELECT '✅ BUSINESS ACCOUNTS EN TRIAL' as status, COUNT(*) as count FROM business_accounts WHERE status = 'trial';