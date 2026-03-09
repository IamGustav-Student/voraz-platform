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
// Configuración: qué store_id se va a sembrar
// Pasá STORE_ID=2 para sembrar un tenant diferente sin tocar el id=1
// ─────────────────────────────────────────────────────────────────────────────
const STORE_ID = parseInt(process.env.STORE_ID || '1');

console.log(`\n🌱 GastroRed — Seeder para store_id=${STORE_ID}`);
console.log('─'.repeat(50));

// ─────────────────────────────────────────────────────────────────────────────
// PASO 0: Crear tablas base si no existen
// ─────────────────────────────────────────────────────────────────────────────
const crearTablas = async () => {
  console.log('🏗️  Verificando tablas...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      slug VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      image_url TEXT,
      store_id INT,
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
      store_id INT,
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
      store_id INT,
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
      store_id INT,
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
      store_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS videos (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200),
      youtube_id VARCHAR(50) NOT NULL,
      thumbnail_url TEXT,
      store_id INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ Tablas verificadas');
};

// ─────────────────────────────────────────────────────────────────────────────
// SEED PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
const sembrarDatos = async () => {
  try {
    await crearTablas();

    // Limpiar solo datos del store_id objetivo (no borra otros tenants)
    console.log(`🧹 Limpiando datos para store_id=${STORE_ID}...`);
    await pool.query('DELETE FROM products    WHERE store_id=$1', [STORE_ID]);
    await pool.query('DELETE FROM categories  WHERE store_id=$1', [STORE_ID]);
    await pool.query('DELETE FROM influencers WHERE store_id=$1', [STORE_ID]);
    await pool.query('DELETE FROM videos      WHERE store_id=$1', [STORE_ID]);
    await pool.query('DELETE FROM news        WHERE store_id=$1', [STORE_ID]);
    // Sucursales hijas (store_id = STORE_ID, pero id != STORE_ID)
    await pool.query('DELETE FROM stores WHERE store_id=$1 AND id!=$1', [STORE_ID]);

    // ─────────────────────────────────────────────────────────────────────────
    // CATEGORÍAS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📂 Insertando categorías...');
    await pool.query(`
      INSERT INTO categories (name, slug, store_id) VALUES
      ('Smash',    'smash-${STORE_ID}',    $1),
      ('Clásicas', 'clasicas-${STORE_ID}', $1),
      ('Crispy',   'crispy-${STORE_ID}',   $1),
      ('Veggie',   'veggie-${STORE_ID}',   $1),
      ('Entradas', 'entradas-${STORE_ID}', $1),
      ('Bebidas',  'bebidas-${STORE_ID}',  $1),
      ('Postres',  'postres-${STORE_ID}',  $1)
    `, [STORE_ID]);

    const getCatId = async (slug) => {
      const res = await pool.query('SELECT id FROM categories WHERE slug = $1', [`${slug}-${STORE_ID}`]);
      return res.rows[0]?.id;
    };

    const smash = await getCatId('smash');
    const clasicas = await getCatId('clasicas');
    const crispy = await getCatId('crispy');
    const veggie = await getCatId('veggie');
    const entradas = await getCatId('entradas');
    const bebidas = await getCatId('bebidas');
    const postres = await getCatId('postres');

    // ─────────────────────────────────────────────────────────────────────────
    // PRODUCTOS REALES (Voraz — Precios ARS 2025)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🔥 Insertando productos...');

    const products = [
      // SMASH
      { name: 'Voraz Burger (Triple)', desc: 'La reina. Triple medallón smash, triple cheddar fundido, panceta ahumada, pickles y salsa especial Voraz. Viene con papas.', price: 24200, cat: smash, img: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&q=80', badge: 'ÍCONO' },
      { name: 'Cheeseburger Doble', desc: 'Doble medallón smash, doble cheddar americano, cebolla, pickles y mostaza. Con papas fritas.', price: 19000, cat: smash, img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', badge: 'CLÁSICO' },
      { name: 'Cheesebacon Doble', desc: 'Doble smash, cheddar, panceta crocante y salsa BBQ. Con papas fritas.', price: 21300, cat: smash, img: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800&q=80', badge: null },
      { name: 'American Burger', desc: 'Doble carne, queso americano, lechuga, tomate, cebolla y mayo. Con papas.', price: 22500, cat: smash, img: 'https://images.unsplash.com/photo-1580013759032-c96505e67d06?w=800&q=80', badge: null },
      { name: 'Montana Burger', desc: 'Doble carne, cheddar, jalapeños, guacamole fresco y chipotle. Con papas.', price: 22500, cat: smash, img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', badge: 'PICANTE' },
      { name: 'Texas Burger', desc: 'Doble carne, queso cheddar, aros de cebolla, panceta y salsa BBQ campesina. Con papas.', price: 22500, cat: smash, img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80', badge: 'TOP' },
      // COLLABS
      { name: 'Veggie Insta by Coscu', desc: 'Medallón de legumbres, queso, tomate y alioli. Con papas.', price: 16800, cat: veggie, img: 'https://images.unsplash.com/photo-1520072959219-c595dc3f3a2a?w=800&q=80', badge: 'COSCU' },
      { name: 'Lula FYE Burger', desc: 'Collab con @lulafye. Doble carne, cheddar, pickles y salsa especial Lula. Con papas.', price: 22500, cat: clasicas, img: 'https://images.unsplash.com/photo-1598679253544-2c97992403ea?w=800&q=80', badge: 'COLLAB' },
      { name: 'Rama FYE Burger', desc: 'Collab con @ramafye. Doble carne, tocino ahumado, cebolla caramelizada. Con papas.', price: 22500, cat: clasicas, img: 'https://images.unsplash.com/photo-1561050843-89c9e2a2d5d2?w=800&q=80', badge: 'COLLAB' },
      // CLÁSICAS
      { name: 'Royal', desc: 'Carne a la parrilla, lechuga, tomate, cebolla y mayo. Con papas.', price: 20300, cat: clasicas, img: 'https://images.unsplash.com/photo-1571091655789-405eb7a3a3a8?w=800&q=80', badge: null },
      { name: 'Classic', desc: 'Doble carne, queso, lechuga, tomate y ketchup. Sin complicaciones. Con papas.', price: 20300, cat: clasicas, img: 'https://images.unsplash.com/photo-1549782337-b170f7b9a073?w=800&q=80', badge: null },
      { name: 'Kids Burger', desc: 'Carne tierna, ketchup y queso. Con papas pequeñas.', price: 13300, cat: clasicas, img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', badge: 'KIDS' },
      // CRISPY
      { name: 'Crispy Chicken', desc: 'Pechuga entera rebozada en panko crocante, lechuga y mayo de lima. Con papas.', price: 14800, cat: crispy, img: 'https://images.unsplash.com/photo-1615557960916-5f4791effe9d?w=800&q=80', badge: null },
      { name: 'Spicy Crispy Chicken', desc: 'Como el crispy pero con salsa buffalo y jalapeños. Con papas.', price: 15800, cat: crispy, img: 'https://images.unsplash.com/photo-1562967960-f0d23814849d?w=800&q=80', badge: 'PICANTE' },
      // VEGGIE
      { name: 'Veggie Classic', desc: 'Medallón de porotos y champiñones, queso suizo, lechuga, tomate y alioli. Con papas.', price: 15800, cat: veggie, img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80', badge: 'VEGGIE' },
      // ENTRADAS
      { name: 'Aros de Cebolla (12)', desc: 'Rebozados en masa de cerveza artesanal. Crocantes y dorados. Con dip.', price: 12000, cat: entradas, img: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=80', badge: null },
      { name: 'Nuggets de Pollo (12)', desc: 'Pura pechuga. Crocantes por fuera, tiernos por dentro. Con dip a elección.', price: 12000, cat: entradas, img: 'https://images.unsplash.com/photo-1562967960-f0d23814849d?w=800&q=80', badge: null },
      { name: 'Papas Fritas', desc: 'Papas corte bastón, bien crocantes y con sal marina.', price: 11500, cat: entradas, img: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=800&q=80', badge: null },
      { name: 'Papas con Cheddar', desc: 'Papas fritas bañadas en salsa de cheddar fundido.', price: 13500, cat: entradas, img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80', badge: 'TOP' },
      { name: 'Papas con Cheddar y Panceta', desc: 'Las papas con cheddar potenciadas con panceta ahumada crujiente.', price: 14500, cat: entradas, img: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=80', badge: 'BEST SELLER' },
      // BEBIDAS
      { name: 'Coca Cola 500ml', desc: 'La clásica bien helada. También disponible Zero.', price: 4500, cat: bebidas, img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80', badge: null },
      { name: 'Agua Mineral 500ml', desc: 'Sin gas o con gas.', price: 2800, cat: bebidas, img: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80', badge: null },
      // POSTRES
      { name: 'Chocotorta en Vaso', desc: 'La clásica argentina con extra dulce de leche Havanna.', price: 7500, cat: postres, img: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80', badge: 'DULCE' },
    ];

    for (const p of products) {
      if (!p.cat) { console.warn(`⚠️  Sin categoría: ${p.name}`); continue; }
      await pool.query(
        'INSERT INTO products (name, description, price, category_id, image_url, badge, store_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [p.name, p.desc, p.price, p.cat, p.img, p.badge, STORE_ID]
      );
    }
    console.log(`✅ ${products.length} productos insertados`);

    // ─────────────────────────────────────────────────────────────────────────
    // SUCURSALES REALES (Buenos Aires)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📍 Insertando sucursales reales...');
    const branchStores = [
      { name: 'Voraz Palermo', address: 'Av. Santa Fe 3241, Palermo, Buenos Aires', phone: '+54 11 4833-0000', hours: 'Lun-Jue 12:00-00:00 | Vie-Dom 12:00-02:00', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80', lat: -34.5885, lng: -58.4138 },
      { name: 'Voraz Recoleta', address: 'Av. Callao 1025, Recoleta, Buenos Aires', phone: '+54 11 4813-0000', hours: 'Lun-Jue 12:00-00:00 | Vie-Dom 12:00-02:00', img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80', lat: -34.5967, lng: -58.3936 },
      { name: 'Voraz Belgrano', address: 'Av. Cabildo 2020, Belgrano, Buenos Aires', phone: '+54 11 4786-0000', hours: 'Lun-Dom 12:00-01:00', img: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=800&q=80', lat: -34.5618, lng: -58.4532 },
      { name: 'Voraz San Telmo', address: 'Defensa 890, San Telmo, Buenos Aires', phone: '+54 11 4300-0000', hours: 'Mar-Dom 13:00-00:00 | Lunes cerrado', img: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80', lat: -34.6213, lng: -58.3701 },
      { name: 'Voraz Almagro', address: 'Av. Corrientes 3800, Almagro, Buenos Aires', phone: '+54 11 4862-0000', hours: 'Lun-Dom 18:00-03:00', img: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&q=80', lat: -34.6056, lng: -58.4267 },
    ];

    for (const s of branchStores) {
      await pool.query(
        'INSERT INTO stores (name, address, phone, hours, image_url, lat, lng, store_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [s.name, s.address, s.phone, s.hours, s.img, s.lat, s.lng, STORE_ID]
      );
    }
    console.log(`✅ ${branchStores.length} sucursales insertadas`);

    // ─────────────────────────────────────────────────────────────────────────
    // INFLUENCERS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📸 Insertando squad...');
    const influencers = [
      { name: 'Coscu', handle: '@coscu', text: 'La Veggie Insta es lo mejor que me pasó. En serio, ¿cómo no hay carne y está tan buena?', img: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&q=80' },
      { name: 'Lula FYE', handle: '@lulafye', text: 'Mi burger tiene el equilibrio perfecto. Probaste la Lula FYE? Spoiler: te va a cambiar la vida.', img: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=500&q=80' },
      { name: 'Rama FYE', handle: '@ramafye', text: 'La Rama FYE es carne, fuego y sabor. Así somos en FYE y así es Voraz.', img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80' },
      { name: 'Fino y Elegante', handle: '@finoyelegante.ok', text: 'La Feat FYE es el collab más potente de la historia hamburguesera.', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=500&q=80' },
    ];

    for (const i of influencers) {
      await pool.query(
        'INSERT INTO influencers (name, social_handle, testimonial, image_url, store_id) VALUES ($1,$2,$3,$4,$5)',
        [i.name, i.handle, i.text, i.img, STORE_ID]
      );
    }
    console.log(`✅ ${influencers.length} influencers insertados`);

    // ─────────────────────────────────────────────────────────────────────────
    // VIDEOS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🎥 Inserando videos...');
    const videos = [
      { title: 'Coscu prueba su propia burger en Voraz', id: 'dQw4w9WgXcQ' },
      { title: 'FYE Squad en Voraz: Lula, Rama y el feat burger', id: 'LXb3EKWsInQ' },
      { title: 'Cómo se hace la Voraz Burger Triple', id: 'Dk7qV7k2qXc' },
    ];
    for (const v of videos) {
      await pool.query(
        'INSERT INTO videos (title, youtube_id, thumbnail_url, store_id) VALUES ($1,$2,$3,$4)',
        [v.title, v.id, `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`, STORE_ID]
      );
    }
    console.log(`✅ ${videos.length} videos insertados`);

    // ─────────────────────────────────────────────────────────────────────────
    // NOTICIAS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📰 Publicando noticias...');
    const noticias = [
      { title: 'Voraz x FYE: El collab del año', content: 'Coscu, Lula y Rama se unieron para crear burgers exclusivas en todos nuestros locales.', img: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=800&q=80', date: '2025-09-15' },
      { title: 'Nuevo local en Almagro: Abrimos hasta las 3 AM', content: 'El local de Almagro abre hasta las 3 AM los viernes y sábados.', img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80', date: '2025-11-20' },
      { title: 'Pedí online y sumá puntos Voraz', content: 'Cada pedido suma puntos para canjear en tu próxima visita.', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', date: '2026-01-10' },
      { title: 'Menú Sin TACC: Ahora todos pueden ser Voraz', content: 'Pan sin gluten disponible para todas las hamburguesas.', img: 'https://images.unsplash.com/photo-1555243896-c709bfa0b564?w=800&q=80', date: '2026-02-05' },
    ];
    for (const n of noticias) {
      await pool.query(
        'INSERT INTO news (title, content, image_url, date, store_id) VALUES ($1,$2,$3,$4,$5)',
        [n.title, n.content, n.img, n.date, STORE_ID]
      );
    }
    console.log(`✅ ${noticias.length} noticias insertadas`);

    // ─────────────────────────────────────────────────────────────────────────
    // CUPONES
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🎟️  Insertando cupones...');
    await pool.query(`
      INSERT INTO coupons (code, description, discount_type, discount_value, min_order, store_id)
      VALUES
        ('VORAZ10',    '10% de descuento en tu pedido',              'percentage', 10,   0,     $1),
        ('COSCU20',    '20% exclusivo del squad Coscu',              'percentage', 20,   20000, $1),
        ('BIENVENIDO', '$5000 de descuento en pedidos sobre $10000', 'fixed',      5000, 10000, $1),
        ('FYE2025',    '15% del squad Fino y Elegante',              'percentage', 15,   18000, $1)
      ON CONFLICT (code) DO NOTHING;
    `, [STORE_ID]);
    console.log('✅ 4 cupones insertados');

    console.log('');
    console.log('🎉 ¡Siembra completada para GastroRed!');
    console.log(`📊 Resumen (store_id=${STORE_ID}):`);
    console.log(`   🍔 ${products.length} productos`);
    console.log(`   📍 ${branchStores.length} sucursales`);
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
