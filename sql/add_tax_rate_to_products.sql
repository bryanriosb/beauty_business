-- Add tax_rate column to products table
-- This allows products (supplies and retail items) to have their own tax rate for invoicing

ALTER TABLE products
ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN products.tax_rate IS 'Tax rate percentage (e.g., 19 for 19% IVA). NULL means no tax.';
