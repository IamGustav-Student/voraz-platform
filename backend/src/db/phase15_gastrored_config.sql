-- ============================================================
-- FASE 15: GastroRed — Configuración del Superadmin
-- ============================================================

-- Tabla de configuración global de la plataforma GastroRed
-- (tokens de pago, precios de planes, URLs, etc.)
CREATE TABLE IF NOT EXISTS gastrored_config (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Valores por defecto (se actualizan desde el superadmin panel)
INSERT INTO gastrored_config (key, value) VALUES
  ('mp_access_token',       '')          ON CONFLICT (key) DO NOTHING,
  ('mp_sandbox_mode',       'false')     ON CONFLICT (key) DO NOTHING,
  ('price_full_digital_monthly',  '60000')  ON CONFLICT (key) DO NOTHING,
  ('price_full_digital_annual',   '600000') ON CONFLICT (key) DO NOTHING,
  ('price_expert_monthly',        '100000') ON CONFLICT (key) DO NOTHING,
  ('price_expert_annual',         '1000000') ON CONFLICT (key) DO NOTHING,
  ('trial_days',            '7')         ON CONFLICT (key) DO NOTHING,
  ('frontend_url',          'https://gastrored.com.ar') ON CONFLICT (key) DO NOTHING,
  ('backend_url',           'https://voraz-platform-production.up.railway.app') ON CONFLICT (key) DO NOTHING,
  ('contact_email',         'hola@gastrored.com.ar') ON CONFLICT (key) DO NOTHING;

-- Si GASTRORED_MP_ACCESS_TOKEN está en el env, úsalo como valor inicial
-- (esto es solo un comentario — la app lo hace en runtime)
