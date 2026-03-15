import { pool, query } from '../config/db.js';
import { getStoreId, getTenantId } from '../utils/tenant.js';

// Points helper removed as it's now per product

export const createOrder = async (req, res) => {
    const {
        customer_name, customer_phone, order_type,
        delivery_address, store_id: bodyStoreId, items, notes, total,
        user_id, points_redeemed, payment_method
    } = req.body;

    if (!customer_name || !customer_phone || !order_type || !items?.length || total == null) {
        return res.status(400).json({ status: 'error', message: 'Datos incompletos.' });
    }
    if (order_type === 'delivery' && !delivery_address) {
        return res.status(400).json({ status: 'error', message: 'Dirección de entrega requerida.' });
    }
    if (order_type === 'pickup' && !bodyStoreId) {
        return res.status(400).json({ status: 'error', message: 'Sucursal requerida para retiro.' });
    }

    const tenantStoreId = await getStoreId(req);
    const tenantId = getTenantId(req);
    let store_id = tenantStoreId;
    if (bodyStoreId != null) {
        const storeCheck = await query(
            'SELECT id FROM stores WHERE id = $1 AND CAST(tenant_id AS VARCHAR) = CAST($2 AS VARCHAR) LIMIT 1',
            [bodyStoreId, tenantId]
        );
        if (storeCheck.rows.length) store_id = storeCheck.rows[0].id;
    }

    const resolvedPaymentMethod = payment_method === 'cash' ? 'cash' : 'mercadopago';

    // ── Loyalty Config ──
    const loyaltyRes = await query(
        'SELECT loyalty_enabled, points_redeem_value FROM tenant_settings WHERE tenant_id_fk = $1',
        [tenantId]
    );
    const loyalty = loyaltyRes.rows[0] || { loyalty_enabled: false, points_redeem_value: 0 };

    let points_discount = 0;
    if (loyalty.loyalty_enabled && points_redeemed > 0) {
        // Redención en bloques de 500
        const blocks = Math.floor(points_redeemed / 500);
        points_discount = blocks * (loyalty.points_redeem_value || 0);
    }

    const finalTotal = Math.max(0, parseFloat(total) - points_discount);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Validar puntos del usuario si intenta redimir
        if (user_id && points_redeemed > 0) {
            const userRes = await client.query('SELECT points FROM users WHERE id = $1 FOR UPDATE', [user_id]);
            const userPoints = userRes.rows[0]?.points || 0;
            if (userPoints < points_redeemed) {
                await client.query('ROLLBACK');
                return res.status(400).json({ status: 'error', message: 'No tenés suficientes puntos.' });
            }
        }

        const productIds = [...new Set(items.map((i) => i.product_id))];
        if (productIds.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ status: 'error', message: 'Ítems inválidos.' });
        }

        const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
        const lockResult = await client.query(
            `SELECT id, COALESCE(stock, -1) as stock, store_id, points_earned
             FROM products
             WHERE id IN (${placeholders})
             FOR UPDATE`,
            productIds
        );
        const productsById = Object.fromEntries(lockResult.rows.map((r) => [r.id, r]));

        // Calcular puntos ganados totales basado en los productos comprados
        let totalPointsEarned = 0;
        for (const item of items) {
            const prod = productsById[item.product_id];
            if (prod) {
                totalPointsEarned += (prod.points_earned || 0) * (parseInt(item.quantity, 10) || 1);
            }
        }

        const qtyByProduct = {};
        for (const item of items) {
            const pid = item.product_id;
            const qty = parseInt(item.quantity, 10) || 0;
            qtyByProduct[pid] = (qtyByProduct[pid] || 0) + qty;
        }
        for (const [pid, totalQty] of Object.entries(qtyByProduct)) {
            const product = productsById[Number(pid)];
            if (!product) {
                await client.query('ROLLBACK');
                return res.status(400).json({ status: 'error', message: `Producto ${pid} no encontrado o no disponible.` });
            }
            if (product.store_id != null && product.store_id !== store_id) {
                await client.query('ROLLBACK');
                return res.status(403).json({ status: 'error', message: 'Producto no pertenece al comercio.' });
            }
            const productName = items.find((i) => Number(i.product_id) === Number(pid))?.product_name || `ID ${pid}`;
            if (product.stock < totalQty) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    status: 'error',
                    message: `Stock insuficiente para "${productName}". Disponible: ${product.stock}, solicitado: ${totalQty}.`,
                });
            }
        }

        const orderResult = await client.query(
            `INSERT INTO orders
             (customer_name, customer_phone, order_type, delivery_address, store_id, total, notes,
              user_id, points_earned, points_redeemed, points_discount, payment_method)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
            [
                customer_name, customer_phone, order_type,
                delivery_address || null, store_id, finalTotal, notes || null,
                user_id || null, totalPointsEarned, points_redeemed || 0, points_discount, resolvedPaymentMethod
            ]
        );
        const order = orderResult.rows[0];

        for (const item of items) {
            await client.query(
                `INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, notes, subtotal)
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [order.id, item.product_id, item.product_name, item.product_price, item.quantity, item.notes || null, item.subtotal]
            );
        }

        await client.query(
            `UPDATE products p
             SET stock = p.stock - agg.total_qty
             FROM (
                 SELECT product_id, SUM(quantity)::int AS total_qty
                 FROM order_items WHERE order_id = $1 GROUP BY product_id
             ) agg
             WHERE p.id = agg.product_id`,
            [order.id]
        );

        // Cupones eliminados; ya no se procesan aquí

        if (user_id && points_redeemed > 0) {
            await client.query('UPDATE users SET points = points - $1 WHERE id = $2', [points_redeemed, user_id]);
            await client.query(
                `INSERT INTO points_history (user_id, order_id, points, type, description) VALUES ($1,$2,$3,'redeemed',$4)`,
                [user_id, order.id, -points_redeemed, `Puntos canjeados en pedido #${order.id}`]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ status: 'success', data: { order_id: order.id, points_earned: totalPointsEarned, final_total: finalTotal } });
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('Error creando orden:', error);
        res.status(500).json({ status: 'error', message: error.message });
    } finally {
        client.release();
    }
};

export const getOrderById = async (req, res) => {
    const { id } = req.params;
    const storeId = await getStoreId(req);
    try {
        const orderResult = await query(
            `SELECT o.*, s.name as store_name
             FROM orders o LEFT JOIN stores s ON o.store_id = s.id
             WHERE o.id = $1 AND o.store_id = $2`,
            [id, storeId]
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
    const storeId = await getStoreId(req);

    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ status: 'error', message: 'Estado inválido.' });
    }

    try {
        const result = await query(
            'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 AND store_id = $3 RETURNING *',
            [status, id, storeId]
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
