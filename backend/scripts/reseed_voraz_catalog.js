import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Root .env is at ../../.env from scripts/
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const { Pool } = pg;

const pool = new Pool({
    user: process.env.DB_USER || 'voraz_admin',
    password: process.env.DB_PASSWORD || 'voraz_password_secure',
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5433'),
    database: process.env.DB_NAME || 'voraz_db',
});

const STORE_ID = 1; // Voraz Base Store

const reseed = async () => {
  try {
    console.log(`\n🧹 Limpiando catálogo para store_id=${STORE_ID}...`);
    
    // Primero productos debido a la FK
    await pool.query('DELETE FROM products WHERE store_id = $1', [STORE_ID]);
    await pool.query('DELETE FROM categories WHERE store_id = $1', [STORE_ID]);
    
    console.log('✅ Catálogo limpio.');

    console.log('📂 Insertando nuevas categorías...');
    const categories = [
      { name: '🍔 Burgers', slug: 'burgers' },
      { name: '🍕 Pizzas', slug: 'pizzas' },
      { name: '🍟 Entradas', slug: 'entradas' },
      { name: '🥤 Bebidas', slug: 'bebidas' },
      { name: '🍰 Postres', slug: 'postres' }
    ];

    for (const cat of categories) {
      await pool.query(
        'INSERT INTO categories (name, slug, store_id) VALUES ($1, $2, $3)',
        [cat.name, cat.slug, STORE_ID]
      );
    }

    const getCatId = async (slug) => {
      const res = await pool.query('SELECT id FROM categories WHERE slug = $1 AND store_id = $2', [slug, STORE_ID]);
      return res.rows[0]?.id;
    };

    const catBurgers = await getCatId('burgers');
    const catPizzas = await getCatId('pizzas');
    const catEntradas = await getCatId('entradas');
    const catBebidas = await getCatId('bebidas');
    const catPostres = await getCatId('postres');

    console.log('🔥 Insertando nuevos productos (2 por categoría)...');
    const products = [
      // BURGERS
      { name: 'Voraz Deluxe', desc: 'Doble carne, cuádruple cheddar, bacon crocante, cebolla caramelizada y salsa Voraz.', price: 12500, cat: catBurgers, img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', badge: 'PREMIUM' },
      { name: 'Smash Classic', desc: 'Doble smash, doble cheddar, cebolla picada, pickles y mostaza.', price: 9800, cat: catBurgers, img: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&q=80', badge: 'MÁS VENDIDO' },
      // PIZZAS
      { name: 'Margherita Premium', desc: 'Salsa de tomate casera, mozzarella fior di latte, albahaca fresca y AOVE.', price: 14000, cat: catPizzas, img: 'https://images.unsplash.com/photo-1574071318508-1cdbad80ad50?w=800&q=80', badge: 'RECOMENDADO' },
      { name: 'Pepperoni Blast', desc: 'Mozzarella, pepperoni americano picante y un toque de miel picante.', price: 15500, cat: catPizzas, img: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=800&q=80', badge: 'NUEVO' },
      // ENTRADAS
      { name: 'Papas Trufadas', desc: 'Papas triple cocción con aceite de trufa blanca, parmesano y perejil.', price: 7800, cat: catEntradas, img: 'https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=800&q=80', badge: 'GOURMET' },
      { name: 'Bastones de Mozzarella', desc: '6 bastones artesanales con dip de pomodoro italiano.', price: 6500, cat: catEntradas, img: 'https://images.unsplash.com/photo-1531492746377-40be9216d79a?w=800&q=80', badge: null },
      // BEBIDAS
      { name: 'Cerveza Artesanal IPA', desc: 'Ipa de la casa, 500ml. Notas cítricas y amargor equilibrado.', price: 4200, cat: catBebidas, img: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800&q=80', badge: 'CRAFT' },
      { name: 'Limonada con Menta', desc: 'Limones frescos, menta, jengibre y almíbar natural. 500ml.', price: 3500, cat: catBebidas, img: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800&q=80', badge: 'REFRESCANTE' },
      // POSTRES
      { name: 'Volcán de Chocolate', desc: 'Corazón fundido de chocolate belga con bocha de crema americana.', price: 6800, cat: catPostres, img: 'https://images.unsplash.com/photo-1624353365286-3f8d62ffff51?w=800&q=80', badge: 'SINFONÍA' },
      { name: 'Cheesecake New York', desc: 'Clásica receta NY con coulis de frutos rojos del bosque.', price: 7200, cat: catPostres, img: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=800&q=80', badge: 'PREMIUM' }
    ];

    for (const p of products) {
      if (!p.cat) continue;
      await pool.query(
        'INSERT INTO products (name, description, price, category_id, image_url, badge, store_id) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [p.name, p.desc, p.price, p.cat, p.img, p.badge, STORE_ID]
      );
    }

    console.log(`✅ ${products.length} productos insertados en sus respectivas categorías.`);
    console.log('\n🚀 ¡Renovación del catálogo de Voraz completada con éxito!');

  } catch (err) {
    console.error('❌ Error durante la renovación:', err.message);
  } finally {
    await pool.end();
  }
};

reseed();
