-- Phase 24: Loyalty Points System
-- Add points earned to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;

-- Add loyalty configuration to tenant_settings
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS points_redeem_value INTEGER DEFAULT 0; -- Pesos per 500 points

-- Add points to users if not present (though it should be there from previous phases)
ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- Add point tracking to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_redeemed INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS points_discount DECIMAL(10, 2) DEFAULT 0;

-- Points history table
CREATE TABLE IF NOT EXISTS points_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    points INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired', 'bonus')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
