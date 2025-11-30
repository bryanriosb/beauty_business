-- ============================================
-- TABLA DE RECORDATORIOS PROGRAMADOS
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_scheduled_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    business_account_id UUID NOT NULL REFERENCES business_accounts(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_phone TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    reminder_type TEXT NOT NULL DEFAULT 'appointment_reminder' CHECK (reminder_type IN ('appointment_reminder', 'appointment_confirmation', 'custom')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),

    -- Evitar duplicados
    CONSTRAINT unique_appointment_reminder UNIQUE (appointment_id, reminder_type)
);

CREATE INDEX idx_scheduled_reminders_pending ON whatsapp_scheduled_reminders(scheduled_for, status)
    WHERE status = 'pending';
CREATE INDEX idx_scheduled_reminders_appointment ON whatsapp_scheduled_reminders(appointment_id);

-- RLS
ALTER TABLE whatsapp_scheduled_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scheduled_reminders_all" ON whatsapp_scheduled_reminders
    FOR ALL USING (true);

GRANT ALL ON whatsapp_scheduled_reminders TO service_role;


-- ============================================
-- FUNCION: Cancelar recordatorios cuando se cancela una cita
-- ============================================
CREATE OR REPLACE FUNCTION cancel_appointment_reminders()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'CANCELLED' AND OLD.status != 'CANCELLED' THEN
        UPDATE whatsapp_scheduled_reminders
        SET status = 'cancelled'
        WHERE appointment_id = NEW.id
          AND status = 'pending';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cancel_reminders_on_appointment_cancel
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION cancel_appointment_reminders();
