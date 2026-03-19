import { createContext, useContext, useEffect, useState } from 'react';
import { TENANT } from '../config/tenant.js';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').trim();

const TenantContext = createContext(null);

const defaultTenant = {
  brandName: TENANT.brandName,
  slogan: TENANT.slogan,
  tagline: TENANT.tagline,
  logo: TENANT.logo,
  colors: TENANT.theme,
  social: TENANT.social,
  currency: TENANT.currency,
  currencySymbol: TENANT.currencySymbol,
  pointsName: TENANT.pointsName,
  cashOnDelivery: true,
  planType: 'Expert',
  loyaltyEnabled: false,
  pointsRedeemValue: 0,
  loaded: false,
};

export function TenantProvider({ children }) {
  const [tenant, setTenant] = useState(defaultTenant);

  useEffect(() => {
    const domain = window.location.hostname;
    fetch(`${API_URL}/settings`, {
      headers: { 'x-store-domain': domain },
    })
      .then(r => r.json())
      .then(data => {
        const s = data.data || data;
        setTenant({
          brandName: s.brand_name || TENANT.brandName,
          slogan: s.slogan || TENANT.slogan,
          tagline: TENANT.tagline,
          logo: s.brand_logo_url || TENANT.logo,
          colors: {
            primary: s.brand_color_primary || TENANT.theme.primary,
            primaryHover: s.brand_color_primary || TENANT.theme.primaryHover,
            secondary: s.brand_color_secondary || TENANT.theme.secondary,
            background: TENANT.theme.background,
            surface: TENANT.theme.surface,
            text: TENANT.theme.text,
          },
          social: {
            instagram: s.instagram_url || (TENANT.social?.instagram || ''),
            whatsapp: s.whatsapp_number || (TENANT.social?.whatsapp || ''),
            tiktok: s.tiktok_url || null,
          },
          currency: 'ARS',
          currencySymbol: '$',
          pointsName: s.points_name || TENANT.pointsName,
          cashOnDelivery: s.cash_on_delivery !== false,
          planType: s.plan_type || 'Expert',
          loyaltyEnabled: !!s.loyalty_enabled,
          pointsRedeemValue: s.points_redeem_value || 0,
          storeId: s.id || 1,
          subdomain: s.subdomain || null,
          loaded: true,
        });

        // Inyectar variables CSS dinámicamente
        const root = document.documentElement;
        const hexToRgb = (hex) => {
          if (!hex) return '0, 0, 0';
          const h = hex.replace('#', '');
          const r = parseInt(h.substr(0, 2), 16);
          const g = parseInt(h.substr(2, 2), 16);
          const b = parseInt(h.substr(4, 2), 16);
          return `${r}, ${g}, ${b}`;
        };

        const getLuminance = (hex) => {
          const rgb = hexToRgb(hex).split(',').map(n => parseInt(n));
          return (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
        };

        if (s.brand_color_primary) {
          const lum = getLuminance(s.brand_color_primary);
          const isLightBrand = lum > 0.6;
          
          root.style.setProperty('--brand-primary', s.brand_color_primary);
          root.style.setProperty('--primary-color', s.brand_color_primary);
          root.style.setProperty('--brand-primary-rgb', hexToRgb(s.brand_color_primary));
          root.style.setProperty('--brand-primary-hover', s.brand_color_primary + 'cc');
          
          // Color de texto sobre el color primario (ej: botones)
          root.style.setProperty('--brand-on-primary', isLightBrand ? '#000000' : '#FFFFFF');
          
          // Fondo dinámico (Sutil matiz de la marca)
          // Si es muy claro, usamos un tono muy oscuro de la marca para mantener el modo noche
          const rgb = hexToRgb(s.brand_color_primary).split(',').map(n => parseInt(n));
          const dynamicBg = `rgb(${Math.round(rgb[0]*0.05)}, ${Math.round(rgb[1]*0.05)}, ${Math.round(rgb[2]*0.05)})`;
          const dynamicSurface = `rgb(${Math.round(rgb[0]*0.1)}, ${Math.round(rgb[1]*0.1)}, ${Math.round(rgb[2]*0.1)})`;
          
          root.style.setProperty('--brand-bg', dynamicBg);
          root.style.setProperty('--brand-surface', dynamicSurface);
        }
        if (s.brand_color_secondary) {
          root.style.setProperty('--brand-secondary', s.brand_color_secondary);
          root.style.setProperty('--secondary-color', s.brand_color_secondary);
          root.style.setProperty('--brand-secondary-rgb', hexToRgb(s.brand_color_secondary));
        }
        if (s.font_family) {
          root.style.setProperty('--font-family', s.font_family);
        }

        // Dinamismo en metadatos del navegador
        if (s.brand_name) document.title = s.brand_name;
        if (s.brand_logo_url) {
          const favicon = document.querySelector('link[rel="icon"]');
          if (favicon) favicon.href = s.brand_logo_url;
        }
      })
      .catch(() => {
        setTenant(prev => ({ ...prev, loaded: true }));
      });
  }, []);

  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

export const useTenant = () => useContext(TenantContext);
