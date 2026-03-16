import { query } from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { initializeTenantData } from '../utils/initialization.js';

const SUPERADMIN_SECRET = process.env.GASTRORED_SUPERADMIN_SECRET || 'gastrored_super_secret';

export const superadminSetup = async (req, res) => {
  try {
    const existing = await query('SELECT COUNT(*) FROM superadmins');
    if (parseInt(existing.rows[0].count) > 0) {
      return res.status(403).json({ status: 'error', message: 'Setup ya completado.' });
    }
    const { email, password, name, setup_key } = req.body;
    const expectedKey = process.env.GASTRORED_SUPERADMIN_SECRET || 'gastrored_dev_secret_CAMBIAR';
    if (setup_key !== expectedKey) return res.status(401).json({ status: 'error', message: 'setup_key inválida.' });
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ status: 'error', message: 'Email y password (mín. 8 caracteres) requeridos.' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO superadmins (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
      [email, hash, name || 'GastroRed Admin']
    );
    res.json({ status: 'success', message: 'Superadmin creado.', data: result.rows[0] });
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
    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name, role: 'superadmin' },
      SUPERADMIN_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ status: 'success', data: { token, admin: { id: admin.id, email: admin.email, name: admin.name } } });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const getGlobalStats = async (req, res) => {
  try {
    const [total, active, suspended, payments] = await Promise.all([
      query("SELECT COUNT(*) FROM tenants WHERE id != 'voraz'"),
      query("SELECT COUNT(*) FROM tenants WHERE status = 'active' AND id != 'voraz'"),
      query("SELECT COUNT(*) FROM tenants WHERE status = 'suspended'"),
      query("SELECT COALESCE(SUM(amount),0) as total FROM subscription_payments WHERE status = 'approved'"),
    ]);
    res.json({
      status: 'success',
      data: {
        total_tenants: parseInt(total.rows[0].count),
        active_tenants: parseInt(active.rows[0].count),
        suspended_tenants: parseInt(suspended.rows[0].count),
        total_revenue: parseFloat(payments.rows[0].total),
      },
    });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── Lista todos los tenants (comercios clientes del SaaS) ────────────────────
export const listAllTenants = async (req, res) => {
  try {
    const result = await query(
      `SELECT t.id, t.name, t.subdomain, t.custom_domain, t.admin_email,
              t.plan_type, t.subscription_period, t.subscription_expires_at,
              t.status, t.brand_name, t.brand_color_primary, t.brand_logo_url,
              t.slogan, t.created_at,
              COALESCE(ts.custom_branding_enabled, false) AS custom_branding_enabled
       FROM tenants t
       LEFT JOIN tenant_settings ts ON ts.tenant_id = t.id OR ts.tenant_id_fk::text = t.id::text
       ORDER BY t.created_at DESC`
    );
    res.json({ status: 'success', data: result.rows });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// Alias backward-compat que usa el panel (lo llama listAllStores)
export const listAllStores = listAllTenants;

// ── Crear nuevo tenant ───────────────────────────────────────────────────────
export const createTenant = async (req, res) => {
  const {
    name, brand_name, subdomain, custom_domain, plan_type, subscription_period,
    admin_email, brand_color_primary, brand_color_secondary, brand_logo_url, slogan,
  } = req.body;

  if (!name || !subdomain) {
    return res.status(400).json({ status: 'error', message: 'name y subdomain son requeridos.' });
  }

  const cleanSub = subdomain.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
  if (!cleanSub) return res.status(400).json({ status: 'error', message: 'Subdomain inválido.' });

  let cleanDomain = null;
  if (custom_domain && custom_domain.trim()) {
    cleanDomain = custom_domain.trim().toLowerCase()
      .replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '').trim() || null;
  }

  try {
    const now = new Date();
    const period = subscription_period || 'monthly';
    const expires = new Date(now);
    expires.setDate(expires.getDate() + (period === 'annual' ? 365 : 30));

    // 1. Crear en tenants
    const tenantResult = await query(
      `INSERT INTO tenants
         (id, name, subdomain, custom_domain, plan_type, subscription_period,
          subscription_expires_at, status, brand_name, brand_color_primary,
          brand_color_secondary, brand_logo_url, slogan, admin_email, active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$9,$10,$11,$12,$13,true)
       RETURNING *`,
      [
        cleanSub, name.trim(), cleanSub, cleanDomain,
        plan_type || 'Full Digital', period, expires,
        (brand_name || name).trim(),
        brand_color_primary || '#E30613',
        brand_color_secondary || '#1A1A1A',
        brand_logo_url || null,
        slogan?.trim() || null,
        admin_email?.trim() || null,
      ]
    );
    const tenant = tenantResult.rows[0];

    // 2. Crear sucursal principal (store) para este tenant
    const storeResult = await query(
      `INSERT INTO stores (name, tenant_id) VALUES ($1, $2) RETURNING *`,
      [name.trim(), cleanSub]
    );
    const store = storeResult.rows[0];

    // 3. Crear tenant_settings
     await query(
       `INSERT INTO tenant_settings (store_id, tenant_id, tenant_id_fk, cash_on_delivery)
        VALUES ($1, $2, $3, true) ON CONFLICT (store_id) DO NOTHING`,
       [store.id, cleanSub, cleanSub]
     );

     // 4. Inicializar datos de ejemplo (2 productos por categoría)
     await initializeTenantData(cleanSub, store.id);

     // 5. Crear usuario administrador si se proveen credenciales
    let adminUser = null;
    const effectiveAdminEmail = admin_email?.trim() || null;
    const { admin_name, admin_password } = req.body;
    if (effectiveAdminEmail && admin_password && admin_password.length >= 6) {
      const hash = await bcrypt.hash(admin_password, 10);
      const adminResult = await query(
        `INSERT INTO users (email, password_hash, name, store_id, tenant_id, role, points)
         VALUES ($1, $2, $3, $4, $5, 'admin', 0)
         ON CONFLICT (email, store_id) DO UPDATE
           SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name, role = 'admin'
         RETURNING id, email, name, role`,
        [effectiveAdminEmail, hash, (admin_name || name).trim(), store.id, cleanSub]
      );
      adminUser = adminResult.rows[0];
    }

    res.status(201).json({
      status: 'success',
      data: {
        ...tenant,
        admin_user: adminUser ? {
          email: adminUser.email,
          name: adminUser.name,
          role: adminUser.role,
          login_url: `https://${cleanSub}.${process.env.GASTRORED_ROOT_DOMAIN || 'gastrored.com.ar'}/admin`,
        } : null,
      },
    });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ status: 'error', message: 'El subdomain o dominio ya existe.' });
    res.status(500).json({ status: 'error', message: e.message });
  }
};

// ── Actualizar estado del tenant ─────────────────────────────────────────────
export const updateStoreStatus = async (req, res) => {
  const { id } = req.params;  // id = tenant subdomain
  const { status } = req.body;
  if (!['active', 'suspended', 'trial', 'pending_payment'].includes(status)) {
    return res.status(400).json({ status: 'error', message: 'Estado inválido.' });
  }

  try {
    let result;
    if (status === 'active') {
      const newExpiry = new Date();
      newExpiry.setDate(newExpiry.getDate() + 30);
      result = await query(
        `UPDATE tenants
         SET status = $1,
             subscription_expires_at = CASE
               WHEN id::text = 'voraz' THEN NULL
               WHEN subscription_expires_at IS NULL OR subscription_expires_at < NOW() THEN $2
               ELSE subscription_expires_at
             END
         WHERE id = $3
         RETURNING id, name, status, subdomain, subscription_expires_at`,
        [status, newExpiry, id]
      );
    } else {
      result = await query(
        'UPDATE tenants SET status = $1 WHERE id = $2 RETURNING id, name, status, subdomain',
        [status, id]
      );
    }
    if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Tenant no encontrado.' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── Actualizar plan del tenant ───────────────────────────────────────────────
export const updateStorePlan = async (req, res) => {
  const { id } = req.params;
  const { plan_type, subscription_period } = req.body;
  if (!['Full Digital', 'Expert'].includes(plan_type)) {
    return res.status(400).json({ status: 'error', message: 'Plan inválido.' });
  }
  try {
    const period = subscription_period || 'monthly';
    const expires = new Date();
    expires.setDate(expires.getDate() + (period === 'annual' ? 365 : 30));
    const result = await query(
      `UPDATE tenants SET plan_type=$1, subscription_period=$2, subscription_expires_at=$3
       WHERE id=$4 RETURNING id, name, plan_type`,
      [plan_type, period, expires, id]
    );
    if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Tenant no encontrado.' });
    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── Precios de planes ────────────────────────────────────────────────────────
export const getPlanPrices = async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM gastrored_config');
    const cfg = Object.fromEntries(result.rows.map(r => [r.key, r.value]));
    res.json({
      status: 'success', data: {
        'Full Digital': {
          monthly: parseInt(cfg.price_full_digital_monthly || '60000'),
          annual: parseInt(cfg.price_full_digital_annual || '600000'),
        },
        'Expert': {
          monthly: parseInt(cfg.price_expert_monthly || '100000'),
          annual: parseInt(cfg.price_expert_annual || '1000000'),
        },
      }
    });
  } catch {
    res.json({ status: 'success', data: { 'Full Digital': { monthly: 60000, annual: 600000 }, 'Expert': { monthly: 100000, annual: 1000000 } } });
  }
};

// ── Configuración global de GastroRed ────────────────────────────────────────
export const getGastroRedConfig = async (req, res) => {
  try {
    const result = await query('SELECT key, value FROM gastrored_config ORDER BY key');
    const config = Object.fromEntries(result.rows.map(r => [r.key, r.value]));
    if (config.mp_access_token && config.mp_access_token.length > 8) {
      config.mp_access_token_masked = config.mp_access_token.slice(0, 6) + '••••••••' + config.mp_access_token.slice(-4);
    } else {
      config.mp_access_token_masked = config.mp_access_token ? '••••••••' : '';
    }
    config.mp_token_from_env = !!(process.env.GASTRORED_MP_ACCESS_TOKEN && !config.mp_access_token?.trim());
    res.json({ status: 'success', data: config });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

export const updateGastroRedConfig = async (req, res) => {
  const allowed = [
    'mp_access_token', 'mp_sandbox_mode',
    'price_full_digital_monthly', 'price_full_digital_annual',
    'price_expert_monthly', 'price_expert_annual',
    'trial_days', 'frontend_url', 'backend_url', 'contact_email',
  ];
  try {
    const updates = [];
    for (const [key, value] of Object.entries(req.body)) {
      if (!allowed.includes(key)) continue;
      await query(
        `INSERT INTO gastrored_config (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, String(value).trim()]
      );
      updates.push(key);
    }
    if (!updates.length) return res.status(400).json({ status: 'error', message: 'No se recibió ningún campo válido.' });
    res.json({ status: 'success', message: `Configuración actualizada: ${updates.join(', ')}` });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── Toggling Custom Branding ─────────────────────────────────────────────────
export const toggleCustomBranding = async (req, res) => {
  const { id } = req.params; // tenant id
  const { enabled } = req.body;
  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ status: 'error', message: 'Se requiere el estado booleano enabled.' });
  }

  try {
    const result = await query(
      `UPDATE tenant_settings 
       SET custom_branding_enabled = $1 
       WHERE tenant_id = $2 OR tenant_id_fk = $2 
       RETURNING custom_branding_enabled`,
      [enabled, id]
    );

    if (!result.rows.length) {
      // In case tenant_settings record doesn't exist yet, insert it minimal.
      const resInsert = await query(
        `INSERT INTO tenant_settings (tenant_id, tenant_id_fk, custom_branding_enabled)
         VALUES ($1, $1, $2) RETURNING custom_branding_enabled`,
        [id, enabled]
      );
      return res.json({ status: 'success', data: resInsert.rows[0] });
    }

    res.json({ status: 'success', data: result.rows[0] });
  } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

// ── Reset de contraseña de admin de comercio (desde superadmin) ───────────────
export const resetAdminPassword = async (req, res) => {
  const { id } = req.params;  // tenant id (subdomain)
  const { new_password } = req.body;

  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ status: 'error', message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    // Buscar usuario admin de este tenant
    const userRes = await query(
      `SELECT u.id, u.email, u.name FROM users u
       WHERE u.role = 'admin' AND (u.tenant_id = $1 OR u.store_id = (SELECT id FROM stores WHERE tenant_id = $1 LIMIT 1))
       ORDER BY u.id ASC LIMIT 1`,
      [id]
    );

    if (!userRes.rows.length) {
      return res.status(404).json({ status: 'error', message: 'No se encontró un usuario administrador para este comercio.' });
    }

    const adminUser = userRes.rows[0];
    const password_hash = await bcrypt.hash(new_password, 12);

    await query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [password_hash, adminUser.id]);

    console.log(`[SUPERADMIN] Contraseña reseteada para admin ${adminUser.email} del tenant ${id}`);

    res.json({
      status: 'success',
      message: `Contraseña del admin "${adminUser.email}" actualizada correctamente.`,
      data: { admin_email: adminUser.email, admin_name: adminUser.name },
    });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
};
