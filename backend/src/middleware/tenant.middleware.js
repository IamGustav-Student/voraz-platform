import { query } from '../config/db.js';

// Tenant de fallback (Voraz — el tenant original)
const FALLBACK_TENANT = { id: 'voraz', plan_type: 'Expert', status: 'active', brand_name: 'Voraz' };

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
  host.includes('voraz-platform.vercel.app');

export const tenantMiddleware = async (req, res, next) => {
  const host = (req.headers['x-store-domain'] || req.headers.host || '').split(':')[0].toLowerCase().trim();

  if (!host) return res.status(400).json({ status: 'error', message: 'Host requerido.' });

  // Si es el dominio root de GastroRed → landing page
  if (GASTRORED_ROOT_DOMAINS.includes(host)) {
    req.isLanding = true;
    req.tenant = null;
    req.store = null;
    return next();
  }

  try {
    // Buscar en TENANTS (fuente de verdad de los clientes SaaS)
    const result = await query(
      `SELECT id, plan_type, status, brand_name, brand_color_primary, brand_color_secondary,
              brand_logo_url, brand_favicon_url, slogan, custom_domain, subdomain,
              subscription_expires_at
       FROM tenants
       WHERE subdomain = $1 OR custom_domain = $1
       LIMIT 1`,
      [host]
    );

    if (!result.rows.length) {
      // Dominios de infra (Railway/Vercel dev) → fallback a Voraz sin landing
      if (isInfraHost(host)) {
        req.tenant = FALLBACK_TENANT;
        req.store = FALLBACK_TENANT; // backward compat
        return next();
      }
      // Dominio desconocido → landing
      req.isLanding = true;
      req.tenant = null;
      req.store = null;
      return next();
    }

    const tenant = result.rows[0];

    // Si el pago está pendiente → mostrar landing (no romper como tenant vacío)
    if (tenant.status === 'pending_payment') {
      req.isLanding = true;
      req.tenant = null;
      req.store = null;
      return next();
    }

    if (tenant.status === 'suspended') {
      return res.status(402).json({
        status: 'error',
        message: 'Suscripción vencida. Contactá a GastroRed para renovar.',
        tenant_id: tenant.id,
      });
    }

    // Auto-suspender si la suscripción venció (solo tenants no-voraz)
    if (tenant.id !== 'voraz' && tenant.status === 'active' &&
      tenant.subscription_expires_at &&
      new Date(tenant.subscription_expires_at) < new Date()) {
      await query("UPDATE tenants SET status='suspended' WHERE id=$1", [tenant.id]);
      return res.status(402).json({
        status: 'error',
        message: 'Tu suscripción venció. Contactá a GastroRed para renovarla.',
        tenant_id: tenant.id,
      });
    }

    req.tenant = tenant;
    req.store = tenant; // backward compat con controllers que aún usan req.store
    next();
  } catch (err) {
    console.error('tenantMiddleware error:', err?.message || String(err));
    req.tenant = FALLBACK_TENANT;
    req.store = FALLBACK_TENANT;
    next();
  }
};
