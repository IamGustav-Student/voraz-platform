-- phase27_promos.sql
-- Sistema de promociones dinámico por tenant

CREATE TABLE IF NOT EXISTS promos (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(50) NOT NULL,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    promo_type VARCHAR(50) DEFAULT 'Libre', -- 'Libre', '2x1', '3x2', etc.
    price DECIMAL(10, 2),
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_promos_tenant ON promos(tenant_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_promos_updated_at') THEN
        CREATE TRIGGER update_promos_updated_at
        BEFORE UPDATE ON promos
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
