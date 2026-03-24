/**
 * Mailer — usa Resend (HTTP API) para envío de emails.
 * No SMTP, no problemas de IPv6 en Railway.
 *
 * Variable de entorno requerida:
 *   RESEND_API_KEY   → se obtiene en resend.com (gratis, 3000 emails/mes)
 *
 * Variable opcional (para el remitente):
 *   SMTP_FROM        → e.g. "GastroRed <contacto@programadorgs.com.ar>"
 *                      (requiere dominio verificado en Resend)
 *                      Si no está configurado, usa el dominio de onboarding de Resend.
 *
 * Modo desarrollo (sin RESEND_API_KEY):
 *   Imprime el link en consola para poder probar sin configurar nada.
 */

import { Resend } from 'resend';

let resendClient = null;

const getClient = () => {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return null;
    resendClient = new Resend(apiKey);
  }
  return resendClient;
};

/**
 * Envía el email de recuperación de contraseña.
 * @returns {{ sent: boolean, devToken?: string }}
 */
export const sendPasswordResetEmail = async ({ to, resetUrl, brandName = 'GastroRed', rawToken = null }) => {
  const client = getClient();

  if (!client) {
    // Modo desarrollo: sin API key, logueamos el link en consola
    console.log('\n[MAILER DEV] Simulación de email (RESEND_API_KEY no configurado):');
    console.log(`  → Para: ${to}`);
    console.log(`  → Link: ${resetUrl}\n`);
    return { sent: false, devToken: rawToken };
  }

  // El remitente: si el dominio está verificado en Resend, usa SMTP_FROM.
  // Si no, Resend rechaza el envío desde dominios no verificados excepto resend.dev.
  const from = process.env.SMTP_FROM || `${brandName} <onboarding@resend.dev>`;

  try {
    const { data, error } = await resendClient.emails.send({
      from,
      to: [to],
      subject: `Restablecé tu contraseña — ${brandName}`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recuperar contraseña — ${brandName}</title>
        </head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#111;border-radius:16px;overflow:hidden;border:1px solid #222;">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#E30613,#c0001a);padding:36px 40px;text-align:center;">
                      <h1 style="margin:0;color:#fff;font-size:28px;font-weight:900;letter-spacing:-0.5px;">${brandName}</h1>
                      <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">Recuperación de contraseña</p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:40px;">
                      <h2 style="margin:0 0 16px;color:#fff;font-size:20px;font-weight:700;">¿Olvidaste tu contraseña?</h2>
                      <p style="margin:0 0 24px;color:#aaa;font-size:15px;line-height:1.6;">
                        Recibimos una solicitud para restablecer la contraseña de tu cuenta. 
                        Si no fuiste vos, ignorá este email — tu contraseña no cambiará.
                      </p>
                      <div style="text-align:center;margin:32px 0;">
                        <a href="${resetUrl}" 
                           style="display:inline-block;background:#E30613;color:#fff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:16px;font-weight:800;letter-spacing:0.5px;">
                          Restablecer contraseña
                        </a>
                      </div>
                      <p style="margin:24px 0 0;color:#666;font-size:13px;line-height:1.5;">
                        Este link es válido por <strong style="color:#aaa;">1 hora</strong>. 
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
      text: `Restablecé tu contraseña en: ${resetUrl}\nEste link expira en 1 hora.`,
    });

    if (error) {
      console.error(`[MAILER ERROR] Resend devolvió error para ${to}:`, error);
      throw new Error(error.message || 'Error al enviar email via Resend');
    }

    console.log(`[MAILER] Email enviado correctamente a ${to}. ID: ${data?.id}`);
    return { sent: true };

  } catch (error) {
    console.error(`[MAILER ERROR] Falló el envío a ${to}:`, error.message);
    throw error;
  }
};

/**
 * Envía email de bienvenida por inicio de Trial.
 */
export const sendTrialWelcomeEmail = async ({ to, brandName, subdomain }) => {
  const client = getClient();
  const url = `https://${subdomain}.gastrored.com.ar`;
  const adminUrl = `https://${subdomain}.gastrored.com.ar/admin`;

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <body style="margin:0;padding:20px;background:#0a0a0a;color:#fff;font-family:sans-serif;">
      <div style="max-width:600px;margin:0 auto;background:#111;padding:40px;border-radius:16px;border:1px solid #222;">
        <h1 style="color:#E30613;margin-top:0;">¡Bienvenido a GastroRed! 🚀</h1>
        <p style="font-size:16px;color:#ccc;">Hola <strong>${brandName}</strong>, tu prueba gratuita de 7 días ha comenzado con éxito.</p>
        <p style="color:#aaa;">Tu plataforma ya está online y lista para configurar:</p>
        <div style="background:#222;padding:20px;border-radius:10px;margin:20px 0;">
          <p style="margin:5px 0;"><strong>Tu Web:</strong> <a href="${url}" style="color:#E30613;">${url}</a></p>
          <p style="margin:5px 0;"><strong>Panel Admin:</strong> <a href="${adminUrl}" style="color:#E30613;">${adminUrl}</a></p>
        </div>
        <p style="color:#aaa;">Aprovechá estos días para cargar tus productos y configurar tu MercadoPago.</p>
        <hr style="border:0;border-top:1px solid #333;margin:30px 0;">
        <p style="font-size:12px;color:#666;">Si tenés dudas, respondé a este email o contactanos por WhatsApp.</p>
      </div>
    </body>
    </html>
  `;

  if (!client) {
    console.log(`\n[MAILER DEV] Trial Welcome for ${brandName} (${to})`);
    console.log(`  → URL: ${url}\n`);
    return { sent: false };
  }

  const from = process.env.SMTP_FROM || `GastroRed <onboarding@resend.dev>`;
  return resendClient.emails.send({
    from,
    to: [to],
    subject: `🚀 ¡Bienvenido a GastroRed! — Tu acceso a ${brandName}`,
    html
  });
};

/**
 * Envía email de confirmación de compra de suscripción.
 */
export const sendSubscriptionWelcomeEmail = async ({ to, brandName, planType, amount }) => {
  const client = getClient();
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <body style="margin:0;padding:20px;background:#0a0a0a;color:#fff;font-family:sans-serif;">
      <div style="max-width:600px;margin:0 auto;background:#111;padding:40px;border-radius:16px;border:1px solid #222;">
        <h1 style="color:#fbbf24;margin-top:0;">¡Pago Confirmado! 🏆</h1>
        <p style="font-size:16px;color:#ccc;">Hola <strong>${brandName}</strong>, tu suscripción al plan <strong>${planType}</strong> ya está activa.</p>
        <div style="background:#222;padding:20px;border-radius:10px;margin:20px 0;">
          <p style="margin:5px 0;"><strong>Plan:</strong> ${planType}</p>
          <p style="margin:5px 0;"><strong>Monto:</strong> $${amount}</p>
          <p style="margin:5px 0;"><strong>Estado:</strong> Activo ✅</p>
        </div>
        <p style="color:#aaa;">Gracias por confiar en GastroRed para hacer crecer tu negocio.</p>
        <hr style="border:0;border-top:1px solid #333;margin:30px 0;">
        <p style="font-size:12px;color:#666;">Recordá que podés gestionar tu suscripción desde el panel de administrador.</p>
      </div>
    </body>
    </html>
  `;

  if (!client) {
    console.log(`\n[MAILER DEV] Subscription Success for ${brandName} (${to})`);
    console.log(`  → Plan: ${planType}, Amount: ${amount}\n`);
    return { sent: false };
  }

  const from = process.env.SMTP_FROM || `GastroRed <onboarding@resend.dev>`;
  return resendClient.emails.send({
    from,
    to: [to],
    subject: `✅ Pago Confirmado — Plan ${planType} en GastroRed`,
    html
  });
};

/**
 * Envía una notificación administrativa al dueño de la plataforma.
 */
export const sendAdminNotification = async ({ subject, html }) => {
  const client = getClient();
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminEmail) {
    console.warn('[MAILER] ADMIN_EMAIL no configurado. Saltando notificación admin.');
    return { sent: false };
  }

  if (!client) {
    console.log(`\n[MAILER DEV] Admin Notification: ${subject}`);
    console.log(`  → HTML length: ${html.length}\n`);
    return { sent: false };
  }

  const from = process.env.SMTP_FROM || `GastroRed Alert <onboarding@resend.dev>`;
  return resendClient.emails.send({
    from,
    to: [adminEmail],
    subject: `🔔 [GastroRed Admin] ${subject}`,
    html
  });
};
