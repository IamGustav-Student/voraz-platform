import { query } from '../config/db.js';

const PLAN_PRODUCT_LIMITS = { 'Full Digital': 50 };

async function getStoreId(req) {
  const rawId = req.tenant?.id || req.store?.id || 1;
  if (/^\d+$/.test(String(rawId))) return parseInt(rawId);
  try {
    const r = await query('SELECT id FROM stores WHERE CAST(tenant_id AS VARCHAR) = CAST($1 AS VARCHAR) ORDER BY id ASC LIMIT 1', [rawId]);
    return r.rows.length > 0 && !isNaN(parseInt(r.rows[0].id)) ? parseInt(r.rows[0].id) : 1;
  } catch { return 1; }
}

export const getMenu = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const sql = `
      SELECT
        p.id, p.name, p.description, p.price, p.image_url, p.badge, p.stock,
        c.name as category
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true AND p.store_id = $1
      ORDER BY p.category_id, p.price ASC
    `;
    const result = await query(sql, [storeId]);
    res.json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ status: 'error', message: error.message, code: error.code || null });
  }
};

export const getProductById = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const result = await query(
      `SELECT p.*, c.name as category FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1 AND p.store_id = $2`,
      [req.params.id, storeId]
    );
    if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Producto no encontrado.' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const planType = req.store?.plan_type || 'Expert';
    const limit = PLAN_PRODUCT_LIMITS[planType];
    if (limit) {
      const countRes = await query('SELECT COUNT(*) FROM products WHERE store_id = $1 AND is_active = true', [storeId]);
      if (parseInt(countRes.rows[0].count) >= limit) {
        return res.status(403).json({
          status: 'error',
          message: `Plan ${planType}: límite de ${limit} productos alcanzado. Actualizá a Expert para productos ilimitados.`,
          upgrade_required: true,
        });
      }
    }
    const { name, description, price, category_id, image_url, badge } = req.body;
    const result = await query(
      `INSERT INTO products (name, description, price, category_id, image_url, badge, store_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true) RETURNING *`,
      [name, description, price, category_id, image_url, badge, storeId]
    );
    res.status(201).json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const { name, description, price, category_id, image_url, badge, is_active } = req.body;
    const result = await query(
      `UPDATE products SET name=$1, description=$2, price=$3, category_id=$4,
       image_url=$5, badge=$6, is_active=$7 WHERE id=$8 AND store_id=$9 RETURNING *`,
      [name, description, price, category_id, image_url, badge, is_active, req.params.id, storeId]
    );
    if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Producto no encontrado.' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    await query('UPDATE products SET is_active=false WHERE id=$1 AND store_id=$2', [req.params.id, storeId]);
    res.json({ status: 'success', message: 'Producto desactivado.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
