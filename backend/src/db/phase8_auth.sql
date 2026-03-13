-- FASE 8: Fidelización — Auth, Puntos y Cupones

-- Usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(200),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    google_id VARCHAR(100) UNIQUE,
    avatar_url TEXT,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Historial de puntos
CREATE TABLE IF NOT EXISTS points_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id),
    points INTEGER NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('earned', 'redeemed', 'bonus')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cupones de descuento
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(10) NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order DECIMAL(10, 2) DEFAULT 0,
    max_uses INTEGER DEFAULT NULL,
    used_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usos de cupones
CREATE TABLE IF NOT EXISTS coupon_uses (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER NOT NULL REFERENCES coupons(id),
    user_id INTEGER REFERENCES users(id),
    order_id INTEGER REFERENCES orders(id),
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Extender tabla orders para fidelización
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_id INTEGER REFERENCES coupons(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_redeemed INTEGER DEFAULT 0;

-- Cupones demo (Corrección de conflictos de inserción multi-tenant)
INSERT INTO coupons (code, description, discount_type, discount_value, min_order)
VALUES ('VORAZ10', '10% de descuento en tu pedido', 'percentage', 10, 0)
ON CONFLICT DO NOTHING;

INSERT INTO coupons (code, description, discount_type, discount_value, min_order)
VALUES ('BIENVENIDO', '$500 de descuento en pedidos mayores a $3000', 'fixed', 500, 3000)
ON CONFLICT DO NOTHING;

INSERT INTO coupons (code, description, discount_type, discount_value, min_order)
VALUES ('VORAZFAN', '15% para los más fanáticos', 'percentage', 15, 5000)
ON CONFLICT DO NOTHING;