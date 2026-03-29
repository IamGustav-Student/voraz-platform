--- Migración para Notificaciones Push (GastroRed)
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(100) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexar por tenant para envíos rápidos por comercio
CREATE INDEX IF NOT EXISTS idx_push_sub_tenant ON push_subscriptions(tenant_id);
