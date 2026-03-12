import { query } from '../config/db.js';

export const getStores = async (req, res) => {
  try {
    const tenantId = req.tenant?.subdomain || req.tenant?.id || req.store?.subdomain || 1;
    const result = await query(
      `SELECT id, name, address, phone, image_url, waze_link, delivery_link, hours, lat, lng
       FROM stores
       WHERE tenant_id = $1
       ORDER BY id ASC`,
      [tenantId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
