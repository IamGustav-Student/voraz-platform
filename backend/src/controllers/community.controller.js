import { query } from '../config/db.js';

export const getInfluencers = async (req, res) => {
  try {
    const storeId = req.store?.id || 1;
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
    const storeId = req.store?.id || 1;
    const result = await query(
      'SELECT * FROM community_videos WHERE store_id = $1 ORDER BY created_at DESC',
      [storeId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
