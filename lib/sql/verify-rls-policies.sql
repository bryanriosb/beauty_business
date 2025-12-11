-- Script para verificar políticas RLS y datos

-- 1. Verificar que RLS está habilitado
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('business_accounts', 'business_account_members')
  AND schemaname = 'public';

-- 2. Ver políticas activas en business_accounts
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('business_accounts', 'business_account_members')
ORDER BY tablename, policyname;

-- 3. Verificar datos de business_account_members
-- (Cambiar el UUID por tu user_id actual)
SELECT
  bam.*,
  up.user_id,
  up.role as user_role
FROM business_account_members bam
JOIN users_profile up ON up.id = bam.user_profile_id
WHERE bam.status = 'active';

-- 4. Verificar qué cuentas debería ver un usuario específico
-- (Reemplaza 'TU_USER_ID' con el UUID real del usuario autenticado)
-- SELECT
--   ba.*,
--   bam.role as member_role,
--   up.role as user_role
-- FROM business_accounts ba
-- LEFT JOIN business_account_members bam ON ba.id = bam.business_account_id
-- LEFT JOIN users_profile up ON up.id = bam.user_profile_id AND up.user_id = 'TU_USER_ID'
-- WHERE bam.status = 'active' OR EXISTS (
--   SELECT 1 FROM users_profile WHERE user_id = 'TU_USER_ID' AND role = 'company_admin'
-- );

-- 5. Test manual de la política (simulando un usuario)
-- Descomentar y reemplazar con el user_id real
-- SET request.jwt.claims TO '{"sub": "TU_USER_ID"}';
-- SELECT * FROM business_accounts;
-- RESET request.jwt.claims;
