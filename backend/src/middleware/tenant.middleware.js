import { query } from '../config/db.js';

// ── Configuración ──────────────────────────────────────────────────────────────
const FALLBACK_TENANT = { id: 1, store_id: 1, plan_type: 'Expert', status: 'active', brand_name: 'GastroRed' };
const CACHE_TTL_MS = 60 * 1000; // 1 minuto: reducir consultas a DB sin dejar de reaccionar a cambios
const tenantCache = new Map(); // host -> { tenant, expiresAt }

// Dominios root de GastroRed → siempre landing
const GASTRORED_ROOT_DOMAINS = [
  'gastrored.com.ar',
  'www.gastrored.com.ar',
  process.env.GASTRORED_ROOT_DOMAIN,
].filter(Boolean).map(d => d.toLowerCase());

// Sufijo del SaaS (ej: '.gastrored.com.ar')
const GASTRORED_SUFFIX = (process.env.GASTRORED_ROOT_DOMAIN || 'gastrored.com.ar').toLowerCase();

// Hosts de infra que NO son tenants reales → fallback a Voraz
const isInfraHost = (host) =>
  host === 'localhost' ||
  host === '127.0.0.1' ||
  host.startsWith('192.168.') ||
  host.includes('.up.railway.app') ||
  host.includes('.railway.app') ||
  host.includes('voraz-platform.vercel.app');

function extractSubdomain(host) {
  // Caso local: subdominio.localhost
  if (host.endsWith('.localhost')) {
    return host.replace('.localhost', '');
  }
  
  // Caso prod: subdominio.gastrored.com.ar
  if (host.endsWith(`.${GASTRORED_SUFFIX}`)) {
    return host.slice(0, host.length - GASTRORED_SUFFIX.length - 1);
  }
  return null;
}

/**
 * Verifica si el tenant puede acceder: activo y suscripción no vencida.
 * Retorna null si es válido, o un objeto { statusCode, body } para responder con error.
 */
function validateTenantAccess(tenant) {
  if (!tenant) return null;
  const status = (tenant.status || '').toLowerCase();
  if (status === 'suspended') {
    return {
      statusCode: 403,
      body: {
        status: 'error',
        message: 'Suscripción vencida o inactiva. Contactá a GastroRed para renovar.',
        tenant_id: tenant.id,
      },
    };
  }
  if (status !== 'active') {
    return {
      statusCode: 403,
      body: {
        status: 'error',
        message: 'Comercio no activo.',
        tenant_id: tenant.id,
      },
    };
  }
  const expiresAt = tenant.subscription_expires_at ? new Date(tenant.subscription_expires_at) : null;
  if (String(tenant.id) !== '1' && expiresAt && expiresAt < new Date()) {
    return {
      statusCode: 403,
      body: {
        status: 'error',
        message: 'Tu suscripción venció. Contactá a GastroRed para renovarla.',
        tenant_id: tenant.id,
      },
    };
  }
  return null;
}

/**
 * Limpia la caché de tenants (útil tras un cambio de plan o activación).
 */
export const clearTenantCache = () => {
  console.log('[Middleware] Clearing tenant cache...');
  tenantCache.clear();
};

export const tenantMiddleware = async (req, res, next) => {
  const host = (req.headers['x-store-domain'] || req.headers.host || '')
    .split(':')[0].toLowerCase().trim();

  if (!host) return res.status(400).json({ status: 'error', message: 'Host requerido.' });
  
  console.log(`[Middleware] Host: ${host}`, { rootDomains: GASTRORED_ROOT_DOMAINS });
  
  // root GastroRed → landing
  if (GASTRORED_ROOT_DOMAINS.includes(host)) {
    console.log(`[Middleware] Root domain detected: ${host}`);
    req.isLanding = true;
    req.tenant = null;
    req.store = null;
    return next();
  }

  // Infra hosts (Railway, Vercel dev) → fallback silencioso a Voraz
  if (isInfraHost(host)) {
    console.log(`[Middleware] Infra host detected: ${host}`);
    req.tenant = FALLBACK_TENANT;
    req.store = FALLBACK_TENANT;
    return next();
  }

  const subdomainPart = extractSubdomain(host);
  console.log(`[Middleware] Extracted subdomain: ${subdomainPart}`);

  try {
    let tenant = null;
    const cached = tenantCache.get(host);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      tenant = cached.tenant;
    } else {
      let result;
      if (subdomainPart) {
        result = await query(
          `SELECT id, plan_type, status, brand_name, brand_color_primary, brand_color_secondary,
                  brand_logo_url, brand_favicon_url, slogan, subscription_expires_at,
                  COALESCE(subdomain, id) as subdomain, custom_domain
           FROM tenants
           WHERE id = $1 OR (subdomain IS NOT NULL AND subdomain = $1)
           LIMIT 1`,
          [subdomainPart]
        ).catch(async () =>
          query(
            `SELECT id, plan_type, status, brand_name, brand_color_primary, brand_color_secondary,
                    brand_logo_url, brand_favicon_url, slogan, subscription_expires_at,
                    id as subdomain, NULL as custom_domain
             FROM tenants WHERE id = $1 LIMIT 1`,
            [subdomainPart]
          )
        );
      } else {
        result = await query(
          `SELECT id, plan_type, status, brand_name, brand_color_primary, brand_color_secondary,
                  brand_logo_url, brand_favicon_url, slogan, subscription_expires_at,
                  COALESCE(subdomain, id) as subdomain, custom_domain
           FROM tenants WHERE custom_domain = $1 LIMIT 1`,
          [host]
        ).catch(async () =>
          query(
            `SELECT id, plan_type, status, brand_name, brand_color_primary, brand_color_secondary,
                    brand_logo_url, brand_favicon_url, slogan, subscription_expires_at,
                    id as subdomain, NULL as custom_domain
             FROM tenants WHERE id = $1 LIMIT 1`,
            [host]
          )
        );
      }

      if (!result.rows.length) {
        req.isLanding = true;
        req.tenant = null;
        req.store = null;
        return next();
      }
      tenant = result.rows[0];
      tenantCache.set(host, { tenant, expiresAt: now + CACHE_TTL_MS });
    }

    if (tenant.status === 'pending_payment') {
      req.isLanding = true;
      req.tenant = null;
      req.store = null;
      return next();
    }

    const invalid = validateTenantAccess(tenant);
    if (invalid) {
      if (String(tenant.id) !== '1' && tenant.status === 'active' && tenant.subscription_expires_at && new Date(tenant.subscription_expires_at) < new Date()) {
        try {
          await query("UPDATE tenants SET status='suspended' WHERE id=$1", [tenant.id]);
          tenantCache.delete(host);
        } catch (_) {}
      }
      return res.status(invalid.statusCode).json(invalid.body);
    }

    req.tenant = tenant;
    req.store = tenant;
    next();
  } catch (err) {
    console.error('tenantMiddleware error:', err?.message || String(err));
    req.tenant = FALLBACK_TENANT;
    req.store = FALLBACK_TENANT;
    next();
  }
};

export const requireCustomBranding = async (req, res, next) => {
  if (!req.tenant || !req.tenant.id) {
    return res.status(401).json({ status: 'error', message: 'No hay contexto de comercio activo.' });
  }
  try {
    const result = await query(
      "SELECT custom_branding_enabled FROM tenant_settings WHERE tenant_id::text = $1::text OR tenant_id_fk::text = $1::text LIMIT 1",
      [req.tenant.id]
    );
    
    const plan = req.tenant.plan_type?.toLowerCase().trim();
    if ((result.rows.length > 0 && result.rows[0].custom_branding_enabled) || 
        (plan === 'expert' || plan === 'full digital')) {
      return next();
    }
    
    return res.status(403).json({
      status: 'error',
      message: 'Tu plan actual no incluye branding personalizado (requiere Plan Full Digital o Expert). Contactá al Súper Admin',
    });
  } catch (err) {
    console.error('requireCustomBranding error:', err);
    return res.status(500).json({ status: 'error', message: 'Error validando privilegios de branding.' });
  }
};
