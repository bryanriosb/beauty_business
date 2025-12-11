-- Crear datos de prueba para company dashboard
-- Insertar citas completadas para diferentes negocios

-- Primero, obtener algunos business_ids existentes
SELECT id, name FROM businesses LIMIT 3;

-- Insertar citas de prueba (descomenta y modifica los IDs según sea necesario)
-- INSERT INTO appointments (
--   business_id,
--   status,
--   start_time,
--   end_time,
--   total_price_cents,
--   created_at
-- ) VALUES
-- ('business-id-1', 'COMPLETED', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '4 days', 50000, CURRENT_TIMESTAMP),
-- ('business-id-2', 'COMPLETED', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '2 days', 75000, CURRENT_TIMESTAMP),
-- ('business-id-1', 'COMPLETED', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP, 60000, CURRENT_TIMESTAMP);

-- Verificar que se crearon las citas
SELECT
  'CITAS DE PRUEBA CREADAS' as status,
  COUNT(*) as total_citas_prueba,
  COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as citas_completadas,
  ROUND(SUM(total_price_cents) / 100.0, 2) as ingresos_totales
FROM appointments
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '1 hour';