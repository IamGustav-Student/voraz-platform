-- FASE 32: Agregar Whatsapp y Dirección al registro de tenants
ALTER TABLE stores ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address TEXT;
