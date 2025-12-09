-- Plans Migration V2
-- Ajusta la estructura para separar correctamente módulos de features
-- Los módulos controlan acceso a secciones del sistema
-- Los features solo contienen límites y configuraciones adicionales

-- =====================================================
-- 1. ACTUALIZAR ESTRUCTURA DE FEATURES EN PLANS
-- =====================================================

-- Actualizar el default de features para solo incluir límites y configuraciones
ALTER TABLE plans
ALTER COLUMN features SET DEFAULT '{
  "max_appointments_per_month": null,
  "max_products": null,
  "max_services": null,
  "max_customers": null,
  "max_storage_mb": null,
  "has_custom_branding": false,
  "has_priority_support": false,
  "has_api_access": false
}'::jsonb;

-- Migrar planes existentes: limpiar features y dejar solo límites
UPDATE plans SET features = jsonb_build_object(
  'max_appointments_per_month', features->'max_appointments_per_month',
  'max_products', features->'max_products',
  'max_services', features->'max_services',
  'max_customers', COALESCE(features->'max_customers', 'null'::jsonb),
  'max_storage_mb', COALESCE(features->'max_storage_mb', 'null'::jsonb),
  'has_custom_branding', COALESCE(features->'has_custom_branding', 'false'::jsonb),
  'has_priority_support', COALESCE(features->'has_priority_support', 'false'::jsonb),
  'has_api_access', COALESCE(features->'has_api_access', 'false'::jsonb)
);

-- =====================================================
-- 2. ASEGURAR QUE EXISTEN TODOS LOS MÓDULOS
-- =====================================================

-- Insertar módulos si no existen
INSERT INTO plan_modules (code, name, description, icon_key, is_active) VALUES
  ('dashboard', 'Tablero', 'Panel principal con métricas y resumen', 'LayoutDashboard', true),
  ('appointments', 'Citas', 'Gestión de citas y agenda', 'Calendar', true),
  ('services', 'Servicios', 'Catálogo de servicios ofrecidos', 'Scissors', true),
  ('products', 'Productos', 'Gestión de productos para venta', 'Package', true),
  ('inventory', 'Inventario', 'Control de inventario y stock', 'Warehouse', true),
  ('specialists', 'Especialistas', 'Gestión del equipo de trabajo', 'UserCircle', true),
  ('customers', 'Clientes', 'Base de datos de clientes', 'Users', true),
  ('medical_records', 'Historias Clínicas', 'Registros médicos de pacientes', 'ClipboardList', true),
  ('commissions', 'Comisiones', 'Sistema de comisiones para especialistas', 'Percent', true),
  ('reports', 'Reportes', 'Informes y analíticas del negocio', 'BarChart3', true),
  ('invoices', 'Facturas', 'Sistema de facturación', 'FileStack', true),
  ('ai_assistant', 'Asistente IA', 'Asistente con inteligencia artificial', 'Bot', true),
  ('whatsapp', 'WhatsApp', 'Integración con WhatsApp Business', 'MessageSquare', true),
  ('settings', 'Configuración', 'Configuración general del negocio', 'Settings', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_key = EXCLUDED.icon_key;

-- =====================================================
-- 3. CREAR FUNCIÓN PARA ASIGNAR MÓDULOS A UN PLAN
-- =====================================================

CREATE OR REPLACE FUNCTION assign_modules_to_plan(
  p_plan_id UUID,
  p_module_codes TEXT[],
  p_can_read BOOLEAN DEFAULT true,
  p_can_write BOOLEAN DEFAULT true,
  p_can_delete BOOLEAN DEFAULT true
) RETURNS void AS $$
DECLARE
  v_module_id UUID;
  v_code TEXT;
BEGIN
  FOREACH v_code IN ARRAY p_module_codes
  LOOP
    SELECT id INTO v_module_id FROM plan_modules WHERE code = v_code;

    IF v_module_id IS NOT NULL THEN
      INSERT INTO plan_module_access (plan_id, module_id, can_read, can_write, can_delete)
      VALUES (p_plan_id, v_module_id, p_can_read, p_can_write, p_can_delete)
      ON CONFLICT (plan_id, module_id) DO UPDATE SET
        can_read = EXCLUDED.can_read,
        can_write = EXCLUDED.can_write,
        can_delete = EXCLUDED.can_delete;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 4. CONFIGURAR MÓDULOS PARA PLANES POR DEFECTO
-- =====================================================

-- Plan FREE: Módulos básicos con límites
DO $$
DECLARE
  v_plan_id UUID;
BEGIN
  SELECT id INTO v_plan_id FROM plans WHERE code = 'free';

  IF v_plan_id IS NOT NULL THEN
    -- Limpiar accesos anteriores
    DELETE FROM plan_module_access WHERE plan_id = v_plan_id;

    -- Asignar módulos básicos
    PERFORM assign_modules_to_plan(
      v_plan_id,
      ARRAY['dashboard', 'appointments', 'services', 'customers', 'specialists'],
      true, true, true
    );

    -- Actualizar features/límites
    UPDATE plans SET features = '{
      "max_appointments_per_month": 50,
      "max_products": 20,
      "max_services": 10,
      "max_customers": 100,
      "max_storage_mb": 500,
      "has_custom_branding": false,
      "has_priority_support": false,
      "has_api_access": false
    }'::jsonb WHERE id = v_plan_id;
  END IF;
END $$;

-- Plan BASIC: Módulos intermedios
DO $$
DECLARE
  v_plan_id UUID;
BEGIN
  SELECT id INTO v_plan_id FROM plans WHERE code = 'basic';

  IF v_plan_id IS NOT NULL THEN
    DELETE FROM plan_module_access WHERE plan_id = v_plan_id;

    PERFORM assign_modules_to_plan(
      v_plan_id,
      ARRAY['dashboard', 'appointments', 'services', 'products', 'inventory',
            'customers', 'specialists', 'invoices', 'reports'],
      true, true, true
    );

    UPDATE plans SET features = '{
      "max_appointments_per_month": 200,
      "max_products": 100,
      "max_services": 50,
      "max_customers": 500,
      "max_storage_mb": 2000,
      "has_custom_branding": false,
      "has_priority_support": false,
      "has_api_access": false
    }'::jsonb WHERE id = v_plan_id;
  END IF;
END $$;

-- Plan PRO: Casi todos los módulos
DO $$
DECLARE
  v_plan_id UUID;
BEGIN
  SELECT id INTO v_plan_id FROM plans WHERE code = 'pro';

  IF v_plan_id IS NOT NULL THEN
    DELETE FROM plan_module_access WHERE plan_id = v_plan_id;

    PERFORM assign_modules_to_plan(
      v_plan_id,
      ARRAY['dashboard', 'appointments', 'services', 'products', 'inventory',
            'customers', 'specialists', 'invoices', 'reports', 'commissions',
            'medical_records', 'ai_assistant', 'whatsapp', 'settings'],
      true, true, true
    );

    UPDATE plans SET features = '{
      "max_appointments_per_month": null,
      "max_products": null,
      "max_services": null,
      "max_customers": null,
      "max_storage_mb": 10000,
      "has_custom_branding": false,
      "has_priority_support": true,
      "has_api_access": false
    }'::jsonb WHERE id = v_plan_id;
  END IF;
END $$;

-- Plan ENTERPRISE: Todos los módulos sin límites
DO $$
DECLARE
  v_plan_id UUID;
BEGIN
  SELECT id INTO v_plan_id FROM plans WHERE code = 'enterprise';

  IF v_plan_id IS NOT NULL THEN
    DELETE FROM plan_module_access WHERE plan_id = v_plan_id;

    PERFORM assign_modules_to_plan(
      v_plan_id,
      ARRAY['dashboard', 'appointments', 'services', 'products', 'inventory',
            'customers', 'specialists', 'invoices', 'reports', 'commissions',
            'medical_records', 'ai_assistant', 'whatsapp', 'settings'],
      true, true, true
    );

    UPDATE plans SET features = '{
      "max_appointments_per_month": null,
      "max_products": null,
      "max_services": null,
      "max_customers": null,
      "max_storage_mb": null,
      "has_custom_branding": true,
      "has_priority_support": true,
      "has_api_access": true
    }'::jsonb WHERE id = v_plan_id;
  END IF;
END $$;

-- =====================================================
-- 5. CREAR VISTA ÚTIL PARA VER PLANES CON SUS MÓDULOS
-- =====================================================

CREATE OR REPLACE VIEW v_plan_with_modules AS
SELECT
  p.id,
  p.code,
  p.name,
  p.description,
  p.price_cents,
  p.billing_period,
  p.status,
  p.max_businesses,
  p.max_users_per_business,
  p.max_specialists_per_business,
  p.features,
  p.sort_order,
  COALESCE(
    json_agg(
      json_build_object(
        'module_code', pm.code,
        'module_name', pm.name,
        'can_read', pma.can_read,
        'can_write', pma.can_write,
        'can_delete', pma.can_delete
      )
    ) FILTER (WHERE pm.id IS NOT NULL),
    '[]'
  ) AS modules
FROM plans p
LEFT JOIN plan_module_access pma ON p.id = pma.plan_id
LEFT JOIN plan_modules pm ON pma.module_id = pm.id
GROUP BY p.id;

-- =====================================================
-- 6. FUNCIÓN PARA VERIFICAR ACCESO A MÓDULO
-- =====================================================

CREATE OR REPLACE FUNCTION check_module_access(
  p_business_account_id UUID,
  p_module_code TEXT
) RETURNS TABLE (
  has_access BOOLEAN,
  can_read BOOLEAN,
  can_write BOOLEAN,
  can_delete BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    true AS has_access,
    pma.can_read,
    pma.can_write,
    pma.can_delete
  FROM business_accounts ba
  JOIN plans p ON ba.plan_id = p.id
  JOIN plan_module_access pma ON p.id = pma.plan_id
  JOIN plan_modules pm ON pma.module_id = pm.id
  WHERE ba.id = p_business_account_id
    AND pm.code = p_module_code
    AND pm.is_active = true;

  -- Si no hay resultados, retornar sin acceso
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, false, false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. FUNCIÓN PARA OBTENER LÍMITE DE FEATURE
-- =====================================================

CREATE OR REPLACE FUNCTION get_plan_feature_limit(
  p_business_account_id UUID,
  p_feature_key TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_value INTEGER;
BEGIN
  SELECT (p.features->>p_feature_key)::INTEGER INTO v_value
  FROM business_accounts ba
  JOIN plans p ON ba.plan_id = p.id
  WHERE ba.id = p_business_account_id;

  RETURN v_value; -- NULL significa sin límite
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. COMENTARIOS PARA DOCUMENTACIÓN
-- =====================================================

COMMENT ON TABLE plans IS 'Planes de suscripción disponibles';
COMMENT ON TABLE plan_modules IS 'Módulos/secciones del sistema que pueden ser asignados a planes';
COMMENT ON TABLE plan_module_access IS 'Relación entre planes y módulos con permisos granulares';
COMMENT ON COLUMN plans.features IS 'Límites y configuraciones del plan (max_appointments, max_products, etc.)';
COMMENT ON FUNCTION check_module_access IS 'Verifica si una cuenta tiene acceso a un módulo específico';
COMMENT ON FUNCTION get_plan_feature_limit IS 'Obtiene el límite de un feature para una cuenta (NULL = sin límite)';
