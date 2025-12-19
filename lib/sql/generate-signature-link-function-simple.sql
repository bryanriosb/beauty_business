-- Función simplificada para generar enlace de firma sin enviar (usando medical_record_id directamente)
CREATE OR REPLACE FUNCTION generate_signature_link(
    p_medical_record_id UUID,
    p_created_by UUID DEFAULT NULL,
    p_expires_days INTEGER DEFAULT 7
)
RETURNS TABLE(request_id UUID, token VARCHAR(64)) AS $$
DECLARE
    v_business_id UUID;
    v_customer_id UUID;
    v_customer_email VARCHAR(255);
    v_customer_phone VARCHAR(50);
    v_token VARCHAR(64);
    v_request_id UUID;
    v_title VARCHAR(255);
BEGIN
    -- Obtener datos del medical record
    SELECT mr.business_id, mr.customer_id, c.email, c.phone, 
           'Historia Clínica - ' || TO_CHAR(mr.record_date, 'DD/MM/YYYY') as title
    INTO v_business_id, v_customer_id, v_customer_email, v_customer_phone, v_title
    FROM medical_records mr
    JOIN business_customers c ON mr.customer_id = c.id
    WHERE mr.id = p_medical_record_id;
    
    IF v_business_id IS NULL THEN
        RAISE EXCEPTION 'Medical record not found';
    END IF;
    
    v_token := generate_signature_token();
    
    -- Cancelar solicitudes pendientes anteriores para el mismo medical record
    UPDATE signature_requests
    SET status = 'cancelled', updated_at = NOW()
    WHERE medical_record_id = p_medical_record_id
    AND status IN ('pending', 'sent', 'viewed');
    
    -- Insertar solicitud de firma sin enviar (status pending)
    INSERT INTO signature_requests (
        submission_id, 
        token,
        sent_via,
        sent_to,
        expires_at, 
        created_by,
        medical_record_id,
        extra_ref_fields
    ) VALUES (
        gen_random_uuid(), -- submission_id puede ser cualquier UUID único
        v_token,
        'generated', -- Canal para enlaces generados (no enviados)
        'link_generated', -- Destinatario para enlaces generados
        NOW() + (p_expires_days || ' days')::INTERVAL, 
        p_created_by,
        p_medical_record_id,
        jsonb_build_object('document_type', 'medical_record', 'generated_only', true)
    ) RETURNING id INTO v_request_id;
    
    RETURN QUERY SELECT v_request_id, v_token;
END;
$$ LANGUAGE plpgsql;