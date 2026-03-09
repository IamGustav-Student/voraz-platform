-- ============================================================
-- FASE 14: GastroRed — Reconciliación tenant_id → store_id
-- ============================================================
-- Fuente única de verdad: store_id (INT). La columna tenant_id
-- (VARCHAR) queda como alias legacy pero NO se usa en lógica nueva.
-- ============================================================

-- 1. Asegurar columnas extra que sembrar-real.js necesita en stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS hours       TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS lat         DECIMAL(10, 7);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS lng         DECIMAL(10, 7);

-- 2. Asegurar que la tienda GastroRed base (id=1) existe y está completa
--    Esta es la tienda "Voraz" que actúa como primer tenant.
INSERT INTO stores (id, name, subdomain, status, plan_type, brand_name,
                    brand_color_primary, brand_color_secondary, slogan)
VALUES (1, 'Voraz', 'voraz', 'active', 'Expert', 'Voraz',
        '#E30613', '#1A1A1A', 'El hambre de crecer')
ON CONFLICT (id) DO UPDATE SET
  subdomain             = EXCLUDED.subdomain,
  status                = EXCLUDED.status,
  plan_type             = EXCLUDED.plan_type,
  brand_name            = EXCLUDED.brand_name,
  brand_color_primary   = EXCLUDED.brand_color_primary,
  brand_color_secondary = EXCLUDED.brand_color_secondary,
  slogan                = EXCLUDED.slogan;

-- 3. Migrar datos que tienen tenant_id='voraz' pero store_id NULL → store_id=1
UPDATE products    SET store_id = 1 WHERE store_id IS NULL;
UPDATE categories  SET store_id = 1 WHERE store_id IS NULL;
UPDATE orders      SET store_id = 1 WHERE store_id IS NULL;
UPDATE coupons     SET store_id = 1 WHERE store_id IS NULL;
UPDATE users       SET store_id = 1 WHERE store_id IS NULL;
UPDATE news        SET store_id = 1 WHERE store_id IS NULL;
UPDATE influencers SET store_id = 1 WHERE store_id IS NULL;

-- community_videos puede no tener store_id aún (se agregó en phase13)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'community_videos' AND column_name = 'store_id'
  ) THEN
    UPDATE community_videos SET store_id = 1 WHERE store_id IS NULL;
  END IF;
END $$;

-- 4. Asegurar tenant_settings para store_id=1 (Voraz)
INSERT INTO tenant_settings (store_id, tenant_id, cash_on_delivery)
VALUES (1, 'voraz', true)
ON CONFLICT (store_id) DO NOTHING;

-- 5. Asegurar registro en tabla tenants (sistema legacy)
INSERT INTO tenants (id, name) VALUES ('voraz', 'Voraz')
ON CONFLICT (id) DO NOTHING;

-- 6. Índice para búsqueda rápida por subdomain (si no existe)
CREATE INDEX IF NOT EXISTS idx_stores_subdomain     ON stores(subdomain);
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain ON stores(custom_domain);
CREATE INDEX IF NOT EXISTS idx_stores_status        ON stores(status);

-- ============================================================
-- FIN FASE 14
-- Verificación rápida (descomentar en Railway console si querés):
-- SELECT id, name, subdomain, status, plan_type FROM stores;
-- SELECT COUNT(*), store_id FROM products GROUP BY store_id;
-- SELECT * FROM tenant_settings WHERE store_id = 1;
-- ============================================================
