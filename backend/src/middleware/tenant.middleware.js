import { query } from '../config/db.js';

// Store de fallback (Voraz — tenant id=1)
const FALLBACK_STORE = { id: 1, plan_type: 'Expert', status: 'active', brand_name: 'Voraz' };

// Dominios del root de GastroRed que deben mostrar la landing, no un tenant
const GASTRORED_ROOT_DOMAINS = [
  'gastrored.com.ar',
  'www.gastrored.com.ar',
  process.env.GASTRORED_ROOT_DOMAIN,
].filter(Boolean).map(d => d.toLowerCase());

// Dominios de infraestructura que hacen fallback a Voraz (dev/CI)
const isInfraHost = (host) =>
  host === 'localhost' ||
  host.startsWith('127.') ||
  host.includes('.up.railway.app') ||
  host.includes('.railway.app') ||
  host.includes('voraz-platform.vercel.app'); // URL de Vercel del tenant Voraz

export const tenantMiddleware = async (req, res, next) => {
  const host = (req.headers['x-store-domain'] || req.headers.host || '').split(':')[0].toLowerCase().trim();

  if (!host) return res.status(400).json({ status: 'error', message: 'Host requerido.' });

  // Si es el dominio root de GastroRed → landing page
  if (GASTRORED_ROOT_DOMAINS.includes(host)) {
    req.isLanding = true;
    req.store = null;
    return next();
  }

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
      // Dominios de infra (Railway/Vercel dev) → fallback a Voraz sin landing
      if (isInfraHost(host)) {
        req.store = FALLBACK_STORE;
        return next();
      }
      // Dominio desconocido no registrado → indicar landing al frontend
      req.isLanding = true;
      req.store = null;
      return next();
    }

    const store = result.rows[0];

    // Si el pago está pendiente → mostrar landing (no romper como tenant vacío)
    if (store.status === 'pending_payment') {
      req.isLanding = true;
      req.store = null;
      return next();
    }

    if (store.status === 'suspended') {
      return res.status(402).json({
        status: 'error',
        message: 'Suscripción vencida. Contactá a GastroRed para renovar.',
        store_id: store.id,
      });
    }

    // Si estaba activo pero la suscripción venció → suspender automáticamente y avisar
    if (store.status === 'active' && store.subscription_expires_at && new Date(store.subscription_expires_at) < new Date()) {
      await query("UPDATE stores SET status='suspended' WHERE id=$1", [store.id]);
      return res.status(402).json({
        status: 'error',
        message: 'Tu suscripción venció. Contactá a GastroRed para renovarla.',
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
