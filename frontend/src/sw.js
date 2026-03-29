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
    // VIBRACIÓN AGRESIVA: Patrón rítmico potente que no pasa desapercibido
    vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40, 500],
    tag: 'new-order-alerta', // Agrupar para renotificar
    renotify: true,          // Volver a sonar y vibrar incluso si ya existe una alerta de pedido
    silent: false,           // Forzar que el sistema tente usar el sonido predeterminado
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
