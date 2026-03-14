import { useEffect, useState } from 'react';
import { applyBrandTheme } from '../config/tenant';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').trim();

const DEFAULTS = {
  primary_color:   '#ef4444',
  secondary_color: '#1f2937',
  font_family:     'Inter, system-ui, sans-serif',
};

const applyToRoot = (branding) => {
  const root = document.documentElement;
  const primary   = branding.primary_color   || DEFAULTS.primary_color;
  const secondary = branding.secondary_color || DEFAULTS.secondary_color;

  root.style.setProperty('--primary-color',   primary);
  root.style.setProperty('--secondary-color', secondary);
  // Sincronizar también las variables brand-* para Tailwind bg-brand-primary etc.
  root.style.setProperty('--brand-primary',         primary);
  root.style.setProperty('--brand-primary-hover',   primary);
  root.style.setProperty('--brand-secondary',       secondary);

  if (branding.font_family) {
    root.style.setProperty('--font-family', branding.font_family);
    root.style.setProperty('font-family',   branding.font_family);
  }
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

    fetch(`${API_URL}/settings`, {
      headers: {
        'x-store-domain': window.location.hostname,
        'Content-Type': 'application/json',
      },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.data) return;
        const b = data.data;

        // Fallback robusto para colores y logo
        const finalBranding = {
          ...DEFAULTS,
          ...b,
          primary_color:   b.primary_color   || b.brand_color_primary   || DEFAULTS.primary_color,
          secondary_color: b.secondary_color || b.brand_color_secondary || DEFAULTS.secondary_color,
          logo_url:        b.logo_url        || b.brand_logo_url        || null,
          font_family:     b.font_family     || DEFAULTS.font_family,
        };

        if (b.custom_branding_enabled) {
          applyToRoot(finalBranding);
        } else {
          // Si no está habilitado custom branding, forzar colores GastroRed
          applyToRoot({
            ...finalBranding,
            primary_color:   '#E30613',
            secondary_color: '#F2C94C',
          });
        }

        // Actualizar título de la pestaña
        if (b.brand_name) {
          document.title = b.brand_name;
        }

        // Sincronizar con el objeto global TENANT
        applyBrandTheme(b);

        setBranding({ ...finalBranding, loaded: true });
      })
      .catch(() => {
        setBranding(prev => ({ ...prev, loaded: true }));
      });
  }, []);

  return branding;
};

export default useBranding;
