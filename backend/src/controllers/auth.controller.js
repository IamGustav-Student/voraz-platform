import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../config/db.js';
import { sendPasswordResetEmail } from '../utils/mailer.js';

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

// ── RECUPERACIÓN DE CONTRASEÑA ─────────────────────────────────────────────

/**
 * POST /api/auth/forgot-password
 * Genera un token temporal y envía email de recuperación.
 * Siempre responde 200 para no revelar si el email existe.
 */
export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ status: 'error', message: 'Email requerido.' });

    const { tenantId, storeId } = getAuthContext(req);

    try {
        // Buscar usuario (cualquier rol) en el tenant actual
        const userQuery = tenantId
            ? `SELECT id, email, name FROM users WHERE LOWER(email)=LOWER($1) AND (tenant_id=$2 OR store_id=(SELECT id FROM stores WHERE tenant_id=$2 LIMIT 1)) LIMIT 1`
            : `SELECT id, email, name FROM users WHERE LOWER(email)=LOWER($1) AND store_id=$2 LIMIT 1`;
        const userRes = await query(userQuery, [email, tenantId || storeId]);

        if (userRes.rows.length) {
            const user = userRes.rows[0];

            // Generar token aleatorio seguro y su hash para guardar en BD
            const rawToken = crypto.randomBytes(32).toString('hex');
            const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

            // Invalidar tokens anteriores de este usuario
            await query('UPDATE password_reset_tokens SET used=true WHERE user_id=$1 AND used=false', [user.id]);

            // Guardar nuevo token
            await query(
                'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,$3)',
                [user.id, tokenHash, expiresAt]
            );

            // Construir URL de reset
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const resetUrl = `${frontendUrl}?reset_token=${rawToken}`;

            const brandName = req.tenant?.brand_name || req.store?.brand_name || 'GastroRed';

            const result = await sendPasswordResetEmail({ to: user.email, resetUrl, brandName, rawToken });

            // En modo dev (sin SMTP) devolvemos el token para que se pueda probar
            if (!result.sent && result.devToken) {
                return res.json({
                    status: 'success',
                    message: 'Si el email existe, recibirás un link de recuperación.',
                    _dev_token: result.devToken,
                    _dev_reset_url: resetUrl,
                });
            }
        }

        // Siempre 200 para no revelar si el email existe
        res.json({ status: 'success', message: 'Si el email existe, recibirás un link de recuperación.' });
    } catch (error) {
        console.error('[forgotPassword]', error.message);
        res.status(500).json({ status: 'error', message: 'Error al procesar la solicitud.' });
    }
};

/**
 * POST /api/auth/reset-password
 * Valida el token y actualiza la contraseña del usuario.
 */
export const resetPassword = async (req, res) => {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
        return res.status(400).json({ status: 'error', message: 'Token y nueva contraseña requeridos.' });
    }
    if (new_password.length < 6) {
        return res.status(400).json({ status: 'error', message: 'La contraseña debe tener al menos 6 caracteres.' });
    }

    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        const tokenRes = await query(
            `SELECT prt.id, prt.user_id, prt.expires_at, prt.used
             FROM password_reset_tokens prt
             WHERE prt.token_hash = $1
             LIMIT 1`,
            [tokenHash]
        );

        if (!tokenRes.rows.length) {
            return res.status(400).json({ status: 'error', message: 'Token inválido o expirado.' });
        }

        const tokenRow = tokenRes.rows[0];

        if (tokenRow.used) {
            return res.status(400).json({ status: 'error', message: 'Este link ya fue utilizado. Solicitá uno nuevo.' });
        }

        if (new Date(tokenRow.expires_at) < new Date()) {
            return res.status(400).json({ status: 'error', message: 'El link expiró. Solicitá uno nuevo.' });
        }

        // Hash de la nueva contraseña
        const password_hash = await bcrypt.hash(new_password, 12);

        // Actualizar contraseña del usuario
        await query('UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [password_hash, tokenRow.user_id]);

        // Marcar token como usado
        await query('UPDATE password_reset_tokens SET used=true WHERE id=$1', [tokenRow.id]);

        res.json({ status: 'success', message: 'Contraseña actualizada correctamente. Ya podés iniciar sesión.' });
    } catch (error) {
        console.error('[resetPassword]', error.message);
        res.status(500).json({ status: 'error', message: 'Error al restablecer la contraseña.' });
    }
};
