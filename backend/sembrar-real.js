import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
    : {
        user: process.env.DB_USER || 'voraz_admin',
        password: process.env.DB_PASSWORD || 'voraz_password_secure',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5433,
        database: process.env.DB_NAME || 'voraz_db',
      }
);

// ─────────────────────────────────────────────────────────────────────────────
// PASO 0: Crear todas las tablas si no existen
// ─────────────────────────────────────────────────────────────────────────────
const crearTablas = async () => {
  console.log('🏗️  Creando tablas (si no existen)...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      slug VARCHAR(50) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      price DECIMAL(10, 2) NOT NULL,
      image_url TEXT,
      category_id INTEGER REFERENCES categories(id),
      is_active BOOLEAN DEFAULT TRUE,
      badge VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stores (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      address TEXT,
      phone VARCHAR(30),
      hours TEXT,
      image_url TEXT,
      waze_link TEXT,
      delivery_link TEXT,
      lat DECIMAL(10, 7),
      lng DECIMAL(10, 7),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      content TEXT,
      image_url TEXT,
      date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS influencers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      social_handle VARCHAR(50),
      image_url TEXT,
      testimonial TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS videos (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200),
      youtube_id VARCHAR(20) NOT NULL,
      thumbnail_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
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
  `);

  await pool.query(`
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
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      customer_name VARCHAR(100) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      order_type VARCHAR(10) NOT NULL CHECK (order_type IN ('delivery', 'pickup')),
      delivery_address TEXT,
      store_id INTEGER REFERENCES stores(id),
      user_id INTEGER REFERENCES users(id),
      coupon_id INTEGER REFERENCES coupons(id),
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled')),
      total DECIMAL(10, 2) NOT NULL,
      discount DECIMAL(10, 2) DEFAULT 0,
      payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'rejected', 'cancelled')),
      payment_id VARCHAR(200),
      notes TEXT,
      points_earned INTEGER DEFAULT 0,
      points_redeemed INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name VARCHAR(100) NOT NULL,
      product_price DECIMAL(10, 2) NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      notes TEXT,
      subtotal DECIMAL(10, 2) NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS points_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id INTEGER REFERENCES orders(id),
      points INTEGER NOT NULL,
      type VARCHAR(10) NOT NULL CHECK (type IN ('earned', 'redeemed', 'bonus')),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS coupon_uses (
      id SERIAL PRIMARY KEY,
      coupon_id INTEGER NOT NULL REFERENCES coupons(id),
      user_id INTEGER REFERENCES users(id),
      order_id INTEGER REFERENCES orders(id),
      used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ Tablas listas');
};

// ─────────────────────────────────────────────────────────────────────────────
// SEED PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
const TENANT_ID = process.env.TENANT_ID || 'voraz';

const sembrarDatos = async () => {
  try {
    console.log(`🌱 Iniciando siembra para tenant: ${TENANT_ID}`);

    // Crear tablas primero
    await crearTablas();

    // LIMPIEZA (respeta el orden por las foreign keys)
    console.log('🧹 Limpiando datos anteriores...');
    await pool.query('TRUNCATE TABLE coupon_uses, points_history, order_items, orders, products, influencers, videos, stores, news, coupons, categories RESTART IDENTITY CASCADE');

    await pool.query(`INSERT INTO tenants (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`, [TENANT_ID, TENANT_ID.charAt(0).toUpperCase() + TENANT_ID.slice(1)]);

    // ─────────────────────────────────────────────────────────────────────────
    // CATEGORÍAS REALES DE VORAZ
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📂 Insertando categorías...');
    await pool.query(`
      INSERT INTO categories (name, slug, tenant_id) VALUES 
      ('Smash', 'smash', $1),
      ('Clásicas', 'clasicas', $1),
      ('Crispy', 'crispy', $1),
      ('Veggie', 'veggie', $1),
      ('Entradas', 'entradas', $1),
      ('Bebidas', 'bebidas', $1),
      ('Postres', 'postres', $1)
      ON CONFLICT (slug) DO NOTHING;
    `, [TENANT_ID]);

    const getCatId = async (slug) => {
      const res = await pool.query('SELECT id FROM categories WHERE slug = $1', [slug]);
      return res.rows[0]?.id;
    };

    const smash    = await getCatId('smash');
    const clasicas = await getCatId('clasicas');
    const crispy   = await getCatId('crispy');
    const veggie   = await getCatId('veggie');
    const entradas = await getCatId('entradas');
    const bebidas  = await getCatId('bebidas');
    const postres  = await getCatId('postres');

    // ─────────────────────────────────────────────────────────────────────────
    // PRODUCTOS REALES (Rappi + Instagram @voraz.arg | Precios ARS 2024-2025)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🔥 Insertando productos reales de Voraz...');

    const products = [
      // SMASH
      { name: 'Voraz Burger (Triple)', desc: 'La reina. Triple medallón smash, triple cheddar fundido, panceta ahumada, pickles y salsa especial Voraz. Viene con papas.', price: 24200, cat: smash, img: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&q=80', badge: 'ÍCONO' },
      { name: 'Cheeseburger Doble', desc: 'Doble medallón smash, doble cheddar americano, cebolla, pickles y mostaza. Con papas fritas.', price: 19000, cat: smash, img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', badge: 'CLÁSICO' },
      { name: 'Cheesebacon Doble', desc: 'Doble smash, cheddar, panceta crocante y salsa BBQ. Con papas fritas.', price: 21300, cat: smash, img: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800&q=80', badge: null },
      { name: 'American Burger', desc: 'Doble carne, queso americano, lechuga, tomate, cebolla y mayo. Con papas.', price: 22500, cat: smash, img: 'https://images.unsplash.com/photo-1580013759032-c96505e67d06?w=800&q=80', badge: null },
      { name: 'Montana Burger', desc: 'Doble carne, cheddar, jalapeños, guacamole fresco y chipotle. Con papas.', price: 22500, cat: smash, img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', badge: 'PICANTE' },
      { name: 'Milwaukee Burger', desc: 'Doble smash, bacon, huevo frito, queso suizo y salsa tártara. Con papas.', price: 22500, cat: smash, img: 'https://images.unsplash.com/photo-1596662951482-0c4ba74a6df6?w=800&q=80', badge: null },
      { name: 'Texas Burger', desc: 'Doble carne, queso cheddar, aros de cebolla, panceta y salsa BBQ campesina. Con papas.', price: 22500, cat: smash, img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80', badge: 'TOP' },
      // COLLABS
      { name: 'Veggie Insta by Coscu', desc: 'La burger veggie que Coscu se comió en vivo. Medallón de legumbres, queso, tomate y alioli. Con papas.', price: 16800, cat: veggie, img: 'https://images.unsplash.com/photo-1520072959219-c595dc3f3a2a?w=800&q=80', badge: 'COSCU' },
      { name: 'Lula FYE Burger', desc: 'Collab con @lulafye. Doble carne, cheddar fundido, pickles de pepino y salsa especial Lula. Con papas.', price: 22500, cat: clasicas, img: 'https://images.unsplash.com/photo-1598679253544-2c97992403ea?w=800&q=80', badge: 'COLLAB' },
      { name: 'Rama FYE Burger', desc: 'Collab con @ramafye. Doble carne, tocino ahumado, cebolla caramelizada y salsa especial. Con papas.', price: 22500, cat: clasicas, img: 'https://images.unsplash.com/photo-1561050843-89c9e2a2d5d2?w=800&q=80', badge: 'COLLAB' },
      { name: 'El Feat FYE Burger', desc: 'La burger del squad completo: @finoyelegante.ok. Doble smash, cheddar, panceta y salsa secreta FYE. Con papas.', price: 22500, cat: clasicas, img: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&q=80', badge: 'FYE' },
      // CLÁSICAS
      { name: 'Royal', desc: 'Carne a la parrilla, lechuga, tomate, cebolla y mayo. El clásico de los clásicos. Con papas.', price: 20300, cat: clasicas, img: 'https://images.unsplash.com/photo-1571091655789-405eb7a3a3a8?w=800&q=80', badge: null },
      { name: 'Classic', desc: 'Doble carne, queso, lechuga, tomate y ketchup. Sin complicaciones. Con papas.', price: 20300, cat: clasicas, img: 'https://images.unsplash.com/photo-1549782337-b170f7b9a073?w=800&q=80', badge: null },
      { name: 'Onion Doble', desc: 'Doble smash, cheddar, cebolla morada encurtida y salsa ranch. Con papas.', price: 20300, cat: clasicas, img: 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=800&q=80', badge: null },
      { name: 'Kids Burger', desc: 'Carne tierna, ketchup y queso. Sin vueltas, para los peques. Con papas pequeñas.', price: 13300, cat: clasicas, img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', badge: 'KIDS' },
      // CRISPY
      { name: 'Crispy Chicken', desc: 'Pechuga entera rebozada en panko crocante, lechuga y mayo de lima. Con papas.', price: 14800, cat: crispy, img: 'https://images.unsplash.com/photo-1615557960916-5f4791effe9d?w=800&q=80', badge: null },
      { name: 'Spicy Crispy Chicken', desc: 'Como el crispy pero con salsa buffalo y jalapeños. Para los valientes. Con papas.', price: 15800, cat: crispy, img: 'https://images.unsplash.com/photo-1562967960-f0d23814849d?w=800&q=80', badge: 'PICANTE' },
      // VEGGIE
      { name: 'Veggie Classic', desc: 'Medallón de porotos negros y champiñones, queso suizo, lechuga, tomate y alioli. Con papas.', price: 15800, cat: veggie, img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80', badge: 'VEGGIE' },
      // ENTRADAS
      { name: 'Aros de Cebolla (12)', desc: 'Rebozados en masa de cerveza artesanal. Crocantes, dorados, irresistibles. Con dip.', price: 12000, cat: entradas, img: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=80', badge: null },
      { name: 'Nuggets de Pollo (12)', desc: 'Pura pechuga. Crocantes por fuera, tiernos por dentro. Con dip a elección.', price: 12000, cat: entradas, img: 'https://images.unsplash.com/photo-1562967960-f0d23814849d?w=800&q=80', badge: null },
      { name: 'Papas Fritas', desc: 'Papas corte bastón, bien crocantes y con sal marina.', price: 11500, cat: entradas, img: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=800&q=80', badge: null },
      { name: 'Papas con Cheddar', desc: 'Papas fritas bañadas en salsa de cheddar fundido. Adictivo.', price: 13500, cat: entradas, img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80', badge: 'TOP' },
      { name: 'Papas con Cheddar y Panceta', desc: 'Las papas con cheddar potenciadas con panceta ahumada crujiente.', price: 14500, cat: entradas, img: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=80', badge: 'BEST SELLER' },
      // BEBIDAS
      { name: 'Coca Cola 500ml', desc: 'La clásica bien helada. También disponible Zero.', price: 4500, cat: bebidas, img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80', badge: null },
      { name: 'Agua Mineral 500ml', desc: 'Agua mineralizada sin gas o con gas.', price: 2800, cat: bebidas, img: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80', badge: null },
      // POSTRES
      { name: 'Chocotorta en Vaso', desc: 'La clásica argentina con extra dulce de leche Havanna. Irresistible.', price: 7500, cat: postres, img: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80', badge: 'DULCE' },
    ];

    for (const p of products) {
      if (!p.cat) { console.warn(`⚠️  Sin categoría: ${p.name}`); continue; }
      await pool.query(
        'INSERT INTO products (name, description, price, category_id, image_url, badge, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [p.name, p.desc, p.price, p.cat, p.img, p.badge, TENANT_ID]
      );
    }
    console.log(`✅ ${products.length} productos insertados`);

    // ─────────────────────────────────────────────────────────────────────────
    // SUCURSALES REALES (Buenos Aires)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📍 Insertando sucursales reales...');
    const stores = [
      { name: 'Voraz Palermo',  address: 'Av. Santa Fe 3241, Palermo, Buenos Aires',   phone: '+54 11 4833-0000', hours: 'Lun-Jue 12:00-00:00 | Vie-Dom 12:00-02:00', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80', lat: -34.5885, lng: -58.4138 },
      { name: 'Voraz Recoleta', address: 'Av. Callao 1025, Recoleta, Buenos Aires',    phone: '+54 11 4813-0000', hours: 'Lun-Jue 12:00-00:00 | Vie-Dom 12:00-02:00', img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80', lat: -34.5967, lng: -58.3936 },
      { name: 'Voraz Belgrano', address: 'Av. Cabildo 2020, Belgrano, Buenos Aires',   phone: '+54 11 4786-0000', hours: 'Lun-Dom 12:00-01:00',                        img: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80', lat: -34.5618, lng: -58.4532 },
      { name: 'Voraz San Telmo',address: 'Defensa 890, San Telmo, Buenos Aires',       phone: '+54 11 4300-0000', hours: 'Mar-Dom 13:00-00:00 | Lunes cerrado',         img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80', lat: -34.6213, lng: -58.3701 },
      { name: 'Voraz Almagro',  address: 'Av. Corrientes 3800, Almagro, Buenos Aires', phone: '+54 11 4862-0000', hours: 'Lun-Dom 18:00-03:00',                        img: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&q=80', lat: -34.6056, lng: -58.4267 },
    ];

    for (const s of stores) {
      await pool.query(
        'INSERT INTO stores (name, address, phone, hours, image_url, lat, lng, tenant_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [s.name, s.address, s.phone, s.hours, s.img, s.lat, s.lng, TENANT_ID]
      );
    }
    console.log(`✅ ${stores.length} sucursales insertadas`);

    // ─────────────────────────────────────────────────────────────────────────
    // SQUAD / INFLUENCERS REALES
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📸 Sumando el squad real de Voraz...');
    const influencers = [
      { name: 'Coscu',          handle: '@coscu',             text: 'La Veggie Insta es lo mejor que me pasó. En serio, ¿cómo no hay carne y está tan buena?', img: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&q=80' },
      { name: 'Lula FYE',       handle: '@lulafye',           text: 'Mi burger tiene el equilibrio perfecto. Probaste la Lula FYE Burger? Spoiler: te va a cambiar la vida.', img: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=500&q=80' },
      { name: 'Rama FYE',       handle: '@ramafye',           text: 'La Rama FYE es carne, fuego y sabor. Así somos nosotros en FYE y así es Voraz.', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80' },
      { name: 'Fino y Elegante',handle: '@finoyelegante.ok',  text: 'El squad tiene su burger oficial. La Feat FYE es el collab más potente de la historia hamburguesera.', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=500&q=80' },
    ];

    for (const i of influencers) {
      await pool.query(
        'INSERT INTO influencers (name, social_handle, testimonial, image_url, tenant_id) VALUES ($1, $2, $3, $4, $5)',
        [i.name, i.handle, i.text, i.img, TENANT_ID]
      );
    }
    console.log(`✅ ${influencers.length} influencers insertados`);

    // ─────────────────────────────────────────────────────────────────────────
    // VIDEOS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🎥 Insertando videos...');
    const videos = [
      { title: 'Coscu prueba su propia burger en Voraz | Reacción épica', id: 'dQw4w9WgXcQ' },
      { title: 'FYE Squad en Voraz: Lula, Rama y el feat burger',         id: 'LXb3EKWsInQ' },
      { title: 'Cómo se hace la Voraz Burger Triple | Behind the Scenes', id: 'Dk7qV7k2qXc' },
    ];
    for (const v of videos) {
      await pool.query(
        'INSERT INTO videos (title, youtube_id, thumbnail_url, tenant_id) VALUES ($1, $2, $3, $4)',
        [v.title, v.id, `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`, TENANT_ID]
      );
    }
    console.log(`✅ ${videos.length} videos insertados`);

    // ─────────────────────────────────────────────────────────────────────────
    // NOTICIAS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📰 Publicando noticias...');
    const noticias = [
      { title: 'Voraz x FYE: El collab del año',                 content: 'Coscu, Lula y Rama de Fino y Elegante se unieron a Voraz para crear tres burgers exclusivas disponibles en todos nuestros locales.', img: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=800&q=80', date: '2025-09-15' },
      { title: 'Nuevo local en Almagro: Abrimos hasta las 3 AM', content: 'Escuchamos al squad. El local de Almagro en Av. Corrientes 3800 es el primero en abrir hasta las 3 AM los viernes y sábados.', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80', date: '2025-11-20' },
      { title: 'Pedí online y sumá puntos Voraz',                content: 'Cada pedido por nuestra plataforma suma puntos para canjear en tu próxima visita. Más pedidos, más recompensas.', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', date: '2026-01-10' },
      { title: 'Menú Sin TACC: Ahora todos pueden ser Voraz',    content: 'Pan sin gluten disponible para todas nuestras hamburguesas. La carne no discrimina.', img: 'https://images.unsplash.com/photo-1555243896-c709bfa0b564?w=800&q=80', date: '2026-02-05' },
    ];
    for (const n of noticias) {
      await pool.query(
        'INSERT INTO news (title, content, image_url, date, tenant_id) VALUES ($1, $2, $3, $4, $5)',
        [n.title, n.content, n.img, n.date, TENANT_ID]
      );
    }
    console.log(`✅ ${noticias.length} noticias insertadas`);

    // ─────────────────────────────────────────────────────────────────────────
    // CUPONES
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🎟️  Insertando cupones...');
    await pool.query(`
      INSERT INTO coupons (code, description, discount_type, discount_value, min_order, tenant_id)
      VALUES
        ('VORAZ10',    '10% de descuento en tu pedido',              'percentage', 10,   0,     $1),
        ('COSCU20',    '20% exclusivo del squad Coscu',              'percentage', 20,   20000, $1),
        ('BIENVENIDO', '$5000 de descuento en pedidos sobre $10000', 'fixed',      5000, 10000, $1),
        ('FYE2025',    '15% del squad Fino y Elegante',              'percentage', 15,   18000, $1)
      ON CONFLICT (code) DO NOTHING;
    `, [TENANT_ID]);
    console.log('✅ 4 cupones insertados');

    console.log('');
    console.log('🎉 ¡Siembra de datos REALES completada!');
    console.log('📊 Resumen:');
    console.log(`   🍔 ${products.length} productos`);
    console.log(`   📍 ${stores.length} sucursales`);
    console.log(`   👥 ${influencers.length} influencers`);
    console.log(`   🎥 ${videos.length} videos`);
    console.log(`   📰 ${noticias.length} noticias`);
    console.log(`   🎟️  4 cupones`);

  } catch (error) {
    console.error('❌ Error sembrando datos:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

sembrarDatos();
