-- Script simple para crear datos de prueba básicos
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar si ya hay datos
SELECT 'SERVICIOS EXISTENTES' as check, COUNT(*) as count FROM services;
SELECT 'CITAS COMPLETADAS' as check, COUNT(*) as count FROM appointments WHERE status = 'COMPLETED';
SELECT 'APPOINTMENT_SERVICES' as check, COUNT(*) as count FROM appointment_services;

-- 2. Si no hay datos, crear algunos básicos
-- Obtener IDs de businesses existentes
DO $$
DECLARE
    business_record RECORD;
    service_id UUID;
    appointment_id UUID;
BEGIN
    -- Para cada business existente, crear algunos servicios y citas
    FOR business_record IN SELECT id, name FROM businesses LIMIT 3 LOOP
        RAISE NOTICE 'Procesando business: % (%)', business_record.name, business_record.id;

        -- Crear servicios si no existen
        INSERT INTO services (id, business_id, name, duration_minutes, price_cents, is_active, created_at, updated_at)
        VALUES
            (gen_random_uuid(), business_record.id, 'Corte de Cabello', 60, 50000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            (gen_random_uuid(), business_record.id, 'Manicura', 45, 35000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
            (gen_random_uuid(), business_record.id, 'Pedicura', 60, 45000, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT DO NOTHING;

        -- Crear citas completadas
        FOR i IN 1..5 LOOP
            INSERT INTO appointments (id, business_id, status, start_time, end_time, total_price_cents, created_at, updated_at)
            VALUES (
                gen_random_uuid(),
                business_record.id,
                'COMPLETED',
                CURRENT_TIMESTAMP - (i || ' days')::interval,
                CURRENT_TIMESTAMP - (i || ' days')::interval + interval '1 hour',
                85000,
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            RETURNING id INTO appointment_id;

            -- Crear appointment_services para esta cita
            FOR service_record IN SELECT id FROM services WHERE business_id = business_record.id LIMIT 2 LOOP
                INSERT INTO appointment_services (id, appointment_id, service_id, price_cents, start_time, end_time, created_at)
                VALUES (
                    gen_random_uuid(),
                    appointment_id,
                    service_record.id,
                    35000 + (random() * 20000)::int,
                    CURRENT_TIMESTAMP - (i || ' days')::interval,
                    CURRENT_TIMESTAMP - (i || ' days')::interval + interval '30 minutes',
                    CURRENT_TIMESTAMP
                );
            END LOOP;
        END LOOP;
    END LOOP;

    -- Marcar un business account como trial
    UPDATE business_accounts
    SET status = 'trial', trial_ends_at = CURRENT_TIMESTAMP + interval '14 days'
    WHERE id IN (SELECT business_account_id FROM businesses LIMIT 1);

    RAISE NOTICE '✅ Datos de prueba creados exitosamente';
END $$;

-- Verificar datos creados
SELECT 'SERVICIOS TOTALES' as metric, COUNT(*) as value FROM services;
SELECT 'CITAS COMPLETADAS' as metric, COUNT(*) as value FROM appointments WHERE status = 'COMPLETED';
SELECT 'APPOINTMENT_SERVICES' as metric, COUNT(*) as value FROM appointment_services;
SELECT 'BUSINESS ACCOUNTS EN TRIAL' as metric, COUNT(*) as value FROM business_accounts WHERE status = 'trial';