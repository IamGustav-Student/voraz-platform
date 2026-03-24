import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { query } from '../config/db.js';
import bcrypt from 'bcrypt';
import { initializeTenantData } from '../utils/initialization.js';
import { clearTenantCache } from '../middleware/tenant.middleware.js';
import { 
  sendTrialWelcomeEmail, 
  sendSubscriptionWelcomeEmail, 
  sendAdminNotification 
} from '../utils/mailer.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Lee toda la configuración de GastroRed desde la DB */
async function getConfig() {
  const result = await query('SELECT key, value FROM gastrored_config');
  return Object.fromEntries(result.rows.map(r => [r.key, r.value]));
}

/** Obtiene el Access Token de MP: primero la DB, luego el env var */
function getMpToken(config) {
  return (config.mp_access_token && config.mp_access_token.trim())
    ? config.mp_access_token.trim()
    : (process.env.GASTRORED_MP_ACCESS_TOKEN || '');
}

/** Calcula el precio según la config de la DB */
function getPrices(config) {
  return {
    'Full Digital': {
      monthly: parseInt(config.price_full_digital_monthly || '60000'),
      annual: parseInt(config.price_full_digital_annual || '600000'),
    },
    'Expert': {
      monthly: parseInt(config.price_expert_monthly || '100000'),
      annual: parseInt(config.price_expert_annual || '1000000'),
    },
    'Trial': { monthly: 0, annual: 0 },
  };
}

/** Sanitiza el subdomain */
function cleanSubdomain(s) {
  return (s || '').toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
}

/** Crea o actualiza tenant en tenants + tenant_settings */
async function syncTenantRecord(tenantId, tenantName) {
  if (!tenantId) return;
  try {
    await query(
      `INSERT INTO tenants (id, name, subdomain) VALUES ($1, $2, $1)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [tenantId, tenantName]
    );
  } catch (e) {
    console.warn('syncTenantRecord warning:', e.message);
  }
}

// ── Crear tenant de trial (7 días gratis, sin pago) ────────────────────────
export const createTrialTenant = async (req, res) => {
  console.log('[TRIAL] Intentando crear tenant:', JSON.stringify(req.body));
  const { name, brand_name, subdomain, admin_email, slogan,
    brand_color_primary, brand_color_secondary, admin_name, admin_password, accepted_terms,
    address, whatsapp } = req.body;

  if (!accepted_terms && req.body.secret !== (process.env.GASTRORED_SUPERADMIN_SECRET || 'gastrored_super_secret'))
    return res.status(400).json({ status: 'error', message: 'Debes aceptar los términos y condiciones de GastroRed para continuar.' });

  if (!name || !subdomain)
    return res.status(400).json({ status: 'error', message: 'name y subdomain son requeridos.' });

  const cleanSub = cleanSubdomain(subdomain);
  if (!cleanSub)
    return res.status(400).json({ status: 'error', message: 'Subdomain inválido.' });

  try {
    const config = await getConfig();

    // ── Bloqueo de re-uso de Trial ──────────────────────────────────────────
    const bypassSecret = req.body.secret === (process.env.GASTRORED_SUPERADMIN_SECRET || 'gastrored_super_secret');
    
    if (!bypassSecret) {
      // 1. Bloqueo por Email
      if (admin_email) {
        const existingEmail = await query('SELECT id FROM tenants WHERE admin_email = $1 LIMIT 1', [admin_email.trim()]);
        if (existingEmail.rows.length > 0) {
          return res.status(403).json({ 
            status: 'error', 
            message: 'Este email ya ha sido seleccionado para una prueba gratuita o ya tiene un comercio asociado.' 
          });
        }
      }

      // 2. Bloqueo por Subdominio Histórico
      try {
        const existingSub = await query('SELECT id FROM trial_domain_history WHERE type = $1 AND value = $2 LIMIT 1', ['subdomain', cleanSub]);
        if (existingSub.rows.length > 0) {
          console.log('[TRIAL] Bloqueado por subdominio histórico:', cleanSub);
          return res.status(403).json({
            status: 'error',
            message: `El subdominio "${cleanSub}" ya ha utilizado el periodo de prueba anteriormente.`
          });
        }
      } catch (e) { console.warn('[TRIAL] Error checking subdomain history (table missing?):', e.message); }

      // 3. Bloqueo por Nombre de Restaurante
      try {
        const cleanName = name.trim().toLowerCase();
        const existingName = await query('SELECT id FROM trial_domain_history WHERE type = $1 AND value = $2 LIMIT 1', ['name', cleanName]);
        if (existingName.rows.length > 0) {
          console.log('[TRIAL] Bloqueado por nombre histórico:', cleanName);
          return res.status(403).json({
            status: 'error',
            message: `El nombre "${name}" ya ha sido utilizado para una prueba gratuita anteriormente.`
          });
        }
      } catch (e) { console.warn('[TRIAL] Error checking name history (table missing?):', e.message); }
    }

    const trialDays = parseInt(config.trial_days || '7');
    const expires = new Date();
    expires.setDate(expires.getDate() + trialDays);

    // 1. Crear en TENANTS
    const result = await query(
      `INSERT INTO tenants
         (id, name, subdomain, brand_name, plan_type, subscription_period,
          subscription_expires_at, status, admin_email, brand_color_primary,
          brand_color_secondary, slogan, active, address, whatsapp)
       VALUES ($1,$2,$1,$3,'Expert','monthly',$4,'active',$5,$6,$7,$8,true,$9,$10)
       RETURNING id, name, brand_name, subdomain, status, subscription_expires_at`,
      [
        cleanSub, name.trim(), (brand_name || name).trim(),
        expires, admin_email?.trim() || null,
        brand_color_primary || '#E30613',
        brand_color_secondary || '#FFFFFF',
        slogan?.trim() || null,
        address?.trim() || null,
        whatsapp?.trim() || null,
      ]
    );
    const tenant = result.rows[0];

    // Registrar en el historial para impedir re-uso (ignorar si es bypass por simplicidad o forzar registro nuevo)
    try {
      await query(
        'INSERT INTO trial_domain_history (type, value, original_tenant_id) VALUES ($1, $2, $3) ON CONFLICT (value) DO NOTHING',
        ['subdomain', cleanSub, cleanSub]
      );
      await query(
        'INSERT INTO trial_domain_history (type, value, original_tenant_id) VALUES ($1, $2, $3) ON CONFLICT (value) DO NOTHING',
        ['name', name.trim().toLowerCase(), cleanSub]
      );
    } catch (e) {
      console.warn('[TRIAL] Error recording history (table missing?):', e.message);
    }

    // 2. Crear sucursal física inicial en STORES
    const storeResult = await query(
      `INSERT INTO stores (name, tenant_id, address, whatsapp) VALUES ($1, $2, $3, $4) RETURNING id`,
      [name.trim(), cleanSub, address?.trim() || null, whatsapp?.trim() || null]
    );
    const storeId = storeResult.rows[0].id;

    // 3. Crear usuario admin (NECESARIO)
    if (admin_email && admin_password) {
      const adminHash = await bcrypt.hash(admin_password, 10);
      await query(
        `INSERT INTO users (email, password_hash, name, store_id, tenant_id, role, points)
         VALUES ($1, $2, $3, $4, $5, 'admin', 0)
         ON CONFLICT (email, store_id) DO UPDATE
           SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = 'admin'`,
        [admin_email.trim(), adminHash, (admin_name || name.trim()), storeId, cleanSub]
      );
    }

    // 4. Crear tenant_settings
     await query(
       `INSERT INTO tenant_settings (store_id, tenant_id, tenant_id_fk, cash_on_delivery)
        VALUES ($1, $2, $2, true) ON CONFLICT (store_id) DO NOTHING`,
       [storeId, cleanSub]
     );

     // 5. Inicializar datos de ejemplo
     await initializeTenantData(cleanSub, storeId);

      // ── NOTIFICACIONES ──
      try {
        // Al cliente
        await sendTrialWelcomeEmail({
          to: admin_email,
          brandName: name.trim(),
          subdomain: cleanSub,
          trialDays
        });
        // Al admin de la plataforma
        await sendAdminNotification({
          subject: `Nuevo Trial: ${name.trim()}`,
          html: `
            <p>Se ha registrado un nuevo trial en GastroRed.</p>
            <ul>
              <li><strong>Comercio:</strong> ${name.trim()}</li>
              <li><strong>Email:</strong> ${admin_email}</li>
              <li><strong>Subdominio:</strong> ${cleanSub}</li>
              <li><strong>Periodo:</strong> ${trialDays} días</li>
              <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          `
        });
      } catch (err) {
        console.error('[NOTIFICACIÓN ERROR] Falló el envío de emails de trial:', err.message);
      }

      res.status(201).json({
      status: 'success',
      data: {
        ...tenant,
        trial_days: trialDays,
        message: `¡Listo! Tu prueba gratuita de ${trialDays} días comenzó. Accedé a tu carta en: ${cleanSub}.${config.frontend_url?.replace('https://', '') || 'gastrored.com.ar'}`,
      },
    });
  } catch (e) {
    if (e.code === '23505')
      return res.status(409).json({ status: 'error', message: 'El subdomain ya está en uso. Elegí otro.' });
    res.status(500).json({ status: 'error', message: e.message });
  }
};

// ── Crear checkout público (desde la landing, sin auth) ───────────────────────
export const createPublicCheckout = async (req, res) => {
  const { name, brand_name, subdomain, admin_email, plan_type,
    subscription_period, brand_color_primary, brand_color_secondary, slogan,
    admin_name, admin_password, accepted_terms, address, whatsapp } = req.body;

  if (!accepted_terms)
    return res.status(400).json({ status: 'error', message: 'Debes aceptar los términos y condiciones de GastroRed para continuar.' });

  if (!name || !subdomain || !plan_type)
    return res.status(400).json({ status: 'error', message: 'name, subdomain y plan_type son requeridos.' });
  if (!['Full Digital', 'Expert'].includes(plan_type))
    return res.status(400).json({ status: 'error', message: 'Plan inválido.' });
  if (!admin_email || !admin_password || admin_password.length < 6)
    return res.status(400).json({ status: 'error', message: 'Email y contraseña del admin requeridos (mín. 6 caracteres).' });

  const cleanSub = cleanSubdomain(subdomain);
  if (!cleanSub)
    return res.status(400).json({ status: 'error', message: 'Subdomain inválido.' });

  try {
    const config = await getConfig();
    const mpToken = getMpToken(config);

    if (!mpToken)
      return res.status(503).json({
        status: 'error',
        message: 'El sistema de pagos aún no está configurado. Contactá a GastroRed.',
      });

    const prices = getPrices(config);
    const period = subscription_period || 'monthly';
    const amount = prices[plan_type][period] || prices[plan_type].monthly;
    const periodLabel = period === 'annual' ? 'anual' : 'mensual';

    // Crear el tenant como "pending_payment" hasta que se confirme el pago
    const expires = new Date();
    expires.setDate(expires.getDate() + (period === 'annual' ? 365 : 30));

    // Verificar que el subdomain no exista en tenants
    const existing = await query('SELECT id FROM tenants WHERE subdomain = $1', [cleanSub]);
    if (existing.rows.length)
      return res.status(409).json({ status: 'error', message: 'El subdomain ya está en uso. Elegí otro.' });

    // Crear en TENANTS como pending_payment hasta confirmar el pago
    const tenantResult = await query(
      `INSERT INTO tenants
         (id, name, subdomain, brand_name, plan_type, subscription_period,
          subscription_expires_at, status, admin_email,
          brand_color_primary, brand_color_secondary, slogan, active, address, whatsapp)
       VALUES ($1,$2,$1,$3,$4,$5,$6,'pending_payment',$7,$8,$9,$10,true, $11, $12)
       RETURNING id, name, brand_name, subdomain`,
      [
        cleanSub, name.trim(), (brand_name || name).trim(),
        plan_type, period, expires,
        admin_email?.trim() || null,
        brand_color_primary || '#E30613',
        brand_color_secondary || '#1A1A1A',
        slogan?.trim() || null,
        address?.trim() || null,
        whatsapp?.trim() || null,
      ]
    );
    const tenant = tenantResult.rows[0];

    // Crear sucursal física inicial (pendiente de activación)
    const storeResult = await query(
      `INSERT INTO stores (name, tenant_id, address, whatsapp) VALUES ($1, $2, $3, $4) RETURNING id`,
      [name.trim(), cleanSub, address?.trim() || null, whatsapp?.trim() || null]
    );
    const storeId = storeResult.rows[0].id;

    // Crear usuario admin desde el inicio (el tenant queda pending pero el user ya existe)
    const adminHash = await bcrypt.hash(admin_password, 10);
     await query(
       `INSERT INTO users (email, password_hash, name, store_id, tenant_id, role, points)
        VALUES ($1, $2, $3, $4, $5, 'admin', 0)
        ON CONFLICT (email, store_id) DO UPDATE
          SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = 'admin'`,
       [admin_email.trim(), adminHash, (admin_name || name).trim(), storeId, cleanSub]
     );

     // Inicializar datos de ejemplo (2 productos por categoría)
     await initializeTenantData(cleanSub, storeId);

     // Crear preferencia en MercadoPago
    const sandbox = config.mp_sandbox_mode === 'true';
    const mp = new MercadoPagoConfig({ accessToken: mpToken });
    const preferenceClient = new Preference(mp);

    const backendUrl = config.backend_url || process.env.BACKEND_URL || 'https://voraz-platform-production.up.railway.app';
    const frontendUrl = config.frontend_url || process.env.GASTRORED_FRONTEND_URL || 'https://gastrored.com.ar';

    const preferenceBody = {
      items: [{
        id: `plan_${plan_type.replace(/\s/g, '_').toLowerCase()}_${period}`,
        title: `GastroRed — ${tenant.brand_name}: Plan ${plan_type} (${periodLabel})`,
        quantity: 1,
        unit_price: amount,
        currency_id: 'ARS',
      }],
      payer: { email: admin_email || 'cliente@gastrored.com.ar' },
      external_reference: `tenant_${cleanSub}_${plan_type.replace(/\s/g, '_')}_${period}`,
      statement_descriptor: 'GASTRORED',
      notification_url: `${backendUrl}/api/subscriptions/webhook`,
      back_urls: {
        success: `${frontendUrl}?sub=success&store=${storeResult.rows[0].id}&tenant=${cleanSub}`,
        failure: `${frontendUrl}?sub=failure&store=${storeResult.rows[0].id}&tenant=${cleanSub}`,
        pending: `${frontendUrl}?sub=pending&store=${storeResult.rows[0].id}&tenant=${cleanSub}`,
      },
      auto_return: 'approved',
    };

    const preference = await preferenceClient.create({ body: preferenceBody });

    await query(
      `INSERT INTO subscription_payments (store_id, tenant_id, mp_payment_id, amount, plan_type, period, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [storeResult.rows[0].id, cleanSub, preference.id, amount, plan_type, period]
    );


    res.status(201).json({
      status: 'success',
      data: {
        tenant_id: cleanSub,
        store_id: storeResult.rows[0].id,
        subdomain: cleanSub,
        plan_type,
        period,
        amount,
        // Sandbox o producción según config
        init_point: sandbox ? preference.sandbox_init_point : preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
        preference_id: preference.id,
      },
    });
  } catch (e) {
    console.error('Public checkout error:', e.message);
    if (e.code === '23505')
      return res.status(409).json({ status: 'error', message: 'El subdomain ya está en uso.' });
    res.status(500).json({ status: 'error', message: e.message });
  }
};

// ── Renovar checkout (comercio existente, desde la landing) ───────────────────
export const createRenewCheckout = async (req, res) => {
  const { subdomain, plan_type, subscription_period, admin_email, admin_password } = req.body;

  if (!subdomain || !plan_type || !admin_email || !admin_password)
    return res.status(400).json({ status: 'error', message: 'subdomain, plan_type, admin_email y admin_password son requeridos.' });
    
  if (!['Full Digital', 'Expert'].includes(plan_type))
    return res.status(400).json({ status: 'error', message: 'Plan inválido.' });

  const cleanSub = cleanSubdomain(subdomain);

  try {
    const config = await getConfig();
    const mpToken = getMpToken(config);

    if (!mpToken)
      return res.status(503).json({ status: 'error', message: 'El sistema de pagos aún no está configurado. Contactá a GastroRed.' });

    // 1. Verificar si el tenant existe
    const existing = await query('SELECT id, name, brand_name, status FROM tenants WHERE subdomain = $1', [cleanSub]);
    if (!existing.rows.length)
      return res.status(404).json({ status: 'error', message: 'El comercio no fue encontrado. Verificá el subdominio.' });

    const tenant = existing.rows[0];

    // 2. Verificar credenciales del administrador del comercio
    const adminCheck = await query('SELECT id, password_hash FROM users WHERE email = $1 AND tenant_id = $2 AND role = $3', [admin_email.trim(), cleanSub, 'admin']);
    if (!adminCheck.rows.length)
      return res.status(401).json({ status: 'error', message: 'Las credenciales no coinciden con las del administrador del comercio.' });

    const adminUser = adminCheck.rows[0];
    const valid = await bcrypt.compare(admin_password, adminUser.password_hash);
    if (!valid)
      return res.status(401).json({ status: 'error', message: 'Contraseña incorrecta para renovar este comercio.' });

    // 3. Obtener el local físico principal
    const storeResult = await query('SELECT id FROM stores WHERE tenant_id = $1 ORDER BY id ASC LIMIT 1', [cleanSub]);
    if (!storeResult.rows.length)
      return res.status(500).json({ status: 'error', message: 'Error interno: El comercio no tiene un local físico asignado.' });
      
    const storeId = storeResult.rows[0].id;

    // 4. Preparar MercadoPago
    const prices = getPrices(config);
    const period = subscription_period || 'monthly';
    const amount = prices[plan_type][period] || prices[plan_type].monthly;
    const periodLabel = period === 'annual' ? 'anual' : 'mensual';

    const sandbox = config.mp_sandbox_mode === 'true';
    const mp = new MercadoPagoConfig({ accessToken: mpToken });
    const preferenceClient = new Preference(mp);

    const backendUrl = config.backend_url || process.env.BACKEND_URL || 'https://voraz-platform-production.up.railway.app';
    const frontendUrl = config.frontend_url || process.env.GASTRORED_FRONTEND_URL || 'https://gastrored.com.ar';

    const preferenceBody = {
      items: [{
        id: `plan_${plan_type.replace(/\s/g, '_').toLowerCase()}_${period}`,
        title: `GastroRed — ${tenant.brand_name || tenant.name}: Renovación Plan ${plan_type} (${periodLabel})`,
        quantity: 1,
        unit_price: amount,
        currency_id: 'ARS',
      }],
      payer: { email: admin_email },
      external_reference: `tenant_${cleanSub}_${plan_type.replace(/\s/g, '_')}_${period}`,
      statement_descriptor: 'GASTRORED',
      notification_url: `${backendUrl}/api/subscriptions/webhook`,
      back_urls: {
        success: `${frontendUrl}?sub=renew_success&store=${storeId}&tenant=${cleanSub}`,
        failure: `${frontendUrl}?sub=renew_failure&store=${storeId}&tenant=${cleanSub}`,
        pending: `${frontendUrl}?sub=renew_pending&store=${storeId}&tenant=${cleanSub}`,
      },
      auto_return: 'approved',
    };

    const preference = await preferenceClient.create({ body: preferenceBody });

    await query(
      `INSERT INTO subscription_payments (store_id, tenant_id, mp_payment_id, amount, plan_type, period, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [storeId, cleanSub, preference.id, amount, plan_type, period]
    );

    res.status(200).json({
      status: 'success',
      data: {
        tenant_id: cleanSub,
        store_id: storeId,
        subdomain: cleanSub,
        plan_type,
        period,
        amount,
        init_point: sandbox ? preference.sandbox_init_point : preference.init_point,
        sandbox_init_point: preference.sandbox_init_point,
        preference_id: preference.id,
      },
    });
  } catch (e) {
    console.error('Renew checkout error:', e.message);
    res.status(500).json({ status: 'error', message: e.message });
  }
};

// ── Obtener Planes Públicos (para la landing) ────────────────────────────────
export const getPublicPlans = async (req, res) => {
  try {
    const config = await getConfig();
    const prices = getPrices(config);
    const trialDays = parseInt(config.trial_days || '7');

    const plans = [
      {
        plan_type: 'Trial',
        name: 'Prueba Gratis',
        price: 0,
        period: `${trialDays} días`,
        badge: '🎁 Sin tarjeta',
        badgeColor: 'gray',
        cta: 'Empezar gratis',
        prices: { monthly: 0, annual: 0 },
        features: [
          { text: 'Menú digital completo' },
          { text: 'Pedidos online' },
          { text: 'Productos ilimitados' },
          { text: 'Múltiples sucursales' },
          { text: 'Cupones de descuento' },
          { text: 'Sistema de puntos / fidelización' },
          { text: 'Código QR de tu carta' },
          { text: 'Branding personalizado' },
          { text: 'MercadoPago integrado' },
          { text: 'Dominio propio' },
          { text: 'Soporte prioritario 24hs por WhatsApp' },
        ],
      },
      {
        plan_type: 'Full Digital',
        name: 'Full Digital',
        price: prices['Full Digital'].monthly,
        period: 'mes',
        badge: '⭐️ Más elegido',
        badgeColor: 'red',
        highlighted: true,
        cta: 'Empezar ahora',
        prices: prices['Full Digital'],
        features: [
          { text: 'Menú digital completo' },
          { text: 'Pedidos online' },
          { text: 'Hasta 50 productos activos' },
          { text: 'Cupones de descuento' },
          { text: 'Sistema de puntos / fidelización' },
          { text: 'Análisis de ventas y pedidos' },
          { text: 'Subdominio + Dominio propio' },
          { text: 'MercadoPago integrado' },
          { text: 'Código QR de carta', disabled: true },
          { text: 'Branding personalizado' },
          { text: 'Soporte L-V 9 a 20hs por email' },
        ],
      },
      {
        plan_type: 'Expert',
        name: 'Expert',
        price: prices['Expert'].monthly,
        period: 'mes',
        badge: '🏆 Máximo poder',
        badgeColor: 'yellow',
        cta: 'Quiero Expert',
        prices: prices['Expert'],
        features: [
          { text: 'Todo lo de Full Digital' },
          { text: 'Productos ilimitados' },
          { text: 'Múltiples sucursales' },
          { text: 'Código QR de tu carta' },
          { text: 'Noticias y blog de marca' },
          { text: 'Branding personalizado' },
          { text: 'Acceso anticipado a nuevas funciones' },
          { text: 'Soporte prioritario 24hs por WhatsApp' },
        ],
      },
    ];

    res.json({ status: 'success', data: plans });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
};

// ── Webhook — confirmar pago ─────────────────────────────────────────────────
export const handleSubscriptionWebhook = async (req, res) => {
  const { type, data } = req.body;
  if (type !== 'payment') return res.sendStatus(200);

  try {
    const config = await getConfig();
    const mpToken = getMpToken(config);
    if (!mpToken) return res.sendStatus(200);

    const mp = new MercadoPagoConfig({ accessToken: mpToken });
    const paymentClient = new Payment(mp);
    const payment = await paymentClient.get({ id: data.id });

    if (payment.status !== 'approved') return res.sendStatus(200);

    const ref = payment.external_reference || '';
    // Soporta formato nuevo: tenant_{subdomain}_{plan}_{period}
    // Y formato legacy: store_{id}_{plan}_{period}
    const tenantMatch = ref.match(/^tenant_([a-z0-9-]+)_(.+)_(monthly|annual)$/);
    const storeMatch = ref.match(/^store_(\d+)_(.+)_(monthly|annual)$/);

    let expires = new Date();
    let tenantId = null;
    let planType, period;

    if (tenantMatch) {
      [, tenantId, planType, period] = tenantMatch;
      planType = planType.replace(/_/g, ' ');
    } else if (storeMatch) {
      const [, storeId, rawPlan, per] = storeMatch;
      planType = rawPlan.replace(/_/g, ' ');
      period = per;
      // Buscar tenant_id desde subscription_payments (store_id legacy)
      const sp = await query('SELECT tenant_id FROM subscription_payments WHERE store_id=$1 LIMIT 1', [storeId]);
      tenantId = sp.rows[0]?.tenant_id || null;
    } else {
      return res.sendStatus(200);
    }

    if (tenantId) {
      const tenantRes = await query('SELECT subscription_expires_at, status, plan_type FROM tenants WHERE id = $1', [tenantId]);
      if (tenantRes.rows.length) {
        const t = tenantRes.rows[0];
        // Si el tenant está activo y su expiración es a futuro
        if (t.status === 'active' && t.subscription_expires_at) {
          const currentExpires = new Date(t.subscription_expires_at);
          if (currentExpires > expires) {
            // Lógica de prorrateo si cambia de plan
            if (t.plan_type && t.plan_type !== planType) {
              const remainingMs = currentExpires.getTime() - expires.getTime();
              const remainingDays = remainingMs / (1000 * 60 * 60 * 24);
              
              const prices = getPrices(config);
              const oldPrice = prices[t.plan_type]?.monthly || 0;
              const newPrice = prices[planType]?.monthly || 1; // Evitar div por cero

              if (oldPrice > 0 && newPrice > 0) {
                const oldDaily = oldPrice / 30;
                const newDaily = newPrice / 30;
                const remainingValue = remainingDays * oldDaily;
                const convertedDays = remainingValue / newDaily;
                
                expires = new Date(expires.getTime() + convertedDays * 24 * 60 * 60 * 1000);
                console.log(`[Upgrade] Tenant ${tenantId} converted ${remainingDays.toFixed(1)} days of ${t.plan_type} into ${convertedDays.toFixed(1)} days of ${planType}`);
              } else {
                expires = new Date(currentExpires.getTime());
              }
            } else {
              // Mismo plan, mantenemos la fecha para sumarle encima
              expires = new Date(currentExpires.getTime());
            }
          }
        }
      }
    }

    expires.setDate(expires.getDate() + (period === 'annual' ? 365 : 30));

    if (tenantId) {
      await query(
        `UPDATE tenants SET status='active', plan_type=$1, subscription_period=$2,
         subscription_expires_at=$3, mp_subscription_id=$4 WHERE id=$5`,
        [planType, period, expires, String(payment.id), tenantId]
      );
    }

    await query(
      `UPDATE subscription_payments SET status='approved', mp_payment_id=$1 WHERE mp_payment_id=$2`,
      [String(payment.id), String(data.id)]
    );

    console.log(`✅ Suscripción aprobada: tenant=${tenantId} plan=${planType} period=${period}`);
    
    // ── NOTIFICACIONES ──
    try {
      // Buscar datos del tenant para el email (brand_name, admin_email)
      const tenantData = await query('SELECT brand_name, admin_email FROM tenants WHERE id = $1', [tenantId]);
      if (tenantData.rows.length) {
        const { brand_name, admin_email } = tenantData.rows[0];
        
        // Al cliente
        if (admin_email) {
          await sendSubscriptionWelcomeEmail({
            to: admin_email,
            brandName: brand_name || tenantId,
            planType,
            amount: payment.transaction_amount || '0'
          });
        }

        // Al admin de la plataforma
        await sendAdminNotification({
          subject: `Nueva Venta: ${brand_name || tenantId} (${planType})`,
          html: `
            <h2 style="color: #22c55e;">¡Nueva suscripción paga!</h2>
            <ul>
              <li><strong>Comercio:</strong> ${brand_name || tenantId}</li>
              <li><strong>Plan:</strong> ${planType} (${period})</li>
              <li><strong>Monto:</strong> $${payment.transaction_amount || 'n/a'}</li>
              <li><strong>Email Admin:</strong> ${admin_email || 'n/a'}</li>
              <li><strong>MP Payment ID:</strong> ${payment.id}</li>
            </ul>
          `
        });
      }
    } catch (err) {
      console.error('[NOTIFICACIÓN ERROR] Falló el envío de emails de suscripción:', err.message);
    }

    clearTenantCache();
    res.sendStatus(200);
  } catch (e) {
    console.error('Subscription webhook error:', e.message);
    res.sendStatus(200);
  }
};

// ── Status de suscripción (por store_id físico, busca tenant relacionado) ────────
export const getSubscriptionStatus = async (req, res) => {
  const { store_id } = req.params;

  if (!store_id || isNaN(parseInt(store_id))) {
    return res.status(400).json({ status: 'error', message: 'store_id inválido o no numérico.' });
  }

  try {
    const config = await getConfig();
    const prices = getPrices(config);
    // Buscar desde el store físico → su tenant
    const storeRes = await query('SELECT tenant_id FROM stores WHERE id = $1', [parseInt(store_id)]);
    const tenantId = storeRes.rows[0]?.tenant_id || store_id;
    const result = await query(
      'SELECT id, subdomain, plan_type, subscription_period, subscription_expires_at, status FROM tenants WHERE id = $1',
      [tenantId]
    );
    if (!result.rows.length)
      return res.status(404).json({ status: 'error', message: 'Comercio no encontrado.' });
    const s = result.rows[0];
    const expired = s.subscription_expires_at && new Date(s.subscription_expires_at) < new Date();
    res.json({ status: 'success', data: { ...s, is_expired: expired, prices } });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
};

// ── (legacy) Checkout autenticado desde superadmin ────────────────────────────
export const createSubscriptionCheckout = async (req, res) => {
  const { store_id, plan_type, period, payer_email } = req.body;
  if (!store_id || !plan_type || !period)
    return res.status(400).json({ status: 'error', message: 'store_id, plan_type y period son requeridos.' });

  try {
    const config = await getConfig();
    const mpToken = getMpToken(config);
    if (!mpToken)
      return res.status(503).json({ status: 'error', message: 'MercadoPago no configurado. Configuralo en el panel de superadmin.' });

    const prices = getPrices(config);
    if (!prices[plan_type]) return res.status(400).json({ status: 'error', message: 'Plan inválido.' });
    const amount = prices[plan_type][period] || prices[plan_type].monthly;
    const periodLabel = period === 'annual' ? 'anual' : 'mensual';

    const storeRes = await query('SELECT name, brand_name FROM stores WHERE id = $1', [store_id]);
    if (!storeRes.rows.length) return res.status(404).json({ status: 'error', message: 'Comercio no encontrado.' });
    const storeName = storeRes.rows[0].brand_name || storeRes.rows[0].name;

    const sandbox = config.mp_sandbox_mode === 'true';
    const mp = new MercadoPagoConfig({ accessToken: mpToken });
    const preferenceClient = new Preference(mp);
    const backendUrl = config.backend_url || process.env.BACKEND_URL || 'https://voraz-platform-production.up.railway.app';
    const frontendUrl = config.frontend_url || process.env.GASTRORED_FRONTEND_URL || 'https://gastrored.com.ar';

    const preferenceBody = {
      items: [{
        id: `plan_${plan_type.replace(/\s/g, '_').toLowerCase()}_${period}`,
        title: `GastroRed — ${storeName}: Plan ${plan_type} (${periodLabel})`,
        quantity: 1, unit_price: amount, currency_id: 'ARS'
      }],
      payer: { email: payer_email || 'admin@gastrored.com.ar' },
      external_reference: `store_${store_id}_${plan_type.replace(/\s/g, '_')}_${period}`,
      statement_descriptor: 'GASTRORED',
      notification_url: `${backendUrl}/api/subscriptions/webhook`,
      back_urls: { success: `${frontendUrl}?sub=success`, failure: `${frontendUrl}?sub=failure`, pending: `${frontendUrl}?sub=pending` },
      auto_return: 'approved',
    };

    const result = await preferenceClient.create({ body: preferenceBody });
    await query(
      `INSERT INTO subscription_payments (store_id, mp_payment_id, amount, plan_type, period, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [store_id, result.id, amount, plan_type, period]
    );

    res.json({
      status: 'success', data: {
        init_point: sandbox ? result.sandbox_init_point : result.init_point,
        sandbox_init_point: result.sandbox_init_point,
        preference_id: result.id, amount, plan_type, period,
      }
    });
  } catch (e) {
    console.error('Subscription checkout error:', e.message);
    res.status(500).json({ status: 'error', message: e.message });
  }
};

// ── Activación manual / sandbox (sin webhook) ─────────────────────────────────
export const activateSandboxStore = async (req, res) => {
  const { store_id, tenant_id, secret } = req.body;
  const targetId = tenant_id || store_id;
  if (!targetId) return res.status(400).json({ status: 'error', message: 'tenant_id o store_id requerido.' });

  try {
    const config = await getConfig();
    const isSandbox = config.mp_sandbox_mode === 'true';
    const validSecret = process.env.GASTRORED_SUPERADMIN_SECRET || 'gastrored_super_secret';

    if (!isSandbox && secret !== validSecret) {
      return res.status(403).json({ status: 'error', message: 'Solo disponible en modo sandbox o con clave de superadmin.' });
    }

    // Resolver tenant_id: si viene store_id numérico, buscar su tenant
    let resolvedTenantId = tenant_id;
    let physicalStoreId = null;
    if (!resolvedTenantId) {
      const storeRes = await query('SELECT tenant_id FROM stores WHERE id = $1', [store_id]);
      resolvedTenantId = storeRes.rows[0]?.tenant_id;
      physicalStoreId = store_id;
    }

    if (!resolvedTenantId)
      return res.status(404).json({ status: 'error', message: 'Comercio no encontrado.' });

    const tenantCheck = await query(
      `SELECT id, name, subdomain, status, plan_type FROM tenants WHERE id = $1`,
      [resolvedTenantId]
    );
    if (!tenantCheck.rows.length)
      return res.status(404).json({ status: 'error', message: 'Tenant no encontrado.' });

    const tenant = tenantCheck.rows[0];
    const trialDays = parseInt(config.trial_days || '7');
    const expires = new Date();
    expires.setDate(expires.getDate() + (isSandbox ? trialDays : 30));

    await query(
      `UPDATE tenants
       SET status = 'active',
           subscription_expires_at = CASE
             WHEN subscription_expires_at IS NULL OR subscription_expires_at < NOW()
             THEN $1
             ELSE subscription_expires_at
           END
       WHERE id = $2`,
      [expires, resolvedTenantId]
    );

    // Registrar pago de prueba en historial
    const storeIdForPayment = physicalStoreId || (await query('SELECT id FROM stores WHERE tenant_id=$1 LIMIT 1', [resolvedTenantId])).rows[0]?.id;
    if (storeIdForPayment) {
      await query(
        `INSERT INTO subscription_payments (store_id, tenant_id, mp_payment_id, amount, plan_type, period, status)
         VALUES ($1, $2, $3, 0, $4, 'monthly', 'approved')`,
        [storeIdForPayment, resolvedTenantId, `sandbox_manual_${Date.now()}`, tenant.plan_type || 'Trial']
      );
    }

    clearTenantCache();

    res.json({
      status: 'success',
      message: `Comercio ${tenant.name} activado correctamente (sandbox).`,
      data: {
        tenant_id: resolvedTenantId,
        subdomain: tenant.subdomain,
        status: 'active',
        subscription_expires_at: expires,
      },
    });
  } catch (e) {
    console.error('activateSandboxStore error:', e.message);
    res.status(500).json({ status: 'error', message: e.message });
  }
};

/** Crea un checkout de upgrade para un tenant logueado */
export const createUpgradeCheckout = async (req, res) => {
  const { plan_type, period } = req.body;
  const tenantId = req.tenant.id;
  const admin_email = req.user.email;

  if (!plan_type || !period)
    return res.status(400).json({ status: 'error', message: 'plan_type y period son requeridos.' });

  try {
    const config = await getConfig();
    const mpToken = getMpToken(config);
    if (!mpToken) return res.status(503).json({ status: 'error', message: 'Sistema de pagos no configurado.' });

    const prices = getPrices(config);
    const amount = prices[plan_type][period];
    const periodLabel = period === 'annual' ? 'anual' : 'mensual';

    const tenantRes = await query('SELECT name, brand_name FROM tenants WHERE id = $1', [tenantId]);
    const tenantName = tenantRes.rows[0]?.brand_name || tenantRes.rows[0]?.name || 'GastroRed';

    const sandbox = config.mp_sandbox_mode === 'true';
    const mp = new MercadoPagoConfig({ accessToken: mpToken });
    const preferenceClient = new Preference(mp);

    const backendUrl = config.backend_url || process.env.BACKEND_URL;
    const frontendUrl = config.frontend_url || process.env.GASTRORED_FRONTEND_URL || 'https://gastrored.com.ar';

    const preferenceBody = {
      items: [{
        id: `upgrade_${plan_type.replace(/\s/g, '_').toLowerCase()}_${period}`,
        title: `Upgrade GastroRed — ${tenantName}: Plan ${plan_type} (${periodLabel})`,
        quantity: 1, unit_price: amount, currency_id: 'ARS'
      }],
      payer: { email: admin_email },
      external_reference: `tenant_${tenantId}_${plan_type.replace(/\s/g, '_')}_${period}`,
      notification_url: `${backendUrl}/api/subscriptions/webhook`,
      back_urls: { 
        success: `${frontendUrl}/admin?sub=success`, 
        failure: `${frontendUrl}/admin?sub=failure`, 
        pending: `${frontendUrl}/admin?sub=pending` 
      },
      auto_return: 'approved',
    };

    const result = await preferenceClient.create({ body: preferenceBody });
    
    // Buscar store_id para el payment
    const storeRes = await query('SELECT id FROM stores WHERE tenant_id = $1 LIMIT 1', [tenantId]);
    const storeId = storeRes.rows[0]?.id;

    if (storeId) {
      await query(
        `INSERT INTO subscription_payments (store_id, tenant_id, mp_payment_id, amount, plan_type, period, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
        [storeId, tenantId, result.id, amount, plan_type, period]
      );
    }

    res.json({
      status: 'success',
      data: {
        init_point: sandbox ? result.sandbox_init_point : result.init_point,
        preference_id: result.id,
      }
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
};

