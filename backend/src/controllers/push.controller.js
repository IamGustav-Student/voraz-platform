import webpush from 'web-push';
import { query } from '../config/db.js';
import { getTenantId } from '../utils/tenant.js';

// Configurar Web Push con las VAPID keys del .env
const configureWebPush = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (publicKey && privateKey) {
    webpush.setVapidDetails(
      'mailto:admin@gastrored.com.ar', // Contacto técnico
      publicKey,
      privateKey
    );
  }
};

configureWebPush();

export const subscribe = async (req, res) => {
  const { subscription } = req.body;
  const userId = req.user.id;
  const tenantId = getTenantId(req);

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ status: 'error', message: 'Datos de suscripción incompletos.' });
  }

  try {
    // Guardar o actualizar la suscripción
    // Usamos el endpoint como identificador único para este navegador/usuario
    await query(
      `INSERT INTO push_subscriptions (user_id, tenant_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE SET 
         user_id = EXCLUDED.user_id,
         tenant_id = EXCLUDED.tenant_id,
         p256dh = EXCLUDED.p256dh,
         auth = EXCLUDED.auth`,
      [
        userId,
        tenantId,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth
      ]
    );

    res.json({ status: 'success', message: 'Suscripción registrada correctamente.' });
  } catch (error) {
    console.error('Error al suscribir a push:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
};

export const unsubscribe = async (req, res) => {
  const { endpoint } = req.body;
  try {
    await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
    res.json({ status: 'success', message: 'Suscripción eliminada.' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

/**
 * Función interna para enviar una notificación a todos los administradores de un tenant.
 */
export const notifyNewOrder = async (tenantId, orderData) => {
  configureWebPush();

  try {
    // Obtener todas las suscripciones de este comercio
    const { rows: subs } = await query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE tenant_id = $1',
      [tenantId]
    );

    const payload = JSON.stringify({
      title: '🍔 ¡Nuevo Pedido en GastroRed!',
      body: `Pedido #${orderData.id} de ${orderData.customer_name}\nTotal: $${orderData.total}`,
      data: {
        url: '/admin/orders', // Donde queremos que abra al hacer clic
        orderId: orderData.id
      }
    });

    const sendPromises = subs.map(sub => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      return webpush.sendNotification(pushConfig, payload).catch(err => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // La suscripción ya no es válida, deberíamos borrarla
          query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
        }
        console.error('Error enviando push notification:', err.message);
      });
    });

    await Promise.all(sendPromises);
  } catch (err) {
    console.error('Error en notifyNewOrder:', err);
  }
};
