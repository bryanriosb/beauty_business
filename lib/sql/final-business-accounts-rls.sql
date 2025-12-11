-- =====================================================
-- POLÍTICAS RLS FUNCIONALES PARA BUSINESS_ACCOUNTS
-- =====================================================
-- Estas políticas permiten que:
-- 1. company_admin vea TODAS las cuentas
-- 2. business_admin vea SOLO las cuentas donde es miembro activo

-- Habilitar RLS
ALTER TABLE business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_account_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- BUSINESS_ACCOUNTS POLICIES
-- =====================================================

-- SELECT: Ver cuentas
CREATE POLICY "Enable read access for authenticated users" ON business_accounts
  FOR SELECT
  USING (
    -- company_admin puede ver todo
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() AND role = 'company_admin'
    )
    OR
    -- business_admin/otros solo ven sus cuentas
    id IN (
      SELECT business_account_id
      FROM business_account_members
      WHERE user_profile_id = (
        SELECT id FROM users_profile WHERE user_id = auth.uid()
      )
      AND status = 'active'
    )
  );

-- INSERT: Crear cuentas (solo company_admin y el creador)
CREATE POLICY "Enable insert for authenticated users" ON business_accounts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() AND role = 'company_admin'
    )
    OR created_by = auth.uid()
  );

-- UPDATE: Actualizar cuentas (company_admin y admin/owner de la cuenta)
CREATE POLICY "Enable update for account admins" ON business_accounts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() AND role = 'company_admin'
    )
    OR
    id IN (
      SELECT business_account_id
      FROM business_account_members
      WHERE user_profile_id = (
        SELECT id FROM users_profile WHERE user_id = auth.uid()
      )
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- DELETE: Eliminar cuentas (SOLO company_admin)
CREATE POLICY "Enable delete for company admins only" ON business_accounts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() AND role = 'company_admin'
    )
  );

-- =====================================================
-- BUSINESS_ACCOUNT_MEMBERS POLICIES
-- =====================================================

-- SELECT: Ver miembros
CREATE POLICY "Enable read access for account members" ON business_account_members
  FOR SELECT
  USING (
    -- company_admin puede ver todo
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() AND role = 'company_admin'
    )
    OR
    -- Solo miembros de esa cuenta pueden ver los miembros
    business_account_id IN (
      SELECT business_account_id
      FROM business_account_members
      WHERE user_profile_id = (
        SELECT id FROM users_profile WHERE user_id = auth.uid()
      )
      AND status = 'active'
    )
  );

-- INSERT: Agregar miembros (company_admin y admin/owner)
CREATE POLICY "Enable insert for account admins" ON business_account_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() AND role = 'company_admin'
    )
    OR
    business_account_id IN (
      SELECT business_account_id
      FROM business_account_members
      WHERE user_profile_id = (
        SELECT id FROM users_profile WHERE user_id = auth.uid()
      )
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- UPDATE: Actualizar miembros (company_admin y admin/owner)
CREATE POLICY "Enable update for account admins" ON business_account_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() AND role = 'company_admin'
    )
    OR
    business_account_id IN (
      SELECT business_account_id
      FROM business_account_members
      WHERE user_profile_id = (
        SELECT id FROM users_profile WHERE user_id = auth.uid()
      )
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- DELETE: Eliminar miembros (company_admin y admin/owner)
CREATE POLICY "Enable delete for account admins" ON business_account_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE user_id = auth.uid() AND role = 'company_admin'
    )
    OR
    business_account_id IN (
      SELECT business_account_id
      FROM business_account_members
      WHERE user_profile_id = (
        SELECT id FROM users_profile WHERE user_id = auth.uid()
      )
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Verificación
SELECT 'RLS Habilitado:' as info;
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename IN ('business_accounts', 'business_account_members')
AND schemaname = 'public';

SELECT '' as separator;
SELECT 'Políticas creadas:' as info;
SELECT tablename, policyname, cmd FROM pg_policies
WHERE tablename IN ('business_accounts', 'business_account_members')
ORDER BY tablename, cmd;
