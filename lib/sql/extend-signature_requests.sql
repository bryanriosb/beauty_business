ALTER TABLE signature_requests
ALTER COLUMN submission_id
DROP NOT NULL;

-- Agregar las columnas que faltan a signature_requests
ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS business_id UUID NOT NULL DEFAULT gen_random_uuid () REFERENCES businesses (id) ON DELETE CASCADE;

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS customer_id UUID NOT NULL DEFAULT gen_random_uuid () REFERENCES business_customers (id) ON DELETE CASCADE;

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (
    status IN (
        'pending',
        'sent',
        'viewed',
        'signed',
        'expired',
        'cancelled'
    )
);

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS signature_ip VARCHAR(45);

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users_profile (id);

ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

"
-- Agregar las columnas que faltan a signature_requests
ALTER TABLE signature_requests 
ADD COLUMN IF NOT EXISTS business_id UUID NOT NULL DEFAULT gen_random_uuid() REFERENCES businesses(id) ON DELETE CASCADE;
ALTER TABLE signature_requests 
ADD COLUMN IF NOT EXISTS customer_id UUID NOT NULL DEFAULT gen_random_uuid() REFERENCES business_customers(id) ON DELETE CASCADE;
ALTER TABLE signature_requests 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'viewed', 'signed', 'expired', 'cancelled'));
ALTER TABLE signature_requests 
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE signature_requests 
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;
ALTER TABLE signature_requests 
ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE signature_requests 
ADD COLUMN IF NOT EXISTS signature_ip VARCHAR(45);
ALTER TABLE signature_requests 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users_profile (id);(id);
ALTER TABLE signature_requests 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();


-- Actualizar la referencia de created_by a users_profile
-- Primero eliminamos la restricción existente si hay
ALTER TABLE signature_requests
DROP CONSTRAINT IF EXISTS signature_requests_created_by_fkey;
-- Luego agregamos la nueva restricción
ALTER TABLE signature_requests
ADD CONSTRAINT signature_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES users_profile (id) ON DELETE SET NULL;

"
-- Actualizar la referencia de created_by a users_profile
-- Primero eliminamos la restricción existente si hay
ALTER TABLE signature_requests
DROP CONSTRAINT IF EXISTS signature_requests_created_by_fkey;
-- Luego agregamos la nueva restricción
ALTER TABLE signature_requests
ADD CONSTRAINT signature_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES users_profile (id) ON DELETE SET NULL

--- NO APLICAR: Estas líneas son solo para referencia y no deben incluirse en el archivo SQL final.
-- Configurar RLS para signature_requests

ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS signature_requests_all ON signature_requests;

CREATE POLICY signature_requests_all ON signature_requests FOR ALL USING (true);