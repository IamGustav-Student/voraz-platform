import { query } from '../config/db.js';

export const getPointsHistory = async (req, res) => {
    const userId = parseInt(req.params.id);
    if (req.user.id !== userId) {
        return res.status(403).json({ status: 'error', message: 'No autorizado.' });
    }
    try {
        const [historyRes, userRes] = await Promise.all([
            query('SELECT * FROM points_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30', [userId]),
            query('SELECT points FROM users WHERE id = $1', [userId])
        ]);
        res.json({
            status: 'success',
            data: { points: userRes.rows[0]?.points || 0, history: historyRes.rows }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const updateProfile = async (req, res) => {
    const { name, phone } = req.body;
    try {
        const result = await query(
            `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone), updated_at = NOW()
             WHERE id = $3 RETURNING id, email, name, phone, avatar_url, points`,
            [name, phone, req.user.id]
        );
        res.json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const getUserOrders = async (req, res) => {
    const userId = parseInt(req.params.id);
    if (req.user.id !== userId) {
        return res.status(403).json({ status: 'error', message: 'No autorizado.' });
    }
    try {
        const result = await query(
            `SELECT id, order_type, status, total, discount, payment_status, points_earned, created_at
             FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 15`,
            [userId]
        );
        res.json({ status: 'success', data: result.rows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
