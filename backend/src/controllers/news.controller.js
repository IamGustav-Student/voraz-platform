import { query } from '../config/db.js';

export const getNews = async (req, res) => {
  try {
    const result = await query('SELECT * FROM news ORDER BY date DESC');
    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};