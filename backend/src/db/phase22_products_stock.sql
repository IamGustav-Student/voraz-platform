-- FASE 22: Stock en productos para descuento al confirmar pago
-- Permite control opcional de inventario; NULL = sin control de stock
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT NULL;
COMMENT ON COLUMN products.stock_quantity IS 'Si es NULL no se controla stock; si es número se descuenta al aprobar pago.';
