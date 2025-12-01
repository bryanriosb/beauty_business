-- Agregar 'ai_agent' como valor válido para el campo source en business_customers
-- Ejecutar en Supabase SQL Editor

-- 1. Eliminar el constraint existente
ALTER TABLE business_customers
DROP CONSTRAINT IF EXISTS business_customers_source_check;

-- 2. Crear el nuevo constraint con ai_agent incluido
ALTER TABLE business_customers
ADD CONSTRAINT business_customers_source_check
CHECK (source IN ('walk_in', 'referral', 'social_media', 'website', 'ai_agent', 'other'));
