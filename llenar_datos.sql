-- ------------------------------------------------------------
-- 🍔 VORAZ PLATFORM - SCRIPT DE INICIALIZACIÓN MAESTRO
-- ------------------------------------------------------------

-- 1. LIMPIEZA (DROP)
-- Borramos tablas viejas si existen para arrancar limpio.
-- Usamos CASCADE para borrar referencias cruzadas sin errores.
DROP TABLE IF EXISTS news CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS videos CASCADE;
DROP TABLE IF EXISTS influencers CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- ------------------------------------------------------------
-- 2. CREACIÓN DE TABLAS
-- ------------------------------------------------------------

-- Tabla: Categorías del Menú
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: Productos (Hamburguesas)
-- Incluye la columna 'badge' agregada en la Fase 5
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    category_id INTEGER REFERENCES categories(id),
    badge VARCHAR(20) DEFAULT NULL, -- Ej: 'NUEVO', 'PICANTE'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: Influencers (Voraz Squad)
CREATE TABLE influencers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    social_handle VARCHAR(50) NOT NULL,
    image_url TEXT,
    testimonial TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: Videos (Voraz Live)
CREATE TABLE videos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100),
    youtube_id VARCHAR(20) NOT NULL,
    thumbnail_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: Sucursales (Locales)
CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(200) NOT NULL,
    hours VARCHAR(100),
    phone VARCHAR(50),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    delivery_link TEXT,
    waze_link TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: Noticias (Mundo Voraz)
CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    content TEXT,
    image_url TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 3. CARGA DE DATOS (SEEDING)
-- ------------------------------------------------------------

-- Categorías
INSERT INTO categories (name, slug) VALUES 
('Smash Burgers', 'smash'),
('Clásicas', 'clasicas'),
('Veggie', 'veggie'),
('Papas & Sides', 'sides');

-- Productos
INSERT INTO products (name, description, price, category_id, image_url, badge) VALUES 
('La Voraz Original', 'Doble carne smash, cheddar x4, bacon crujiente y salsa secreta Voraz.', 8500.00, 1, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80', 'BEST SELLER'),
('Triple Cheese', 'Triple carne, triple cheddar, cebolla caramelizada.', 9200.00, 1, 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80', 'NUEVO'),
('Classic American', 'Medallón 180g, lechuga, tomate, cebolla morada y mayonesa.', 7800.00, 2, 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80', NULL),
('Veggie Master', 'Medallón de lentejas y not-meat, palta, rúcula y tomate.', 8100.00, 3, 'https://images.unsplash.com/photo-1520072959219-c595dc3f3a2a?auto=format&fit=crop&w=800&q=80', 'VEGGIE'),
('Papas Voraces', 'Papas bastón con cheddar fundido y trocitos de bacon.', 4500.00, 4, 'https://images.unsplash.com/photo-1573080496987-aeb7d53384a3?auto=format&fit=crop&w=800&q=80', 'PICANTE');

-- Influencers
INSERT INTO influencers (name, social_handle, image_url, testimonial) VALUES
('Santi M.', '@santimaratea', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&h=500&fit=crop', 'La Triple Cheese me cambió la vida. Literalmente es otro nivel.'),
('Paulina C.', '@paulinacocina', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&h=500&fit=crop', 'Chicos, la técnica del smash que tienen es impecable. 10/10.'),
('Martín D.', '@coscu', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&h=500&fit=crop', 'Nashe la hamburguesa. Buenardo mal.');

-- Videos
INSERT INTO videos (title, youtube_id, thumbnail_url) VALUES
('Voraz Fest 2025 - Aftermovie Oficial', 'LXb3EKWsInQ', 'https://images.unsplash.com/photo-1470229722913-7ea251b94d58?w=800&q=80'),
('Cómo hacemos la Smash Perfecta', 'p7g8G22hNlY', 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?w=800&q=80');

-- Sucursales
INSERT INTO stores (name, address, hours, phone, lat, lng, delivery_link, waze_link, image_url) VALUES
('Voraz Palermo', 'Gorriti 4300, Palermo Soho', 'Lun-Dom 12:00 - 00:00', '11-5555-0001', -34.5913, -58.4231, 'https://www.pedidosya.com.ar', 'https://waze.com/ul', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80'),
('Voraz Belgrano', 'Av. Cabildo 2000, Belgrano', 'Mar-Dom 11:00 - 01:00', '11-5555-0002', -34.5613, -58.4561, 'https://www.rappi.com.ar', 'https://maps.google.com', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80'),
('Voraz Recoleta', 'Vicente López 1800, Recoleta', 'Lun-Dom 11:00 - 23:00', '11-5555-0003', -34.5889, -58.3900, 'https://www.pedidosya.com.ar', 'https://maps.google.com', 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80');

-- Noticias
INSERT INTO news (title, content, image_url, date) VALUES
('¡Abrimos nueva sucursal en Devoto!', 'La familia Voraz sigue creciendo. Vení a conocer nuestro nuevo local con terraza y arcade free.', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80', '2025-12-01'),
('Lanzamiento: La Triple Bikini Bottom', 'Una colaboración exclusiva con Bob Esponja. Disponible por tiempo limitado en todos los locales.', 'https://images.unsplash.com/photo-1596662951482-0c4ba74a6df6?w=800&q=80', '2026-01-10'),
('Sorteo de Entradas: Lollapalooza', 'Comiendo una Voraz Original participás por pases VIP. Escaneá el QR de tu bandeja.', 'https://images.unsplash.com/photo-1459749411177-d4a414c9ff5f?w=800&q=80', '2026-01-05');