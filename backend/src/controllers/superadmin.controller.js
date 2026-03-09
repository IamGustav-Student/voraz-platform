import { query } from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SUPERADMIN_SECRET = process.env.GASTRORED_SUPERADMIN_SECRET || 'gastrored_super_secret';

const PLAN_PRICES = {
  'Full Digital': { monthly: 60000, annual: 600000 },
  'Expert': { monthly: 100000, annual: 1000000 },
};

export const superadminSetup = async (req, res) => {
  try {
    const existing = await query('SELECT COUNT(*) FROM superadmins');
    if (parseInt(existing.rows[0].count) > 0) {
      return res.status(403).json({ status: 'error', message: 'Setup ya completado. El superadmin ya existe.' });
    }
    const { email, password, name, setup_key } = req.body;
    const expectedKey = process.env.GASTRORED_SUPERADMIN_SECRET || 'gastrored_dev_secret_CAMBIAR';
    if (setup_key !== expectedKey) {
      return res.status(401).json({ status: 'error', message: 'setup_key inválida.' });
    }
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ status: 'error', message: 'Email y password (mín. 8 caracteres) requeridos.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO superadmins (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hash, name || 'GastroRed Admin']
    );
    res.json({ status: 'success', message: 'Superadmin creado. Ya podés hacer login.', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const superadminLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await query('SELECT * FROM superadmins WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(401).json({ status: 'error', message: 'Credenciales inválidas.' });
    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ status: 'error', message: 'Credenciales inválidas.' });
    const token = jwt.sign({ id: admin.id, email: admin.email, name: admin.name, role: 'superadmin' }, SUPERADMIN_SECRET, { expiresIn: '7d' });
    res.json({ status: 'success', data: { token, admin: { id: admin.id, email: admin.email, name: admin.name } } });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const getGlobalStats = async (req, res) => {
  try {
    const [stores, active, suspended, payments] = await Promise.all([
      query('SELECT COUNT(*) FROM stores WHERE id > 0'),
      query("SELECT COUNT(*) FROM stores WHERE status = 'active'"),
      query("SELECT COUNT(*) FROM stores WHERE status = 'suspended'"),
      query("SELECT COALESCE(SUM(amount),0) as total FROM subscription_payments WHERE status = 'approved'"),
    ]);
    res.json({
      status: 'success',
      data: {
        total_stores: parseInt(stores.rows[0].count),
        active_stores: parseInt(active.rows[0].count),
        suspended_stores: parseInt(suspended.rows[0].count),
        total_revenue: parseFloat(payments.rows[0].total),
      },
    });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const listAllStores = async (req, res) => {
  try {
    const result = await query(
      `SELECT id, name, address, admin_email, subdomain, custom_domain,
              plan_type, subscription_period, subscription_expires_at,
              status, brand_name, brand_color_primary, brand_logo_url, created_at
       FROM stores ORDER BY id ASC`
    );
    res.json({ status: 'success', data: result.rows });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const createTenant = async (req, res) => {
  const { name, brand_name, subdomain, custom_domain, plan_type, subscription_period,
    admin_email, brand_color_primary, brand_color_secondary, brand_logo_url, slogan } = req.body;
  if (!name || !subdomain) return res.status(400).json({ status: 'error', message: 'name y subdomain son requeridos.' });

  // ── Sanitización de dominios ──────────────────────────────────────────────
  const cleanSubdomain = subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
  if (!cleanSubdomain) return res.status(400).json({ status: 'error', message: 'Subdomain inválido.' });

  // custom_domain: limpiar espacios, mayúsculas y prefijos http(s)://www.
  let cleanDomain = null;
  if (custom_domain && custom_domain.trim()) {
    cleanDomain = custom_domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//i, '')  // quitar http:// o https://
      .replace(/^www\./i, '')         // quitar www.
      .replace(/\/.*$/, '')           // quitar path si lo hay
      .trim();
    if (!cleanDomain) cleanDomain = null;
  }

  try {
    const now = new Date();
    const period = subscription_period || 'monthly';
    const expires = new Date(now);
    expires.setDate(expires.getDate() + (period === 'annual' ? 365 : 30));

    const result = await query(
      `INSERT INTO stores
         (name, brand_name, subdomain, custom_domain, plan_type, subscription_period,
          subscription_expires_at, status, admin_email, brand_color_primary,
          brand_color_secondary, brand_logo_url, slogan)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        name.trim(), (brand_name || name).trim(), cleanSubdomain, cleanDomain,
        plan_type || 'Full Digital', period, expires,
        admin_email?.trim() || null,
        brand_color_primary || '#E30613',
        brand_color_secondary || '#1A1A1A',
        brand_logo_url || null,
        slogan?.trim() || null,
      ]
    );
    const store = result.rows[0];

    // Crear registro en tenant_settings usando el store_id como FK canónica
    await query(
      `INSERT INTO tenant_settings (store_id, tenant_id, cash_on_delivery)
       VALUES ($1, $2, true)
       ON CONFLICT (store_id) DO NOTHING`,
      [store.id, cleanSubdomain]
    );

    res.status(201).json({ status: 'success', data: store });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ status: 'error', message: 'El subdomain o dominio ya existe.' });
    res.status(500).json({ status: 'error', message: e.message });
  }
};

export const updateStoreStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['active', 'suspended', 'trial'].includes(status)) return res.status(400).json({ status: 'error', message: 'Estado inválido.' });
  try {
    const result = await query('UPDATE stores SET status = $1 WHERE id = $2 RETURNING id, name, status', [status, id]);
    if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Comercio no encontrado.' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const updateStorePlan = async (req, res) => {
  const { id } = req.params;
  const { plan_type, subscription_period } = req.body;
  if (!['Full Digital', 'Expert'].includes(plan_type)) return res.status(400).json({ status: 'error', message: 'Plan inválido.' });
  try {
    const period = subscription_period || 'monthly';
    const expires = new Date();
    expires.setDate(expires.getDate() + (period === 'annual' ? 365 : 30));
    const result = await query(
      'UPDATE stores SET plan_type=$1, subscription_period=$2, subscription_expires_at=$3 WHERE id=$4 RETURNING id, name, plan_type',
      [plan_type, period, expires, id]
    );
    if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Comercio no encontrado.' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const getPlanPrices = async (req, res) => {
  res.json({ status: 'success', data: PLAN_PRICES });
};
