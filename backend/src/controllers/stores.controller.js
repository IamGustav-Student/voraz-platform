import { query } from '../config/db.js';

export const getStores = async (req, res) => {
  try {
    const result = await query('SELECT * FROM stores ORDER BY id ASC');
    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};