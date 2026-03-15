import { pool, query } from '../config/db.js';
import { getStoreId, getTenantId } from '../utils/tenant.js';

// Points helper removed as it's now per product

export const createOrder = async (req, res) => {
    const {
        customer_name, customer_phone, order_type,
        delivery_address, store_id: bodyStoreId, items, notes, total: frontendTotal,
        user_id, points_redeemed: requestedPoints, payment_method
    } = req.body;

    if (!customer_name || !customer_phone || !order_type || !items?.length) {
        return res.status(400).json({ status: 'error', message: 'Datos incompletos.' });
    }
    
    const tenantId = getTenantId(req);
    const tenantStoreId = await getStoreId(req);
    let store_id = tenantStoreId;
    if (bodyStoreId != null) {
        const storeCheck = await query(
            'SELECT id FROM stores WHERE id = $1 AND CAST(tenant_id AS VARCHAR) = CAST($2 AS VARCHAR) LIMIT 1',
            [bodyStoreId, tenantId]
        );
        if (storeCheck.rows.length) store_id = storeCheck.rows[0].id;
    }

    const resolvedPaymentMethod = payment_method === 'cash' ? 'cash' : 'mercadopago';
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Obtener configuración del Tenant (Bloqueo preventivo de settings no es necesario, pero leemos valor fresco)
        const loyaltyRes = await client.query(
            'SELECT loyalty_enabled, points_redeem_value FROM tenant_settings WHERE tenant_id_fk = $1',
            [tenantId]
        );
        const loyalty = loyaltyRes.rows[0] || { loyalty_enabled: false, points_redeem_value: 0 };
        const pointsRedeemValue = parseFloat(loyalty.points_redeem_value) || 0;

        // 2. Bloqueo y obtención de productos frescos (Anti-concurrencia de stock y precios)
        const productIds = [...new Set(items.map((i) => i.product_id))];
        const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
        const lockResult = await client.query(
            `SELECT id, price, COALESCE(stock, 0) as stock, store_id, points_earned 
             FROM products WHERE id IN (${placeholders}) FOR UPDATE`,
            productIds
        );
        const productsById = Object.fromEntries(lockResult.rows.map((r) => [r.id, r]));

        // 3. Cálculo de Subtotal y Puntos Ganados (Lado del servidor)
        let calculatedSubtotal = 0;
        let totalPointsEarned = 0;

        const qtyByProduct = {};
        for (const item of items) {
            const product = productsById[item.product_id];
            if (!product) throw new Error(`Producto ${item.product_id} no disponible.`);
            if (product.store_id != null && product.store_id !== store_id) throw new Error('Producto no pertenece al comercio.');
            
            const qty = parseInt(item.quantity, 10) || 0;
            if (product.stock < qty) throw new Error(`Stock insuficiente para ${item.product_name || 'producto'}.`);
            
            calculatedSubtotal += parseFloat(product.price) * qty;
            if (loyalty.loyalty_enabled) {
                totalPointsEarned += (parseInt(product.points_earned, 10) || 0) * qty;
            }
            qtyByProduct[item.product_id] = (qtyByProduct[item.product_id] || 0) + qty;
        }

        // 4. Lógica de Redención (Con bloqueo FOR UPDATE en Usuario)
        let pointsDiscount = 0;
        let actualPointsRedeemed = 0;

        if (user_id && requestedPoints > 0 && loyalty.loyalty_enabled && pointsRedeemValue > 0) {
            const userRes = await client.query('SELECT points FROM users WHERE id = $1 FOR UPDATE', [user_id]);
            if (userRes.rows.length === 0) throw new Error('Usuario no encontrado.');
            
            const availablePoints = userRes.rows[0].points;
            // Solo redimimos lo que el usuario tiene y lo que el subtotal permite
            const maxPointsByUser = availablePoints;
            const maxPointsBySubtotal = Math.floor(calculatedSubtotal / pointsRedeemValue);
            
            actualPointsRedeemed = Math.min(requestedPoints, maxPointsByUser, maxPointsBySubtotal);
            pointsDiscount = actualPointsRedeemed * pointsRedeemValue;

            if (actualPointsRedeemed > 0) {
                await client.query('UPDATE users SET points = points - $1 WHERE id = $2', [actualPointsRedeemed, user_id]);
                // Log de redención inmediato (El earning es diferido)
                await client.query(
                    `INSERT INTO points_history (user_id, points, type, description) VALUES ($1,$2,'redeemed',$3)`,
                    [user_id, -actualPointsRedeemed, `Canje en pedido pendiente`]
                );
            }
        }

        const finalTotal = Math.max(0, calculatedSubtotal - pointsDiscount);

        // 5. Insertar Orden
        const orderResult = await client.query(
            `INSERT INTO orders 
             (customer_name, customer_phone, order_type, delivery_address, store_id, total, notes, 
              user_id, points_earned, points_redeemed, points_discount, payment_method, status) 
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending') RETURNING id`,
            [
                customer_name, customer_phone, order_type, delivery_address || null, store_id,
                finalTotal, notes || null, user_id || null, totalPointsEarned, 
                actualPointsRedeemed, pointsDiscount, resolvedPaymentMethod
            ]
        );
        const orderId = orderResult.rows[0].id;

        // 6. Insertar ítems y Actualizar Stock
        for (const item of items) {
            const product = productsById[item.product_id];
            await client.query(
                `INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity, notes, subtotal) 
                 VALUES ($1,$2,$3,$4,$5,$6,$7)`,
                [orderId, item.product_id, item.product_name || 'Producto', product.price, item.quantity, item.notes || null, (product.price * item.quantity)]
            );
            await client.query(
                'UPDATE products SET stock = stock - $1 WHERE id = $2',
                [item.quantity, item.product_id]
            );
        }

        // Vincular el historial de puntos a la orden creada
        if (actualPointsRedeemed > 0) {
            await client.query('UPDATE points_history SET order_id = $1 WHERE user_id = $2 AND order_id IS NULL AND type = \'redeemed\'', [orderId, user_id]);
        }

        await client.query('COMMIT');
        res.status(201).json({ status: 'success', data: { order_id: orderId, final_total: finalTotal, points_earned: totalPointsEarned } });

    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        console.error('Error procesando orden maestra:', error.message);
        res.status(400).json({ status: 'error', message: error.message });
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
        const client = await pool.connect();
        await client.query('BEGIN');

        const orderRes = await client.query(
            'SELECT * FROM orders WHERE id = $1 AND store_id = $2 FOR UPDATE',
            [id, storeId]
        );
        if (!orderRes.rows.length) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ status: 'error', message: 'Pedido no encontrado.' });
        }
        const order = orderRes.rows[0];

        // 1. Acreditación Diferida de Puntos (Solo si passa a delivered)
        if (status === 'delivered' && order.status !== 'delivered' && order.user_id && (order.points_earned || 0) > 0) {
            const loyaltyCheck = await client.query(
                'SELECT loyalty_enabled FROM tenant_settings WHERE tenant_id_fk = $1',
                [getTenantId(req)]
            );
            
            if (loyaltyCheck.rows[0]?.loyalty_enabled) {
                const alreadyEarned = await client.query(
                    `SELECT id FROM points_history WHERE order_id = $1 AND type = 'earned'`,
                    [id]
                );
                if (!alreadyEarned.rows.length) {
                    await client.query('UPDATE users SET points = points + $1 WHERE id = $2', [order.points_earned, order.user_id]);
                    await client.query(
                        `INSERT INTO points_history (user_id, order_id, points, type, description) VALUES ($1,$2,$3,'earned',$4)`,
                        [order.user_id, id, order.points_earned, `Puntos ganados por pedido #${id}`]
                    );
                }
            }
        }

        // 2. Devolución de Puntos por Cancelación
        if (status === 'cancelled' && order.status !== 'cancelled' && order.user_id && (order.points_redeemed || 0) > 0) {
            const alreadyRefunded = await client.query(
                `SELECT id FROM points_history WHERE order_id = $1 AND type = 'refund'`,
                [id]
            );
            if (!alreadyRefunded.rows.length) {
                await client.query('UPDATE users SET points = points + $1 WHERE id = $2', [order.points_redeemed, order.user_id]);
                await client.query(
                    `INSERT INTO points_history (user_id, order_id, points, type, description) VALUES ($1,$2,$3,'refund',$4)`,
                    [order.user_id, id, order.points_redeemed, `Devolución de puntos por cancelación de pedido #${id}`]
                );
            }
        }

        const updateResult = await client.query(
            'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, id]
        );
        
        await client.query('COMMIT');
        client.release();
        res.json({ status: 'success', data: updateResult.rows[0] });
    } catch (error) {
        console.error('Error actualizando estado de orden maestro:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
};
