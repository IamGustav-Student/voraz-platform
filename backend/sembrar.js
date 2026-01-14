import pg from 'pg';

// ✅ TU URL DE RAILWAY YA CONFIGURADA (No toques esta línea):
const connectionString = 'postgresql://postgres:EbpUXXiuhkWoDUFKtEmzHxQYIIQDFrDV@trolley.proxy.rlwy.net:43062/railway';

const pool = new pg.Pool({
  connectionString, // Aquí usamos la variable definida arriba
  ssl: { rejectUnauthorized: false } // Obligatorio para Railway
});

const sql = `
-- 1. LIMPIEZA
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS stores CASCADE;
DROP TABLE IF EXISTS influencers CASCADE;
DROP TABLE IF EXISTS videos CASCADE;
DROP TABLE IF EXISTS news CASCADE;

-- 2. TABLAS
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url TEXT,
    category_id INTEGER REFERENCES categories(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(200) NOT NULL,
    hours VARCHAR(100),
    phone VARCHAR(50),
    image_url TEXT,
    map_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE influencers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    social_handle VARCHAR(50),
    review_text TEXT,
    image_url TEXT,
    profile_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE videos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100),
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    content TEXT,
    image_url TEXT,
    published_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. DATOS DE EJEMPLO
INSERT INTO categories (name, slug) VALUES 
('Smash Burgers', 'smash'), ('Clásicas', 'clasicas'), ('Veggie', 'veggie'), ('Papas & Sides', 'sides');

INSERT INTO products (name, description, price, category_id, image_url) VALUES 
('La Voraz Original', 'Doble carne smash, cheddar x4, bacon crujiente.', 8500.00, 1, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd'),
('Triple Cheese', 'Triple carne, triple cheddar, cebolla caramelizada.', 9200.00, 1, 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5'),
('Veggie Master', 'Medallón de lentejas, palta, rúcula y tomate.', 8100.00, 3, 'https://images.unsplash.com/photo-1520072959219-c595dc3f3a2a');

INSERT INTO stores (name, address, hours, image_url) VALUES
('Voraz Palermo', 'Serrano 1520, CABA', 'Lun-Dom: 12pm - 1am', 'https://images.unsplash.com/photo-1552566626-52f8b828add9');

INSERT INTO influencers (name, social_handle, review_text, image_url) VALUES
('La Chica del Brunch', '@chica.brunch', '¡La mejor smash de BsAs!', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330');

INSERT INTO news (title, content, image_url) VALUES
('¡Abrimos nueva sucursal!', 'Llegamos a Caballito.', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5');
`;

async function sembrar() {
  console.log("🌱 Conectando a Railway...");
  try {
    await pool.query(sql);
    console.log("✅ ¡ÉXITO TOTAL! Base de datos sembrada correctamente.");
  } catch (error) {
    console.error("❌ Error al sembrar:", error);
  } finally {
    await pool.end();
  }
}

sembrar();