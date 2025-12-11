-- =====================================================
-- Agregar columnas email y phone a la tabla businesses
-- =====================================================

-- Agregar columna email si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'businesses' AND column_name = 'email'
    ) THEN
        ALTER TABLE businesses ADD COLUMN email TEXT;
    END IF;
END $$;

-- Agregar columna phone si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'businesses' AND column_name = 'phone'
    ) THEN
        ALTER TABLE businesses ADD COLUMN phone TEXT;
    END IF;
END $$;

-- Verificar que las columnas se hayan agregado
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'businesses'
  AND column_name IN ('email', 'phone')
ORDER BY column_name;
