import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import { query } from '../config/db.js';

const PLAN_PRICES = {
  'Full Digital': { monthly: 60000, annual: 600000 },
  'Expert':       { monthly: 100000, annual: 1000000 },
};

const GASTRORED_MP_TOKEN = process.env.GASTRORED_MP_ACCESS_TOKEN;

export const createSubscriptionCheckout = async (req, res) => {
  const { store_id, plan_type, period, payer_email } = req.body;
  if (!store_id || !plan_type || !period)
    return res.status(400).json({ status: 'error', message: 'store_id, plan_type y period son requeridos.' });
  if (!GASTRORED_MP_TOKEN)
    return res.status(503).json({ status: 'error', message: 'MercadoPago de GastroRed no configurado. Configurá GASTRORED_MP_ACCESS_TOKEN en Railway.' });

  const prices = PLAN_PRICES[plan_type];
  if (!prices) return res.status(400).json({ status: 'error', message: 'Plan inválido.' });
  const amount = prices[period] || prices.monthly;
  const periodLabel = period === 'annual' ? 'anual' : 'mensual';

  try {
    const storeRes = await query('SELECT name, brand_name FROM stores WHERE id = $1', [store_id]);
    if (!storeRes.rows.length)
      return res.status(404).json({ status: 'error', message: 'Comercio no encontrado.' });
    const storeName = storeRes.rows[0].brand_name || storeRes.rows[0].name;

    const mp = new MercadoPagoConfig({ accessToken: GASTRORED_MP_TOKEN });
    const preferenceClient = new Preference(mp);

    const backendUrl = process.env.BACKEND_URL || 'https://voraz-platform-production.up.railway.app';
    const frontendUrl = process.env.GASTRORED_FRONTEND_URL || 'https://voraz-platform.vercel.app';
    const isHttps = frontendUrl.startsWith('https://');

    const preferenceBody = {
      items: [{
        id: `plan_${plan_type.replace(/\s/g, '_').toLowerCase()}_${period}`,
        title: `GastroRed — ${storeName}: Plan ${plan_type} (${periodLabel})`,
        quantity: 1,
        unit_price: amount,
        currency_id: 'ARS',
      }],
      payer: { email: payer_email || 'admin@gastrored.com.ar' },
      external_reference: `store_${store_id}_${plan_type.replace(/\s/g, '_')}_${period}`,
      statement_descriptor: 'GASTRORED',
      notification_url: `${backendUrl}/api/subscriptions/webhook`,
    };

    if (isHttps) {
      preferenceBody.back_urls = {
        success: `${frontendUrl}?sub=success`,
        failure: `${frontendUrl}?sub=failure`,
        pending: `${frontendUrl}?sub=pending`,
      };
      preferenceBody.auto_return = 'approved';
    }

    const result = await preferenceClient.create({ body: preferenceBody });

    await query(
      `INSERT INTO subscription_payments (store_id, mp_payment_id, amount, plan_type, period, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [store_id, result.id, amount, plan_type, period]
    );

    res.json({
      status: 'success',
      data: {
        init_point: result.init_point,
        sandbox_init_point: result.sandbox_init_point,
        preference_id: result.id,
        amount,
        plan_type,
        period,
      }
    });
  } catch (e) {
    console.error('Subscription checkout error:', e.message);
    res.status(500).json({ status: 'error', message: e.message });
  }
};

export const handleSubscriptionWebhook = async (req, res) => {
  const { type, data } = req.body;
  if (type !== 'payment') return res.sendStatus(200);

  try {
    if (!GASTRORED_MP_TOKEN) return res.sendStatus(200);
    const mp = new MercadoPagoConfig({ accessToken: GASTRORED_MP_TOKEN });
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

    await query(
      `UPDATE stores SET status='active', plan_type=$1, subscription_period=$2,
       subscription_expires_at=$3, mp_subscription_id=$4 WHERE id=$5`,
      [planType, period, expires, String(payment.id), storeId]
    );

    await query(
      `UPDATE subscription_payments SET status='approved', mp_payment_id=$1
       WHERE mp_payment_id=$2`,
      [String(payment.id), String(data.id)]
    );

    res.sendStatus(200);
  } catch (e) {
    console.error('Subscription webhook error:', e.message);
    res.sendStatus(200);
  }
};

export const getSubscriptionStatus = async (req, res) => {
  const { store_id } = req.params;
  try {
    const result = await query(
      'SELECT plan_type, subscription_period, subscription_expires_at, status FROM stores WHERE id = $1',
      [store_id]
    );
    if (!result.rows.length)
      return res.status(404).json({ status: 'error', message: 'Comercio no encontrado.' });
    const s = result.rows[0];
    const expired = s.subscription_expires_at && new Date(s.subscription_expires_at) < new Date();
    res.json({ status: 'success', data: { ...s, is_expired: expired, prices: PLAN_PRICES } });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
};
