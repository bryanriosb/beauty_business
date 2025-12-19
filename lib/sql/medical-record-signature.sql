-- =====================================================
-- EXTENSIÓN DE HISTORIA CLÍNICA: FIRMA DIGITAL Y CAMPOS DINÁMICOS
-- =====================================================
-- Enfoque DESACOPLADO:
-- - El modelo medical_records se mantiene con sus campos base
-- - extended_data (JSONB) almacena campos dinámicos del formulario
-- - form_templates define el esquema de campos personalizables
-- - signature_requests maneja el flujo de firma externa
-- =====================================================

-- =====================================================
-- 1. TABLA: form_templates
-- Define la ESTRUCTURA de formularios personalizados
-- Los valores se guardan en medical_records.extended_data
-- =====================================================

-- Primero eliminar la tabla si existe con estructura incorrecta (solo en desarrollo)
-- DROP TABLE IF EXISTS form_templates CASCADE;

CREATE TABLE IF NOT EXISTS form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    business_id UUID NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    requires_signature BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES business_account_users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agregar columnas si no existen (para tablas existentes)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'form_templates' AND column_name = 'is_active') THEN
        ALTER TABLE form_templates ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'form_templates' AND column_name = 'is_default') THEN
        ALTER TABLE form_templates ADD COLUMN is_default BOOLEAN NOT NULL DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'form_templates' AND column_name = 'requires_signature') THEN
        ALTER TABLE form_templates ADD COLUMN requires_signature BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- Crear índices después de asegurar que las columnas existen
CREATE INDEX IF NOT EXISTS idx_form_templates_business ON form_templates (business_id);

-- Índice parcial para plantillas activas
DROP INDEX IF EXISTS idx_form_templates_active;

CREATE INDEX idx_form_templates_active ON form_templates (business_id)
WHERE
    is_active = true;

-- Índice único para solo una plantilla por defecto por business
DROP INDEX IF EXISTS idx_form_templates_default;

CREATE UNIQUE INDEX idx_form_templates_default ON form_templates (business_id)
WHERE
    is_default = true
    AND is_active = true;

-- =====================================================
-- 2. EXTENSIÓN: medical_records (campos mínimos necesarios)
-- =====================================================

-- Datos extendidos del formulario (JSONB dinámico)
ALTER TABLE medical_records
ADD COLUMN IF NOT EXISTS extended_data JSONB DEFAULT NULL;

-- Referencia a la plantilla usada (opcional, para saber qué esquema se usó)
ALTER TABLE medical_records
ADD COLUMN IF NOT EXISTS form_template_id UUID REFERENCES form_templates (id) ON DELETE SET NULL;

-- Firma digital del paciente
ALTER TABLE medical_records
ADD COLUMN IF NOT EXISTS signature_data TEXT DEFAULT NULL;

ALTER TABLE medical_records
ADD COLUMN IF NOT EXISTS signature_date TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE medical_records
ADD COLUMN IF NOT EXISTS signed_by_name VARCHAR(255) DEFAULT NULL;

ALTER TABLE medical_records
ADD COLUMN IF NOT EXISTS signed_by_document VARCHAR(50) DEFAULT NULL;

ALTER TABLE medical_records
ADD COLUMN IF NOT EXISTS signature_ip VARCHAR(45) DEFAULT NULL;

-- Firma del especialista/médico (opcional)
ALTER TABLE medical_records
ADD COLUMN IF NOT EXISTS specialist_signature_data TEXT DEFAULT NULL;

ALTER TABLE medical_records
ADD COLUMN IF NOT EXISTS specialist_signature_date TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_medical_records_signed ON medical_records (business_id)
WHERE
    signature_data IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_medical_records_unsigned ON medical_records (business_id)
WHERE
    signature_data IS NULL
    AND status = 'active';

-- =====================================================
-- 4. FUNCIONES AUXILIARES
-- =====================================================

-- Generar token único
CREATE OR REPLACE FUNCTION generate_signature_token()
RETURNS VARCHAR(64) AS $$
DECLARE
    new_token VARCHAR(64);
BEGIN
    LOOP
        new_token := encode(gen_random_bytes(32), 'hex');
        IF NOT EXISTS(SELECT 1 FROM signature_requests WHERE token = new_token) THEN
            RETURN new_token;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Crear solicitud de firma
-- Función actualizada para crear solicitud de firma usando submission_id
-- Actualizar la función create_signature_request para incluir todos los campos requeridos
CREATE OR REPLACE FUNCTION create_signature_request(
    p_submission_id UUID,
    p_created_by UUID DEFAULT NULL,
    p_expires_days INTEGER DEFAULT 7,
    p_sent_via VARCHAR(50) DEFAULT 'whatsapp',
    p_sent_to VARCHAR(255) DEFAULT NULL
)
RETURNS TABLE(request_id UUID, token VARCHAR(64)) AS $$
DECLARE
    v_business_id UUID;
    v_customer_id UUID;
    v_customer_email VARCHAR(255);
    v_customer_phone VARCHAR(50);
    v_token VARCHAR(64);
    v_request_id UUID;
BEGIN
    -- Obtener business_id, customer_id y datos del cliente desde medical_records
    SELECT mr.business_id, mr.customer_id, c.email, c.phone
    INTO v_business_id, v_customer_id, v_customer_email, v_customer_phone
    FROM medical_records mr
    JOIN customers c ON mr.customer_id = c.id
    WHERE mr.id = p_submission_id;
    
    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'Medical record not found';
    END IF;
    
    v_token := generate_signature_token();
    
    -- Determinar el destinatario según el canal
    IF p_sent_to IS NULL THEN
        IF p_sent_via = 'email' THEN
            p_sent_to := v_customer_email;
        ELSIF p_sent_via = 'whatsapp' THEN
            p_sent_to := v_customer_phone;
        END IF;
    END IF;
    
    -- Cancelar solicitudes pendientes anteriores
    UPDATE signature_requests
    SET status = 'cancelled', updated_at = NOW()
    WHERE submission_id = p_submission_id
    AND status IN ('pending', 'sent', 'viewed');
    
    -- Insertar nueva solicitud de firma con todos los campos requeridos
    INSERT INTO signature_requests (
        submission_id, 
        token,
        sent_via,
        sent_to,
        expires_at, 
        created_by
    ) VALUES (
        p_submission_id, 
        v_token,
        p_sent_via,
        COALESCE(p_sent_to, v_customer_phone),
        NOW() + (p_expires_days || ' days')::INTERVAL, 
        p_created_by
    ) RETURNING id INTO v_request_id;
    
    RETURN QUERY SELECT v_request_id, v_token;
END;
$$ LANGUAGE plpgsql;

-- Función process_signature corregida para usar medical_record_id o submission_id
-- Función process_signature corregida para usar medical_record_id o submission_id
CREATE OR REPLACE FUNCTION process_signature(
    p_token VARCHAR(64),
    p_signature_data TEXT,
    p_signed_by_name VARCHAR(255),
    p_signed_by_document VARCHAR(50) DEFAULT NULL,
    p_signature_ip VARCHAR(45) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_request signature_requests%ROWTYPE;
    v_medical_record_id UUID;
BEGIN
    SELECT * INTO v_request FROM signature_requests WHERE token = p_token;
    IF v_request IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Token inválido');
    END IF;
    IF v_request.status = 'signed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Este documento ya fue firmado');
    END IF;
    IF v_request.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Esta solicitud fue cancelada');
    END IF;
    IF v_request.expires_at < NOW() THEN
        UPDATE signature_requests SET status = 'expired', updated_at = NOW() WHERE id = v_request.id;
        RETURN jsonb_build_object('success', false, 'error', 'El enlace ha expirado');
    END IF;
    
    -- Determinar el ID del medical record: usar medical_record_id si existe, sino submission_id
    v_medical_record_id := COALESCE(v_request.medical_record_id, v_request.submission_id);
    
    IF v_medical_record_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'No se encontró el registro médico asociado');
    END IF;
    
    -- Actualizar medical_record con el ID correcto
    UPDATE medical_records SET
        signature_data = p_signature_data,
        signature_date = NOW(),
        signed_by_name = p_signed_by_name,
        signed_by_document = p_signed_by_document,
        signature_ip = p_signature_ip,
        updated_at = NOW()
    WHERE id = v_medical_record_id;
    
    -- Actualizar signature_request
    UPDATE signature_requests SET
        status = 'signed', 
        signed_at = NOW(), 
        signature_ip = p_signature_ip, 
        updated_at = NOW()
    WHERE id = v_request.id;
    
    RETURN jsonb_build_object('success', true, 'medical_record_id', v_medical_record_id);
END;
$$ LANGUAGE plpgsql;

-- Marcar como vista
-- Función mark_signature_viewed actualizada
CREATE OR REPLACE FUNCTION mark_signature_viewed(p_token VARCHAR(64))
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE signature_requests SET
        status = CASE WHEN status IN ('pending', 'sent') THEN 'viewed' ELSE status END,
        opened_at = COALESCE(opened_at, NOW()), -- Usar opened_at que ya existe
        viewed_at = COALESCE(viewed_at, NOW()),
        view_count = view_count + 1,
        updated_at = NOW()
    WHERE token = p_token AND status IN ('pending', 'sent', 'viewed') AND expires_at > NOW();
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_form_templates_updated ON form_templates;

CREATE TRIGGER trg_form_templates_updated BEFORE UPDATE ON form_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_form_templates_updated ON form_templates;

CREATE TRIGGER trg_form_templates_updated BEFORE UPDATE ON form_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- 6. RLS POLICIES
-- =====================================================
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;

ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS form_templates_all ON form_templates;

CREATE POLICY form_templates_all ON form_templates FOR ALL USING (true);

DROP POLICY IF EXISTS signature_requests_all ON signature_requests;

CREATE POLICY signature_requests_all ON signature_requests FOR ALL USING (true);

-- =====================================================
-- 7. PLANTILLA POR DEFECTO: Historia Clínica Estética
-- Basada en el formato PDF proporcionado
-- =====================================================
-- NOTA: Ejecutar con el business_id correspondiente
/*
INSERT INTO form_templates (business_id, name, description, toon_schema, is_default, requires_signature)
VALUES (
'{{BUSINESS_ID}}',
'Historia Clínica Estética',
'Formulario completo para procedimientos estéticos basado en formato estándar',
'{
"sections": [
{
"id": "personal_data",
"title": "Datos Personales",
"fields": [
{"field_id": "age", "label": "Edad", "type": "number", "required": true},
{"field_id": "birth_date", "label": "Fecha de nacimiento", "type": "date", "required": true},
{"field_id": "blood_type", "label": "RH", "type": "select", "required": false, "options": ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]},
{"field_id": "phone", "label": "Celular", "type": "text", "required": true},
{"field_id": "marital_status", "label": "Estado civil", "type": "select", "required": false, "options": ["Soltero(a)", "Casado(a)", "Unión libre", "Divorciado(a)", "Viudo(a)"]},
{"field_id": "gender", "label": "Género", "type": "select", "required": true, "options": ["Femenino", "Masculino", "Otro"]},
{"field_id": "eps", "label": "EPS", "type": "text", "required": false},
{"field_id": "address", "label": "Dirección", "type": "text", "required": false},
{"field_id": "email", "label": "E-mail", "type": "email", "required": false},
{"field_id": "document_number", "label": "CC", "type": "text", "required": true},
{"field_id": "occupation", "label": "Ocupación", "type": "text", "required": false},
{"field_id": "referral_source", "label": "Medio por el cual se enteró de nosotros", "type": "text", "required": false}
]
},
{
"id": "minor_guardian",
"title": "Datos del Acompañante (Menores de edad)",
"condition": "age < 18",
"fields": [
{"field_id": "guardian_name", "label": "Nombre del acompañante", "type": "text", "required": true},
{"field_id": "guardian_relationship", "label": "Parentesco", "type": "text", "required": true},
{"field_id": "guardian_phone", "label": "Teléfono", "type": "text", "required": true},
{"field_id": "guardian_document", "label": "CC", "type": "text", "required": true}
]
},
{
"id": "clinical_data",
"title": "Datos Clínicos",
"description": "Marque SI o NO y agregue observaciones si aplica",
"fields": [
{"field_id": "current_treatment", "label": "¿Está en algún tratamiento médico actualmente?", "type": "yes_no_observation", "required": true},
{"field_id": "takes_medications", "label": "¿Toma medicamentos?", "type": "yes_no_observation", "required": true},
{"field_id": "has_allergies", "label": "¿Es alérgico(a) a algo?", "type": "yes_no_observation", "required": true},
{"field_id": "heart_problems", "label": "Problemas cardíacos", "type": "yes_no_observation", "required": true},
{"field_id": "blood_pressure", "label": "Alteración de la presión arterial", "type": "yes_no_observation", "required": true},
{"field_id": "poor_healing", "label": "¿Tienes mala cicatrización?", "type": "yes_no_observation", "required": true},
{"field_id": "pregnancy", "label": "Embarazo (Sospecha)", "type": "yes_no_observation", "required": true},
{"field_id": "diabetes", "label": "Diabetes", "type": "yes_no_observation", "required": true},
{"field_id": "hepatitis", "label": "Hepatitis", "type": "yes_no_observation", "required": true},
{"field_id": "skin_problems", "label": "¿Sufres problemas de piel?", "type": "yes_no_observation", "required": true},
{"field_id": "thyroid", "label": "Alteración de la tiroides", "type": "yes_no_observation", "required": true},
{"field_id": "gastric_disorders", "label": "Trastornos gástricos", "type": "yes_no_observation", "required": true},
{"field_id": "kidney_disease", "label": "Enfermedades renales", "type": "yes_no_observation", "required": true},
{"field_id": "respiratory", "label": "Patologías respiratorias", "type": "yes_no_observation", "required": true},
{"field_id": "surgeries", "label": "Cirugías", "type": "yes_no_observation", "required": true},
{"field_id": "other_conditions", "label": "Otras alteraciones", "type": "yes_no_observation", "required": false}
]
},
{
"id": "daily_activity",
"title": "Actividad Cotidiana",
"fields": [
{"field_id": "lifestyle", "label": "¿Cuál es tu estilo de vida?", "type": "select", "required": true, "options": ["Sedentario", "Activo", "Muy activo"]},
{"field_id": "smokes", "label": "¿Fumas?", "type": "frequency", "required": true, "options": ["Sí", "No", "Ocasional"]},
{"field_id": "alcohol", "label": "¿Consumes alcohol?", "type": "frequency", "required": true, "options": ["Sí", "No", "Ocasional"]},
{"field_id": "drugs", "label": "¿Consumes algún tipo de sustancia alucinógena?", "type": "frequency", "required": true, "options": ["Sí", "No", "Ocasional"]},
{"field_id": "exercise", "label": "¿Practicas algún deporte?", "type": "frequency", "required": true, "options": ["Sí", "No", "Ocasional"]},
{"field_id": "sleep_quality", "label": "¿Cómo es tu calidad de sueño?", "type": "select", "required": true, "options": ["Buena", "Mala", "Normal"]},
{"field_id": "constipation", "label": "¿Tienes problemas de estreñimiento?", "type": "frequency", "required": true, "options": ["Sí", "No", "Ocasional"]},
{"field_id": "anxiety_stress", "label": "¿Sufres de Ansiedad, Nerviosismo o estrés?", "type": "frequency", "required": true, "options": ["Sí", "No", "Ocasional"]},
{"field_id": "healthy_eating", "label": "¿Tienes cuidados con tu alimentación?", "type": "frequency", "required": true, "options": ["Sí", "No", "Ocasional"]},
{"field_id": "water_intake", "label": "¿Consumes agua?", "type": "frequency", "required": true, "options": ["Sí", "No", "Ocasional"]},
{"field_id": "uses_girdle", "label": "¿Utilizas faja?", "type": "frequency", "required": true, "options": ["Sí", "No", "Ocasional"]},
{"field_id": "hormonal_disorders", "label": "¿Tienes trastornos hormonales?", "type": "frequency", "required": true, "options": ["Sí", "No", "Ocasional"]},
{"field_id": "sunscreen", "label": "¿Utilizas protector solar?", "type": "frequency", "required": true, "options": ["Sí", "No", "Ocasional"]},
{"field_id": "skin_care", "label": "¿Tienes cuidados con tu piel?", "type": "frequency", "required": true, "options": ["Sí", "No", "Ocasional"]}
]
},
{
"id": "physical_exam",
"title": "Examen Físico",
"description": "Medidas corporales - Inicial y Final",
"fields": [
{"field_id": "height", "label": "Estatura (cm)", "type": "measurement", "required": false},
{"field_id": "weight", "label": "Peso (kg)", "type": "measurement", "required": false},
{"field_id": "aa", "label": "AA - Ancho Abdominal (cm)", "type": "measurement", "required": false},
{"field_id": "am", "label": "AM - Ancho Medio (cm)", "type": "measurement", "required": false},
{"field_id": "waist", "label": "O - Cintura (cm)", "type": "measurement", "required": false},
{"field_id": "ab", "label": "AB - Abdomen Bajo (cm)", "type": "measurement", "required": false},
{"field_id": "cad", "label": "CAD - Cadera (cm)", "type": "measurement", "required": false},
{"field_id": "bd", "label": "BD - Brazo Derecho (cm)", "type": "measurement", "required": false},
{"field_id": "bi", "label": "BI - Brazo Izquierdo (cm)", "type": "measurement", "required": false},
{"field_id": "pd", "label": "PD - Pierna Derecha (cm)", "type": "measurement", "required": false},
{"field_id": "pi", "label": "PI - Pierna Izquierda (cm)", "type": "measurement", "required": false},
{"field_id": "gluteus", "label": "Perímetro Glúteo (cm)", "type": "measurement", "required": false},
{"field_id": "calf", "label": "Pantorrilla (cm)", "type": "measurement", "required": false}
]
},
{
"id": "consents",
"title": "Autorizaciones",
"fields": [
{"field_id": "photo_consent", "label": "Autorizo a que me tomen fotografías, para ser usadas como ayudas y apoyo durante mi tratamiento", "type": "checkbox", "required": true},
{"field_id": "treatment_consent", "label": "He leído y acepto los términos del tratamiento", "type": "checkbox", "required": true}
]
},
{
"id": "observations",
"title": "Observaciones",
"fields": [
{"field_id": "observations", "label": "Observaciones generales", "type": "textarea", "required": false}
]
}
]
}'::jsonb,
true,
true
);
*/

-- =====================================================
-- 8. TEMPLATE DE WHATSAPP PARA SOLICITUD DE FIRMA
-- =====================================================
-- Registrar en Meta Business Suite antes de usar
/*
Template Name: medical_record_signature_request
Language: es_CO
Category: UTILITY

Body:
Hola {{1}},

{{2}} te ha enviado tu historia clínica para firmar digitalmente.

📋 Documento: Historia Clínica
📅 Fecha: {{3}}

Firma aquí: {{4}}

⚠️ Este enlace expira en {{5}} días.

Si tienes dudas, contacta a {{2}}.

Variables:
{{1}} = customer_name
{{2}} = business_name
{{3}} = record_date
{{4}} = signature_url
{{5}} = expires_days
*/

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================