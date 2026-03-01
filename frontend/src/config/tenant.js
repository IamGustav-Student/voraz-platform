// ─────────────────────────────────────────────────────────────────────────────
// TENANT CONFIG — Archivo maestro de identidad de marca
// Para deployar una nueva marca: solo cambiá este archivo + .env
// ─────────────────────────────────────────────────────────────────────────────

const tenantId = import.meta.env.VITE_TENANT_ID || 'voraz';

// Configuraciones por tenant
const tenants = {
  voraz: {
    id: 'voraz',
    brandName: 'Voraz',
    slogan: 'El hambre de crecer',
    tagline: 'Hamburguesas que no piden perdón.',
    logo: null, // null = usar brandName como texto
    favicon: '/favicon.ico',
    social: {
      instagram: 'https://www.instagram.com/voraz.arg/',
      whatsapp: '+5491100000000',
      tiktok: null,
    },
    theme: {
      primary: '#D92525',
      primaryHover: '#b71c1c',
      secondary: '#F2C94C',
      background: '#121212',
      surface: '#1E1E1E',
      text: '#F5F5F5',
    },
    currency: 'ARS',
    currencySymbol: '$',
    pointsName: 'Voraz Points',
    pointsRatio: 100,     // $100 = 1 punto
    pointsValue: 5,       // 1 punto = $5 de descuento
    welcomeBonus: 50,
    meta: {
      title: 'Voraz — Hamburguesas que no piden perdón',
      description: 'Pedí online, ganá puntos y disfrutá las mejores smash burgers de Buenos Aires.',
    },
  },

  // Ejemplo de segunda marca — solo cambiar VITE_TENANT_ID=cafecito
  cafecito: {
    id: 'cafecito',
    brandName: 'Cafecito',
    slogan: 'El mejor café de tu barrio',
    tagline: 'Café de especialidad, siempre cerca.',
    logo: null,
    favicon: '/favicon.ico',
    social: {
      instagram: null,
      whatsapp: null,
      tiktok: null,
    },
    theme: {
      primary: '#6F4E37',
      primaryHover: '#5a3e2b',
      secondary: '#F5CBA7',
      background: '#1a1208',
      surface: '#2a1f10',
      text: '#FDF6EC',
    },
    currency: 'ARS',
    currencySymbol: '$',
    pointsName: 'Café Points',
    pointsRatio: 100,
    pointsValue: 5,
    welcomeBonus: 30,
    meta: {
      title: 'Cafecito — Café de especialidad',
      description: 'Los mejores cafés de especialidad cerca tuyo.',
    },
  },
};

export const TENANT = tenants[tenantId] || tenants['voraz'];
export const TENANT_ID = TENANT.id;

// Helper para formatear precios con la moneda del tenant
export const formatPrice = (amount) =>
  `${TENANT.currencySymbol}${Number(amount).toLocaleString('es-AR')}`;
