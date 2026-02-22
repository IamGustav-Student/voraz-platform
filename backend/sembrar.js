import pg from 'pg';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const { Pool } = pg;

// Configuración de conexión (Usamos los defaults de tu proyecto si no hay .env)
const pool = new Pool({
  user: process.env.DB_USER || 'voraz_admin',
  password: process.env.DB_PASSWORD || 'voraz_password_secure',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5433, // Puerto 5433 que definimos anteriormente
  database: process.env.DB_NAME || 'voraz_db',
});

const sembrarDatos = async () => {
  try {
    console.log('🌱 Iniciando siembra de datos...');

    // 1. LIMPIEZA PREVIA (Opcional: Descomentar si quieres borrar todo antes de llenar)
    await pool.query('TRUNCATE TABLE order_items, orders, products, influencers, videos, stores, news RESTART IDENTITY CASCADE');

    // -----------------------------------------------------------------------
    // 2. NUEVAS CATEGORÍAS
    // -----------------------------------------------------------------------
    console.log('🍔 Insertando Categorías extra...');
    // Verificamos si existen antes de insertar para no duplicar error
    await pool.query(`
      INSERT INTO categories (name, slug) VALUES 
      ('Bebidas', 'bebidas'),
      ('Postres', 'postres')
      ON CONFLICT (slug) DO NOTHING;
    `);

    // -----------------------------------------------------------------------
    // 3. PRODUCTOS MASIVOS
    // -----------------------------------------------------------------------
    console.log('🔥 Parrilla al máximo: Insertando Productos...');
    
    const products = [
      // --- SMASH (ID 1) ---
      { name: 'La Oklahoma Fried', desc: 'Carne smash con costra de cebolla, doble cheddar y pan de papa al vapor.', price: 8900, cat: 1, img: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&q=80', badge: 'TOP' },
      { name: 'Baconator 3000', desc: 'Triple carne, 6 fetas de panceta ahumada, salsa BBQ casera.', price: 10500, cat: 1, img: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800&q=80', badge: 'PICANTE' },
      { name: 'Cheeseburger Junior', desc: 'Ideal para los peques. Carne, queso y ketchup. Sin vueltas.', price: 6500, cat: 1, img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80', badge: null },
      
      // --- CLÁSICAS (ID 2) ---
      { name: 'Voraz Royal', desc: 'Cuarto de libra, queso azul fundido, cebolla caramelizada y rúcula.', price: 9800, cat: 2, img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80', badge: 'GOURMET' },
      { name: 'Crispy Chicken', desc: 'Pechuga de pollo rebozada en panko, lechuga, tomate y mayo de lima.', price: 8200, cat: 2, img: 'https://images.unsplash.com/photo-1615557960916-5f4791effe9d?w=800&q=80', badge: null },
      { name: 'La Tapa Arterias', desc: 'Huevo frito, aros de cebolla, doble carne y salsa picante.', price: 11000, cat: 2, img: 'https://images.unsplash.com/photo-1596662951482-0c4ba74a6df6?w=800&q=80', badge: 'BEST SELLER' },

      // --- VEGGIE (ID 3) ---
      { name: 'Hongos & Swiss', desc: 'Medallón de portobellos y porotos negros, queso suizo y alioli.', price: 8600, cat: 3, img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80', badge: 'VEGGIE' },
      { name: 'Crispy Tofu', desc: 'Tofu marinado frito, pickles de nabo y salsa teriyaki.', price: 8400, cat: 3, img: 'https://images.unsplash.com/photo-1520072959219-c595dc3f3a2a?w=800&q=80', badge: 'VEGGIE' },

      // --- SIDES (ID 4) ---
      { name: 'Aros de Cebolla', desc: 'Rebozados en cerveza artesanal. Incluye dip de barbacoa.', price: 4200, cat: 4, img: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=80', badge: null },
      { name: 'Nuggets (x10)', desc: 'Pura pechuga. Crocantes por fuera, tiernos por dentro.', price: 5500, cat: 4, img: 'https://images.unsplash.com/photo-1562967960-f0d23814849d?w=800&q=80', badge: null },

      // --- BEBIDAS (ID 5 - Asumiendo que se creó con ID 5) ---
      { name: 'Coca Cola 500ml', desc: 'Bien helada.', price: 2000, cat: 5, img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80', badge: null },
      { name: 'Cerveza Voraz IPA', desc: 'Nuestra propia birra artesanal. Lata 473ml.', price: 3500, cat: 5, img: 'https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=800&q=80', badge: '+18' },

      // --- POSTRES (ID 6 - Asumiendo que se creó con ID 6) ---
      { name: 'Chocotorta en Vaso', desc: 'La clásica argentina, con extra dulce de leche.', price: 4500, cat: 6, img: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80', badge: 'DULCE' },
      { name: 'Key Lime Pie', desc: 'Tarta de lima cremosa con base de galletita.', price: 4800, cat: 6, img: 'https://images.unsplash.com/photo-1535141192574-5d4897c12636?w=800&q=80', badge: null },
    ];

    // Insertar productos (asumiendo que los IDs de categoría 5 y 6 se generaron en orden)
    // Nota: Si tus IDs de categoría son diferentes, ajusta el campo 'cat' arriba.
    // Usamos una consulta dinámica para insertar todo el array
    for (const p of products) {
      // Truco: Buscamos el ID de la categoría por nombre para no fallar si los IDs cambiaron
      let catId = p.cat;
      if (p.cat === 5) { // Bebidas
         const res = await pool.query("SELECT id FROM categories WHERE slug = 'bebidas'");
         if(res.rows.length) catId = res.rows[0].id;
      }
      if (p.cat === 6) { // Postres
         const res = await pool.query("SELECT id FROM categories WHERE slug = 'postres'");
         if(res.rows.length) catId = res.rows[0].id;
      }

      await pool.query(
        'INSERT INTO products (name, description, price, category_id, image_url, badge) VALUES ($1, $2, $3, $4, $5, $6)',
        [p.name, p.desc, p.price, catId, p.img, p.badge]
      );
    }

    // -----------------------------------------------------------------------
    // 4. INFLUENCERS (SQUAD)
    // -----------------------------------------------------------------------
    console.log('📸 Sumando gente al Squad...');
    const influencers = [
      { name: 'La Chica del Brunch', handle: '@lachicadelbrunch', text: 'Si no probaron la Voraz Royal, no saben lo que es vivir.', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&q=80' },
      { name: 'Burger Kid', handle: '@burgerkid', text: 'El pan de papa tiene la humedad perfecta. Aprobado.', img: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=500&q=80' },
      { name: 'Bajoneando x Hay', handle: '@bajoneando', text: 'Ideal para el bajón de las 3 AM. Pidan la Triple.', img: 'https://images.unsplash.com/photo-1586297135537-94bc9ba060aa?w=500&q=80' }
    ];

    for (const i of influencers) {
      await pool.query(
        'INSERT INTO influencers (name, social_handle, testimonial, image_url) VALUES ($1, $2, $3, $4)',
        [i.name, i.handle, i.text, i.img]
      );
    }

    // -----------------------------------------------------------------------
    // 5. VIDEOS (LIVE)
    // -----------------------------------------------------------------------
    console.log('🎥 Grabando videos...');
    const videos = [
      { title: 'Entrevista Exclusiva: Duki come en Voraz', id: 'Dk7qV7k2qXc' }, // ID Falso de ejemplo
      { title: 'Recorrida de Locales: Palermo Soho', id: 'LXb3EKWsInQ' }
    ];

    for (const v of videos) {
      await pool.query(
        'INSERT INTO videos (title, youtube_id, thumbnail_url) VALUES ($1, $2, $3)',
        [v.title, v.id, `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`]
      );
    }

    // -----------------------------------------------------------------------
    // 6. NOTICIAS
    // -----------------------------------------------------------------------
    console.log('📰 Imprimiendo las noticias...');
    const noticias = [
      { title: 'Voraz x Stranger Things', content: 'Llega el menú del Upside Down. Hamburguesa negra y papas con extra demogorgon.', img: 'https://images.unsplash.com/photo-1605902711622-cfb43c4437b5?w=800&q=80', date: '2026-01-12' },
      { title: 'Nueva Sucursal: Miami', content: 'Cruzamos el charco. Próximamente Voraz en Wynwood Walls.', img: 'https://images.unsplash.com/photo-1535498730771-e735b998cd64?w=800&q=80', date: '2026-02-01' }
    ];

    for (const n of noticias) {
      await pool.query(
        'INSERT INTO news (title, content, image_url, date) VALUES ($1, $2, $3, $4)',
        [n.title, n.content, n.img, n.date]
      );
    }

    console.log('✅ ¡Siembra completada con éxito! Tu base de datos está llena de sabor.');
  } catch (error) {
    console.error('❌ Error sembrando datos:', error);
  } finally {
    await pool.end();
  }
};

sembrarDatos();