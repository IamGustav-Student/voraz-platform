-- ============================================================
-- FASE 18: GastroRed — Admin User por Tenant
--   Permite que el mismo email sea admin de distintos comercios
--   Agrega tenant_id a users para navegación directa
-- ============================================================

-- 1. Quitar UNIQUE global en email (impide que un dueño tenga 2 comercios)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;

-- 2. Unique por (email, store_id) — el mismo email puede existir en N stores
CREATE UNIQUE INDEX IF NOT EXISTS users_email_store_idx ON users(email, store_id);

-- 3. Agregar tenant_id a users (FK directa al tenant)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) REFERENCES tenants(id);

-- 4. Poblar tenant_id desde tenant_settings
UPDATE users u
SET tenant_id = ts.tenant_id_fk
FROM tenant_settings ts
WHERE u.store_id = ts.store_id
  AND u.tenant_id IS NULL;

-- Fallback: store_id=1 → voraz
UPDATE users SET tenant_id = 'voraz' WHERE store_id = 1 AND tenant_id IS NULL;

-- ============================================================
-- FIN FASE 18
-- ============================================================
