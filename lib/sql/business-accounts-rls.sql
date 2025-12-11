-- =====================================================
-- RLS POLICIES FOR BUSINESS_ACCOUNTS
-- =====================================================
-- Habilitar RLS en business_accounts
ALTER TABLE business_accounts ENABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las políticas existentes (incluyendo las viejas)
DROP POLICY IF EXISTS "Enable read access for all users" ON business_accounts;
DROP POLICY IF EXISTS "business_accounts_select" ON business_accounts;
DROP POLICY IF EXISTS "business_accounts_insert" ON business_accounts;
DROP POLICY IF EXISTS "business_accounts_update" ON business_accounts;
DROP POLICY IF EXISTS "business_accounts_delete" ON business_accounts;

-- SELECT: Ver cuentas
-- company_admin: ve todas las cuentas
-- business_admin y otros: solo ven las cuentas donde son miembros activos
CREATE POLICY "business_accounts_select" ON business_accounts
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- company_admin puede ver todas las cuentas
      EXISTS (
        SELECT 1
        FROM users_profile
        WHERE users_profile.user_id = auth.uid()
          AND users_profile.role = 'company_admin'
      )
      OR
      -- business_admin y otros solo ven cuentas donde son miembros activos
      EXISTS (
        SELECT 1
        FROM business_account_members bam
        JOIN users_profile up ON up.id = bam.user_profile_id
        WHERE up.user_id = auth.uid()
          AND bam.business_account_id = business_accounts.id
          AND bam.status = 'active'
      )
    )
  );

-- INSERT: Crear cuentas
-- company_admin: puede crear cualquier cuenta
-- otros usuarios: pueden crear cuentas donde ellos son el creador
CREATE POLICY "business_accounts_insert" ON business_accounts
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM users_profile
        WHERE users_profile.user_id = auth.uid()
          AND users_profile.role = 'company_admin'
      )
      OR
      created_by = auth.uid()
    )
  );

-- UPDATE: Actualizar cuentas
-- company_admin: puede actualizar todas las cuentas
-- owner/admin: pueden actualizar sus cuentas
CREATE POLICY "business_accounts_update" ON business_accounts
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM users_profile
        WHERE users_profile.user_id = auth.uid()
          AND users_profile.role = 'company_admin'
      )
      OR
      EXISTS (
        SELECT 1
        FROM business_account_members bam
        JOIN users_profile up ON up.id = bam.user_profile_id
        WHERE up.user_id = auth.uid()
          AND bam.business_account_id = business_accounts.id
          AND bam.role IN ('owner', 'admin')
          AND bam.status = 'active'
      )
    )
  );

-- DELETE: Eliminar cuentas
-- SOLO company_admin puede eliminar cuentas
CREATE POLICY "business_accounts_delete" ON business_accounts
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM users_profile
      WHERE users_profile.user_id = auth.uid()
        AND users_profile.role = 'company_admin'
    )
  );

-- =====================================================
-- RLS POLICIES FOR BUSINESS_ACCOUNT_MEMBERS
-- =====================================================
-- Habilitar RLS en business_account_members
ALTER TABLE business_account_members ENABLE ROW LEVEL SECURITY;

-- Eliminar TODAS las políticas existentes (incluyendo las viejas)
DROP POLICY IF EXISTS "Users can view their own memberships" ON business_account_members;
DROP POLICY IF EXISTS "Owners and admins can view all members" ON business_account_members;
DROP POLICY IF EXISTS "Owners and admins can create memberships" ON business_account_members;
DROP POLICY IF EXISTS "Owners and admins can update memberships" ON business_account_members;
DROP POLICY IF EXISTS "Only owners can delete memberships" ON business_account_members;
DROP POLICY IF EXISTS "business_account_members_select" ON business_account_members;
DROP POLICY IF EXISTS "business_account_members_insert" ON business_account_members;
DROP POLICY IF EXISTS "business_account_members_update" ON business_account_members;
DROP POLICY IF EXISTS "business_account_members_delete" ON business_account_members;

-- SELECT: Ver miembros
-- company_admin: ve todos los miembros
-- otros: solo ven miembros de cuentas donde ellos son miembros activos
CREATE POLICY "business_account_members_select" ON business_account_members
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM users_profile
        WHERE users_profile.user_id = auth.uid()
          AND users_profile.role = 'company_admin'
      )
      OR
      EXISTS (
        SELECT 1
        FROM business_account_members bam
        JOIN users_profile up ON up.id = bam.user_profile_id
        WHERE up.user_id = auth.uid()
          AND bam.business_account_id = business_account_members.business_account_id
          AND bam.status = 'active'
      )
    )
  );

-- INSERT: Agregar miembros
-- company_admin: puede agregar miembros a cualquier cuenta
-- owner/admin: pueden agregar miembros a sus cuentas
CREATE POLICY "business_account_members_insert" ON business_account_members
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM users_profile
        WHERE users_profile.user_id = auth.uid()
          AND users_profile.role = 'company_admin'
      )
      OR
      EXISTS (
        SELECT 1
        FROM business_account_members bam
        JOIN users_profile up ON up.id = bam.user_profile_id
        WHERE up.user_id = auth.uid()
          AND bam.business_account_id = business_account_members.business_account_id
          AND bam.role IN ('owner', 'admin')
          AND bam.status = 'active'
      )
    )
  );

-- UPDATE: Actualizar miembros
-- company_admin: puede actualizar cualquier miembro
-- owner/admin: pueden actualizar miembros de sus cuentas
CREATE POLICY "business_account_members_update" ON business_account_members
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM users_profile
        WHERE users_profile.user_id = auth.uid()
          AND users_profile.role = 'company_admin'
      )
      OR
      EXISTS (
        SELECT 1
        FROM business_account_members bam
        JOIN users_profile up ON up.id = bam.user_profile_id
        WHERE up.user_id = auth.uid()
          AND bam.business_account_id = business_account_members.business_account_id
          AND bam.role IN ('owner', 'admin')
          AND bam.status = 'active'
      )
    )
  );

-- DELETE: Eliminar miembros
-- company_admin: puede eliminar cualquier miembro
-- owner/admin: pueden eliminar miembros de sus cuentas
CREATE POLICY "business_account_members_delete" ON business_account_members
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM users_profile
        WHERE users_profile.user_id = auth.uid()
          AND users_profile.role = 'company_admin'
      )
      OR
      EXISTS (
        SELECT 1
        FROM business_account_members bam
        JOIN users_profile up ON up.id = bam.user_profile_id
        WHERE up.user_id = auth.uid()
          AND bam.business_account_id = business_account_members.business_account_id
          AND bam.role IN ('owner', 'admin')
          AND bam.status = 'active'
      )
    )
  );