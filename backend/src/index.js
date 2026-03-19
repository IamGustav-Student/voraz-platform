import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
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
import promosRoutes from './routes/promos.routes.js';

import { tenantMiddleware } from './middleware/tenant.middleware.js';
import { getTenantId } from './utils/tenant.js';

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Seguridad Global ────────────────────────────────────────────────────────
app.set('trust proxy', 1); // Confiar en el proxy (Railway/Vercel) para rate-limit
app.use(helmet()); 
app.use(morgan('dev'));

// Rate limiting global: 300 peticiones cada 15 minutos por IP (suficiente para el admin panel)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 300, 
    message: { status: 'error', message: 'Demasiadas peticiones. Intentá de nuevo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
    // Saltar preflight CORS (OPTIONS) y superadmin — los OPTIONS no son requests reales del usuario
    skip: (req) => req.method === 'OPTIONS' || req.path.startsWith('/api/superadmin'),
});
app.use('/api/', globalLimiter);

// CORS dinámico para soportar subdomains del SaaS
const rootDomain = process.env.GASTRORED_ROOT_DOMAIN || 'gastrored.com.ar';
app.use(cors({
    origin: (origin, callback) => {
        // Permitir si no hay origin (ej. mobile app o server-to-server) 
        // o si coincide con localhost o con el dominio raíz y sus subdominios
        if (!origin || 
            origin.includes('localhost') || 
            origin.includes('127.0.0.1') || 
            origin.endsWith(rootDomain) ||
            origin.endsWith('vercel.app') // Permitir despliegues de Vercel
        ) {
            callback(null, true);
        } else {
            console.warn(`[CORS Blocked] Origin: ${origin}`);
            callback(new Error('CORS no permitido'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-tenant-id', 'x-store-domain']
}));

app.use(express.json({ limit: '5mb' })); // Reducido de 15mb para prevenir DoS
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

app.get('/api/clean-db-now', async (req, res) => {
    try {
        const phase20 = fs.readFileSync(path.join(__dirname, 'db', 'phase20_clean_tenants.sql'), 'utf8');
        const phase21 = fs.readFileSync(path.join(__dirname, 'db', 'phase21_fix_constraints.sql'), 'utf8');
        await query(phase20);
        await query(phase21);
        res.json({ status: 'success', message: 'DB limpiada y constraints arreglados.' });
    } catch (e) {
        res.status(500).json({ error: e.message });
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
        has_tenant: !!req.tenant,
        store: req.tenant ? {
            id: req.tenant.id,
            brand_name: req.tenant.brand_name,
            subdomain: req.tenant.subdomain,
        } : null,
    });
});

// ── Manifest PWA dinámico ───────────────────────────────────────────────────
app.get('/api/manifest', async (req, res) => {
    const host = (req.headers['x-store-domain'] || req.headers.host || '').split(':')[0].toLowerCase();
    const rootDomain = process.env.GASTRORED_ROOT_DOMAIN || 'gastrored.com.ar';
    const GASTRORED_ROOT_DOMAINS = ['gastrored.com.ar', 'www.gastrored.com.ar', rootDomain].map(d => d.toLowerCase());

    try {
        let queryStr, params;
        
        if (GASTRORED_ROOT_DOMAINS.includes(host)) {
            // Caso root: Usar branding de Voraz (id=1 o subdomain='voraz')
            queryStr = `
                SELECT t.brand_name, 
                       COALESCE(ts.primary_color, t.brand_color_primary) as brand_color_primary,
                       COALESCE(ts.logo_url, t.brand_logo_url) as brand_logo_url,
                       t.slogan
                FROM tenants t
                LEFT JOIN tenant_settings ts ON ts.tenant_id_fk = t.id
                WHERE t.id = '1' OR t.subdomain = 'voraz' LIMIT 1`;
            params = [];
        } else {
            // Caso tenant: Extraer subdomain o usar custom_domain
            queryStr = `
                SELECT t.brand_name, 
                       COALESCE(ts.primary_color, t.brand_color_primary) as brand_color_primary,
                       COALESCE(ts.logo_url, t.brand_logo_url) as brand_logo_url,
                       t.slogan
                FROM tenants t
                LEFT JOIN tenant_settings ts ON ts.tenant_id_fk = t.id
                WHERE t.custom_domain=$1 OR t.subdomain=$1 OR t.id::text=$1 LIMIT 1`;
            params = [host.replace(`.${rootDomain}`, '')]; // Fallback simple para subdominios
        }

        const result = await query(queryStr, params);
        const s = result.rows[0] || {};
        const name = s.brand_name || 'GastroRed';
        const color = s.brand_color_primary || '#E30613';
        const logo = s.brand_logo_url || '/images/logo_voraz.jpg';

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
    } catch (err) {
        console.error('Manifest error:', err.message);
        res.json({ 
            name: 'GastroRed', 
            short_name: 'GastroRed', 
            start_url: '/', 
            display: 'standalone', 
            theme_color: '#E30613',
            icons: [{ src: '/images/logo_voraz.jpg', sizes: '192x192', type: 'image/jpeg' }]
        });
    }
});



// ── Configuración pública del tenant ─────────────────────────────────────────
app.get('/api/settings', tenantMiddleware, async (req, res) => {
    const tenantId = getTenantId(req);
    try {
        const result = await query(
            `SELECT t.id, ts.cash_on_delivery, ts.orders_paused, t.brand_name, t.brand_color_primary, t.brand_color_secondary,
                    t.brand_logo_url, t.slogan, t.plan_type, t.subdomain,
                    ts.primary_color, ts.secondary_color, ts.font_family, ts.logo_url, ts.custom_branding_enabled,
                    ts.loyalty_enabled, ts.points_redeem_value
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
                primary_color: cfg.primary_color || null,
                secondary_color: cfg.secondary_color || null,
                font_family: cfg.font_family || null,
                logo_url: cfg.logo_url || null,
                custom_branding_enabled: !!cfg.custom_branding_enabled || 
                                         (cfg.plan_type && (cfg.plan_type.toLowerCase().trim() === 'expert' || cfg.plan_type.toLowerCase().trim() === 'full digital')),
                loyalty_enabled: !!cfg.loyalty_enabled,
                points_redeem_value: cfg.points_redeem_value || 0,
            }
        });
    } catch {
        res.json({ status: 'success', data: { cash_on_delivery: true, orders_paused: false, brand_name: 'GastroRed' } });
    }
});

// ── Rutas con tenant middleware ───────────────────────────────────────────────
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

// ── Migraciones ───────────────────────────────────────────────────────────────
const runMigration = async (sqlFile) => {
    try {
        // 1. Asegurar que existe la tabla de control de migraciones
        await query(`CREATE TABLE IF NOT EXISTS system_migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) UNIQUE NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // 2. Verificar si ya se ejecutó
        const check = await query('SELECT 1 FROM system_migrations WHERE name = $1', [sqlFile]);
        if (check.rows.length > 0) {
            // Ya ejecutada, no hacer nada
            return;
        }

        // 3. Leer y ejecutar
        const sqlPath = path.join(__dirname, 'db', sqlFile);
        if (!fs.existsSync(sqlPath)) {
            console.warn(`⚠️  Archivo de migración no encontrado: ${sqlFile}`);
            return;
        }

        const sql = fs.readFileSync(sqlPath, 'utf8');
        await query(sql);
        
        // 4. Registrar éxito
        await query('INSERT INTO system_migrations (name) VALUES ($1)', [sqlFile]);
        console.log(`✅ Migración ejecutada y registrada: ${sqlFile}`);
    } catch (error) {
        const msg = error?.message || String(error);
        const isLegacyConflict = msg.includes('does not exist') || msg.includes('duplicate key') || msg.includes('already exists');
        
        if (isLegacyConflict) {
            console.warn(`⚠️  Migración ${sqlFile} falló por conflicto de esquema existente (tolerable): ${msg}. Se registra como completada para evitar bucles.`);
            try {
                await query('INSERT INTO system_migrations (name) VALUES ($1)', [sqlFile]);
            } catch (regError) {
                // Si falla el registro (ej: UNIQUE violation), ignorar, ya se intentó
            }
        } else {
            console.error(`🔴 Error crítico en migración ${sqlFile}:`, msg);
        }
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
    await runMigration('phase15_gastrored_config.sql'); // GastroRed: tabla de config global
    await runMigration('phase16_multitenant_fix.sql');  // GastroRed: fix multi-tenancy completo
    await runMigration('phase17_tenants_stores_refactor.sql'); // GastroRed: tenants=SaaS clients, stores=sucursales
    await runMigration('phase18_tenant_admin_user.sql');       // GastroRed: admin user por tenant, email único por store
    await runMigration('phase19_admin_errors_fix.sql');        // Correcciones a columnas en Categorias, Productos y Videos
    await runMigration('phase20_clean_tenants.sql');           // Elimina todos los tenants (clientes SaaS testeados) y deja base a Voraz
    await runMigration('phase21_fix_constraints.sql');         // Soluciona conflictos UNIQUE entre tenants
    await runMigration('phase22_products_stock.sql');
    await runMigration('phase23_products_stock_column.sql');
    await runMigration('phase24_loyalty_system.sql');
    await runMigration('phase25_loyalty_fix.sql');
    await runMigration('phase26_welcome_bonus.sql');
    await runMigration('phase27_promos.sql');
    await runMigration('phase28_loyalty_fix.sql');    // Fidelización: fix CHECK constraint, sync tenant_id_fk, default points
    await runMigration('phase29_password_reset.sql');  // Password reset tokens table
    await runMigration('phase30_orders_paused.sql');    // Pausa de recepción de pedidos por comercio
});
