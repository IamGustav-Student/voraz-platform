import { query } from '../config/db.js';
import { getStoreId } from '../utils/tenant.js';

export const getInfluencers = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const result = await query(
      'SELECT * FROM influencers WHERE store_id = $1 ORDER BY id ASC',
      [storeId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getVideos = async (req, res) => {
  try {
    const storeId = await getStoreId(req);
    const result = await query(
      'SELECT * FROM videos WHERE store_id = $1 ORDER BY created_at DESC',
      [storeId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
