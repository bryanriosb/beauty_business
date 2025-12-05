-- Migración: Agregar specialist_id y horarios a appointment_services
-- Ejecutar en Supabase Dashboard > SQL Editor

-- 1. Agregar columna specialist_id a appointment_services
ALTER TABLE appointment_services
ADD COLUMN IF NOT EXISTS specialist_id UUID REFERENCES specialists(id) ON DELETE SET NULL;

-- 2. Agregar columnas de horario para cada servicio individual
ALTER TABLE appointment_services
ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;

-- 3. Migrar datos existentes: asignar el specialist_id y horarios del appointment padre
UPDATE appointment_services AS as_table
SET
  specialist_id = COALESCE(as_table.specialist_id, a.specialist_id),
  start_time = COALESCE(as_table.start_time, a.start_time),
  end_time = COALESCE(as_table.end_time, a.end_time)
FROM appointments AS a
WHERE as_table.appointment_id = a.id;

-- 4. Crear índices para mejorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_appointment_services_specialist_id
ON appointment_services(specialist_id);

CREATE INDEX IF NOT EXISTS idx_appointment_services_appointment_specialist
ON appointment_services(appointment_id, specialist_id);

CREATE INDEX IF NOT EXISTS idx_appointment_services_start_time
ON appointment_services(start_time);

CREATE INDEX IF NOT EXISTS idx_appointment_services_specialist_time
ON appointment_services(specialist_id, start_time, end_time);
