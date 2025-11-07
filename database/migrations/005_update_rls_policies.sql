-- Actualizar políticas RLS de business_accounts para incluir membresías

-- Eliminar políticas básicas
DROP POLICY IF EXISTS "Users can view their created business accounts" ON business_accounts;
DROP POLICY IF EXISTS "Creators can update business accounts" ON business_accounts;

-- Crear políticas completas con membresías
CREATE POLICY "Users can view their business accounts"
  ON business_accounts
  FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM business_account_members
      WHERE business_account_members.business_account_id = business_accounts.id
      AND business_account_members.user_profile_id IN (
        SELECT id FROM users_profile WHERE user_id = auth.uid()
      )
      AND business_account_members.status = 'active'
    )
  );

CREATE POLICY "Owners and admins can update business accounts"
  ON business_accounts
  FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM business_account_members
      WHERE business_account_members.business_account_id = business_accounts.id
      AND business_account_members.user_profile_id IN (
        SELECT id FROM users_profile WHERE user_id = auth.uid()
      )
      AND business_account_members.role IN ('owner', 'admin')
      AND business_account_members.status = 'active'
    )
  );

-- Comentarios
COMMENT ON POLICY "Users can view their business accounts" ON business_accounts IS 'Los usuarios pueden ver cuentas donde son miembros activos';
COMMENT ON POLICY "Owners and admins can update business accounts" ON business_accounts IS 'Solo owners y admins pueden actualizar la cuenta';
