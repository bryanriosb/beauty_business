-- Crear tabla business_account_members (relación muchos a muchos)
CREATE TABLE IF NOT EXISTS business_account_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    business_account_id UUID NOT NULL REFERENCES business_accounts (id) ON DELETE CASCADE,
    user_profile_id UUID NOT NULL REFERENCES users_profile (id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (
        status IN ('active', 'inactive')
    ),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE ('utc', NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE ('utc', NOW()) NOT NULL,
    UNIQUE (
        business_account_id,
        user_profile_id
    )
);

-- Índices para business_account_members
CREATE INDEX idx_business_account_members_account ON business_account_members (business_account_id);

CREATE INDEX idx_business_account_members_user ON business_account_members (user_profile_id);

CREATE INDEX idx_business_account_members_status ON business_account_members (status);

CREATE INDEX idx_business_account_members_role ON business_account_members (role);

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

-- RLS (Row Level Security) - DESHABILITADO TEMPORALMENTE
-- TODO: Habilitar y configurar correctamente cuando el sistema esté estable
-- ALTER TABLE business_account_members ENABLE ROW LEVEL SECURITY;

-- Asegurar que el constraint tiene los valores correctos
ALTER TABLE business_account_members
DROP CONSTRAINT IF EXISTS business_account_members_role_check;

ALTER TABLE business_account_members
ADD CONSTRAINT business_account_members_role_check CHECK (
    role IN ('owner', 'admin', 'member')
);

-- Comentarios
COMMENT ON TABLE business_account_members IS 'Relación muchos a muchos entre usuarios y cuentas de negocio';

COMMENT ON COLUMN business_account_members.role IS 'owner: propietario de la cuenta, admin: administrador de la cuenta, member: miembro de la cuenta';

COMMENT ON COLUMN business_account_members.status IS 'active: activo, inactive: inactivo';