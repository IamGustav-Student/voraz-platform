-- phase30_orders_paused.sql
-- Agrega la columna orders_paused a tenant_settings para permitir
-- que el admin pause la recepción de nuevos pedidos.

ALTER TABLE tenant_settings
ADD COLUMN IF NOT EXISTS orders_paused BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenant_settings.orders_paused IS 'Si true, el comercio no acepta nuevos pedidos. El admin puede activar/desactivar esto desde el panel.';
