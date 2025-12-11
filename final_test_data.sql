-- Script FINAL para crear datos de prueba completos
-- Ejecutar en Supabase SQL Editor

DO $$
DECLARE
    business_record RECORD;
    service_record RECORD;
    appointment_record RECORD;
BEGIN
    RAISE NOTICE '🚀 Iniciando creación de datos de prueba...';

    -- Para cada business existente
    FOR business_record IN SELECT id, name FROM businesses LIMIT 5 LOOP
        RAISE NOTICE 'Procesando business: %', business_record.name;

        -- Crear servicios si no existen
        INSERT INTO services (id, business_id, name, duration_minutes, price_cents, is_active, created_at, updated_at)
        VALUES
            (gen_random_uuid(), business_record.id, 'Corte de Cabello', 60, 50000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            (gen_random_uuid(), business_record.id, 'Manicura', 45, 35000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            (gen_random_uuid(), business_record.id, 'Pedicura', 60, 45000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            (gen_random_uuid(), business_record.id, 'Tinte Completo', 120, 150000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            (gen_random_uuid(), business_record.id, 'Tratamiento Facial', 90, 80000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING;

        -- Crear citas completadas en diferentes fechas
        FOR i IN 0..20 LOOP
            INSERT INTO appointments (id, business_id, status, start_time, end_time, total_price_cents, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                business_record.id,
                'COMPLETED',
                CURRENT_TIMESTAMP - (i || ' days')::interval,
                CURRENT_TIMESTAMP - (i || ' days')::interval + interval '1 hour',
                (random() * 100000 + 20000)::int,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );
        END LOOP;
    END LOOP;

    -- Crear appointment_services para relacionar citas con servicios
    FOR appointment_record IN SELECT id, business_id FROM appointments WHERE status = 'COMPLETED' LIMIT 100 LOOP
        FOR service_record IN SELECT id FROM services WHERE business_id = appointment_record.business_id ORDER BY random() LIMIT 2 LOOP
            INSERT INTO appointment_services (id, appointment_id, service_id, price_cents, start_time, end_time, created_at)
            SELECT
                gen_random_uuid(),
                appointment_record.id,
                service_record.id,
                s.price_cents,
                a.start_time,
                a.end_time,
                CURRENT_TIMESTAMP
            FROM services s, appointments a
            WHERE s.id = service_record.id AND a.id = appointment_record.id
            ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;

    -- Actualizar total_price_cents de appointments
    UPDATE appointments
    SET total_price_cents = (
        SELECT COALESCE(SUM(price_cents), 0)
        FROM appointment_services
        WHERE appointment_id = appointments.id
    )
    WHERE status = 'COMPLETED' AND total_price_cents = 0;

    -- Marcar algunos business accounts como trial
    UPDATE business_accounts
    SET status = 'trial', trial_ends_at = CURRENT_TIMESTAMP + interval '30 days'
    WHERE id IN (
        SELECT DISTINCT business_account_id FROM businesses LIMIT 3
    );

    RAISE NOTICE '✅ Datos de prueba creados exitosamente!';
END $$;

-- Verificar resultados
SELECT '📊 SERVICIOS TOTALES' as metric, COUNT(*) as count FROM services;
SELECT '📅 CITAS COMPLETADAS' as metric, COUNT(*) as count FROM appointments WHERE status = 'COMPLETED';
SELECT '🔗 APPOINTMENT_SERVICES' as metric, COUNT(*) as count FROM appointment_services;
SELECT '🎯 BUSINESS ACCOUNTS EN TRIAL' as metric, COUNT(*) as count FROM business_accounts WHERE status = 'trial';

-- Mostrar algunos datos de ejemplo
SELECT
    'Servicios más populares (últimos 30 días)' as info,
    s.name as service,
    COUNT(as2.*) as appointments,
    ROUND(SUM(as2.price_cents) / 100.0, 2) as revenue
FROM appointment_services as2
JOIN services s ON s.id = as2.service_id
JOIN appointments a ON a.id = as2.appointment_id
WHERE a.status = 'COMPLETED' AND a.start_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.id, s.name
ORDER BY appointments DESC
LIMIT 5;