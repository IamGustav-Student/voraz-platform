-- Fase 11: Configuración por tenant (MercadoPago y ajustes generales)

CREATE TABLE IF NOT EXISTS tenant_settings (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(50) UNIQUE NOT NULL DEFAULT 'voraz',
  mp_access_token TEXT,
  mp_public_key TEXT,
  mp_sandbox BOOLEAN DEFAULT false,
  mp_webhook_secret TEXT,
  store_name VARCHAR(100),
  store_email VARCHAR(150),
  store_phone VARCHAR(30),
  store_address TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar fila base para el tenant por defecto si no existe
INSERT INTO tenant_settings (tenant_id)
VALUES ('voraz')
ON CONFLICT (tenant_id) DO NOTHING;
