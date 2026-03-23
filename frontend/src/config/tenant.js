// ─────────────────────────────────────────────────────────────────────────────
// TENANT CONFIG — Dinámico: se carga desde /api/settings en runtime
// Los valores por defecto (Voraz) se usan hasta que la API responda.
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').trim();

// Valores por defecto de GastroRed — se sobreescriben al cargar la config de la API
let _tenant = {
  id: import.meta.env.VITE_TENANT_ID || 'gastrored',
  brandName: import.meta.env.VITE_BRAND_NAME || 'GastroRed',
  slogan: import.meta.env.VITE_SLOGAN || '',
  logo: import.meta.env.VITE_LOGO_URL || null,
  favicon: '/favicon.ico',
  theme: {
    primary: import.meta.env.VITE_COLOR_PRIMARY || '#E30613',
    primaryHover: import.meta.env.VITE_COLOR_PRIMARY || '#b71c1c',
    secondary: import.meta.env.VITE_COLOR_SECONDARY || '#FFFFFF',
    background: '#121212',
    surface: '#1E1E1E',
    text: '#F5F5F5',
  },
  currency: 'ARS',
  currencySymbol: '$',
  pointsName: 'GastroRed Points',
  pointsRatio: 100,
  pointsValue: 5,
  welcomeBonus: 50,
  meta: {
    title: 'GastroRed',
    description: 'Tu carta digital.',
  },
  social: {
    instagram: '',
    whatsapp: '',
    facebook: '',
  },
};

const hexToRgb = (hex) => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return '0, 0, 0';
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  if (isNaN(r)) return '0, 0, 0';
  return `${r}, ${g}, ${b}`;
};

/** Aplica los colores del tenant como CSS custom properties en :root */
export function applyBrandTheme(settings) {
  if (!settings) return;
  const root = document.documentElement;

  // Custom branding logic
  let primary = _tenant.theme.primary;
  let secondary = _tenant.theme.secondary;
  let logo = _tenant.logo;
  let fontFam = null;

  if (settings.custom_branding_enabled) {
    primary = settings.primary_color || settings.brand_color_primary || primary;
    secondary = settings.secondary_color || settings.brand_color_secondary || secondary;
    logo = settings.logo_url || settings.brand_logo_url || logo;
    fontFam = settings.font_family || null;
  } else {
    primary = '#E30613';    // Default GastroRed
    secondary = '#F59E0B';  // Default GastroRed
    logo = '/vite.svg';     // GastroRed root app logo
  }

  const primaryHover = adjustColor(primary, -20);

  root.style.setProperty('--primary-color', primary);
  root.style.setProperty('--secondary-color', secondary);
  root.style.setProperty('--brand-primary', primary);
  root.style.setProperty('--brand-secondary', secondary);
  root.style.setProperty('--brand-primary-hover', primaryHover);
  
  root.style.setProperty('--brand-primary-rgb', hexToRgb(primary));
  root.style.setProperty('--brand-secondary-rgb', hexToRgb(secondary));

  if (fontFam) {
    root.style.setProperty('--font-family', fontFam);
    root.style.fontFamily = fontFam;
  }

  // Actualizar el objeto _tenant para que TENANT refleje los datos reales
  _tenant.brandName = settings.brand_name || _tenant.brandName;
  _tenant.slogan = settings.slogan || _tenant.slogan;
  _tenant.logo = logo;
  _tenant.theme.primary = primary;
  _tenant.theme.secondary = secondary;
  _tenant.theme.primaryHover = adjustColor(primary, -20);
  _tenant.customBrandingEnabled = !!settings.custom_branding_enabled;
  _tenant.loyaltyEnabled = !!settings.loyalty_enabled;
  _tenant.pointsRedeemValue = settings.points_redeem_value || 0;
  _tenant.status = settings.status || 'active';
  _tenant.whatsapp = settings.whatsapp || '';
  _tenant.address = settings.address || '';

  // Actualizar favicon si existe
  if (settings.brand_favicon_url) {
    const link = document.querySelector("link[rel~='icon']");
    if (link) link.href = settings.brand_favicon_url;
  }

  // Actualizar title
  if (settings.brand_name) {
    document.title = settings.brand_name;
  }
}

/** Oscurece un color hex en `amount` puntos (–20 = 20 más oscuro) */
function adjustColor(hex, amount) {
  try {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
    const num = parseInt(hex.replace('#', ''), 16);
    if (isNaN(num)) return hex;
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  } catch { return hex; }
}

/** Carga la config del tenant desde la API y aplica el branding */
export async function loadTenantConfig() {
  try {
    const res = await fetch(`${API_URL}/settings`, {
      headers: { 'x-store-domain': window.location.hostname },
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data?.data) applyBrandTheme(data.data);
  } catch {
    // Silencioso — usa los valores por defecto
  }
}

// Proxy para que TENANT siempre devuelva los valores actuales
export const TENANT = new Proxy(_tenant, {
  get: (target, prop) => target[prop],
});

export const TENANT_ID = _tenant.id;

// Helper para formatear precios con la moneda del tenant
export const formatPrice = (amount) =>
  `$${Number(amount).toLocaleString('es-AR')}`;


