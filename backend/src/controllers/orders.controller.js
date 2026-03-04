import { query } from '../config/db.js';

const POINTS_PER_100_ARS = 1;

const calcPoints = (total) => Math.floor(parseFloat(total) / 100) * POINTS_PER_100_ARS;

export const createOrder = async (req, res) => {
    const {
        customer_name, customer_phone, order_type,
        delivery_address, store_id, items, notes, total,
        user_id, coupon_id, discount, points_redeemed, payment_method
    } = req.body;

    if (!customer_name || !customer_phone || !order_type || !items?.length || total == null) {
        return res.status(400).json({ status: 'error', message: 'Datos incompletos.' });
    }
    if (order_type === 'delivery' && !delivery_address) {
        return res.status(400).json({ status: 'error', message: 'Dirección de entrega requerida.' });
    }
    if (order_type === 'pickup' && !store_id) {
        return res.status(400).json({ status: 'error', message: 'Sucursal requerida para retiro.' });
    }

    const resolvedPaymentMethod = payment_method === 'cash' ? 'cash' : 'mercadopago';
    const finalTotal = Math.max(0, parseFloat(total) - (parseFloat(discount) || 0) - ((points_redeemed || 0) * 5));
    const pointsEarned = calcPoints(finalTotal);

    try {
        const orderResult = await query(
            `INSERT INTO orders
             (customer_name, customer_phone, order_type, delivery_address, store_id, total, notes,
              user_id, coupon_id, discount, points_earned, points_redeemed, payment_method)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
            [
                customer_name, customer_phone, order_type,
                delivery_address || null, store_id || null, finalTotal, notes || null,
                user_id || null, coupon_id || null,
                discount || 0, pointsEarned, points_redeemed || 0, resolvedPaymentMethod
            ]
        );
        const order = orderResult.rows[0];

        for (const item of items) {
            await query(
                `INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, notes, subtotal)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [order.id, item.product_id, item.product_name, item.product_price, item.quantity, item.notes || null, item.subtotal]
            );
        }

        if (coupon_id) {
            await query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1', [coupon_id]);
            await query(
                'INSERT INTO coupon_uses (coupon_id, user_id, order_id) VALUES ($1, $2, $3)',
                [coupon_id, user_id || null, order.id]
            );
        }

        if (user_id) {
            if (points_redeemed > 0) {
                await query('UPDATE users SET points = points - $1 WHERE id = $2', [points_redeemed, user_id]);
                await query(
                    `INSERT INTO points_history (user_id, order_id, points, type, description) VALUES ($1,$2,$3,'redeemed',$4)`,
                    [user_id, order.id, -points_redeemed, `Puntos canjeados en pedido #${order.id}`]
                );
            }
        }

        res.status(201).json({ status: 'success', data: { order_id: order.id, points_earned: pointsEarned, final_total: finalTotal } });
    } catch (error) {
        console.error('Error creando orden:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const getOrderById = async (req, res) => {
    const { id } = req.params;
    try {
        const orderResult = await query(
            `SELECT o.*, s.name as store_name
             FROM orders o LEFT JOIN stores s ON o.store_id = s.id
             WHERE o.id = $1`,
            [id]
        );
        if (!orderResult.rows.length) {
            return res.status(404).json({ status: 'error', message: 'Pedido no encontrado.' });
        }
        const itemsResult = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [id]);
        res.json({ status: 'success', data: { ...orderResult.rows[0], items: itemsResult.rows } });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ status: 'error', message: 'Estado inválido.' });
    }

    try {
        const result = await query(
            'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, id]
        );
        if (!result.rows.length) {
            return res.status(404).json({ status: 'error', message: 'Pedido no encontrado.' });
        }
        const order = result.rows[0];

        if (status === 'delivered' && order.user_id && order.points_earned > 0) {
            const already = await query(
                `SELECT id FROM points_history WHERE order_id = $1 AND type = 'earned'`,
                [id]
            );
            if (!already.rows.length) {
                await query('UPDATE users SET points = points + $1 WHERE id = $2', [order.points_earned, order.user_id]);
                await query(
                    `INSERT INTO points_history (user_id, order_id, points, type, description) VALUES ($1,$2,$3,'earned',$4)`,
                    [order.user_id, id, order.points_earned, `Puntos ganados por pedido #${id}`]
                );
            }
        }

        res.json({ status: 'success', data: order });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
