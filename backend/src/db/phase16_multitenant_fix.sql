-- ============================================================
-- FASE 16: GastroRed — Fix Multi-Tenancy Completo
-- ============================================================
-- Objetivo: sincronizar la tabla `tenants` con `stores`,
-- crear tenant_settings faltantes, y limpiar la columna
-- `store_id` de `stores` (que era para sub-sucursales y
-- causaba errores SQL).
-- ============================================================

-- 1. Eliminar la columna store_id de stores (era para
--    sub-sucursales y nunca fue utilizada correctamente en SaaS)
ALTER TABLE stores DROP COLUMN IF EXISTS store_id;

-- 2. Sincronizar todos los stores con subdomain hacia tenants
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'subdomain') THEN
    INSERT INTO tenants (id, name)
    SELECT subdomain, COALESCE(brand_name, name)
    FROM stores
    WHERE subdomain IS NOT NULL AND subdomain <> ''
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
  END IF;
END $$;

-- 3. Crear tenant_settings para todos los stores que no tienen
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'subdomain') THEN
    INSERT INTO tenant_settings (store_id, tenant_id, cash_on_delivery)
    SELECT s.id, s.subdomain, true
    FROM stores s
    WHERE s.subdomain IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM tenant_settings ts WHERE ts.store_id = s.id
      )
    ON CONFLICT (store_id) DO NOTHING;
  END IF;
END $$;

-- 4. Pasar a status='suspended' los stores pending_payment con
--    subscription_expires_at vencida (limpieza de estados huérfanos)
UPDATE stores
SET status = 'suspended'
WHERE status = 'pending_payment'
  AND subscription_expires_at IS NOT NULL
  AND subscription_expires_at < NOW();

-- 5. Si hay stores con status='active' pero subscription_expires_at
--    ya vencida, pasarlos a suspended también
UPDATE stores
SET status = 'suspended'
WHERE status = 'active'
  AND subscription_expires_at IS NOT NULL
  AND subscription_expires_at < NOW()
  AND id > 1;  -- nunca tocar Voraz (id=1)

-- 6. Asegurar que Voraz (id=1) siempre sea active sin vencimiento
UPDATE stores
SET status = 'active',
    subscription_expires_at = NULL,
    plan_type = 'Expert'
WHERE id = 1;

-- 7. Índices de soporte (por si no existen)
CREATE INDEX IF NOT EXISTS idx_stores_status     ON stores(status);
CREATE INDEX IF NOT EXISTS idx_stores_subdomain  ON stores(subdomain);
CREATE INDEX IF NOT EXISTS idx_stores_domain     ON stores(custom_domain);

-- ============================================================
-- FIN FASE 16
-- Verificación:
-- SELECT id, name, subdomain, status, subscription_expires_at FROM stores;
-- SELECT id, name FROM tenants;
-- SELECT store_id, tenant_id FROM tenant_settings;
-- ============================================================
