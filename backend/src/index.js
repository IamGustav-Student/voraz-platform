import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, testConnection } from './config/db.js';

import productsRoutes from './routes/products.routes.js';
import communityRoutes from './routes/community.routes.js';
import storesRoutes from './routes/stores.routes.js';
import newsRoutes from './routes/news.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import couponsRoutes from './routes/coupons.routes.js';
import adminRoutes from './routes/admin.routes.js';
import superadminRoutes from './routes/superadmin.routes.js';
import subscriptionRoutes from './routes/subscriptions.routes.js';

import { tenantMiddleware } from './middleware/tenant.middleware.js';

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(morgan('dev'));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-tenant-id, x-store-domain');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.get('/', (req, res) => {
    res.json({ message: '🍔 GastroRed API — SaaS Multi-tenant' });
});

app.get('/api/test-db', async (req, res) => {
    try {
        const result = await query('SELECT NOW()');
        res.json({ status: 'success', time: result.rows[0].now });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── Rutas sin tenant middleware ──────────────────────────────────────────────
app.use('/api/superadmin', superadminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// ── Tenant check (antes del middleware \u2014 sin bloquear) ───────────────────────
// El frontend lo llama para saber si debe mostrar la landing de GastroRed
app.get('/api/tenant-check', tenantMiddleware, (req, res) => {
    res.json({
        is_landing: req.isLanding === true,
        has_tenant: !!req.store,
        store: req.store ? {
            id: req.store.id,
            brand_name: req.store.brand_name,
            subdomain: req.store.subdomain,
        } : null,
    });
});


// ── Manifest PWA dinámico (necesita host pero no bloquea si no encuentra) ────
app.get('/api/manifest', async (req, res) => {
    const host = (req.headers['x-store-domain'] || req.headers.host || '').split(':')[0].toLowerCase();
    try {
        const result = await query(
            'SELECT brand_name, brand_color_primary, brand_logo_url, brand_favicon_url, slogan FROM stores WHERE custom_domain=$1 OR subdomain=$1 LIMIT 1',
            [host]
        );
        const s = result.rows[0] || {};
        const name = s.brand_name || 'GastroRed';
        const color = s.brand_color_primary || '#E30613';
        const logo = s.brand_logo_url || '/icons/icon-192.png';
        res.setHeader('Content-Type', 'application/manifest+json');
        res.json({
            name,
            short_name: name,
            description: s.slogan || `${name} — tu app de pedidos`,
            start_url: '/',
            display: 'standalone',
            background_color: '#000000',
            theme_color: color,
            icons: [
                { src: logo, sizes: '192x192', type: 'image/png' },
                { src: logo, sizes: '512x512', type: 'image/png' },
            ],
        });
    } catch {
        res.json({ name: 'GastroRed', short_name: 'GastroRed', start_url: '/', display: 'standalone', theme_color: '#E30613' });
    }
});

// ── Configuración pública del tenant ─────────────────────────────────────────
app.get('/api/settings', tenantMiddleware, async (req, res) => {
    const storeId = req.store?.id || 1;
    try {
        const result = await query(
            `SELECT s.id, ts.cash_on_delivery, s.brand_name, s.brand_color_primary, s.brand_color_secondary,
                    s.brand_logo_url, s.slogan, s.plan_type, s.subdomain
             FROM stores s
             LEFT JOIN tenant_settings ts ON ts.store_id = s.id
             WHERE s.id = $1`,
            [storeId]
        );
        const cfg = result.rows[0] || {};
        res.json({
            status: 'success',
            data: {
                id: cfg.id || 1,
                cash_on_delivery: cfg.cash_on_delivery !== false,
                brand_name: cfg.brand_name || 'GastroRed',
                brand_color_primary: cfg.brand_color_primary || '#E30613',
                brand_color_secondary: cfg.brand_color_secondary || '#1A1A1A',
                brand_logo_url: cfg.brand_logo_url || null,
                slogan: cfg.slogan || null,
                plan_type: cfg.plan_type || 'Full Digital',
                subdomain: cfg.subdomain || null,
            }
        });
    } catch {
        res.json({ status: 'success', data: { cash_on_delivery: true, brand_name: 'GastroRed' } });
    }
});

// ── Rutas con tenant middleware ───────────────────────────────────────────────
app.use('/api/products', tenantMiddleware, productsRoutes);
app.use('/api/community', tenantMiddleware, communityRoutes);
app.use('/api/stores', tenantMiddleware, storesRoutes);
app.use('/api/news', tenantMiddleware, newsRoutes);
app.use('/api/orders', tenantMiddleware, ordersRoutes);
app.use('/api/payments', tenantMiddleware, paymentsRoutes);
app.use('/api/auth', tenantMiddleware, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/coupons', tenantMiddleware, couponsRoutes);
app.use('/api/admin', tenantMiddleware, adminRoutes);

// ── Migraciones ───────────────────────────────────────────────────────────────
const runMigration = async (sqlFile) => {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'db', sqlFile), 'utf8');
        await query(sql);
        console.log(`✅ Migración ejecutada: ${sqlFile}`);
    } catch (error) {
        console.error(`⚠️  Error en migración ${sqlFile}:`, error?.message || String(error));
    }
};

app.listen(PORT, async () => {
    console.log(`\n🚀 GastroRed API corriendo en http://localhost:${PORT}`);
    const dbOk = await testConnection();
    if (!dbOk) {
        console.error('🔴 Sin conexión a BD. Las migraciones se saltean. Verificá DATABASE_URL en Railway → Variables.');
        return;
    }
    await runMigration('init.sql');             // categories, products (base)
    await runMigration('phase6.sql');            // influencers, videos (community)
    await runMigration('phase7_orders.sql');
    await runMigration('phase8_auth.sql');
    await runMigration('phase9_whitelabel.sql');
    await runMigration('phase10_admin.sql');
    await runMigration('phase11_tenant_settings.sql');
    await runMigration('phase12_cash_payment.sql');
    await runMigration('phase13_gastrored_saas.sql');
    await runMigration('phase14_reconcile_tenant.sql'); // GastroRed: reconcilia tenant_id → store_id
});
