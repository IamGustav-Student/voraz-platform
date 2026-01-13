-- 1. Limpieza inicial (por si ejecutamos varias veces)
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS categories;

-- 2. Tabla de Categorías (Ej: Smash, Clásicas, Veggie)
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL, -- Para URLs amigables (ej: /menu/smash)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de Productos (Las Hamburguesas)
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL, -- DECIMAL es vital para dinero
    image_url TEXT, -- Guardaremos la URL de la imagen
    category_id INTEGER REFERENCES categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Datos Iniciales (SEED)

-- Categorías
INSERT INTO categories (name, slug) VALUES 
('Smash Burgers', 'smash'),
('Clásicas', 'clasicas'),
('Veggie', 'veggie'),
('Papas & Sides', 'sides');

-- Productos (Hamburguesas Voraces)
INSERT INTO products (name, description, price, category_id, image_url) VALUES 
('La Voraz Original', 'Doble carne smash, cheddar x4, bacon crujiente y salsa secreta Voraz.', 8500.00, 1, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'),
('Triple Cheese', 'Triple carne, triple cheddar, cebolla caramelizada.', 9200.00, 1, 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80'),
('Classic American', 'Medallón 180g, lechuga, tomate, cebolla morada y mayonesa.', 7800.00, 2, 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80'),
('Veggie Master', 'Medallón de lentejas y not-meat, palta, rúcula y tomate.', 8100.00, 3, 'https://images.unsplash.com/photo-1520072959219-c595dc3f3a2a?auto=format&fit=crop&w=800&q=80'),
('Papas Voraces', 'Papas bastón con cheddar fundido y trocitos de bacon.', 4500.00, 4, 'https://images.unsplash.com/photo-1573080496987-aeb7d53384a3?auto=format&fit=crop&w=800&q=80');