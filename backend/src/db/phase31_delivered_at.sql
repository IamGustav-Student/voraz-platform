-- FASE 31: Timestamp de entrega para cálculo de ingresos
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;

-- Inicializar delivered_at para pedidos ya entregados usando updated_at como fallback
UPDATE orders SET delivered_at = updated_at WHERE status = 'delivered' AND delivered_at IS NULL;
