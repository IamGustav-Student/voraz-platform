import { query } from '../config/db.js';

const getTenantId = (req) =>
  req.headers['x-tenant-id'] || req.query.tenant || process.env.TENANT_ID || 'voraz';

export const getNews = async (req, res) => {
  try {
    const tenantId = getTenantId(req);
    const result = await query(
      'SELECT * FROM news WHERE tenant_id = $1 ORDER BY date DESC',
      [tenantId]
    );
    res.json({ status: 'success', data: result.rows });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};
