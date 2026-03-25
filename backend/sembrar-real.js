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

const STORE_ID = parseInt(process.env.STORE_ID || '1');

console.log(`\n🌱 GastroRed — Seeder para store_id=${STORE_ID}`);
console.log('─'.repeat(50));

const sembrarDatos = async () => {
  try {
    // Limpiar solo datos del store_id objetivo
    console.log(`🧹 Limpiando datos para store_id=${STORE_ID}...`);
    await pool.query('DELETE FROM products    WHERE store_id=$1', [STORE_ID]);
    await pool.query('DELETE FROM categories  WHERE store_id=$1', [STORE_ID]);
    await pool.query('DELETE FROM influencers WHERE store_id=$1', [STORE_ID]);
    await pool.query('DELETE FROM videos      WHERE store_id=$1', [STORE_ID]);
    await pool.query('DELETE FROM news        WHERE store_id=$1', [STORE_ID]);
    await pool.query('DELETE FROM stores      WHERE store_id=$1 AND id!=$1', [STORE_ID]);
    await pool.query('DELETE FROM coupons     WHERE store_id=$1', [STORE_ID]);

    // ─────────────────────────────────────────────────────────────────────────
    // CATEGORÍAS
    // ─────────────────────────────────────────────────────────────────────────
    console.log('📂 Insertando categorías...');
    await pool.query(`
      INSERT INTO categories (name, slug, store_id) VALUES
      ('Smash Burgers', 'smash-${STORE_ID}',    $1),
      ('Clásicas',      'clasicas-${STORE_ID}', $1),
      ('Crispy',        'crispy-${STORE_ID}',   $1),
      ('Veggie',        'veggie-${STORE_ID}',   $1),
      ('Entradas',      'entradas-${STORE_ID}', $1),
      ('Bebidas',       'bebidas-${STORE_ID}',  $1),
      ('Postres',       'postres-${STORE_ID}',  $1)
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
    // PRODUCTOS (2 por categoría)
    // ─────────────────────────────────────────────────────────────────────────
    console.log('🔥 Insertando productos (2 por categoría)...');

    const products = [
      // SMASH
      { name: 'Burger (Triple)', desc: 'Triple medallón smash, triple cheddar fundido, panceta ahumada, pickles y salsa especial. Con papas.', price: 24200, cat: smash, img: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&q=80', badge: 'ÍCONO' },
      { name: 'Cheeseburger Doble', desc: 'Doble medallón smash, doble cheddar americano, cebolla, pickles y mostaza. Con papas fritas.', price: 19000, cat: smash, img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', badge: 'CLÁSICO' },
      // CLÁSICAS
      { name: 'Royal', desc: 'Carne a la parrilla, lechuga, tomate, cebolla y mayo. Con papas.', price: 20300, cat: clasicas, img: 'https://images.unsplash.com/photo-1571091655789-405eb7a3a3a8?w=800&q=80', badge: null },
      { name: 'Classic', desc: 'Doble carne, queso, lechuga, tomate y ketchup. Sin complicaciones. Con papas.', price: 20300, cat: clasicas, img: 'https://images.unsplash.com/photo-1549782337-b170f7b9a073?w=800&q=80', badge: null },
      // CRISPY
      { name: 'Crispy Chicken', desc: 'Pechuga entera rebozada en panko crocante, lechuga y mayo de lima. Con papas.', price: 14800, cat: crispy, img: 'https://images.unsplash.com/photo-1615557960916-5f4791effe9d?w=800&q=80', badge: null },
      { name: 'Spicy Crispy Chicken', desc: 'Como el crispy pero con salsa buffalo y jalapeños. Con papas.', price: 15800, cat: crispy, img: 'https://images.unsplash.com/photo-1562967960-f0d23814849d?w=800&q=80', badge: 'PICANTE' },
      // VEGGIE
      { name: 'Veggie Classic', desc: 'Medallón de porotos y champiñones, queso suizo, lechuga, tomate y alioli. Con papas.', price: 15800, cat: veggie, img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80', badge: 'VEGGIE' },
      { name: 'Veggie Mush', desc: 'Medallón de legumbres, champiñones salteados, queso, tomate y alioli. Con papas.', price: 16800, cat: veggie, img: 'https://images.unsplash.com/photo-1520072959219-c595dc3f3a2a?w=800&q=80', badge: 'NUEVO' },
      // ENTRADAS
      { name: 'Papas con Cheddar y Panceta', desc: 'Papas fritas bañadas en salsa de cheddar fundido y panceta ahumada crujiente.', price: 14500, cat: entradas, img: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=80', badge: 'BEST SELLER' },
      { name: 'Aros de Cebolla (12)', desc: 'Rebozados en masa de cerveza artesanal. Crocantes y dorados. Con dip.', price: 12000, cat: entradas, img: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=80', badge: null },
      // BEBIDAS
      { name: 'Coca Cola 500ml', desc: 'La clásica bien helada. También disponible Zero.', price: 4500, cat: bebidas, img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80', badge: null },
      { name: 'Agua Mineral 500ml', desc: 'Sin gas o con gas.', price: 2800, cat: bebidas, img: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80', badge: null },
      // POSTRES
      { name: 'Chocotorta en Vaso', desc: 'La clásica argentina con extra dulce de leche Havanna.', price: 7500, cat: postres, img: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80', badge: 'DULCE' },
      { name: 'Cheesecake de Frutos Rojos', desc: 'Base crocante de galletitas, crema suave de queso y coulis de frutos rojos.', price: 8200, cat: postres, img: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&q=80', badge: 'PREMIUM' },
    ];

    for (const p of products) {
      if (!p.cat) { console.warn(`⚠️  Sin categoría: ${p.name}`); continue; }
      await pool.query(
        'INSERT INTO products (name, description, price, category_id, image_url, badge, store_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [p.name, p.desc, p.price, p.cat, p.img, p.badge, STORE_ID]
      );
    }
    console.log(`✅ ${products.length} productos insertados`);

    // 📍 Sucursales
    const branchStores = [
      { name: 'Sede Palermo', address: 'Av. Santa Fe 3241, Palermo, Buenos Aires', phone: '+54 11 4833-0000', hours: 'Lun-Dom 12:00-00:00', img: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80', lat: -34.5885, lng: -58.4138 },
      { name: 'Sede Recoleta', address: 'Av. Callao 1025, Recoleta, Buenos Aires', phone: '+54 11 4813-0000', hours: 'Lun-Dom 12:00-00:00', img: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80', lat: -34.5967, lng: -58.3936 },
    ];
    for (const s of branchStores) {
      await pool.query(
        'INSERT INTO stores (name, address, phone, hours, image_url, lat, lng, store_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [s.name, s.address, s.phone, s.hours, s.img, s.lat, s.lng, STORE_ID]
      );
    }

    // 📸 Influencers
    const influencers = [
      { name: 'Dante', handle: '@dante.gastronomia', text: 'La Burger Triple es un espectáculo. Recomendadísima.', img: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&q=80' },
    ];
    for (const i of influencers) {
      await pool.query(
        'INSERT INTO influencers (name, social_handle, testimonial, image_url, store_id) VALUES ($1,$2,$3,$4,$5)',
        [i.name, i.handle, i.text, i.img, STORE_ID]
      );
    }

    // 📰 Noticias
    const noticias = [
      { title: 'Nueva Apertura', content: 'Inauguramos nuestra nueva sede con promos exclusivas toda la semana.', img: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=800&q=80', date: '2026-03-01' },
      { title: 'Sumá Puntos', content: 'Cada pedido online suma puntos para canjear por productos gratis.', img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', date: '2026-03-10' },
    ];
    for (const n of noticias) {
      await pool.query(
        'INSERT INTO news (title, content, image_url, date, store_id) VALUES ($1,$2,$3,$4,$5)',
        [n.title, n.content, n.img, n.date, STORE_ID]
      );
    }

    // 🎟️ Cupones
    await pool.query(`
      INSERT INTO coupons (code, description, discount_type, discount_value, min_order, store_id)
      VALUES
        ('BIENVENIDO', '$5000 de regalo en tu primer pedido', 'fixed', 5000, 10000, $1),
        ('GASTRO10',    '10% de descuento extra',             'percentage', 10, 0, $1)
    `, [STORE_ID]);

    console.log('✅ Siembra completada');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

sembrarDatos();
