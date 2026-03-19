-- ============================================================
-- FASE 17: GastroRed — Refactor Arquitectural
--          tenants = comercios SaaS
--          stores  = sucursales físicas de un tenant
-- ============================================================

-- 1. Expandir tabla tenants con todos los campos SaaS
--    (antes vivían en stores)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subdomain        VARCHAR(100) UNIQUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain    VARCHAR(255) UNIQUE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS plan_type        VARCHAR(50)  DEFAULT 'Full Digital';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_period VARCHAR(20) DEFAULT 'monthly';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status          VARCHAR(20)  DEFAULT 'active';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_name      VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_color_primary   VARCHAR(10) DEFAULT '#E30613';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_color_secondary VARCHAR(10) DEFAULT '#1A1A1A';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_logo_url  TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_favicon_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slogan          VARCHAR(200);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS admin_email     VARCHAR(150);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS mp_subscription_id VARCHAR(200);

-- 2. Migar datos de stores → tenants para todos los stores con subdomain
--    Esto convierte los "stores SaaS" existentes en tenants reales.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'subdomain') THEN
    INSERT INTO tenants (
      id, name, subdomain, custom_domain, plan_type, subscription_period,
      subscription_expires_at, status, brand_name, brand_color_primary,
      brand_color_secondary, brand_logo_url, brand_favicon_url, slogan, admin_email,
      mp_subscription_id, active
    )
    SELECT
      subdomain,
      COALESCE(brand_name, name),
      subdomain,
      custom_domain,
      COALESCE(plan_type, 'Full Digital'),
      COALESCE(subscription_period, 'monthly'),
      subscription_expires_at,
      COALESCE(status, 'active'),
      COALESCE(brand_name, name),
      COALESCE(brand_color_primary, '#E30613'),
      COALESCE(brand_color_secondary, '#1A1A1A'),
      brand_logo_url,
      brand_favicon_url,
      slogan,
      admin_email,
      mp_subscription_id,
      true
    FROM stores
    WHERE subdomain IS NOT NULL
      AND subdomain <> ''
      AND subdomain <> 'voraz'  -- voraz ya está en tenants
    ON CONFLICT (id) DO UPDATE SET
      custom_domain          = EXCLUDED.custom_domain,
      plan_type              = EXCLUDED.plan_type,
      subscription_period    = EXCLUDED.subscription_period,
      subscription_expires_at = EXCLUDED.subscription_expires_at,
      status                 = EXCLUDED.status,
      brand_name             = EXCLUDED.brand_name,
      brand_color_primary    = EXCLUDED.brand_color_primary,
      brand_color_secondary  = EXCLUDED.brand_color_secondary,
      brand_logo_url         = EXCLUDED.brand_logo_url,
      slogan                 = EXCLUDED.slogan,
      admin_email            = EXCLUDED.admin_email;
  END IF;
END $$;

-- 3. Asegurar que Voraz (tenant=voraz) tiene todos los campos
UPDATE tenants SET
  subdomain             = 'voraz',
  plan_type             = 'Expert',
  status                = 'active',
  brand_name            = 'Voraz',
  brand_color_primary   = '#E30613',
  brand_color_secondary = '#1A1A1A',
  slogan                = 'El hambre de crecer',
  subscription_expires_at = NULL
WHERE id = 'voraz';

-- 4. Agregar tenant_id a stores (la FK que la relaciona con el tenant dueño)
ALTER TABLE stores ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenants(id);

-- 5. Poblar tenant_id en los stores existentes (el store id=1 pertenece a Voraz)
UPDATE stores SET tenant_id = 'voraz' WHERE tenant_id IS NULL;

-- 6. Limpieza de stores: quitar las columnas SaaS que ahora viven en tenants
--    Se hace con IF EXISTS para ser idempotente.
ALTER TABLE stores DROP COLUMN IF EXISTS subdomain;
ALTER TABLE stores DROP COLUMN IF EXISTS custom_domain;
ALTER TABLE stores DROP COLUMN IF EXISTS plan_type;
ALTER TABLE stores DROP COLUMN IF EXISTS subscription_period;
ALTER TABLE stores DROP COLUMN IF EXISTS subscription_expires_at;
ALTER TABLE stores DROP COLUMN IF EXISTS status;
ALTER TABLE stores DROP COLUMN IF EXISTS brand_name;
ALTER TABLE stores DROP COLUMN IF EXISTS brand_color_primary;
ALTER TABLE stores DROP COLUMN IF EXISTS brand_color_secondary;
ALTER TABLE stores DROP COLUMN IF EXISTS brand_logo_url;
ALTER TABLE stores DROP COLUMN IF EXISTS brand_favicon_url;
ALTER TABLE stores DROP COLUMN IF EXISTS admin_email;
ALTER TABLE stores DROP COLUMN IF EXISTS mp_subscription_id;
ALTER TABLE stores DROP COLUMN IF EXISTS slogan;

-- 7. Actualizar tenant_settings: cambiar store_id → tenant_id donde sea posible
--    Agrega tenant_id como columna principal (store_id se mantiene como legacy)
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS tenant_id_fk VARCHAR(50) REFERENCES tenants(id);
UPDATE tenant_settings ts
SET tenant_id_fk = t.id
FROM tenants t
WHERE t.id = ts.tenant_id;
-- Voraz fallback
UPDATE tenant_settings SET tenant_id_fk = 'voraz' WHERE tenant_id_fk IS NULL;

-- 8. Actualizar subscription_payments: agregar tenant_id como FK
ALTER TABLE subscription_payments ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenants(id);
UPDATE subscription_payments sp
SET tenant_id = t.id
FROM stores s
JOIN tenants t ON t.id = (SELECT id FROM tenants WHERE subdomain = t.id LIMIT 1)
WHERE sp.store_id = s.id AND sp.tenant_id IS NULL;
-- Fallback: voraz
UPDATE subscription_payments SET tenant_id = 'voraz'
WHERE tenant_id IS NULL AND store_id = 1;

-- 9. Índices de performance sobre tenants
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_subdomain     ON tenants(subdomain);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_custom_domain ON tenants(custom_domain);
CREATE INDEX       IF NOT EXISTS idx_tenants_status         ON tenants(status);
CREATE INDEX       IF NOT EXISTS idx_stores_tenant_id       ON stores(tenant_id);

-- ============================================================
-- FIN FASE 17
-- Verificación:
-- SELECT id, subdomain, status, plan_type FROM tenants;
-- SELECT id, name, tenant_id, address FROM stores;
-- ============================================================
