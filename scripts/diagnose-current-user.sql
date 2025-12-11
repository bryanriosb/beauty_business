-- Script para diagnosticar el problema del usuario actual

-- 1. Verificar el usuario autenticado actual
SELECT
  auth.uid() as current_auth_uid,
  auth.jwt() as current_jwt;

-- 2. Verificar el users_profile del usuario actual
SELECT
  id,
  user_id,
  role,
  email,
  full_name
FROM users_profile
WHERE user_id = auth.uid();

-- 3. Verificar las membresías del usuario actual
SELECT
  bam.id,
  bam.business_account_id,
  bam.role as member_role,
  bam.status,
  ba.company_name,
  up.role as user_system_role
FROM business_account_members bam
JOIN users_profile up ON up.id = bam.user_profile_id
JOIN business_accounts ba ON ba.id = bam.business_account_id
WHERE up.user_id = auth.uid();

-- 4. Probar la política manualmente - Ver si cumple condición de company_admin
SELECT
  'Es company_admin?' as pregunta,
  EXISTS (
    SELECT 1
    FROM users_profile
    WHERE users_profile.user_id = auth.uid()
      AND users_profile.role = 'company_admin'
  ) as resultado;

-- 5. Probar la política manualmente - Ver si cumple condición de miembro activo
SELECT
  ba.id,
  ba.company_name,
  'Es miembro activo?' as pregunta,
  EXISTS (
    SELECT 1
    FROM business_account_members bam
    JOIN users_profile up ON up.id = bam.user_profile_id
    WHERE up.user_id = auth.uid()
      AND bam.business_account_id = ba.id
      AND bam.status = 'active'
  ) as es_miembro
FROM business_accounts ba;

-- 6. Query final - lo que debería devolver la consulta normal
SELECT * FROM business_accounts;

-- 7. Contar cuántas cuentas ve el usuario
SELECT COUNT(*) as total_cuentas_visibles FROM business_accounts;
