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
            instagram: s.instagram_url || TENANT.social.instagram,
            whatsapp: s.whatsapp_number || TENANT.social.whatsapp,
            tiktok: s.tiktok_url || null,
          },
          currency: 'ARS',
          currencySymbol: '$',
          pointsName: s.points_name || TENANT.pointsName,
          cashOnDelivery: s.cash_on_delivery !== false,
          planType: s.plan_type || 'Expert',
          storeId: s.id || 1,
          subdomain: s.subdomain || null,
          loaded: true,
        });
      })
      .catch(() => {
        setTenant(prev => ({ ...prev, loaded: true }));
      });
  }, []);

  return <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>;
}

export const useTenant = () => useContext(TenantContext);
