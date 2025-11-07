-- Agregar columna business_account_id a la tabla businesses
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS business_account_id UUID REFERENCES business_accounts(id) ON DELETE RESTRICT;

-- Índice para mejorar queries por cuenta
CREATE INDEX IF NOT EXISTS idx_businesses_account ON businesses(business_account_id);

-- Actualizar RLS para incluir verificación de cuenta
DROP POLICY IF EXISTS "Users can view businesses they have access to" ON businesses;

CREATE POLICY "Users can view businesses they have access to"
  ON businesses
  FOR SELECT
  USING (
    -- Company admins pueden ver todos los negocios
    EXISTS (
      SELECT 1 FROM users_profile
      WHERE users_profile.user_id = auth.uid()
      AND users_profile.role = 'company_admin'
    )
    OR
    -- Business admins pueden ver negocios de sus cuentas
    business_account_id IN (
      SELECT business_account_id FROM business_account_members
      WHERE user_profile_id IN (
        SELECT id FROM users_profile WHERE user_id = auth.uid()
      )
      AND status = 'active'
    )
  );

-- Política para insertar negocios (solo miembros activos de la cuenta)
DROP POLICY IF EXISTS "Members can create businesses in their accounts" ON businesses;

CREATE POLICY "Members can create businesses in their accounts"
  ON businesses
  FOR INSERT
  WITH CHECK (
    business_account_id IN (
      SELECT business_account_id FROM business_account_members
      WHERE user_profile_id IN (
        SELECT id FROM users_profile WHERE user_id = auth.uid()
      )
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Política para actualizar negocios
DROP POLICY IF EXISTS "Members can update businesses in their accounts" ON businesses;

CREATE POLICY "Members can update businesses in their accounts"
  ON businesses
  FOR UPDATE
  USING (
    business_account_id IN (
      SELECT business_account_id FROM business_account_members
      WHERE user_profile_id IN (
        SELECT id FROM users_profile WHERE user_id = auth.uid()
      )
      AND role IN ('owner', 'admin')
      AND status = 'active'
    )
  );

-- Comentarios
COMMENT ON COLUMN businesses.business_account_id IS 'Cuenta de negocio a la que pertenece este negocio/sucursal';
