import { query } from '../config/db.js';
import { getStoreId } from '../utils/tenant.js';

export const getNews = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const result = await query(
      'SELECT * FROM news WHERE store_id = $1 ORDER BY date DESC',
      [storeId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
