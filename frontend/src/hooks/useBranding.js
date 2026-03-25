import { useEffect, useState } from 'react';
import { applyBrandTheme } from '../config/tenant';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').trim();

const DEFAULTS = {
  primary_color:   '#E30613',
  secondary_color: '#F59E0B',
  font_family:     'Inter, system-ui, sans-serif',
};



export const useBranding = () => {
  const [branding, setBranding] = useState({
    ...DEFAULTS,
    logo_url: null,
    custom_branding_enabled: false,
    loaded: false,
  });

  useEffect(() => {

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

        // Sincronizar con el objeto global TENANT y CSS variables
        applyBrandTheme(b);

        const finalBranding = {
          ...DEFAULTS,
          ...b,
          primary_color:   b.primary_color   || b.brand_color_primary   || DEFAULTS.primary_color,
          secondary_color: b.secondary_color || b.brand_color_secondary || DEFAULTS.secondary_color,
          logo_url:        b.logo_url        || b.brand_logo_url        || null,
          font_family:     b.font_family     || DEFAULTS.font_family,
        };

        // ── Generar Manifiesto PWA Dinámico ──────────────────────────────────
        
        const host = window.location.hostname.toLowerCase();
        const gastroRootEnv = (import.meta.env.VITE_GASTRORED_ROOT_DOMAIN || '').toLowerCase();
        const isGastroRedRoot = host === 'gastrored.com.ar' || host === 'www.gastrored.com.ar' || (gastroRootEnv && host === gastroRootEnv);
        
        const rawIcon = (b.custom_branding_enabled && (b.logo_url || b.brand_logo_url))
            ? (b.logo_url || b.brand_logo_url)
            : (!b.custom_branding_enabled && isGastroRedRoot ? '/vite.svg' : '/vite.svg');

        const isSvg = rawIcon.endsWith('.svg');
        const iconType = isSvg ? 'image/svg+xml' : (rawIcon.endsWith('.png') ? 'image/png' : 'image/jpeg');

        const manifestData = {
          name: b.brand_name || 'GastroRed',
          short_name: b.brand_name || 'GastroRed',
          description: b.slogan || 'Tu app de pedidos.',
          start_url: '/',
          display: 'standalone',
          background_color: '#000000',
          theme_color: (b.custom_branding_enabled ? (b.primary_color || b.brand_color_primary) : null) || '#E30613',
          icons: [
            {
              src: rawIcon,
              sizes: isSvg ? 'any' : '192x192',
              type: iconType
            },
            {
              src: rawIcon,
              sizes: isSvg ? 'any' : '512x512',
              type: iconType
            }
          ]
        };
        const blob = new Blob([JSON.stringify(manifestData)], { type: 'application/json' });
        const manifestUrl = URL.createObjectURL(blob);
        const manifestLink = document.getElementById('app-manifest');
        if (manifestLink) manifestLink.href = manifestUrl;

        setBranding({ ...finalBranding, loaded: true });
      })
      .catch(() => {
        setBranding(prev => ({ ...prev, loaded: true }));
      });
  }, []);

  return branding;
};

export default useBranding;
