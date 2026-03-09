import { query } from '../config/db.js';

// ── Configuración ──────────────────────────────────────────────────────────────
const FALLBACK_TENANT = { id: 'voraz', plan_type: 'Expert', status: 'active', brand_name: 'Voraz' };

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
  host.startsWith('127.') ||
  host.includes('.up.railway.app') ||
  host.includes('.railway.app') ||
  host.includes('voraz-platform.vercel.app');

/**
 * Dado el host completo, extrae el tenant_id candidato.
 * Ejemplos:
 *   voraz.gastrored.com.ar     → 'voraz'
 *   miburguer.gastrored.com.ar → 'miburguer'
 *   miburguer.com.ar           → 'miburguer.com.ar'  (dominio propio — se busca por custom_domain)
 */
function extractSubdomain(host) {
  if (host.endsWith(`.${GASTRORED_SUFFIX}`)) {
    return host.slice(0, host.length - GASTRORED_SUFFIX.length - 1);
  }
  return null; // dominio propio o desconocido
}

export const tenantMiddleware = async (req, res, next) => {
  const host = (req.headers['x-store-domain'] || req.headers.host || '')
    .split(':')[0].toLowerCase().trim();

  if (!host) return res.status(400).json({ status: 'error', message: 'Host requerido.' });

  // root GastroRed → landing
  if (GASTRORED_ROOT_DOMAINS.includes(host)) {
    req.isLanding = true;
    req.tenant = null;
    req.store = null;
    return next();
  }

  // Infra hosts (Railway, Vercel dev) → fallback silencioso a Voraz
  if (isInfraHost(host)) {
    req.tenant = FALLBACK_TENANT;
    req.store = FALLBACK_TENANT;
    return next();
  }

  // Extraer el subdomain si es un subdominio de GastroRed
  const subdomainPart = extractSubdomain(host); // 'voraz' | null (si es dominio propio)

  try {
    let result;

    if (subdomainPart) {
      // Subdominio GastroRed: buscar por id (=subdomain) o por subdomain column (post-phase17)
      // La query funciona tanto ANTES como DESPUÉS de que phase17 corre:
      //   - Antes: tenants.id = 'voraz', no tiene columna subdomain → solo busca por id
      //   - Después: tenants tiene subdomain column → busca por ambos
      result = await query(
        `SELECT id, plan_type, status, brand_name, brand_color_primary, brand_color_secondary,
                brand_logo_url, brand_favicon_url, slogan, subscription_expires_at,
                COALESCE(subdomain, id) as subdomain,
                custom_domain
         FROM tenants
         WHERE id = $1
            OR (subdomain IS NOT NULL AND subdomain = $1)
         LIMIT 1`,
        [subdomainPart]
      ).catch(async () => {
        // Si la columna subdomain no existe aún (pre-phase17) → usar solo id
        return query(
          `SELECT id, plan_type, status, brand_name, brand_color_primary, brand_color_secondary,
                  brand_logo_url, brand_favicon_url, slogan, subscription_expires_at,
                  id as subdomain, NULL as custom_domain
           FROM tenants WHERE id = $1 LIMIT 1`,
          [subdomainPart]
        );
      });
    } else {
      // Dominio propio (custom_domain): buscar por custom_domain exacto
      result = await query(
        `SELECT id, plan_type, status, brand_name, brand_color_primary, brand_color_secondary,
                brand_logo_url, brand_favicon_url, slogan, subscription_expires_at,
                COALESCE(subdomain, id) as subdomain, custom_domain
         FROM tenants
         WHERE custom_domain = $1
         LIMIT 1`,
        [host]
      ).catch(async () => {
        return query(
          `SELECT id, plan_type, status, brand_name, brand_color_primary, brand_color_secondary,
                  brand_logo_url, brand_favicon_url, slogan, subscription_expires_at,
                  id as subdomain, NULL as custom_domain
           FROM tenants WHERE id = $1 LIMIT 1`,
          [host]
        );
      });
    }

    if (!result.rows.length) {
      // Tenant desconocido → landing
      req.isLanding = true;
      req.tenant = null;
      req.store = null;
      return next();
    }

    const tenant = result.rows[0];

    // pending_payment → mostrar landing (no redirigir a tenant vacío)
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

    // Auto-suspender si venció (no aplica a Voraz)
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
    req.store = tenant; // backward compat
    next();
  } catch (err) {
    // En caso de error inesperado → fallback a Voraz (no romper la app)
    console.error('tenantMiddleware error:', err?.message || String(err));
    req.tenant = FALLBACK_TENANT;
    req.store = FALLBACK_TENANT;
    next();
  }
};
