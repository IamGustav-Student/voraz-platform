import { query } from '../config/db.js';
import { v2 as cloudinary } from 'cloudinary';

const getTenantId = (req) =>
  req.headers['x-tenant-id'] || req.query.tenant || process.env.TENANT_ID || 'voraz';

// ── PRODUCTOS ──────────────────────────────────────────────────────────────
export const getAdminProducts = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await query(
      `SELECT p.*, c.name as category_name FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.tenant_id = $1 ORDER BY p.category_id, p.id`,
      [tenantId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const createProduct = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { name, description, price, category_id, image_url, badge } = req.body;
    const result = await query(
      `INSERT INTO products (name, description, price, category_id, image_url, badge, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, description, price, category_id, image_url, badge || null, tenantId]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const updateProduct = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { name, description, price, category_id, image_url, badge, is_active } = req.body;
    const result = await query(
      `UPDATE products SET name=$1, description=$2, price=$3, category_id=$4,
       image_url=$5, badge=$6, is_active=$7
       WHERE id=$8 AND tenant_id=$9 RETURNING *`,
      [name, description, price, category_id, image_url, badge || null, is_active ?? true, id, tenantId]
    );
    if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Producto no encontrado' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const deleteProduct = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    await query('UPDATE products SET is_active=false WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
    res.json({ status: 'success', message: 'Producto desactivado' });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const getCategories = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await query('SELECT * FROM categories WHERE tenant_id=$1 ORDER BY id', [tenantId]);
    res.json({ status: 'success', data: result.rows });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const createCategory = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { name, description, image_url } = req.body;
    const result = await query(
      'INSERT INTO categories (name, description, image_url, tenant_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, description || null, image_url || null, tenantId]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const updateCategory = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { name, description, image_url } = req.body;
    const result = await query(
      'UPDATE categories SET name=$1, description=$2, image_url=$3 WHERE id=$4 AND tenant_id=$5 RETURNING *',
      [name, description || null, image_url || null, id, tenantId]
    );
    if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Categoría no encontrada' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const deleteCategory = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const used = await query('SELECT COUNT(*) FROM products WHERE category_id=$1 AND is_active=true', [id]);
    if (parseInt(used.rows[0].count) > 0) {
      return res.status(409).json({ status: 'error', message: 'No se puede eliminar: hay productos activos en esta categoría' });
    }
    await query('DELETE FROM categories WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
    res.json({ status: 'success', message: 'Categoría eliminada' });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── CUPONES ────────────────────────────────────────────────────────────────
export const getAdminCoupons = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await query('SELECT * FROM coupons WHERE tenant_id=$1 ORDER BY id DESC', [tenantId]);
    res.json({ status: 'success', data: result.rows });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const createCoupon = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { code, description, discount_type, discount_value, min_order, max_uses, expires_at } = req.body;
    const result = await query(
      `INSERT INTO coupons (code, description, discount_type, discount_value, min_order, max_uses, expires_at, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [code.toUpperCase(), description, discount_type, discount_value, min_order || 0, max_uses || null, expires_at || null, tenantId]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const updateCoupon = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { active } = req.body;
    const result = await query(
      'UPDATE coupons SET active=$1 WHERE id=$2 AND tenant_id=$3 RETURNING *',
      [active, id, tenantId]
    );
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const deleteCoupon = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    await query('DELETE FROM coupons WHERE id=$1 AND tenant_id=$2', [req.params.id, tenantId]);
    res.json({ status: 'success', message: 'Cupón eliminado' });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── VIDEOS ─────────────────────────────────────────────────────────────────
export const createVideo = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    let { title, youtube_url } = req.body;
    // Extraer ID del link de YouTube
    const match = youtube_url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    if (!match) return res.status(400).json({ status: 'error', message: 'URL de YouTube inválida' });
    const youtube_id = match[1];
    const thumbnail_url = `https://img.youtube.com/vi/${youtube_id}/hqdefault.jpg`;
    const result = await query(
      'INSERT INTO videos (title, youtube_id, thumbnail_url, tenant_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [title, youtube_id, thumbnail_url, tenantId]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const deleteVideo = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    await query('DELETE FROM videos WHERE id=$1 AND tenant_id=$2', [req.params.id, tenantId]);
    res.json({ status: 'success', message: 'Video eliminado' });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── NOTICIAS ───────────────────────────────────────────────────────────────
export const createNews = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { title, content, image_url, date } = req.body;
    const result = await query(
      'INSERT INTO news (title, content, image_url, date, tenant_id) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [title, content, image_url, date || new Date().toISOString().split('T')[0], tenantId]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const updateNews = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { title, content, image_url } = req.body;
    const result = await query(
      'UPDATE news SET title=$1, content=$2, image_url=$3 WHERE id=$4 AND tenant_id=$5 RETURNING *',
      [title, content, image_url, id, tenantId]
    );
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const deleteNews = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    await query('DELETE FROM news WHERE id=$1 AND tenant_id=$2', [req.params.id, tenantId]);
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
    const { image_base64, folder } = req.body;
    if (!image_base64) return res.status(400).json({ status: 'error', message: 'Se requiere image_base64' });
    const tenantId = getTenantId(req);
    const result = await cloudinary.uploader.upload(image_base64, {
      folder: `tenants/${tenantId}/${folder || 'products'}`,
      resource_type: 'image',
    });
    res.json({ status: 'success', data: { url: result.secure_url, public_id: result.public_id } });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── STATS / DASHBOARD ─────────────────────────────────────────────────────
export const getDashboardStats = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const [products, orders, users, coupons] = await Promise.all([
      query('SELECT COUNT(*) FROM products WHERE tenant_id=$1 AND is_active=true', [tenantId]),
      query("SELECT COUNT(*), COALESCE(SUM(total),0) as revenue FROM orders WHERE status != 'cancelled'"),
      query('SELECT COUNT(*) FROM users'),
      query('SELECT COUNT(*) FROM coupons WHERE tenant_id=$1 AND active=true', [tenantId]),
    ]);
    res.json({
      status: 'success',
      data: {
        products: parseInt(products.rows[0].count),
        orders: parseInt(orders.rows[0].count),
        revenue: parseFloat(orders.rows[0].revenue),
        users: parseInt(users.rows[0].count),
        activeCoupons: parseInt(coupons.rows[0].count),
      }
    });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── PEDIDOS ADMIN ──────────────────────────────────────────────────────────
export const getAdminOrders = async (req, res) => {
  try {
    const result = await query(
      `SELECT o.*, u.name as user_name, u.email as user_email
       FROM orders o LEFT JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC LIMIT 100`
    );
    res.json({ status: 'success', data: result.rows });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ status: 'error', message: 'Estado inválido' });
    }
    const result = await query(
      'UPDATE orders SET status=$1 WHERE id=$2 RETURNING *',
      [status, id]
    );
    if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Pedido no encontrado' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── CONFIGURACIÓN MERCADOPAGO ──────────────────────────────────────────────
export const getMercadopagoConfig = async (req, res) => {
  res.json({
    status: 'success',
    data: {
      public_key: process.env.MP_PUBLIC_KEY ? '***configurado***' : null,
      access_token_set: !!process.env.MP_ACCESS_TOKEN,
      webhook_url: `${process.env.BACKEND_URL || ''}/api/payments/webhook`,
    }
  });
};

export const saveMercadopagoConfig = async (req, res) => {
  res.json({
    status: 'info',
    message: 'Para actualizar las credenciales de MercadoPago, editá las variables de entorno MP_PUBLIC_KEY y MP_ACCESS_TOKEN en Railway → Variables. Los cambios se aplican en el próximo redeploy.'
  });
};
