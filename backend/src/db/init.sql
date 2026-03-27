-- 1. Tabla de Categorías (UTF-8)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL, 
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    image_url TEXT,
    store_id INT
);

-- 2. Tabla de Productos (UTF-8)
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    category_id INTEGER REFERENCES categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    badge VARCHAR(50),
    store_id INT
);

-- 3. Tabla de Locales / Sucursales (UTF-8)
CREATE TABLE IF NOT EXISTS stores (
    id           SERIAL PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    address      TEXT,
    phone        VARCHAR(30),
    image_url    TEXT,
    hours        TEXT,
    lat          FLOAT,
    lng          FLOAT,
    store_id     INT,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Otros Maestros (UTF-8)
CREATE TABLE IF NOT EXISTS news (
    id         SERIAL PRIMARY KEY,
    title      VARCHAR(200) NOT NULL,
    content    TEXT,
    image_url  TEXT,
    date       DATE,
    store_id   INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Siembra básica (Idempotente)
INSERT INTO stores (id, name) VALUES (1, 'Voraz') ON CONFLICT DO NOTHING;

-- Seed de Categorías (UTF-8 Limpio)
INSERT INTO categories (name, slug, store_id) VALUES 
('Smash Burgers', 'smash', 1),
('Clásicas', 'clasicas', 1),
('Veggie', 'veggie', 1),
('Papas & Sides', 'sides', 1)
ON CONFLICT DO NOTHING;

-- Seed de Productos (UTF-8 Limpio)
INSERT INTO products (name, description, price, category_id, stock, store_id) VALUES 
('La Voraz Original', 'Doble carne smash, cheddar x4, bacon crujiente y salsa secreta Voraz.', 8500.00, 1, 100, 1),
('Classic American', 'Medallón 180g, lechuga, tomate, cebolla morada y mayonesa.', 7800.00, 2, 80, 1)
ON CONFLICT DO NOTHING;