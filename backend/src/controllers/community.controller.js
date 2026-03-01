import { query } from '../config/db.js';

const getTenantId = (req) =>
  req.headers['x-tenant-id'] || req.query.tenant || process.env.TENANT_ID || 'voraz';

export const getInfluencers = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await query(
      'SELECT * FROM influencers WHERE tenant_id = $1 ORDER BY id ASC',
      [tenantId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getVideos = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await query(
      'SELECT * FROM videos WHERE tenant_id = $1 ORDER BY created_at DESC',
      [tenantId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
