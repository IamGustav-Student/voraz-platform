import { query } from '../config/db.js';
import { getTenantId } from '../utils/tenant.js';

// ── PUBLIC ──────────────────────────────────────────────────────────────────

export const getPromos = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await query(
      `SELECT p.*, pr.name as product_name
       FROM promos p
       LEFT JOIN products pr ON p.product_id = pr.id AND pr.deleted_at IS NULL
       WHERE p.tenant_id = $1 AND p.is_active = true
       ORDER BY p.created_at DESC`,
      [String(tenantId)]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
};

// ── ADMIN ───────────────────────────────────────────────────────────────────

export const getAdminPromos = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await query(
      `SELECT p.*, pr.name as product_name
       FROM promos p
       LEFT JOIN products pr ON p.product_id = pr.id AND pr.deleted_at IS NULL
       WHERE p.tenant_id = $1
       ORDER BY p.created_at DESC`,
      [String(tenantId)]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
};

export const createPromo = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { product_id, title, description, promo_type, price, image_url, is_active } = req.body;
    
    const result = await query(
      `INSERT INTO promos (tenant_id, product_id, title, description, promo_type, price, image_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [String(tenantId), product_id || null, title, description || '', promo_type || 'Libre', price || 0, image_url || null, is_active !== false]
    );
    
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
};

export const updatePromo = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    const { product_id, title, description, promo_type, price, image_url, is_active } = req.body;
    
    const result = await query(
      `UPDATE promos 
       SET product_id = $1, title = $2, description = $3, promo_type = $4, price = $5, image_url = $6, is_active = $7
       WHERE id = $8 AND tenant_id = $9
       RETURNING *`,
      [product_id || null, title, description || '', promo_type || 'Libre', price || 0, image_url || null, is_active !== false, id, String(tenantId)]
    );
    
    if (result.rowCount === 0) return res.status(404).json({ status: 'error', message: 'Promo no encontrada' });
    
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
};

export const deletePromo = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const { id } = req.params;
    
    const result = await query(
      'DELETE FROM promos WHERE id = $1 AND tenant_id = $2',
      [id, String(tenantId)]
    );
    
    if (result.rowCount === 0) return res.status(404).json({ status: 'error', message: 'Promo no encontrada' });
    
    res.json({ status: 'success', message: 'Promo eliminada' });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
};
