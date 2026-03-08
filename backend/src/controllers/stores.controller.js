import { query } from '../config/db.js';

export const getStores = async (req, res) => {
  try {
    const storeId = req.store?.id || 1;
    const result = await query(
      `SELECT id, name, address, phone, image_url, waze_link, delivery_link
       FROM stores
       WHERE id = $1
          OR (store_id = $1 AND id != $1)
       ORDER BY id ASC`,
      [storeId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
