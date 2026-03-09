import { query } from '../config/db.js';

// Devuelve las sucursales físicas del tenant actual
export const getStores = async (req, res) => {
  try {
    // req.tenant.id es el subdomain del tenant (ej: 'voraz', 'miburguer')
    const tenantId = req.tenant?.id || req.store?.id || 'voraz';
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
