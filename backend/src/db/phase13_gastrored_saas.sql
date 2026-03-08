-- ============================================================
-- FASE 13: GastroRed — Transformación a SaaS Multi-tenant
-- ============================================================

-- 1. Ampliar tabla stores con campos SaaS
ALTER TABLE stores ADD COLUMN IF NOT EXISTS custom_domain    VARCHAR(255) UNIQUE;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS subdomain        VARCHAR(100) UNIQUE;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS plan_type        VARCHAR(50)  DEFAULT 'Full Digital';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS subscription_period VARCHAR(20) DEFAULT 'monthly';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS status           VARCHAR(20)  DEFAULT 'active';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS brand_name       VARCHAR(100);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS brand_color_primary   VARCHAR(10) DEFAULT '#E30613';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS brand_color_secondary VARCHAR(10) DEFAULT '#1A1A1A';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS brand_logo_url   TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS brand_favicon_url TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS admin_email      VARCHAR(150);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS mp_subscription_id VARCHAR(200);
ALTER TABLE stores ADD COLUMN IF NOT EXISTS slogan           VARCHAR(200);

-- 2. Asegurar que stores tenga tenant_settings_id vinculado (para config SaaS)
--    Se usa store_id como FK en tenant_settings
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS store_id INT;

-- 3. Agregar store_id a todas las tablas de datos
ALTER TABLE products         ADD COLUMN IF NOT EXISTS store_id INT REFERENCES stores(id) DEFAULT 1;
ALTER TABLE categories       ADD COLUMN IF NOT EXISTS store_id INT REFERENCES stores(id) DEFAULT 1;
ALTER TABLE orders           ADD COLUMN IF NOT EXISTS store_id INT REFERENCES stores(id) DEFAULT 1;
ALTER TABLE coupons          ADD COLUMN IF NOT EXISTS store_id INT REFERENCES stores(id) DEFAULT 1;
ALTER TABLE users            ADD COLUMN IF NOT EXISTS store_id INT REFERENCES stores(id) DEFAULT 1;
ALTER TABLE news             ADD COLUMN IF NOT EXISTS store_id INT REFERENCES stores(id) DEFAULT 1;
ALTER TABLE community_videos ADD COLUMN IF NOT EXISTS store_id INT REFERENCES stores(id) DEFAULT 1;
ALTER TABLE influencers      ADD COLUMN IF NOT EXISTS store_id INT REFERENCES stores(id) DEFAULT 1;

-- 4. Migrar Voraz como tenant id=1
UPDATE stores SET
  subdomain  = 'voraz',
  status     = 'active',
  plan_type  = 'Expert',
  brand_name = 'Voraz',
  brand_color_primary   = '#E30613',
  brand_color_secondary = '#1A1A1A',
  slogan     = 'El hambre de crecer'
WHERE id = 1;

-- Asegurarse que todos los datos existentes tengan store_id = 1
UPDATE products         SET store_id = 1 WHERE store_id IS NULL;
UPDATE categories       SET store_id = 1 WHERE store_id IS NULL;
UPDATE orders           SET store_id = 1 WHERE store_id IS NULL;
UPDATE coupons          SET store_id = 1 WHERE store_id IS NULL;
UPDATE users            SET store_id = 1 WHERE store_id IS NULL;
UPDATE news             SET store_id = 1 WHERE store_id IS NULL;
UPDATE community_videos SET store_id = 1 WHERE store_id IS NULL;
UPDATE influencers      SET store_id = 1 WHERE store_id IS NULL;

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_products_store    ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store      ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_store  ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_users_store       ON users(store_id);
CREATE INDEX IF NOT EXISTS idx_coupons_store     ON coupons(store_id);
CREATE INDEX IF NOT EXISTS idx_news_store        ON news(store_id);
CREATE INDEX IF NOT EXISTS idx_videos_store      ON community_videos(store_id);

-- 6. Tabla superadmins
CREATE TABLE IF NOT EXISTS superadmins (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          VARCHAR(100),
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 7. Tabla de suscripciones / historial de pagos
CREATE TABLE IF NOT EXISTS subscription_payments (
  id             SERIAL PRIMARY KEY,
  store_id       INT NOT NULL REFERENCES stores(id),
  mp_payment_id  VARCHAR(200),
  mp_order_id    VARCHAR(200),
  amount         DECIMAL(12,2),
  plan_type      VARCHAR(50),
  period         VARCHAR(20),
  status         VARCHAR(30) DEFAULT 'pending',
  created_at     TIMESTAMP DEFAULT NOW()
);

-- 8. Vincular tenant_settings con store_id (para queries por store_id numérico)
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS store_id INT REFERENCES stores(id);
UPDATE tenant_settings SET store_id = 1 WHERE store_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_settings_store_id ON tenant_settings(store_id);

-- 9. Superadmin inicial de GastroRed (se inserta solo si no existe ninguno)
INSERT INTO superadmins (email, password_hash, name)
SELECT
  'iamgustav.olivera@gmail.com',
  '$2b$10$qlvIkKH8xsp1lzFjpXfJ4.ds1E/01LTA8vBWVSNQkRd/sZKsJ3tm6',
  'GastroRed Admin'
WHERE NOT EXISTS (SELECT 1 FROM superadmins LIMIT 1);
