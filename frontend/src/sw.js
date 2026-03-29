import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

// Precache de assets (Vite inyectará esto automáticamente)
precacheAndRoute(self.__WB_MANIFEST);

// Cache de la API (Estrategia similar a la que teníamos en vite.config.js)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api'),
  new NetworkFirst({
    cacheName: 'api-cache',
  })
);

// Evento PUSH: Aquí es donde sucede la magia de la notificación con la app cerrada
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'GastroRed', body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'Nuevo pedido recibido.',
    icon: '/vite.svg', // Icono por defecto (se puede cambiar dinámicamente)
    badge: '/vite.svg',
    vibrate: [200, 100, 200],
    data: {
      url: data.data?.url || '/admin/orders'
    },
    actions: [
      { action: 'view', title: 'Ver Pedido' },
      { action: 'close', title: 'Cerrar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'GastroRed', options)
  );
});

// Evento de clic en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si ya hay una ventana abierta, la enfocamos y navegamos
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Si no, abrimos una nueva
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
