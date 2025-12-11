-- Ver TODAS las políticas de business_accounts
SELECT
  policyname,
  cmd,
  permissive,
  roles,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'business_accounts'
ORDER BY policyname;

-- Ver TODAS las políticas de business_account_members
SELECT
  policyname,
  cmd,
  permissive,
  roles,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'business_account_members'
ORDER BY policyname;

-- Verificar cuántas políticas SELECT hay en business_accounts
SELECT COUNT(*) as total_select_policies
FROM pg_policies
WHERE tablename = 'business_accounts'
  AND cmd = 'SELECT';
