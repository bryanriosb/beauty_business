-- Función para obtener las cuentas de un usuario
CREATE OR REPLACE FUNCTION get_user_business_accounts(user_uuid UUID)
RETURNS TABLE (
  account_id UUID,
  company_name VARCHAR,
  member_role VARCHAR,
  member_status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ba.id AS account_id,
    ba.company_name,
    bam.role AS member_role,
    bam.status AS member_status
  FROM business_accounts ba
  INNER JOIN business_account_members bam ON ba.id = bam.business_account_id
  INNER JOIN users_profile up ON bam.user_profile_id = up.id
  WHERE up.user_id = user_uuid
  AND bam.status = 'active'
  ORDER BY bam.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un usuario es admin de una cuenta
CREATE OR REPLACE FUNCTION is_account_admin(user_uuid UUID, account_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM business_account_members bam
    INNER JOIN users_profile up ON bam.user_profile_id = up.id
    WHERE up.user_id = user_uuid
    AND bam.business_account_id = account_uuid
    AND bam.role IN ('owner', 'admin')
    AND bam.status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para contar negocios de una cuenta
CREATE OR REPLACE FUNCTION count_account_businesses(account_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  business_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO business_count
  FROM businesses
  WHERE business_account_id = account_uuid;

  RETURN business_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar límites del plan
CREATE OR REPLACE FUNCTION can_create_business_in_account(account_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_count INTEGER;
  plan VARCHAR;
  max_businesses INTEGER;
BEGIN
  SELECT subscription_plan INTO plan
  FROM business_accounts
  WHERE id = account_uuid;

  SELECT count_account_businesses(account_uuid) INTO current_count;

  max_businesses := CASE plan
    WHEN 'free' THEN 1
    WHEN 'basic' THEN 3
    WHEN 'pro' THEN 10
    WHEN 'enterprise' THEN F5F5F5
    ELSE 0
  END;

  RETURN current_count < max_businesses;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener los negocios asociados a una cuenta
CREATE OR REPLACE FUNCTION get_account_businesses(account_uuid UUID)
RETURNS TABLE (
  business_id UUID,
  business_name VARCHAR,
  business_account_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS business_id,
    b.name AS business_name,
    b.business_account_id
  FROM businesses b
  WHERE b.business_account_id = account_uuid
  ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION get_user_business_accounts IS 'Obtiene todas las cuentas de negocio a las que pertenece un usuario';

COMMENT ON FUNCTION is_account_admin IS 'Verifica si un usuario es admin u owner de una cuenta';

COMMENT ON FUNCTION count_account_businesses IS 'Cuenta el número de negocios asociados a una cuenta';

COMMENT ON FUNCTION can_create_business_in_account IS 'Verifica si se pueden crear más negocios según el plan de suscripción';

COMMENT ON FUNCTION get_account_businesses IS 'Obtiene todos los negocios asociados a una cuenta de negocio';