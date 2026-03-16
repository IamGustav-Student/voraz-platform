import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'gastrored_dev_secret_ONLY_LOCAL';
const TOKEN_EXPIRY = '24h';

const generateToken = (user) =>
    jwt.sign({ id: user.id, email: user.email, name: user.name, role: user.role || 'user', store_id: user.store_id, tenant_id: user.tenant_id }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

/**
 * Retorna { tenantId, storeId } para queries de usuarios.
 * - req.tenant.id es siempre el subdomain VARCHAR (ej: 'comercio4')
 * - usuarios antiguos pueden tener solo store_id (INT)
 * Usamos tenant_id cuando existe, soportando también store_id heredado.
 */
const getAuthContext = (req) => {
    const tenant = req.tenant || req.store;
    const rawId = tenant?.id;
    // Si el rawId es solo dígitos, es un INT (legacy store_id sin refactor)
    const isNumeric = /^\d+$/.test(String(rawId || ''));
    return {
        tenantId: isNumeric ? null : (rawId || null),
        storeId: isNumeric ? parseInt(rawId) : null,
    };
};

export const register = async (req, res) => {
    const { email, password, name, phone } = req.body;
    const { tenantId, storeId } = getAuthContext(req);
    const storeName = req.tenant?.brand_name || req.store?.brand_name || 'la plataforma';
    if (!email || !password || !name) return res.status(400).json({ status: 'error', message: 'Email, contraseña y nombre son requeridos.' });
    try {
        // Consultar configuración de fidelización para este tenant/store
        const settingsRes = await query(
            tenantId 
                ? 'SELECT loyalty_enabled, welcome_bonus_points FROM tenant_settings WHERE tenant_id_fk = $1'
                : 'SELECT loyalty_enabled, welcome_bonus_points FROM tenant_settings WHERE store_id = $1',
            [tenantId || storeId]
        );
        const settings = settingsRes.rows[0] || { loyalty_enabled: false, welcome_bonus_points: 0 };
        const initialPoints = settings.loyalty_enabled ? (settings.welcome_bonus_points || 0) : 0;

        // Verificar duplicado por tenant_id o store_id
        const dupQuery = tenantId
            ? 'SELECT id FROM users WHERE email = $1 AND tenant_id = $2'
            : 'SELECT id FROM users WHERE email = $1 AND store_id = $2';
        const existing = await query(dupQuery, [email, tenantId || storeId]);
        if (existing.rows.length) return res.status(409).json({ status: 'error', message: 'El email ya está registrado.' });

        const password_hash = await bcrypt.hash(password, 12);

        let result;
        if (tenantId) {
            // Arquitectura nueva: buscar store_id numérico desde stores
            const storeRow = await query('SELECT id FROM stores WHERE tenant_id = $1 LIMIT 1', [tenantId]);
            const numericStoreId = storeRow.rows[0]?.id || null;
            result = await query(
                `INSERT INTO users (email, password_hash, name, phone, points, tenant_id, store_id)
                 VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, email, name, phone, avatar_url, points, role, store_id, tenant_id, created_at`,
                [email, password_hash, name, phone || null, initialPoints, tenantId, numericStoreId]
            );
        } else {
            result = await query(
                `INSERT INTO users (email, password_hash, name, phone, points, store_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, email, name, phone, avatar_url, points, role, store_id, created_at`,
                [email, password_hash, name, phone || null, initialPoints, storeId]
            );
        }
        const user = result.rows[0];

        if (initialPoints > 0) {
            await query(
                `INSERT INTO points_history (user_id, points, type, description) VALUES ($1, $2, 'bonus', $3)`,
                [user.id, initialPoints, `¡Bienvenido a ${storeName}! Bonus inicial.`]
            );
        }
        res.status(201).json({ status: 'success', data: { token: generateToken(user), user } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    const { tenantId, storeId } = getAuthContext(req);
    if (!email || !password) return res.status(400).json({ status: 'error', message: 'Email y contraseña requeridos.' });
    try {
        // Buscar por tenant_id (nuevo) o store_id (heredado)
        const loginQuery = tenantId
            ? `SELECT * FROM users WHERE email = $1 AND (tenant_id = $2 OR store_id = (SELECT id FROM stores WHERE tenant_id = $2 LIMIT 1))`
            : `SELECT * FROM users WHERE email = $1 AND store_id = $2`;
        const result = await query(loginQuery, [email, tenantId || storeId]);
        if (!result.rows.length) return res.status(401).json({ status: 'error', message: 'Credenciales inválidas.' });
        const user = result.rows[0];
        if (!user.password_hash) return res.status(401).json({ status: 'error', message: 'Esta cuenta usa Google para iniciar sesión.' });
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ status: 'error', message: 'Credenciales inválidas.' });
        const { password_hash, ...safeUser } = user;
        res.json({ status: 'success', data: { token: generateToken(safeUser), user: safeUser } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const me = async (req, res) => {
    try {
        const result = await query(
            'SELECT id, email, name, phone, avatar_url, points, role, store_id, tenant_id, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
        res.json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const googleCallback = async (req, res) => {
    const profile = req.user;
    const email = profile.emails[0].value;
    const avatar_url = profile.photos[0]?.value || null;
    const google_id = profile.id;
    try {
        const existing = await query('SELECT id, email, name, phone, points, role, store_id, tenant_id FROM users WHERE google_id = $1 OR email = $2', [google_id, email]);
        let user;
        if (existing.rows.length) {
            await query('UPDATE users SET google_id = $1, avatar_url = $2, updated_at = NOW() WHERE id = $3', [google_id, avatar_url, existing.rows[0].id]);
            user = existing.rows[0];
        } else {
            // Consultar configuración de fidelización para el store_id 1 (default en Google callback por ahora)
            // Nota: En una arquitectura multi-tenant completa, el store_id debería venir del contexto del request
            const settingsRes = await query('SELECT loyalty_enabled, welcome_bonus_points FROM tenant_settings WHERE store_id = 1');
            const settings = settingsRes.rows[0] || { loyalty_enabled: false, welcome_bonus_points: 0 };
            const initialPoints = settings.loyalty_enabled ? (settings.welcome_bonus_points || 0) : 0;

            const result = await query(
                `INSERT INTO users (email, name, google_id, avatar_url, points, store_id) VALUES ($1,$2,$3,$4,$5,1) RETURNING id, email, name, phone, points, role, store_id`,
                [email, profile.displayName, google_id, avatar_url, initialPoints]
            );
            user = result.rows[0];

            if (initialPoints > 0) {
                await query(
                    `INSERT INTO points_history (user_id, points, type, description) VALUES ($1, $2, 'bonus', $3)`,
                    [user.id, initialPoints, '¡Bienvenido! Bonus por registro con Google.']
                );
            }
        }
        const token = generateToken(user);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}?token=${token}`);
    } catch (err) {
        console.error('Error en Google callback:', err);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}?auth_error=true`);
    }
};
