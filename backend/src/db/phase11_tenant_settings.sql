-- Fase 11: Configuración por tenant (MercadoPago, branding y ajustes generales)

CREATE TABLE IF NOT EXISTS tenant_settings (
  id                      SERIAL PRIMARY KEY,
  tenant_id               VARCHAR(50) UNIQUE NOT NULL DEFAULT 'voraz',
  tenant_id_fk            VARCHAR(50),
  mp_access_token         TEXT,
  mp_public_key           TEXT,
  mp_sandbox              BOOLEAN DEFAULT false,
  mp_webhook_secret       TEXT,
  store_name              VARCHAR(100),
  store_email             VARCHAR(150),
  store_phone             VARCHAR(30),
  store_address           TEXT,
  cash_on_delivery        BOOLEAN DEFAULT true,
  primary_color           VARCHAR(20),
  secondary_color         VARCHAR(20),
  font_family             VARCHAR(50),
  logo_url                TEXT,
  custom_branding_enabled BOOLEAN DEFAULT FALSE,
  updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Columnas agregadas en fases posteriores (idempotentes)
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS tenant_id_fk VARCHAR(50);
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS cash_on_delivery BOOLEAN DEFAULT true;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20);
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS secondary_color VARCHAR(20);
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS font_family VARCHAR(50);
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS custom_branding_enabled BOOLEAN DEFAULT FALSE;

-- Sincronizar tenant_id_fk con tenant_id en filas existentes
UPDATE tenant_settings SET tenant_id_fk = tenant_id WHERE tenant_id_fk IS NULL;

-- Índices
CREATE INDEX IF NOT EXISTS idx_tenant_settings_fk ON tenant_settings(tenant_id_fk);

-- Fila base para voraz
INSERT INTO tenant_settings (tenant_id, tenant_id_fk)
VALUES ('voraz', 'voraz')
ON CONFLICT (tenant_id) DO UPDATE SET tenant_id_fk = EXCLUDED.tenant_id_fk
  WHERE tenant_settings.tenant_id_fk IS NULL;
