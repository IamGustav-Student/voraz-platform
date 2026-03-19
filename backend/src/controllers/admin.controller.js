import { query, pool } from '../config/db.js';
import { v2 as cloudinary } from 'cloudinary';
import { getTenantId, getStoreId } from '../utils/tenant.js';

// ── PRODUCTOS ──────────────────────────────────────────────────────────────
export const getAdminProducts = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const result = await query(
      `SELECT p.*, c.name as category_name FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.store_id = $1 ORDER BY p.category_id, p.id`,
      [storeId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const createProduct = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const tenantId = getTenantId(req);

    // ── Validar límite de productos según plan ──
    const tenantRes = await query('SELECT plan_type FROM tenants WHERE id::text = $1::text OR subdomain = $1::text', [String(tenantId)]);
    const plan = tenantRes.rows[0]?.plan_type || 'Full Digital';

    if (plan === 'Full Digital') {
      const countRes = await query('SELECT COUNT(*) FROM products WHERE store_id = $1 AND is_active = true', [storeId]);
      if (parseInt(countRes.rows[0].count) >= 50) {
        return res.status(403).json({
          status: 'error',
          message: 'Límite de 50 productos alcanzado para el Plan Full Digital. Mejorá a Plan Expert para tener productos ilimitados.'
        });
      }
    }

    const { name, description, price, category_id, image_url, badge, stock, points_earned } = req.body;
    const stockVal = Math.max(0, parseInt(stock, 10) || 0);
    const pointsVal = parseInt(points_earned, 10) || 0;
    const result = await query(
      `INSERT INTO products (name, description, price, category_id, image_url, badge, store_id, stock, points_earned)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, description, price, category_id, image_url, badge || null, storeId, stockVal, pointsVal]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const updateProduct = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    const { name, description, price, category_id, image_url, badge, is_active, stock, points_earned } = req.body;
    const stockVal = typeof stock === 'number' ? Math.max(0, stock) : Math.max(0, parseInt(stock, 10) || 0);
    const pointsVal = typeof points_earned === 'number' ? points_earned : (parseInt(points_earned, 10) || 0);
    const result = await query(
      `UPDATE products SET name=$1, description=$2, price=$3, category_id=$4,
       image_url=$5, badge=$6, is_active=$7, stock=$8, points_earned=$9
       WHERE id=$10 AND store_id=$11 RETURNING *`,
      [name, description, price, category_id, image_url, badge || null, is_active ?? true, stockVal, pointsVal, id, storeId]
    );
    if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Producto no encontrado' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const deleteProduct = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    await query('UPDATE products SET is_active=false WHERE id=$1 AND store_id=$2', [id, storeId]);
    res.json({ status: 'success', message: 'Producto desactivado' });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const getCategories = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const result = await query('SELECT id, name, slug, image_url, store_id FROM categories WHERE store_id=$1 ORDER BY id', [storeId]);
    res.json({ status: 'success', data: result.rows });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const createCategory = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const { name, image_url, description } = req.body;
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const result = await query(
      'INSERT INTO categories (name, slug, description, image_url, store_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, slug, description || null, image_url || null, storeId]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ status: 'error', message: 'Ya existe una categoría con ese nombre' });
    res.status(500).json({ status: 'error', message: e.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    const { name, image_url, description } = req.body;
    const result = await query(
      'UPDATE categories SET name=$1, description=$2, image_url=$3 WHERE id=$4 AND store_id=$5 RETURNING *',
      [name, description || null, image_url || null, id, storeId]
    );
    if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Categoría no encontrada' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const deleteCategory = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    const used = await query('SELECT COUNT(*) FROM products WHERE category_id=$1 AND is_active=true', [id]);
    if (parseInt(used.rows[0].count) > 0) {
      return res.status(409).json({ status: 'error', message: 'No se puede eliminar: hay productos activos en esta categoría' });
    }
    await query('DELETE FROM categories WHERE id=$1 AND store_id=$2', [id, storeId]);
    res.json({ status: 'success', message: 'Categoría eliminada' });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── CUPONES ────────────────────────────────────────────────────────────────
export const getAdminCoupons = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const result = await query('SELECT * FROM coupons WHERE store_id=$1 ORDER BY id DESC', [storeId]);
    res.json({ status: 'success', data: result.rows });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const createCoupon = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const { code, description, discount_type, discount_value, min_order, max_uses, expires_at } = req.body;
    const result = await query(
      `INSERT INTO coupons (code, description, discount_type, discount_value, min_order, max_uses, expires_at, store_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [code.toUpperCase(), description, discount_type, discount_value, min_order || 0, max_uses || null, expires_at || null, storeId]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ status: 'error', message: 'Ya existe un cupón con ese código' });
    res.status(500).json({ status: 'error', message: e.message });
  }
};

export const updateCoupon = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    const { active } = req.body;
    const result = await query(
      'UPDATE coupons SET active=$1 WHERE id=$2 AND store_id=$3 RETURNING *',
      [active, id, storeId]
    );
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const deleteCoupon = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    await query('DELETE FROM coupons WHERE id=$1 AND store_id=$2', [req.params.id, storeId]);
    res.json({ status: 'success', message: 'Cupón eliminado' });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── VIDEOS ─────────────────────────────────────────────────────────────────
export const createVideo = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    let { title, youtube_url } = req.body;
    const match = youtube_url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    if (!match) return res.status(400).json({ status: 'error', message: 'URL de YouTube inválida' });
    const youtube_id = match[1];
    const thumbnail_url = `https://img.youtube.com/vi/${youtube_id}/hqdefault.jpg`;
    const result = await query(
      'INSERT INTO videos (title, youtube_id, thumbnail_url, store_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [title, youtube_id, thumbnail_url, storeId]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const deleteVideo = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    await query('DELETE FROM videos WHERE id=$1 AND store_id=$2', [req.params.id, storeId]);
    res.json({ status: 'success', message: 'Video eliminado' });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── NOTICIAS ───────────────────────────────────────────────────────────────
export const createNews = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const { title, content, image_url, date } = req.body;
    const result = await query(
      'INSERT INTO news (title, content, image_url, date, store_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [title, content, image_url, date || new Date().toISOString().split('T')[0], storeId]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const updateNews = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const { id } = req.params;
    const { title, content, image_url } = req.body;
    const result = await query(
      'UPDATE news SET title=$1, content=$2, image_url=$3 WHERE id=$4 AND store_id=$5 RETURNING *',
      [title, content, image_url, id, storeId]
    );
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const deleteNews = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    await query('DELETE FROM news WHERE id=$1 AND store_id=$2', [req.params.id, storeId]);
    res.json({ status: 'success', message: 'Noticia eliminada' });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── UPLOAD DE IMÁGENES (Cloudinary) ────────────────────────────────────────
export const uploadImage = async (req, res) => {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(503).json({ status: 'error', message: 'Cloudinary no configurado. Configurá CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET en Railway.' });
    }
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const { image_base64 } = req.body;
    let { folder } = req.body;
    folder = (folder || 'products').replace(/[^a-zA-Z0-9_\-\/]/g, ''); // Sanitización
    if (!image_base64) return res.status(400).json({ status: 'error', message: 'Se requiere image_base64' });
    const storeId = await getStoreId(req);
    const result = await cloudinary.uploader.upload(image_base64, {
      folder: `tenants/${storeId}/${folder}`,
      resource_type: 'image',
    });
    res.json({ status: 'success', data: { url: result.secure_url, public_id: result.public_id } });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── STATS / DASHBOARD ─────────────────────────────────────────────────────
export const getDashboardStats = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const tenantId = getTenantId(req);

    const [
      basicStats,
      weeklyOrders,
      dailyRevenue,
      bestSellers,
      tenantInfo,
      loyaltyConfig
    ] = await Promise.all([
      // 1. Estadísticas básicas (Cards) - Ingresos solo si está entregado
      query(`
        SELECT 
          (SELECT COUNT(*) FROM products WHERE store_id=$1 AND is_active=true) as products_count,
          (SELECT COUNT(*) FROM orders WHERE store_id=$1 AND status != 'cancelled') as orders_count,
          (SELECT COALESCE(SUM(total),0) FROM orders WHERE store_id=$1 AND status = 'delivered') as total_revenue,
          (SELECT COUNT(*) FROM users WHERE store_id=$1) as users_count,
          (SELECT COALESCE(SUM(points_redeemed),0) FROM orders WHERE store_id=$1 AND status = 'delivered') as points_redeemed
      `, [storeId]),

      // 2. Pedidos mensuales por semana (Usando delivered_at para pedidos entregados)
      query(`
        SELECT 
          to_char(DATE_TRUNC('week', COALESCE(delivered_at, created_at)), 'DD/MM') as week_label,
          COUNT(*) as count
        FROM orders 
        WHERE store_id = $1 AND status = 'delivered' AND COALESCE(delivered_at, created_at) >= NOW() - INTERVAL '30 days'
        GROUP BY DATE_TRUNC('week', COALESCE(delivered_at, created_at))
        ORDER BY DATE_TRUNC('week', COALESCE(delivered_at, created_at)) ASC
      `, [storeId]),

      // 3. Ingresos diarios (Solo entregados, usando delivered_at)
      query(`
        SELECT 
          to_char(COALESCE(delivered_at, created_at), 'DD/MM') as day_label,
          COALESCE(SUM(total), 0) as amount
        FROM orders 
        WHERE store_id = $1 AND status = 'delivered' AND COALESCE(delivered_at, created_at) >= NOW() - INTERVAL '14 days'
        GROUP BY to_char(COALESCE(delivered_at, created_at), 'DD/MM'), DATE_TRUNC('day', COALESCE(delivered_at, created_at))
        ORDER BY DATE_TRUNC('day', COALESCE(delivered_at, created_at)) ASC
      `, [storeId]),

      // 4. Productos más vendidos (Top 5)
      query(`
        SELECT 
          product_name,
          SUM(quantity) as total_qty,
          SUM(subtotal) as total_amount
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        WHERE o.store_id = $1 AND o.status = 'delivered'
        GROUP BY product_name
        ORDER BY total_qty DESC
        LIMIT 5
      `, [storeId]),

      // 5. Info de suscripción para el Hero Banner (Unified Branding)
      query(`
        SELECT t.id, t.plan_type, t.subscription_expires_at, t.brand_name, t.status,
               COALESCE(ts.primary_color, t.brand_color_primary) as brand_color_primary,
               COALESCE(ts.secondary_color, t.brand_color_secondary) as brand_color_secondary
        FROM tenants t
        LEFT JOIN tenant_settings ts ON ts.tenant_id_fk = t.id
        WHERE t.id::text = $1::text
      `, [String(tenantId)]),

      // 6. Config de puntos (Solo entregados)
      query(`
        SELECT COALESCE(SUM(points_earned), 0) as total_assigned
        FROM orders WHERE store_id = $1 AND status = 'delivered'
      `, [storeId])
    ]);

    const basic = basicStats.rows[0];
    const tenant = tenantInfo.rows[0] || {};

    res.json({
      status: 'success',
      data: {
        // Cards
        products: parseInt(basic.products_count),
        orders: parseInt(basic.orders_count),
        revenue: parseFloat(basic.total_revenue),
        users: parseInt(basic.users_count),
        redeemedPoints: parseInt(basic.points_redeemed),
        assignedPoints: parseInt(loyaltyConfig.rows[0]?.total_assigned || 0),

        // Charts
        weeklyOrders: weeklyOrders.rows,
        dailyRevenue: dailyRevenue.rows,
        bestSellers: bestSellers.rows,

        // Subscription Hero
        subscription: {
           plan: tenant.plan_type || 'Full Digital',
           expires_at: tenant.subscription_expires_at,
           status: tenant.status,
           brand_name: tenant.brand_name,
           primary_color: tenant.brand_color_primary,
           secondary_color: tenant.brand_color_secondary
        }
      }
    });
  } catch (e) { 
    console.error('getDashboardStats Error:', e);
    res.status(500).json({ status: 'error', message: e.message }); 
  }
};

// ── LOCALES (sucursales físicas del tenant) ─────────────────────────────
export const getAdminStores = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await query(
      `SELECT * FROM stores WHERE CAST(tenant_id AS VARCHAR) = CAST($1 AS VARCHAR) ORDER BY id`,
      [tenantId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const createStore = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { name, address, image_url, google_maps_url, delivery_link, phone } = req.body;
    const result = await query(
      `INSERT INTO stores (name, address, image_url, waze_link, delivery_link, phone, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, address, image_url || null, google_maps_url || null, delivery_link || null, phone || null, tenantId]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const updateStore = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { name, address, image_url, google_maps_url, delivery_link, phone } = req.body;
    const result = await query(
      `UPDATE stores SET name=$1, address=$2, image_url=$3, waze_link=$4, delivery_link=$5, phone=$6
       WHERE id=$7 AND CAST(tenant_id AS VARCHAR)=CAST($8 AS VARCHAR) RETURNING *`,
      [name, address, image_url || null, google_maps_url || null, delivery_link || null, phone || null, id, tenantId]
    );
    if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Local no encontrado' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const deleteStore = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    await query('DELETE FROM stores WHERE id=$1 AND CAST(tenant_id AS VARCHAR)=CAST($2 AS VARCHAR)', [req.params.id, tenantId]);
    res.json({ status: 'success', message: 'Local eliminado' });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── PEDIDOS ADMIN ──────────────────────────────────────────────────────────
export const getAdminOrders = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const result = await query(
      `SELECT o.*, u.name as user_name, u.email as user_email
       FROM orders o LEFT JOIN users u ON o.user_id = u.id
       WHERE o.store_id = $1
       ORDER BY o.created_at DESC LIMIT 100`,
      [storeId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const updateOrderStatus = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Estado inválido' });
    }
    const storeId = await getStoreId(req);
    const tenantId = getTenantId(req);

    await client.query('BEGIN');

    // 1. Obtener estado actual de la orden con bloqueo
    const orderRes = await client.query(
      'SELECT id, status, user_id, points_earned, points_redeemed FROM orders WHERE id = $1 AND store_id = $2 FOR UPDATE',
      [id, storeId]
    );
    if (!orderRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ status: 'error', message: 'Pedido no encontrado' });
    }
    const order = orderRes.rows[0];

    // 2. Acreditación de puntos al marcar como 'delivered'
    if (status === 'delivered' && order.status !== 'delivered' && order.user_id && (order.points_earned || 0) > 1) {
      const loyaltyRes = await client.query(
        'SELECT loyalty_enabled FROM tenant_settings WHERE store_id = $1 LIMIT 1',
        [storeId]
      );
      if (loyaltyRes.rows[0]?.loyalty_enabled) {
        // Evitar duplicados (idempotencia)
        const alreadyEarned = await client.query(
          "SELECT id FROM points_history WHERE order_id = $1 AND type = 'earned'",
          [id]
        );
        if (!alreadyEarned.rows.length) {
          await client.query('UPDATE users SET points = points + $1 WHERE id = $2', [order.points_earned, order.user_id]);
          await client.query(
            `INSERT INTO points_history (user_id, order_id, points, type, description) VALUES ($1,$2,$3,'earned',$4)`,
            [order.user_id, id, order.points_earned, `Puntos ganados por pedido entregado #${id}`]
          );
        }
      }
    }

    // 3. Devolución de puntos al cancelar
    if (status === 'cancelled' && order.status !== 'cancelled' && order.user_id && (order.points_redeemed || 0) > 0) {
      const alreadyRefunded = await client.query(
        "SELECT id FROM points_history WHERE order_id = $1 AND type = 'refund'",
        [id]
      );
      if (!alreadyRefunded.rows.length) {
        await client.query('UPDATE users SET points = points + $1 WHERE id = $2', [order.points_redeemed, order.user_id]);
        await client.query(
          `INSERT INTO points_history (user_id, order_id, points, type, description) VALUES ($1,$2,$3,'refund',$4)`,
          [order.user_id, id, order.points_redeemed, `Devolución de puntos por cancelación de pedido #${id}`]
        );
      }
    }

    // 4. Actualizar estado de la orden
    const updateResult = await client.query(
      `UPDATE orders 
       SET status=$1, 
           delivered_at = CASE 
             WHEN $1 = 'delivered' THEN COALESCE(delivered_at, NOW()) 
             ELSE NULL 
           END,
           updated_at = NOW()
       WHERE id=$2 AND store_id=$3 
       RETURNING *`,
      [status, id, storeId]
    );

    await client.query('COMMIT');
    res.json({ status: 'success', data: updateResult.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    res.status(500).json({ status: 'error', message: e.message });
  } finally {
    client.release();
  }
};

// ── CONFIGURACIÓN MERCADOPAGO ──────────────────────────────────────────────
export const getMercadopagoConfig = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const result = await query(
      'SELECT mp_public_key, mp_sandbox, mp_access_token, store_name, store_email, store_phone, store_address, cash_on_delivery, orders_paused FROM tenant_settings WHERE store_id = $1 LIMIT 1',
      [storeId]
    );
    const settings = result.rows[0] || {};
    const backendUrl = process.env.BACKEND_URL || `https://voraz-platform-production.up.railway.app`;
    res.json({
      status: 'success',
      data: {
        mp_public_key: settings.mp_public_key || null,
        access_token_set: !!(settings.mp_access_token),
        mp_sandbox: settings.mp_sandbox ?? false,
        cash_on_delivery: settings.cash_on_delivery !== false,
        orders_paused: !!settings.orders_paused,
        webhook_url: `${backendUrl}/api/payments/webhook?store_id=${storeId}`,
        store_name: settings.store_name || null,
        store_email: settings.store_email || null,
        store_phone: settings.store_phone || null,
        store_address: settings.store_address || null,
      }
    });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const saveMercadopagoConfig = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const tenantId = getTenantId(req);
    const { mp_access_token, mp_public_key, mp_sandbox, cash_on_delivery, store_name, store_email, store_phone, store_address } = req.body;

    await query(
      `INSERT INTO tenant_settings (store_id, tenant_id, tenant_id_fk, mp_access_token, mp_public_key, mp_sandbox, cash_on_delivery, store_name, store_email, store_phone, store_address, updated_at)
       VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
       ON CONFLICT (store_id) DO UPDATE SET
         mp_access_token  = COALESCE(NULLIF($3,''), tenant_settings.mp_access_token),
         mp_public_key    = COALESCE(NULLIF($4,''), tenant_settings.mp_public_key),
         mp_sandbox       = $5,
         cash_on_delivery = $6,
         store_name       = COALESCE(NULLIF($7,''), tenant_settings.store_name),
         store_email      = COALESCE(NULLIF($8,''), tenant_settings.store_email),
         store_phone      = COALESCE(NULLIF($9,''), tenant_settings.store_phone),
         store_address    = COALESCE(NULLIF($10,''), tenant_settings.store_address),
         updated_at       = NOW()`,
      [storeId, tenantId, mp_access_token || '', mp_public_key || '', mp_sandbox ?? false, cash_on_delivery !== false, store_name || '', store_email || '', store_phone || '', store_address || '']
    );

    res.json({ status: 'success', message: 'Configuración guardada correctamente.' });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── BRANDING ───────────────────────────────────────────────────────────────
export const getBranding = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await query(
      `SELECT 
          COALESCE(ts.primary_color, t.brand_color_primary) as primary_color,
          COALESCE(ts.secondary_color, t.brand_color_secondary) as secondary_color,
          ts.font_family, 
          COALESCE(ts.logo_url, t.brand_logo_url) as logo_url,
          ts.custom_branding_enabled, 
          t.plan_type
       FROM tenants t
       LEFT JOIN tenant_settings ts ON ts.store_id = (SELECT id FROM stores WHERE tenant_id = t.id LIMIT 1)
       WHERE t.id::text = $1::text OR t.subdomain = $1::text LIMIT 1`,
      [String(tenantId)]
    );
    const branding = result.rows[0] || {};
    res.json({
      status: 'success',
      data: {
        custom_branding_enabled: !!branding.custom_branding_enabled || 
                                 (branding.plan_type && (branding.plan_type.toLowerCase().trim() === 'expert' || branding.plan_type.toLowerCase().trim() === 'full digital')),
        plan_type: branding.plan_type || 'Full Digital',
        primary_color:   branding.primary_color   || '#E30613',
        secondary_color: branding.secondary_color || '#1A1A1A',
        font_family:     branding.font_family     || 'Inter',
        logo_url:        branding.logo_url        || null,
      }
    });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const updateBranding = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    
    // Validar plan Expert o Full Digital
    const tenantCheck = await query('SELECT plan_type FROM tenants WHERE id::text = $1::text OR subdomain = $1::text', [String(tenantId)]);
    const plan = tenantCheck.rows[0]?.plan_type?.toLowerCase().trim();
    if (plan !== 'expert' && plan !== 'full digital') {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Función exclusiva del Plan Full Digital o Expert.' 
      });
    }

    const { primary_color, secondary_color, font_family, logo_url } = req.body;
    const storeId = await getStoreId(req);
    await query(
      `INSERT INTO tenant_settings (store_id, tenant_id, tenant_id_fk, primary_color, secondary_color, font_family, logo_url, updated_at)
       VALUES ($1, $2, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (store_id) DO UPDATE SET
         primary_color   = COALESCE(NULLIF($3,''), tenant_settings.primary_color),
         secondary_color = COALESCE(NULLIF($4,''), tenant_settings.secondary_color),
         font_family     = COALESCE(NULLIF($5,''), tenant_settings.font_family),
         logo_url        = COALESCE(NULLIF($6,''), tenant_settings.logo_url),
         updated_at      = NOW()`,
      [storeId, String(tenantId), primary_color || '', secondary_color || '', font_family || '', logo_url || '']
    );
    res.json({ status: 'success', message: 'Branding actualizado correctamente.' });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── QR MENU ────────────────────────────────────────────────────────────────
export const getQRConfig = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await query(
      `SELECT subdomain, plan_type FROM tenants WHERE id::text = $1::text OR subdomain = $1::text LIMIT 1`,
      [String(tenantId)]
    );
    const tenant = result.rows[0];
    
    res.json({
      status: 'success',
      data: {
        subdomain: tenant?.subdomain || String(tenantId),
        plan_type: tenant?.plan_type || 'Full Digital',
        root_domain: process.env.GASTRORED_DOMAIN || 'gastrored.com.ar'
      }
    });
  } catch (e) { 
    console.error('getQRConfig error:', e.message);
    res.status(500).json({ status: 'error', message: e.message }); 
  }
};

// ── FIDELIZACIÓN (LOYALTY) ───────────────────────────────────────────────────
export const getLoyaltyConfig = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const result = await query(
      `SELECT loyalty_enabled, points_redeem_value FROM tenant_settings WHERE store_id = $1`,
      [storeId]
    );
    const config = result.rows[0] || { loyalty_enabled: false, points_redeem_value: 0 };
    res.json({ status: 'success', data: config });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const updateLoyaltyConfig = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const tenantId = getTenantId(req);
    const { loyalty_enabled, points_redeem_value } = req.body;
    
    await query(
      `INSERT INTO tenant_settings (store_id, tenant_id, tenant_id_fk, loyalty_enabled, points_redeem_value, updated_at)
       VALUES ($1, $2, $2, $3, $4, NOW())
       ON CONFLICT (store_id) DO UPDATE SET
         loyalty_enabled     = $3,
         points_redeem_value = $4,
         updated_at          = NOW()`,
      [storeId, String(tenantId), !!loyalty_enabled, parseInt(points_redeem_value, 10) || 0]
    );
    res.json({ status: 'success', message: 'Configuración de fidelización actualizada.' });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── PAUSA DE PEDIDOS ───────────────────────────────────────────────────────────
/**
 * PATCH /api/admin/orders-pause
 * Body: { paused: boolean }
 * Activa o desactiva la recepción de nuevos pedidos para el comercio.
 */
export const toggleOrdersPaused = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const tenantId = getTenantId(req);
    const { paused } = req.body;
    if (typeof paused !== 'boolean') {
      return res.status(400).json({ status: 'error', message: 'El campo "paused" debe ser un booleano.' });
    }

    await query(
      `INSERT INTO tenant_settings (store_id, tenant_id, tenant_id_fk, orders_paused, updated_at)
       VALUES ($1, $2, $2, $3, NOW())
       ON CONFLICT (store_id) DO UPDATE SET
         orders_paused = $3,
         updated_at    = NOW()`,
      [storeId, String(tenantId), paused]
    );

    res.json({
      status: 'success',
      message: paused ? '🔴 Comercio pausado. No se aceptan nuevos pedidos.' : '✅ Comercio activo. Se aceptan pedidos.',
      data: { orders_paused: paused },
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
};


