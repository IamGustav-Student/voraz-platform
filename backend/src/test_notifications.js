/**
 * Script de prueba para verificar las nuevas notificaciones por email.
 * 
 * Uso: node src/test_notifications.js
 */
import 'dotenv/config';
import { 
  sendTrialWelcomeEmail, 
  sendSubscriptionWelcomeEmail, 
  sendAdminNotification 
} from './utils/mailer.js';

async function test() {
  const testEmail = process.env.ADMIN_EMAIL || 'test@example.com';
  
  console.log('--- Iniciando prueba de notificaciones ---');
  
  try {
    // 1. Prueba Welcome Trial
    console.log('\n[1/3] Probando sendTrialWelcomeEmail...');
    await sendTrialWelcomeEmail({
      to: testEmail,
      brandName: 'Mi Burger Test',
      subdomain: 'miburger'
    });

    // 2. Prueba Welcome Subscription
    console.log('\n[2/3] Probando sendSubscriptionWelcomeEmail...');
    await sendSubscriptionWelcomeEmail({
      to: testEmail,
      brandName: 'Mi Burger Test',
      planType: 'Expert',
      amount: '100000'
    });

    // 3. Prueba Admin Notification
    console.log('\n[3/3] Probando sendAdminNotification...');
    await sendAdminNotification({
      subject: 'Test de Alerta',
      html: '<p>Esta es una notificación de prueba.</p>'
    });

    console.log('\n✅ Prueba completada. Verificá los logs de arriba o tu casilla de email.');
  } catch (err) {
    console.error('\n❌ Error en la prueba:', err.message);
  }
}

test();
