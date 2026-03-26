-- ============================================================
-- FASE 36: GastroRed — Agregar Columnas de Auditoría
-- ============================================================
-- Se agregan columnas updated_at a las tablas principales
-- para permitir el correcto funcionamiento de las APIs de edición.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE gastrored_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Opcional: Agregar a otras tablas clave para consistencia
ALTER TABLE stores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE categories ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE news ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
