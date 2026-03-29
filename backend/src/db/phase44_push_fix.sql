--- Fase 44: Corrección y Aseguramiento de Tabla para Notificaciones Push (GastroRed)
--- Esta migración asegura que la tabla exista con los tipos de datos correctos para el entorno SaaS.

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tenant_id VARCHAR(100) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    endpoint TEXT UNIQUE NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Asegurar el índice para rendimiento en envíos masivos por comercio
CREATE INDEX IF NOT EXISTS idx_push_tenant_v44 ON push_subscriptions(tenant_id);

--- Fin de Fase 44
