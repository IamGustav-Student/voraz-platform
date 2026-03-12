-- FASE 23: Columna stock en products (nombre estándar, NOT NULL, CHECK >= 0)
-- Para bases existentes que no tienen la columna stock en init.sql

ALTER TABLE products ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_stock_check;
ALTER TABLE products ADD CONSTRAINT products_stock_check CHECK (stock >= 0);

-- Migrar datos desde stock_quantity si existía (phase22)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'stock_quantity') THEN
    UPDATE products SET stock = GREATEST(0, COALESCE(stock_quantity, 0)) WHERE stock_quantity IS NOT NULL;
    ALTER TABLE products DROP COLUMN IF EXISTS stock_quantity;
  END IF;
END $$;
