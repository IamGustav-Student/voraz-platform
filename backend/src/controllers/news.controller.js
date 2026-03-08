import { query } from '../config/db.js';

export const getNews = async (req, res) => {
  try {
    const storeId = req.store?.id || 1;
    const result = await query(
      'SELECT * FROM news WHERE store_id = $1 ORDER BY date DESC',
      [storeId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
