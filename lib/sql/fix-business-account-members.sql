-- Script para crear registros en business_account_members
-- para cuentas existentes que no tienen miembros

-- 1. Ver cuentas que NO tienen miembros
SELECT
  ba.id,
  ba.company_name,
  ba.created_by,
  ba.created_at
FROM business_accounts ba
LEFT JOIN business_account_members bam ON ba.id = bam.business_account_id
WHERE bam.id IS NULL;

-- 2. Insertar miembros para cuentas sin miembros
-- Esto vincula al creador de la cuenta como 'owner'
INSERT INTO business_account_members (
  business_account_id,
  user_profile_id,
  role,
  status
)
SELECT
  ba.id as business_account_id,
  up.id as user_profile_id,
  'owner' as role,
  'active' as status
FROM business_accounts ba
CROSS JOIN users_profile up
WHERE ba.created_by = up.user_id
  AND NOT EXISTS (
    SELECT 1
    FROM business_account_members bam
    WHERE bam.business_account_id = ba.id
      AND bam.user_profile_id = up.id
  );

-- 3. Verificar que se crearon correctamente
SELECT
  ba.id,
  ba.company_name,
  bam.role,
  up.user_id,
  up.role as user_role
FROM business_accounts ba
JOIN business_account_members bam ON ba.id = bam.business_account_id
JOIN users_profile up ON up.id = bam.user_profile_id
ORDER BY ba.created_at DESC;
