-- Migración White Label: tabla tenants + tenant_id en tablas clave

CREATE TABLE IF NOT EXISTS tenants (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar tenant por defecto (Voraz)
INSERT INTO tenants (id, name) VALUES ('voraz', 'Voraz')
ON CONFLICT (id) DO NOTHING;

-- Agregar tenant_id a las tablas principales (si no existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE products ADD COLUMN tenant_id VARCHAR(50) DEFAULT 'voraz' REFERENCES tenants(id);
    UPDATE products SET tenant_id = 'voraz' WHERE tenant_id IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE categories ADD COLUMN tenant_id VARCHAR(50) DEFAULT 'voraz' REFERENCES tenants(id);
    UPDATE categories SET tenant_id = 'voraz' WHERE tenant_id IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE stores ADD COLUMN tenant_id VARCHAR(50) DEFAULT 'voraz' REFERENCES tenants(id);
    UPDATE stores SET tenant_id = 'voraz' WHERE tenant_id IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'news' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE news ADD COLUMN tenant_id VARCHAR(50) DEFAULT 'voraz' REFERENCES tenants(id);
    UPDATE news SET tenant_id = 'voraz' WHERE tenant_id IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'influencers' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE influencers ADD COLUMN tenant_id VARCHAR(50) DEFAULT 'voraz' REFERENCES tenants(id);
    UPDATE influencers SET tenant_id = 'voraz' WHERE tenant_id IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'videos' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE videos ADD COLUMN tenant_id VARCHAR(50) DEFAULT 'voraz' REFERENCES tenants(id);
    UPDATE videos SET tenant_id = 'voraz' WHERE tenant_id IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'coupons' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE coupons ADD COLUMN tenant_id VARCHAR(50) DEFAULT 'voraz' REFERENCES tenants(id);
    UPDATE coupons SET tenant_id = 'voraz' WHERE tenant_id IS NULL;
  END IF;
END $$;
