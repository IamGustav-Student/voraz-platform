import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { query, testConnection } from './config/db.js';
import dotenv from 'dotenv';
import { runMigrations } from './utils/migrations.js';

dotenv.config();

// Ejecutar migraciones automáticas al iniciar
runMigrations().catch(e => console.error('[MIGRATOR] Critical error:', e.message));

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
import promosRoutes from './routes/promos.routes.js';

import { tenantMiddleware } from './middleware/tenant.middleware.js';
import { getTenantId } from './utils/tenant.js';

// ── Validación de Entorno Crítica ──────────────────────────────────────────
if (!process.env.JWT_SECRET) {
    console.error('🔴 ERROR CRÍTICO: JWT_SECRET no definidio. El sistema no puede iniciar por seguridad.');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Seguridad Global ────────────────────────────────────────────────────────
app.set('trust proxy', 1); 
app.use(helmet()); 
app.use(morgan('dev'));

const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 300, 
    message: { status: 'error', message: 'Demasiadas peticiones. Intentá de nuevo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.method === 'OPTIONS' || req.path.startsWith('/api/superadmin'),
});
app.use('/api/', globalLimiter);

const rootDomain = process.env.GASTRORED_ROOT_DOMAIN || 'gastrored.com.ar';
app.use(cors({
    origin: (origin, callback) => {
        // Permitir peticiones sin origen (como apps móviles o curl si se desea, 
        // pero aquí restringimos a web por seguridad del SaaS)
        if (!origin) return callback(null, true);

        const isAllowed = 
            origin.includes('localhost') || 
            origin.includes('127.0.0.1') || 
            origin.endsWith(rootDomain) ||
            origin.endsWith('vercel.app');

        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`[CORS Blocked] Origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-tenant-id', 'x-store-domain']
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

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

app.get('/api/debug-config', async (req, res) => {
    try {
        const result = await query('SELECT key, value FROM gastrored_config');
        res.json({ 
            status: 'success', 
            database: 'Connected',
            config: Object.fromEntries(result.rows.map(r => [r.key, r.value]))
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/debug-base-store', async (req, res) => {
    try {
        const products = await query('SELECT id, name, image_url FROM products WHERE store_id = 1');
        const categories = await query('SELECT id, name, image_url FROM categories WHERE store_id = 1');
        res.json({ 
            status: 'success', 
            products: products.rows,
            categories: categories.rows
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/run-migrations-manual', async (req, res) => {
    try {
        await runMigrations();
        res.json({ status: 'success', message: 'Sistema de migraciones ejecutado manualmente.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.use('/api/superadmin', superadminRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

app.get('/api/tenant-check', tenantMiddleware, (req, res) => {
    res.json({
        is_landing: req.isLanding === true,
        has_tenant: !!req.tenant,
        store: req.tenant ? {
            id: req.tenant.id,
            brand_name: req.tenant.brand_name,
            subdomain: req.tenant.subdomain,
            status: req.tenant.status,
            whatsapp: req.tenant.whatsapp,
            address: req.tenant.address,
        } : null,
    });
});

app.get('/api/manifest', async (req, res) => {
    const host = (req.headers['x-store-domain'] || req.headers.host || '').split(':')[0].toLowerCase();
    const rootDomain = process.env.GASTRORED_ROOT_DOMAIN || 'gastrored.com.ar';
    const GASTRORED_ROOT_DOMAINS = ['gastrored.com.ar', 'www.gastrored.com.ar', rootDomain].map(d => d.toLowerCase());

    try {
        let queryStr, params;
        if (GASTRORED_ROOT_DOMAINS.includes(host)) {
            queryStr = `
                SELECT t.brand_name, 
                       COALESCE(ts.primary_color, t.brand_color_primary) as brand_color_primary,
                       COALESCE(ts.logo_url, t.brand_logo_url) as brand_logo_url,
                       t.slogan, ts.custom_branding_enabled
                FROM tenants t
                LEFT JOIN tenant_settings ts ON ts.tenant_id_fk = t.id
                WHERE t.id = '1' OR t.subdomain = 'voraz' LIMIT 1`;
            params = [];
        } else {
            queryStr = `
                SELECT t.brand_name, 
                       COALESCE(ts.primary_color, t.brand_color_primary) as brand_color_primary,
                       COALESCE(ts.logo_url, t.brand_logo_url) as brand_logo_url,
                       t.slogan, ts.custom_branding_enabled
                FROM tenants t
                LEFT JOIN tenant_settings ts ON ts.tenant_id_fk = t.id
                WHERE t.custom_domain=$1 OR t.subdomain=$1 OR t.id::text=$1 LIMIT 1`;
            params = [host.replace(`.${rootDomain}`, '')];
        }

        const result = await query(queryStr, params);
        const s = result.rows[0] || {};
        const name = s.brand_name || 'GastroRed';
        const color = s.brand_color_primary || '#E30613';
        const isRoot = GASTRORED_ROOT_DOMAINS.includes(host);
        const iconUrl = (s.custom_branding_enabled && s.brand_logo_url)
            ? s.brand_logo_url
            : (isRoot ? '/vite.svg' : '/images/logo_voraz.jpg');

        const isSvg = iconUrl.toLowerCase().endsWith('.svg');
        const iconType = isSvg ? 'image/svg+xml' : (iconUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg');

        res.setHeader('Content-Type', 'application/manifest+json');
        res.json({
            name,
            short_name: name,
            description: s.slogan || `${name} — Tu plataforma gastronómica inteligente.`,
            start_url: '/',
            display: 'standalone',
            background_color: '#080C12',
            theme_color: color,
            orientation: 'portrait',
            categories: ['food', 'shopping', 'business'],
            lang: 'es-AR',
            icons: [
                { 
                    src: iconUrl, 
                    sizes: isSvg ? 'any' : '192x192', 
                    type: iconType,
                    purpose: 'any maskable'
                },
                { 
                    src: iconUrl, 
                    sizes: isSvg ? 'any' : '512x512', 
                    type: iconType 
                },
            ],
            shortcuts: [
                {
                    name: "Ver Mi Pedido",
                    short_name: "Pedidos",
                    url: "/tracking",
                    icons: [{ src: iconUrl, sizes: "192x192" }]
                },
                {
                    name: "Explorar Menú",
                    short_name: "Menú",
                    url: "/",
                    icons: [{ src: iconUrl, sizes: "192x192" }]
                }
            ],
            screenshots: [
                {
                    src: "/images/gallery/dashboard.jpg",
                    sizes: "1280x720",
                    type: "image/jpeg",
                    form_factor: "wide",
                    label: "Panel de Control Inteligente"
                },
                {
                    src: "/images/gallery/menu_items.jpg",
                    sizes: "720x1280",
                    type: "image/jpeg",
                    form_factor: "narrow",
                    label: "Menú Digital Interactivo"
                }
            ]
        });
    } catch (err) {
        res.json({ name: 'GastroRed', short_name: 'GastroRed', theme_color: '#E30613' });
    }
});

app.get('/api/settings', tenantMiddleware, async (req, res) => {
    const tenantId = getTenantId(req);
    try {
        const result = await query(
            `SELECT t.id, ts.cash_on_delivery, ts.orders_paused, t.slogan, t.plan_type, t.subdomain,
                    COALESCE(ts.primary_color, t.brand_color_primary) as brand_color_primary,
                    COALESCE(ts.secondary_color, t.brand_color_secondary) as brand_color_secondary,
                    COALESCE(ts.logo_url, t.brand_logo_url) as brand_logo_url,
                    t.brand_name,
                    t.brand_favicon_url,
                    ts.primary_color, ts.secondary_color, ts.font_family, ts.logo_url as ts_logo_url, ts.custom_branding_enabled,
                    ts.loyalty_enabled, ts.points_redeem_value, t.status, t.whatsapp, t.address
             FROM tenants t
             LEFT JOIN tenant_settings ts ON ts.tenant_id_fk = t.id
             WHERE t.id::text = $1::text OR t.subdomain = $1::text`,
            [String(tenantId)]
        );
        const cfg = result.rows[0] || {};
        res.json({
            status: 'success',
            data: {
                id: cfg.id || tenantId,
                cash_on_delivery: cfg.cash_on_delivery !== false,
                orders_paused: !!cfg.orders_paused,
                brand_name: cfg.brand_name || 'GastroRed',
                brand_color_primary: cfg.brand_color_primary || '#E30613',
                brand_color_secondary: cfg.brand_color_secondary || '#1A1A1A',
                brand_logo_url: cfg.brand_logo_url || null,
                slogan: cfg.slogan || null,
                plan_type: cfg.plan_type || 'Full Digital',
                subdomain: cfg.subdomain || null,
                custom_branding_enabled: !!cfg.custom_branding_enabled || 
                                         (cfg.plan_type && (cfg.plan_type.toLowerCase().trim() === 'expert' || cfg.plan_type.toLowerCase().trim() === 'full digital')),
                loyalty_enabled: !!cfg.loyalty_enabled,
                points_redeem_value: cfg.points_redeem_value || 0,
                status: cfg.status || 'active',
                whatsapp: cfg.whatsapp || '',
                address: cfg.address || '',
            }
        });
    } catch {
        res.json({ status: 'success', data: { cash_on_delivery: true, orders_paused: false, brand_name: 'GastroRed' } });
    }
});

app.use('/api/products', tenantMiddleware, productsRoutes);
app.use('/api/community', tenantMiddleware, communityRoutes);
app.use('/api/promos', tenantMiddleware, promosRoutes);
app.use('/api/stores', tenantMiddleware, storesRoutes);
app.use('/api/news', tenantMiddleware, newsRoutes);
app.use('/api/orders', tenantMiddleware, ordersRoutes);
app.use('/api/payments', tenantMiddleware, paymentsRoutes);
app.use('/api/auth', tenantMiddleware, authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/coupons', tenantMiddleware, couponsRoutes);
app.use('/api/admin', tenantMiddleware, adminRoutes);


app.listen(PORT, async () => {
    console.log(`\n🚀 GastroRed API corriendo en http://localhost:${PORT}`);
    const dbOk = await testConnection();
    if (!dbOk) return;

    // Fuerza la eliminación de la restricción que rompe el multi-local de MercadoPago
    try { 
        await query('ALTER TABLE tenant_settings DROP CONSTRAINT IF EXISTS tenant_settings_tenant_id_key'); 
    } catch(e) { console.error('Error dropeando constraint:', e.message); }

});
