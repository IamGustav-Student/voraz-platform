-- Fase 12: Pago contra entrega (Cash on Delivery)

-- Agregar columna payment_method a orders si no existe
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'mercadopago'
    CHECK (payment_method IN ('mercadopago', 'cash'));

-- Agregar flag cash_on_delivery a tenant_settings
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS cash_on_delivery BOOLEAN DEFAULT true;
