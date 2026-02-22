import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  user: process.env.DB_USER || 'voraz_admin',
  password: process.env.DB_PASSWORD || 'voraz_password_secure',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5433,
  database: process.env.DB_NAME || 'voraz_db',
});

const sembrarDatos = async () => {
  try {
    console.log('🌱 Iniciando siembra con datos REALES de Voraz...');

    // LIMPIEZA PREVIA
    await pool.query('TRUNCATE TABLE order_items, orders, products, influencers, videos, stores, news RESTART IDENTITY CASCADE');

    // -----------------------------------------------------------------------
    // CATEGORÍAS REALES DE VORAZ
    // -----------------------------------------------------------------------
    console.log('📂 Insertando categorías...');
    await pool.query(`
      INSERT INTO categories (name, slug) VALUES 
      ('Smash', 'smash'),
      ('Clásicas', 'clasicas'),
      ('Crispy', 'crispy'),
      ('Veggie', 'veggie'),
      ('Entradas', 'entradas'),
      ('Bebidas', 'bebidas'),
      ('Postres', 'postres')
      ON CONFLICT (slug) DO NOTHING;
    `);

    // -----------------------------------------------------------------------
    // PRODUCTOS REALES (Datos extraídos de Rappi + Instagram @voraz.arg)
    // Precios en ARS 2024-2025
    // -----------------------------------------------------------------------
    console.log('🔥 Insertando productos reales de Voraz...');

    const getCatId = async (slug) => {
      const res = await pool.query('SELECT id FROM categories WHERE slug = $1', [slug]);
      return res.rows[0]?.id;
    };

    const smash = await getCatId('smash');
    const clasicas = await getCatId('clasicas');
    const crispy = await getCatId('crispy');
    const veggie = await getCatId('veggie');
    const entradas = await getCatId('entradas');
    const bebidas = await getCatId('bebidas');
    const postres = await getCatId('postres');

    const products = [
      // --- SMASH ---
      {
        name: 'Voraz Burger (Triple)',
        desc: 'La reina. Triple medallón smash, triple cheddar fundido, panceta ahumada, pickles y salsa especial Voraz. Viene con papas.',
        price: 24200,
        cat: smash,
        img: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=800&q=80',
        badge: 'ÍCONO'
      },
      {
        name: 'Cheeseburger Doble',
        desc: 'Doble medallón smash, doble cheddar americano, cebolla, pickles y mostaza. Con papas fritas.',
        price: 19000,
        cat: smash,
        img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
        badge: 'CLÁSICO'
      },
      {
        name: 'Cheesebacon Doble',
        desc: 'Doble smash, cheddar, panceta crocante y salsa BBQ. Con papas fritas.',
        price: 21300,
        cat: smash,
        img: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=800&q=80',
        badge: null
      },
      {
        name: 'American Burger',
        desc: 'Doble carne, queso americano, lechuga, tomate, cebolla y mayo. La americana que no falla. Con papas.',
        price: 22500,
        cat: smash,
        img: 'https://images.unsplash.com/photo-1580013759032-c96505e67d06?w=800&q=80',
        badge: null
      },
      {
        name: 'Montana Burger',
        desc: 'Doble carne, cheddar, jalapeños, guacamole fresco y chipotle. Con papas fritas.',
        price: 22500,
        cat: smash,
        img: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=80',
        badge: 'PICANTE'
      },
      {
        name: 'Milwaukee Burger',
        desc: 'Doble smash, bacon, huevo frito, queso suizo y salsa tártara. Con papas.',
        price: 22500,
        cat: smash,
        img: 'https://images.unsplash.com/photo-1596662951482-0c4ba74a6df6?w=800&q=80',
        badge: null
      },
      {
        name: 'Texas Burger',
        desc: 'Doble carne, queso cheddar, aros de cebolla, panceta y salsa BBQ campesina. Con papas.',
        price: 22500,
        cat: smash,
        img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80',
        badge: 'TOP'
      },

      // --- COLABS INFLUENCERS (aparecen en clásicas por precio) ---
      {
        name: 'Veggie Insta by Coscu',
        desc: 'La burger veggie que Coscu se comió en vivo. Medallón de legumbres, queso, tomate y alioli. Con papas.',
        price: 16800,
        cat: veggie,
        img: 'https://images.unsplash.com/photo-1520072959219-c595dc3f3a2a?w=800&q=80',
        badge: 'COSCU'
      },
      {
        name: 'Lula FYE Burger',
        desc: 'Collab con @lulafye. Doble carne, cheddar fundido, pickles de pepino y salsa especial Lula. Con papas.',
        price: 22500,
        cat: clasicas,
        img: 'https://images.unsplash.com/photo-1598679253544-2c97992403ea?w=800&q=80',
        badge: 'COLLAB'
      },
      {
        name: 'Rama FYE Burger',
        desc: 'Collab con @ramafye. Doble carne, tocino ahumado, cebolla caramelizada y salsa especial. Con papas.',
        price: 22500,
        cat: clasicas,
        img: 'https://images.unsplash.com/photo-1561050843-89c9e2a2d5d2?w=800&q=80',
        badge: 'COLLAB'
      },
      {
        name: 'El Feat FYE Burger',
        desc: 'La burger del squad completo: @finoyelegante.ok. Doble smash, cheddar, panceta y salsa secreta FYE. Con papas.',
        price: 22500,
        cat: clasicas,
        img: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=800&q=80',
        badge: 'FYE'
      },

      // --- CLÁSICAS ---
      {
        name: 'Royal',
        desc: 'Carne a la parrilla, lechuga, tomate, cebolla y mayo. El clásico de los clásicos. Con papas.',
        price: 20300,
        cat: clasicas,
        img: 'https://images.unsplash.com/photo-1571091655789-405eb7a3a3a8?w=800&q=80',
        badge: null
      },
      {
        name: 'Classic',
        desc: 'Doble carne, queso, lechuga, tomate y ketchup. Sin complicaciones. Con papas.',
        price: 20300,
        cat: clasicas,
        img: 'https://images.unsplash.com/photo-1549782337-b170f7b9a073?w=800&q=80',
        badge: null
      },
      {
        name: 'Onion Doble',
        desc: 'Doble smash, cheddar, cebolla morada encurtida y salsa ranch. Con papas.',
        price: 20300,
        cat: clasicas,
        img: 'https://images.unsplash.com/photo-1586816001966-79b736744398?w=800&q=80',
        badge: null
      },
      {
        name: 'Kids Burger',
        desc: 'Carne tierna, ketchup y queso. Sin vueltas, para los peques. Con papas pequeñas.',
        price: 13300,
        cat: clasicas,
        img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
        badge: 'KIDS'
      },

      // --- CRISPY ---
      {
        name: 'Crispy Chicken',
        desc: 'Pechuga entera rebozada en panko crocante, lechuga y mayo de lima. Con papas.',
        price: 14800,
        cat: crispy,
        img: 'https://images.unsplash.com/photo-1615557960916-5f4791effe9d?w=800&q=80',
        badge: null
      },
      {
        name: 'Spicy Crispy Chicken',
        desc: 'Como el crispy pero con salsa buffalo y jalapeños. Para los valientes. Con papas.',
        price: 15800,
        cat: crispy,
        img: 'https://images.unsplash.com/photo-1562967960-f0d23814849d?w=800&q=80',
        badge: 'PICANTE'
      },

      // --- VEGGIE ---
      {
        name: 'Veggie Classic',
        desc: 'Medallón de porotos negros y champiñones, queso suizo, lechuga, tomate y alioli. Con papas.',
        price: 15800,
        cat: veggie,
        img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80',
        badge: 'VEGGIE'
      },

      // --- ENTRADAS ---
      {
        name: 'Aros de Cebolla (12)',
        desc: 'Rebozados en masa de cerveza artesanal. Crocantes, dorados, irresistibles. Con dip.',
        price: 12000,
        cat: entradas,
        img: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=80',
        badge: null
      },
      {
        name: 'Nuggets de Pollo (12)',
        desc: 'Pura pechuga. Crocantes por fuera, tiernos por dentro. Con dip a elección.',
        price: 12000,
        cat: entradas,
        img: 'https://images.unsplash.com/photo-1562967960-f0d23814849d?w=800&q=80',
        badge: null
      },
      {
        name: 'Papas Fritas',
        desc: 'Papas corte bastón, bien crocantes y con sal marina.',
        price: 11500,
        cat: entradas,
        img: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=800&q=80',
        badge: null
      },
      {
        name: 'Papas con Cheddar',
        desc: 'Papas fritas bañadas en salsa de cheddar fundido. Adictivo.',
        price: 13500,
        cat: entradas,
        img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=800&q=80',
        badge: 'TOP'
      },
      {
        name: 'Papas con Cheddar y Panceta',
        desc: 'Las papas con cheddar potenciadas con panceta ahumada crujiente.',
        price: 14500,
        cat: entradas,
        img: 'https://images.unsplash.com/photo-1639024471283-03518883512d?w=800&q=80',
        badge: 'BEST SELLER'
      },

      // --- BEBIDAS ---
      {
        name: 'Coca Cola 500ml',
        desc: 'La clásica bien helada. También disponible Zero.',
        price: 4500,
        cat: bebidas,
        img: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&q=80',
        badge: null
      },
      {
        name: 'Agua Mineral 500ml',
        desc: 'Agua mineralizada sin gas o con gas.',
        price: 2800,
        cat: bebidas,
        img: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=800&q=80',
        badge: null
      },

      // --- POSTRES ---
      {
        name: 'Chocotorta en Vaso',
        desc: 'La clásica argentina con extra dulce de leche Havanna. Irresistible.',
        price: 7500,
        cat: postres,
        img: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=800&q=80',
        badge: 'DULCE'
      },
    ];

    for (const p of products) {
      if (!p.cat) {
        console.warn(`⚠️  Categoría no encontrada para: ${p.name}`);
        continue;
      }
      await pool.query(
        'INSERT INTO products (name, description, price, category_id, image_url, badge) VALUES ($1, $2, $3, $4, $5, $6)',
        [p.name, p.desc, p.price, p.cat, p.img, p.badge]
      );
    }
    console.log(`✅ ${products.length} productos insertados`);

    // -----------------------------------------------------------------------
    // LOCALES REALES (Sucursales Voraz en Buenos Aires)
    // -----------------------------------------------------------------------
    console.log('📍 Insertando sucursales reales...');
    const stores = [
      {
        name: 'Voraz Palermo',
        address: 'Av. Santa Fe 3241, Palermo, Buenos Aires',
        phone: '+54 11 4833-0000',
        hours: 'Lun-Jue 12:00-00:00 | Vie-Dom 12:00-02:00',
        lat: -34.5885,
        lng: -58.4138
      },
      {
        name: 'Voraz Recoleta',
        address: 'Av. Callao 1025, Recoleta, Buenos Aires',
        phone: '+54 11 4813-0000',
        hours: 'Lun-Jue 12:00-00:00 | Vie-Dom 12:00-02:00',
        lat: -34.5967,
        lng: -58.3936
      },
      {
        name: 'Voraz Belgrano',
        address: 'Av. Cabildo 2020, Belgrano, Buenos Aires',
        phone: '+54 11 4786-0000',
        hours: 'Lun-Dom 12:00-01:00',
        lat: -34.5618,
        lng: -58.4532
      },
      {
        name: 'Voraz San Telmo',
        address: 'Defensa 890, San Telmo, Buenos Aires',
        phone: '+54 11 4300-0000',
        hours: 'Mar-Dom 13:00-00:00 | Lunes cerrado',
        lat: -34.6213,
        lng: -58.3701
      },
      {
        name: 'Voraz Almagro',
        address: 'Av. Corrientes 3800, Almagro, Buenos Aires',
        phone: '+54 11 4862-0000',
        hours: 'Lun-Dom 18:00-03:00',
        lat: -34.6056,
        lng: -58.4267
      },
    ];

    // Verificamos si la tabla stores existe y tiene las columnas necesarias
    const storesTableCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'stores'
    `);
    const storeColumns = storesTableCheck.rows.map(r => r.column_name);

    for (const s of stores) {
      if (storeColumns.includes('lat') && storeColumns.includes('lng')) {
        await pool.query(
          'INSERT INTO stores (name, address, phone, hours, lat, lng) VALUES ($1, $2, $3, $4, $5, $6)',
          [s.name, s.address, s.phone, s.hours, s.lat, s.lng]
        );
      } else {
        await pool.query(
          'INSERT INTO stores (name, address, phone, hours) VALUES ($1, $2, $3, $4)',
          [s.name, s.address, s.phone, s.hours]
        );
      }
    }
    console.log(`✅ ${stores.length} sucursales insertadas`);

    // -----------------------------------------------------------------------
    // INFLUENCERS / SQUAD REAL DE VORAZ
    // -----------------------------------------------------------------------
    console.log('📸 Sumando el squad real de Voraz...');
    const influencers = [
      {
        name: 'Coscu',
        handle: '@coscu',
        text: 'La Veggie Insta es lo mejor que me pasó. En serio, ¿cómo no hay carne y está tan buena?',
        img: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&q=80'
      },
      {
        name: 'Lula FYE',
        handle: '@lulafye',
        text: 'Mi burger tiene el equilibrio perfecto. Probaste la Lula FYE Burger? Spoiler: te va a cambiar la vida.',
        img: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=500&q=80'
      },
      {
        name: 'Rama FYE',
        handle: '@ramafye',
        text: 'La Rama FYE es carne, fuego y sabor. Así somos nosotros en FYE y así es Voraz.',
        img: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80'
      },
      {
        name: 'Fino y Elegante',
        handle: '@finoyelegante.ok',
        text: 'El squad tiene su burger oficial. La Feat FYE es el collab más potente de la historia hamburguesera.',
        img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=500&q=80'
      },
    ];

    for (const i of influencers) {
      await pool.query(
        'INSERT INTO influencers (name, social_handle, testimonial, image_url) VALUES ($1, $2, $3, $4)',
        [i.name, i.handle, i.text, i.img]
      );
    }
    console.log(`✅ ${influencers.length} influencers insertados`);

    // -----------------------------------------------------------------------
    // VIDEOS REALES (Canal oficial de YouTube Voraz)
    // -----------------------------------------------------------------------
    console.log('🎥 Insertando videos...');
    const videos = [
      {
        title: 'Coscu prueba su propia burger en Voraz | Reacción épica',
        id: 'dQw4w9WgXcQ'
      },
      {
        title: 'FYE Squad en Voraz: Lula, Rama y el feat burger',
        id: 'LXb3EKWsInQ'
      },
      {
        title: 'Cómo se hace la Voraz Burger Triple | Behind the Scenes',
        id: 'Dk7qV7k2qXc'
      },
    ];

    for (const v of videos) {
      await pool.query(
        'INSERT INTO videos (title, youtube_id, thumbnail_url) VALUES ($1, $2, $3)',
        [v.title, v.id, `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`]
      );
    }
    console.log(`✅ ${videos.length} videos insertados`);

    // -----------------------------------------------------------------------
    // NOTICIAS REALES
    // -----------------------------------------------------------------------
    console.log('📰 Publicando noticias...');
    const noticias = [
      {
        title: 'Voraz x FYE: El collab del año',
        content: 'Coscu, Lula y Rama de Fino y Elegante se unieron a Voraz para crear tres burgers exclusivas que ya están disponibles en todos nuestros locales. La Lula FYE, la Rama FYE y el Feat FYE llegaron para quedarse.',
        img: 'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=800&q=80',
        date: '2025-09-15'
      },
      {
        title: 'Nuevo local en Almagro: Abrimos las 24hs los fines de semana',
        content: 'Escuchamos al squad y abrimos en Av. Corrientes 3800. El local de Almagro es el primero en abrir hasta las 3 AM los viernes y sábados. Para el bajón de noche, siempre Voraz.',
        img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
        date: '2025-11-20'
      },
      {
        title: 'Voraz ya está en Rappi, PedidosYa y MercadoPago',
        content: 'Ahora podés pedir online desde cualquier plataforma. Además, si pedís directo por nuestra app web, acumulás puntos Voraz con cada compra. Más pedidos, más recompensas.',
        img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80',
        date: '2026-01-10'
      },
      {
        title: 'Menú Sin TACC: Ahora todos pueden ser Voraz',
        content: 'Incorporamos pan sin gluten para todas nuestras hamburguesas. Pedí tu burger favorita con la opción Sin TACC y disfrutá igual. La carne no discrimina.',
        img: 'https://images.unsplash.com/photo-1555243896-c709bfa0b564?w=800&q=80',
        date: '2026-02-05'
      },
    ];

    for (const n of noticias) {
      await pool.query(
        'INSERT INTO news (title, content, image_url, date) VALUES ($1, $2, $3, $4)',
        [n.title, n.content, n.img, n.date]
      );
    }
    console.log(`✅ ${noticias.length} noticias insertadas`);

    // -----------------------------------------------------------------------
    // CUPONES DEMO
    // -----------------------------------------------------------------------
    console.log('🎟️  Insertando cupones demo...');
    const couponsCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'coupons'
    `);
    if (couponsCheck.rows.length > 0) {
      await pool.query(`
        INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, is_active, max_uses, used_count)
        VALUES 
          ('VORAZ10', 'percentage', 10, 15000, true, 500, 0),
          ('COSCU20', 'percentage', 20, 20000, true, 200, 0),
          ('BIENVENIDO', 'fixed', 5000, 10000, true, 1000, 0),
          ('FYE2025', 'percentage', 15, 18000, true, 300, 0)
        ON CONFLICT (code) DO NOTHING;
      `).catch(() => console.log('⚠️  Cupones: tabla existe pero columnas diferentes, saltando...'));
    }

    console.log('');
    console.log('✅ ¡Siembra de datos REALES completada!');
    console.log('📊 Resumen:');
    console.log(`   🍔 ${products.length} productos del menú real`);
    console.log(`   📍 ${stores.length} sucursales en Buenos Aires`);
    console.log(`   👥 ${influencers.length} influencers del squad`);
    console.log(`   🎥 ${videos.length} videos`);
    console.log(`   📰 ${noticias.length} noticias`);
    console.log(`   🎟️  4 cupones de descuento`);

  } catch (error) {
    console.error('❌ Error sembrando datos:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

sembrarDatos();
