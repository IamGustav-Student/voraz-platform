import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './config/db.js';

import productsRoutes from './routes/products.routes.js';
import communityRoutes from './routes/community.routes.js';
import storesRoutes from './routes/stores.routes.js';
import newsRoutes from './routes/news.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import paymentsRoutes from './routes/payments.routes.js';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';
import couponsRoutes from './routes/coupons.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(morgan('dev'));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-tenant-id');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ message: '🍔 Voraz API funcionando' });
});

app.get('/api/test-db', async (req, res) => {
    try {
        const result = await query('SELECT NOW()');
        res.json({ status: 'success', time: result.rows[0].now });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.use('/api/products', productsRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/coupons', couponsRoutes);

const runMigration = async (sqlFile) => {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'db', sqlFile), 'utf8');
        await query(sql);
        console.log(`✅ Migración ejecutada: ${sqlFile}`);
    } catch (error) {
        console.error(`⚠️  Error en migración ${sqlFile}:`, error.message);
    }
};

app.listen(PORT, async () => {
    console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
    await runMigration('phase7_orders.sql');
    await runMigration('phase8_auth.sql');
    await runMigration('phase9_whitelabel.sql');
});
