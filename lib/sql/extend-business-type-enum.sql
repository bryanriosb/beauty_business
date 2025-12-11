-- Extend business_type enum with new values
-- Run this migration to add the new business types

-- Add new values to business_type enum
ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'AESTHETICS_CENTER';

ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'BARBERSHOP';

ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'HAIR_SALON';

ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'MAKEUP_CENTER';

ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'EYEBROWS_EYELASHES_SALON';

ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'SPA';

ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'MANICURE_PEDICURE_SALON';

ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'BEAUTY_SALON';

ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'PLASTIC_SURGERY_CENTER';

ALTER TYPE business_type ADD VALUE IF NOT EXISTS 'CONSULTORY';

-- Verify the enum values
-- SELECT unnest(enum_range(NULL::business_type));