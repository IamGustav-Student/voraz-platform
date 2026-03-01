import { query } from '../config/db.js';

// Helper: obtiene el tenant_id del header o query param, default 'voraz'
const getTenantId = (req) =>
  req.headers['x-tenant-id'] || req.query.tenant || process.env.TENANT_ID || 'voraz';

export const getMenu = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const sql = `
      SELECT 
        p.id, p.name, p.description, p.price, p.image_url, p.badge,
        c.name as category 
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_active = true AND p.tenant_id = $1
      ORDER BY p.category_id, p.price ASC
    `;
    const result = await query(sql, [tenantId]);
    res.json({ status: 'success', count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Error fetching menu:', error);
    res.status(500).json({ status: 'error', message: error.message, code: error.code || null });
  }
};
