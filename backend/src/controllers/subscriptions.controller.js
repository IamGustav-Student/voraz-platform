import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { query } from '../config/db.js';

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

/** Sincroniza un store con la tabla tenants (legacy) y tenant_settings */
async function syncTenantRecord(storeId, subdomain, storeName) {
  if (!subdomain) return;
  try {
    // Upsert en tabla tenants (legacy) — necesaria para que el middleware la encuentre
    await query(
      `INSERT INTO tenants (id, name) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
      [subdomain, storeName]
    );
    // Upsert en tenant_settings
    await query(
      `INSERT INTO tenant_settings (store_id, tenant_id, cash_on_delivery)
       VALUES ($1, $2, true)
       ON CONFLICT (store_id) DO NOTHING`,
      [storeId, subdomain]
    );
  } catch (e) {
    console.warn('syncTenantRecord warning:', e.message);
  }
}

// ── Crear tenant de trial (7 días gratis, sin pago) ──────────────────────────
export const createTrialTenant = async (req, res) => {
  const { name, brand_name, subdomain, admin_email, slogan,
    brand_color_primary, brand_color_secondary } = req.body;

  if (!name || !subdomain)
    return res.status(400).json({ status: 'error', message: 'name y subdomain son requeridos.' });

  const cleanSub = cleanSubdomain(subdomain);
  if (!cleanSub)
    return res.status(400).json({ status: 'error', message: 'Subdomain inválido.' });

  try {
    const config = await getConfig();
    const trialDays = parseInt(config.trial_days || '7');
    const expires = new Date();
    expires.setDate(expires.getDate() + trialDays);

    const result = await query(
      `INSERT INTO stores
         (name, brand_name, subdomain, plan_type, subscription_period,
          subscription_expires_at, status, admin_email, brand_color_primary,
          brand_color_secondary, slogan)
       VALUES ($1,$2,$3,'Trial','monthly',$4,'trial',$5,$6,$7,$8)
       RETURNING id, name, brand_name, subdomain, status, subscription_expires_at`,
      [
        name.trim(), (brand_name || name).trim(), cleanSub,
        expires,
        admin_email?.trim() || null,
        brand_color_primary || '#E30613',
        brand_color_secondary || '#1A1A1A',
        slogan?.trim() || null,
      ]
    );
    const store = result.rows[0];

    // Sincronizar con tenants + tenant_settings
    await syncTenantRecord(store.id, cleanSub, store.name);

    res.status(201).json({
      status: 'success',
      data: {
        ...store,
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
    subscription_period, brand_color_primary, brand_color_secondary, slogan } = req.body;

  if (!name || !subdomain || !plan_type)
    return res.status(400).json({ status: 'error', message: 'name, subdomain y plan_type son requeridos.' });
  if (!['Full Digital', 'Expert'].includes(plan_type))
    return res.status(400).json({ status: 'error', message: 'Plan inválido.' });

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

    // Verificar que el subdomain no exista
    const existing = await query('SELECT id FROM stores WHERE subdomain = $1', [cleanSub]);
    if (existing.rows.length)
      return res.status(409).json({ status: 'error', message: 'El subdomain ya está en uso. Elegí otro.' });

    const storeResult = await query(
      `INSERT INTO stores
         (name, brand_name, subdomain, plan_type, subscription_period,
          subscription_expires_at, status, admin_email,
          brand_color_primary, brand_color_secondary, slogan)
       VALUES ($1,$2,$3,$4,$5,$6,'pending_payment',$7,$8,$9,$10)
       RETURNING id, name, brand_name, subdomain`,
      [
        name.trim(), (brand_name || name).trim(), cleanSub,
        plan_type, period, expires,
        admin_email?.trim() || null,
        brand_color_primary || '#E30613',
        brand_color_secondary || '#1A1A1A',
        slogan?.trim() || null,
      ]
    );
    const store = storeResult.rows[0];

    // Sincronizar con tenants + tenant_settings
    await syncTenantRecord(store.id, cleanSub, store.name);

    // Crear preferencia en MercadoPago
    const sandbox = config.mp_sandbox_mode === 'true';
    const mp = new MercadoPagoConfig({ accessToken: mpToken });
    const preferenceClient = new Preference(mp);

    const backendUrl = config.backend_url || process.env.BACKEND_URL || 'https://voraz-platform-production.up.railway.app';
    const frontendUrl = config.frontend_url || process.env.GASTRORED_FRONTEND_URL || 'https://gastrored.com.ar';

    const preferenceBody = {
      items: [{
        id: `plan_${plan_type.replace(/\s/g, '_').toLowerCase()}_${period}`,
        title: `GastroRed — ${store.brand_name}: Plan ${plan_type} (${periodLabel})`,
        quantity: 1,
        unit_price: amount,
        currency_id: 'ARS',
      }],
      payer: { email: admin_email || 'cliente@gastrored.com.ar' },
      external_reference: `store_${store.id}_${plan_type.replace(/\s/g, '_')}_${period}`,
      statement_descriptor: 'GASTRORED',
      notification_url: `${backendUrl}/api/subscriptions/webhook`,
      back_urls: {
        success: `${frontendUrl}?sub=success&store=${store.id}`,
        failure: `${frontendUrl}?sub=failure&store=${store.id}`,
        pending: `${frontendUrl}?sub=pending&store=${store.id}`,
      },
      auto_return: 'approved',
    };

    const preference = await preferenceClient.create({ body: preferenceBody });

    await query(
      `INSERT INTO subscription_payments (store_id, mp_payment_id, amount, plan_type, period, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [store.id, preference.id, amount, plan_type, period]
    );

    res.status(201).json({
      status: 'success',
      data: {
        store_id: store.id,
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

// ── Webhook — confirmar pago ──────────────────────────────────────────────────
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
    const match = ref.match(/^store_(\d+)_(.+)_(monthly|annual)$/);
    if (!match) return res.sendStatus(200);

    const [, storeId, rawPlanType, period] = match;
    const planType = rawPlanType.replace(/_/g, ' ');
    const expires = new Date();
    expires.setDate(expires.getDate() + (period === 'annual' ? 365 : 30));

    const storeResult = await query(
      `UPDATE stores SET status='active', plan_type=$1, subscription_period=$2,
       subscription_expires_at=$3, mp_subscription_id=$4 WHERE id=$5
       RETURNING id, name, subdomain`,
      [planType, period, expires, String(payment.id), storeId]
    );

    await query(
      `UPDATE subscription_payments SET status='approved', mp_payment_id=$1
       WHERE mp_payment_id=$2`,
      [String(payment.id), String(data.id)]
    );

    // Sincronizar tenant con el sistema completo
    if (storeResult.rows[0]) {
      const s = storeResult.rows[0];
      await syncTenantRecord(s.id, s.subdomain, s.name);
    }

    console.log(`✅ Suscripción aprobada: store_id=${storeId} plan=${planType} period=${period}`);
    res.sendStatus(200);
  } catch (e) {
    console.error('Subscription webhook error:', e.message);
    res.sendStatus(200);
  }
};

// ── Status de suscripción ─────────────────────────────────────────────────────
export const getSubscriptionStatus = async (req, res) => {
  const { store_id } = req.params;
  try {
    const config = await getConfig();
    const prices = getPrices(config);
    const result = await query(
      'SELECT plan_type, subscription_period, subscription_expires_at, status FROM stores WHERE id = $1',
      [store_id]
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
  const { store_id, secret } = req.body;
  if (!store_id) return res.status(400).json({ status: 'error', message: 'store_id requerido.' });

  try {
    const config = await getConfig();
    const isSandbox = config.mp_sandbox_mode === 'true';
    const validSecret = process.env.GASTRORED_SUPERADMIN_SECRET || 'gastrored_super_secret';

    // Solo permitir si sandbox está activo O si se provee el secret del superadmin
    if (!isSandbox && secret !== validSecret) {
      return res.status(403).json({
        status: 'error',
        message: 'Solo disponible en modo sandbox o con clave de superadmin.',
      });
    }

    const storeCheck = await query(
      `SELECT id, name, subdomain, status FROM stores WHERE id = $1`,
      [store_id]
    );
    if (!storeCheck.rows.length)
      return res.status(404).json({ status: 'error', message: 'Comercio no encontrado.' });

    const store = storeCheck.rows[0];
    const trialDays = parseInt(config.trial_days || '7');
    const expires = new Date();
    expires.setDate(expires.getDate() + (isSandbox ? trialDays : 30));

    await query(
      `UPDATE stores
       SET status = 'active',
           subscription_expires_at = CASE
             WHEN subscription_expires_at IS NULL OR subscription_expires_at < NOW()
             THEN $1
             ELSE subscription_expires_at
           END
       WHERE id = $2`,
      [expires, store_id]
    );

    // Registrar pago de prueba en historial
    await query(
      `INSERT INTO subscription_payments (store_id, mp_payment_id, amount, plan_type, period, status)
       VALUES ($1, $2, 0, $3, 'monthly', 'approved')`,
      [store_id, `sandbox_manual_${Date.now()}`, store.plan_type || 'Trial']
    );

    // Sincronizar con tenants + tenant_settings
    await syncTenantRecord(store.id, store.subdomain, store.name);

    res.json({
      status: 'success',
      message: `Comercio ${store.name} activado correctamente (sandbox).`,
      data: {
        store_id: store.id,
        subdomain: store.subdomain,
        expires_at: expires,
      },
    });
  } catch (e) {
    console.error('activateSandboxStore error:', e.message);
    res.status(500).json({ status: 'error', message: e.message });
  }
};
