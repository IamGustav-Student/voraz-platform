-- Phase 28: Loyalty System Definitive Fix
-- 1. Reparamos el CHECK constraint de points_history para incluir 'refund'
ALTER TABLE points_history DROP CONSTRAINT IF EXISTS points_history_type_check;
ALTER TABLE points_history ADD CONSTRAINT points_history_type_check
    CHECK (type IN ('earned', 'redeemed', 'expired', 'bonus', 'refund'));

-- 2. Sincronizamos tenant_id_fk con tenant_id en todas las filas donde sea NULL
UPDATE tenant_settings SET tenant_id_fk = tenant_id WHERE tenant_id_fk IS NULL;

-- 3. Aseguramos que loyalty_enabled se pueda activar por tenant_id también
-- y que la columna exista (idempotente)
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS points_redeem_value INTEGER DEFAULT 0;

-- 4. Aseguramos que el campo points_earned exista con default razonable en productos
ALTER TABLE products ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 10;
-- Actualizamos productos que tienen 0 puntos para darles el default mínimo
UPDATE products SET points_earned = 10 WHERE points_earned = 0 OR points_earned IS NULL;
