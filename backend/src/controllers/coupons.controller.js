import { query } from '../config/db.js';
import { getStoreId } from '../utils/tenant.js';

const fmt = (n) => parseInt(n).toLocaleString('es-AR');

export const validateCoupon = async (req, res) => {
    const { code, order_total } = req.body;
    const storeId = await getStoreId(req);
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
        const storeId = await getStoreId(req);
        const result = await query('SELECT id, code, description, discount_type, discount_value, min_order, max_uses, used_count, expires_at, active FROM coupons WHERE store_id = $1 ORDER BY created_at DESC', [storeId]);
        res.json({ status: 'success', data: result.rows });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const createCoupon = async (req, res) => {
    const storeId = await getStoreId(req);
    const { code, description, discount_type, discount_value, min_order, max_uses, expires_at } = req.body;
    if (!code || !discount_type || !discount_value) {
        return res.status(400).json({ status: 'error', message: 'code, discount_type y discount_value son requeridos.' });
    }
    try {
        const result = await query(
            `INSERT INTO coupons (code, description, discount_type, discount_value, min_order, max_uses, expires_at, active, store_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8) RETURNING *`,
            [code.toUpperCase(), description || '', discount_type, discount_value, min_order || 0, max_uses || null, expires_at || null, storeId]
        );
        res.json({ status: 'success', data: result.rows[0] });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
