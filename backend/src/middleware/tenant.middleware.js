import { query } from '../config/db.js';

const FALLBACK_STORE = { id: 1, plan_type: 'Expert', status: 'active', brand_name: 'Voraz' };

export const tenantMiddleware = async (req, res, next) => {
  const host = (req.headers['x-store-domain'] || req.headers.host || '').split(':')[0].toLowerCase().trim();

  if (!host) return res.status(400).json({ status: 'error', message: 'Host requerido.' });

  try {
    const result = await query(
      `SELECT id, plan_type, status, brand_name, brand_color_primary, brand_color_secondary,
              brand_logo_url, brand_favicon_url, slogan, custom_domain, subdomain
       FROM stores
       WHERE custom_domain = $1 OR subdomain = $1
       LIMIT 1`,
      [host]
    );

    if (!result.rows.length) {
      const isLocal = host === 'localhost' || host.startsWith('127.') || host.includes('.railway.app') || host.includes('.vercel.app') || host.includes('.up.railway.app');
      if (isLocal) {
        req.store = FALLBACK_STORE;
        return next();
      }
      return res.status(404).json({ status: 'error', message: `Comercio no encontrado para el dominio: ${host}` });
    }

    const store = result.rows[0];

    if (store.status === 'suspended') {
      return res.status(402).json({
        status: 'error',
        message: 'Suscripción vencida. Contactá a GastroRed para renovar.',
        store_id: store.id,
      });
    }

    req.store = store;
    next();
  } catch (err) {
    console.error('tenantMiddleware error:', err?.message || String(err));
    req.store = FALLBACK_STORE;
    next();
  }
};
