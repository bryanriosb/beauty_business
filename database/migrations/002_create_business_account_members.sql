-- Crear tabla business_account_members (relación muchos a muchos)
CREATE TABLE IF NOT EXISTS business_account_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_account_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
  user_profile_id UUID NOT NULL REFERENCES users_profile(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  UNIQUE(business_account_id, user_profile_id)
);

-- Índices para business_account_members
CREATE INDEX idx_business_account_members_account ON business_account_members(business_account_id);
CREATE INDEX idx_business_account_members_user ON business_account_members(user_profile_id);
CREATE INDEX idx_business_account_members_status ON business_account_members(status);
CREATE INDEX idx_business_account_members_role ON business_account_members(role);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_business_account_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_business_account_members_updated_at
  BEFORE UPDATE ON business_account_members
  FOR EACH ROW
  EXECUTE FUNCTION update_business_account_members_updated_at();

-- RLS (Row Level Security)
ALTER TABLE business_account_members ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Los usuarios pueden ver sus propias membresías
CREATE POLICY "Users can view their own memberships"
  ON business_account_members
  FOR SELECT
  USING (
    user_profile_id IN (
      SELECT id FROM users_profile WHERE user_id = auth.uid()
    )
  );

-- Políticas RLS: Owners y admins pueden ver todos los miembros de su cuenta
CREATE POLICY "Owners and admins can view all members"
  ON business_account_members
  FOR SELECT
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

-- Políticas RLS: Owners y admins pueden crear membresías
CREATE POLICY "Owners and admins can create memberships"
  ON business_account_members
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

-- Políticas RLS: Owners y admins pueden actualizar membresías
CREATE POLICY "Owners and admins can update memberships"
  ON business_account_members
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

-- Políticas RLS: Solo owners pueden eliminar membresías
CREATE POLICY "Only owners can delete memberships"
  ON business_account_members
  FOR DELETE
  USING (
    business_account_id IN (
      SELECT business_account_id FROM business_account_members
      WHERE user_profile_id IN (
        SELECT id FROM users_profile WHERE user_id = auth.uid()
      )
      AND role = 'owner'
      AND status = 'active'
    )
  );

-- Comentarios
COMMENT ON TABLE business_account_members IS 'Relación muchos a muchos entre usuarios y cuentas de negocio';
COMMENT ON COLUMN business_account_members.role IS 'owner: propietario, admin: administrador, member: miembro';
COMMENT ON COLUMN business_account_members.status IS 'active: activo, inactive: inactivo, pending: invitación pendiente';
