import { adminFetch } from '../services/api';

/**
 * Convierte una clave VAPID pública de base64url a Uint8Array.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Solicita permiso y suscribe al usuario a notificaciones push.
 */
export async function subscribeToPush(token) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Tu navegador no soporta notificaciones Push.');
  }

  // Esperar a que el SW esté listo
  const registration = await navigator.serviceWorker.ready;

  // Verificar si ya existe una suscripción
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    // Solicitar permiso
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permiso de notificación denegado.');
    }

    // Suscribir al servidor de push
    const publicKey = 'BCkh3MImFXcJprtbYtGCER6RjhjwraivDVtgsRoOPj2HFqxsrLCuANVx8ND7-gCz64PTxoaF_z6RvKO83POdO4U'; 
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
  }

  // Enviar la suscripción al backend
  const data = JSON.parse(JSON.stringify(subscription));
  return await adminFetch('/push/subscribe', token, {
    method: 'POST',
    body: JSON.stringify({ subscription: data })
  });
}

/**
 * Elimina la suscripción push.
 */
export async function unsubscribeFromPush(token) {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    await subscription.unsubscribe();
    await adminFetch('/push/unsubscribe', token, {
      method: 'POST',
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });
  }
}

/**
 * Verifica el estado actual de la suscripción.
 */
export async function getPushSubscriptionState() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}
