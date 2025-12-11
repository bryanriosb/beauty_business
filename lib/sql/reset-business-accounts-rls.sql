-- =====================================================
-- RESET COMPLETO DE RLS PARA BUSINESS_ACCOUNTS
-- =====================================================
-- Este script hace una limpieza completa y reaplica las políticas

-- 1. DESHABILITAR RLS temporalmente
ALTER TABLE business_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE business_account_members DISABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR **TODAS** LAS POLÍTICAS EXISTENTES
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Eliminar todas las políticas de business_accounts
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'business_accounts' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON business_accounts', r.policyname);
    END LOOP;

    -- Eliminar todas las políticas de business_account_members
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'business_account_members' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON business_account_members', r.policyname);
    END LOOP;
END$$;

-- 3. VOLVER A HABILITAR RLS
ALTER TABLE business_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_account_members ENABLE ROW LEVEL SECURITY;

-- 4. CREAR POLÍTICAS NUEVAS PARA BUSINESS_ACCOUNTS
-- SELECT: Ver cuentas
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

-- 5. CREAR POLÍTICAS NUEVAS PARA BUSINESS_ACCOUNT_MEMBERS
-- SELECT: Ver miembros
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

-- 6. VERIFICACIÓN FINAL
SELECT 'business_accounts policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'business_accounts' ORDER BY cmd, policyname;

SELECT 'business_account_members policies:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'business_account_members' ORDER BY cmd, policyname;
