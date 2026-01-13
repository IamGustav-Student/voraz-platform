import { query } from '../config/db.js';

export const getInfluencers = async (req, res) => {
  try {
    const result = await query('SELECT * FROM influencers ORDER BY id ASC');
    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getVideos = async (req, res) => {
  try {
    const result = await query('SELECT * FROM videos ORDER BY created_at DESC');
    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};