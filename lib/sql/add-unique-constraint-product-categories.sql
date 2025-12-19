-- Migration: Añadir constraint único al campo name de product_categories
-- Este script asegura que no puedan existir categorías de productos con nombres duplicados

-- Primero, verificar si ya existen datos duplicados
SELECT 
    name,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as duplicate_ids
FROM product_categories 
GROUP BY name 
HAVING COUNT(*) > 1;

-- Eliminar duplicados, manteniendo el registro más antiguo (menor ID)
WITH duplicates AS (
    SELECT 
        id,
        name,
        ROW_NUMBER() OVER (PARTITION BY name ORDER BY created_at ASC, id ASC) as rn
    FROM product_categories
)
DELETE FROM product_categories 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Ahora añadir el constraint UNIQUE al campo name
ALTER TABLE product_categories 
ADD CONSTRAINT product_categories_name_unique 
UNIQUE (name);

-- Verificar que el constraint se haya añadido correctamente
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'product_categories' 
    AND tc.constraint_type = 'UNIQUE'
    AND kcu.column_name = 'name';