import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'voraz_secret_key';
const TOKEN_EXPIRY = '30d';

const generateToken = (user) =>
    jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });

export const register = async (req, res) => {
    const { email, password, name, phone } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ status: 'error', message: 'Email, contraseña y nombre son requeridos.' });
    }
    try {
        const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length) {
            return res.status(409).json({ status: 'error', message: 'El email ya está registrado.' });
        }
        const password_hash = await bcrypt.hash(password, 10);
        const result = await query(
            `INSERT INTO users (email, password_hash, name, phone, points)
             VALUES ($1, $2, $3, $4, 50) RETURNING id, email, name, phone, avatar_url, points, created_at`,
            [email, password_hash, name, phone || null]
        );
        const user = result.rows[0];
        await query(
            `INSERT INTO points_history (user_id, points, type, description) VALUES ($1, 50, 'bonus', '¡Bienvenido al Voraz Club!')`,
            [user.id]
        );
        res.status(201).json({ status: 'success', data: { token: generateToken(user), user } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ status: 'error', message: 'Email y contraseña requeridos.' });
    }
    try {
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (!result.rows.length) {
            return res.status(401).json({ status: 'error', message: 'Credenciales inválidas.' });
        }
        const user = result.rows[0];
        if (!user.password_hash) {
            return res.status(401).json({ status: 'error', message: 'Esta cuenta usa Google para iniciar sesión.' });
        }
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
            'SELECT id, email, name, phone, avatar_url, points, created_at FROM users WHERE id = $1',
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
        const existing = await query(
            'SELECT id, email, name, phone, points FROM users WHERE google_id = $1 OR email = $2',
            [google_id, email]
        );
        let user;
        if (existing.rows.length) {
            await query(
                'UPDATE users SET google_id = $1, avatar_url = $2, updated_at = NOW() WHERE id = $3',
                [google_id, avatar_url, existing.rows[0].id]
            );
            user = existing.rows[0];
        } else {
            const result = await query(
                `INSERT INTO users (email, name, google_id, avatar_url, points)
                 VALUES ($1, $2, $3, $4, 50) RETURNING id, email, name, phone, points`,
                [email, profile.displayName, google_id, avatar_url]
            );
            user = result.rows[0];
            await query(
                `INSERT INTO points_history (user_id, points, type, description) VALUES ($1, 50, 'bonus', '¡Bienvenido al Voraz Club!')`,
                [user.id]
            );
        }
        const token = generateToken(user);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}?token=${token}`);
    } catch {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}?auth_error=true`);
    }
};
