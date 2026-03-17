/**
 * Mailer — wrapper de nodemailer configurable via env vars.
 *
 * Variables de entorno SMTP:
 *   SMTP_HOST    e.g. smtp.gmail.com
 *   SMTP_PORT    e.g. 587
 *   SMTP_USER    e.g. mi-cuenta@gmail.com
 *   SMTP_PASS    e.g. app password de Gmail / key de Resend etc.
 *   SMTP_FROM    e.g. "GastroRed <noreply@gastrored.com.ar>"
 *
 * Si no hay config, en LOCAL/DEV imprime el link en consola y lo devuelve
 * para poder probarlo sin necesidad de SMTP real.
 */

import nodemailer from 'nodemailer';

const isSmtpConfigured = () =>
  !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;

const getTransporter = () => {
  if (!transporter && isSmtpConfigured()) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const port = parseInt(process.env.SMTP_PORT || '465');
    const isGmailHost = host.toLowerCase().includes('gmail.com');

    // Configuración base
    const config = {
      host: host,
      port: port,
      secure: port === 465, // true para 465, false para otros (como 587 con STARTTLS)
      auth: {
        user: user,
        pass: process.env.SMTP_PASS,
      },
      // Forzar IPv4 para evitar errores ENETUNREACH en entornos sin IPv6 (como Railway a veces)
      family: 4,
      // Timeouts esenciales para Railway
      connectionTimeout: 10000, 
      greetingTimeout: 10000,   
      socketTimeout: 15000,     
      tls: {
        // No falla por certificados mal configurados o subdominios
        rejectUnauthorized: false
      }
    };

    /**
     * NOTA PARA GOOGLE WORKSPACE / GMAIL:
     * Si usamos host: 'smtp.gmail.com' y port: 465, la configuración explícita es más robusta
     * que el shortcut service: 'gmail' (que a veces ignora el puerto o falla con dominios customs).
     * Solo usamos el shortcut si NO hay host configurado explícitamente pero sí usuario de gmail.
     */
    
    console.log(`[MAILER] Inicializando transporter para: ${host}:${port} (${config.secure ? 'SSL' : 'TLS/STARTTLS'})`);
    
    transporter = nodemailer.createTransport(config);
  }
  return transporter;
};

/**
 * Envía el email de recuperación de contraseña.
 * @returns {{ sent: boolean, devToken?: string }}
 */
export const sendPasswordResetEmail = async ({ to, resetUrl, brandName = 'GastroRed', rawToken = null }) => {
  const t = getTransporter();

  if (!t) {
    // Modo desarrollo: logueamos el link y lo devolvemos para el frontend
    console.log('\n[MAILER DEV] Simulación de email (SMTP no configurado):');
    console.log(`  → Para: ${to}`);
    console.log(`  → Link: ${resetUrl}\n`);
    return { sent: false, devToken: rawToken };
  }

  const from = process.env.SMTP_FROM || `"${brandName}" <noreply@gastrored.com.ar>`;

  try {
    await t.sendMail({
      from,
      to,
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
    return { sent: true };
  } catch (error) {
    console.error(`[MAILER ERROR] Falló el envío a ${to}:`, error.message);
    // IMPORTANTE: Lanzamos el error para que el controller lo maneje
    throw error;
  }
};
