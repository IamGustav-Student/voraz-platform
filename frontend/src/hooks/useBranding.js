import { useEffect, useState } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').trim();

const DEFAULTS = {
  primary_color:   '#E30613',
  secondary_color: '#1A1A1A',
  font_family:     'Inter, system-ui, sans-serif',
};

const applyToRoot = (branding) => {
  const root = document.documentElement;
  root.style.setProperty('--primary-color',   branding.primary_color   || DEFAULTS.primary_color);
  root.style.setProperty('--secondary-color', branding.secondary_color || DEFAULTS.secondary_color);
  root.style.setProperty('--font-family',     branding.font_family     || DEFAULTS.font_family);
};

export const useBranding = () => {
  const [branding, setBranding] = useState({
    ...DEFAULTS,
    logo_url: null,
    custom_branding_enabled: false,
    loaded: false,
  });

  useEffect(() => {
    // Aplicar defaults inmediatamente para evitar flash
    applyToRoot(DEFAULTS);

    fetch(`${API_URL}/admin/branding`, {
      headers: {
        'x-store-domain': window.location.hostname,
        'Content-Type': 'application/json',
      },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.data) return;
        const b = data.data;
        if (b.custom_branding_enabled) {
          applyToRoot(b);
        }
        setBranding({ ...DEFAULTS, ...b, loaded: true });
      })
      .catch(() => {
        setBranding(prev => ({ ...prev, loaded: true }));
      });
  }, []);

  return branding;
};

export default useBranding;
