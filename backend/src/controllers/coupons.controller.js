import { query } from '../config/db.js';

const fmt = (n) => parseInt(n).toLocaleString('es-AR');

export const validateCoupon = async (req, res) => {
    const { code, order_total } = req.body;
    const storeId = req.store?.id || 1;
    if (!code) return res.status(400).json({ status: 'error', message: 'Código requerido.' });
    try {
        const result = await query(
            'SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND store_id = $2',
            [code, storeId]
        );
        if (!result.rows.length) return res.status(404).json({ status: 'error', message: 'Cupón no encontrado.' });
        const coupon = result.rows[0];
        if (!coupon.active) return res.status(400).json({ status: 'error', message: 'Este cupón no está activo.' });
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return res.status(400).json({ status: 'error', message: 'Este cupón ya expiró.' });
        if (coupon.max_uses && coupon.used_count >= coupon.max_uses) return res.status(400).json({ status: 'error', message: 'Este cupón ya alcanzó su límite de usos.' });
        if (parseFloat(order_total) < parseFloat(coupon.min_order)) return res.status(400).json({ status: 'error', message: `Pedido mínimo $${fmt(coupon.min_order)} para usar este cupón.` });
        const discount = coupon.discount_type === 'percentage'
            ? Math.round(parseFloat(order_total) * parseFloat(coupon.discount_value) / 100)
            : parseFloat(coupon.discount_value);
        res.json({ status: 'success', data: { coupon_id: coupon.id, code: coupon.code, description: coupon.description, discount_type: coupon.discount_type, discount_value: coupon.discount_value, discount } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const listCoupons = async (req, res) => {
    try {
        const storeId = req.store?.id || 1;
        const result = await query('SELECT id, code, description, discount_type, discount_value, min_order, max_uses, used_count, expires_at, active FROM coupons WHERE store_id = $1 ORDER BY created_at DESC', [storeId]);
        res.json({ status: 'success', data: result.rows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
