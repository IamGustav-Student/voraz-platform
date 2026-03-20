import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { HelmetProvider } from 'react-helmet-async';
import { CartProvider } from './context/CartContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { TENANT } from './config/tenant.js';
import { TenantProvider } from './hooks/useTenant.jsx';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

// Inyectar variables CSS del tenant al arrancar la app (Defaults)
const root = document.documentElement;
root.style.setProperty('--brand-primary',       TENANT.theme.primary);
root.style.setProperty('--primary-color',       TENANT.theme.primary);
root.style.setProperty('--brand-primary-hover', TENANT.theme.primaryHover);
root.style.setProperty('--brand-secondary',     TENANT.theme.secondary);
root.style.setProperty('--secondary-color',     TENANT.theme.secondary);
root.style.setProperty('--brand-bg',            TENANT.theme.background);
root.style.setProperty('--brand-surface',       TENANT.theme.surface);
root.style.setProperty('--brand-text',          TENANT.theme.text);

// Actualizar título y favicon del documento
document.title = TENANT.meta.title;
const metaDesc = document.querySelector('meta[name="description"]');
if (metaDesc) metaDesc.setAttribute('content', TENANT.meta.description);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <AuthProvider>
        <TenantProvider>
          <CartProvider>
            <App />
            <Analytics />
            <SpeedInsights />
          </CartProvider>
        </TenantProvider>
      </AuthProvider>
    </HelmetProvider>
  </React.StrictMode>,
)

// Registro del Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registrado:', reg.scope))
      .catch(err => console.log('SW falló:', err));
  });
}
