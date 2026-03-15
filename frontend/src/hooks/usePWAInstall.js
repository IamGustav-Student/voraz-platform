import { useState, useEffect } from 'react';

// Variable global para capturar el evento antes de que cualquier componente se monte
let deferredPrompt = null;
let isPWAInstalled = false;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Disparar un evento personalizado para que los hooks activos se enteren
    window.dispatchEvent(new CustomEvent('pwa-prompt-available'));
  });

  window.addEventListener('appinstalled', () => {
    isPWAInstalled = true;
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });

  // Verificar estado inicial
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    isPWAInstalled = true;
  }
}

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(deferredPrompt);
  const [isInstalled, setIsInstalled] = useState(isPWAInstalled);

  useEffect(() => {
    const handlePrompt = () => setInstallPrompt(deferredPrompt);
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('pwa-prompt-available', handlePrompt);
    window.addEventListener('pwa-installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa-prompt-available', handlePrompt);
      window.removeEventListener('pwa-installed', handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt || installPrompt;
    if (!promptEvent) return;
    
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    
    if (outcome === 'accepted') {
      isPWAInstalled = true;
      deferredPrompt = null;
      setIsInstalled(true);
      setInstallPrompt(null);
    }
  };

  return { 
    isInstallable: !!(deferredPrompt || installPrompt) && !isInstalled, 
    isInstalled,
    handleInstallClick 
  };
}
