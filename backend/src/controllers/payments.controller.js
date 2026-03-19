import crypto from 'crypto';
import { query } from '../config/db.js';
import { getStoreId } from '../utils/tenant.js';

// Obtiene las credenciales MP del tenant desde la BD por store_id, con fallback a env vars
const getMPCredentials = async (storeId = 1) => {
    try {
        const result = await query(
            `SELECT mp_access_token, mp_public_key, mp_sandbox, store_name, mp_webhook_secret
             FROM tenant_settings WHERE store_id = $1 OR tenant_id = $1::text LIMIT 1`,
            [storeId]
        );
        if (result.rows.length && result.rows[0].mp_access_token) {
            return {
                accessToken: result.rows[0].mp_access_token,
                publicKey: result.rows[0].mp_public_key,
                sandbox: result.rows[0].mp_sandbox,
                storeName: result.rows[0].store_name || 'GastroRed',
                webhookSecret: result.rows[0].mp_webhook_secret || null,
            };
        }
    } catch {}
    if (process.env.MP_ACCESS_TOKEN) {
        return {
            accessToken: process.env.MP_ACCESS_TOKEN,
            publicKey: process.env.MP_PUBLIC_KEY || '',
            sandbox: false,
            storeName: 'GastroRed',
            webhookSecret: process.env.MP_WEBHOOK_SECRET || null,
        };
    }
    return null;
};

/**
 * Valida la firma x-signature de Mercado Pago (HMAC-SHA256).
 * Formato header: ts=1234567890,v1=hexhash
 * Manifest: id:{data_id};request-id:{x-request-id};ts:{ts};
 */
const validateMPSignature = (secret, dataId, requestId, ts, signatureV1) => {
    if (!secret || !signatureV1) return false;
    const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
    const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
    const sigBuf = Buffer.from(signatureV1, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
};

/**
 * Descuenta stock de productos según los ítems del pedido al aprobar el pago.
 */
const decrementStockForOrder = async (orderId) => {
    await query(
        `UPDATE products p
         SET stock = p.stock - agg.total_qty
         FROM (
             SELECT product_id, SUM(quantity)::int AS total_qty
             FROM order_items WHERE order_id = $1 GROUP BY product_id
         ) agg
         WHERE p.id = agg.product_id AND p.stock >= agg.total_qty`,
        [orderId]
    );
};

// Devuelve URLs válidas para back_urls de MercadoPago.
// MercadoPago exige HTTPS y no acepta localhost — si la URL no es https, las omite.
const buildBackUrls = (frontendUrl, orderId) => {
    const isValid = frontendUrl && frontendUrl.startsWith('https://');
    if (!isValid) return null;
    return {
        success: `${frontendUrl}?order_id=${orderId}&payment_status=success`,
        failure: `${frontendUrl}?order_id=${orderId}&payment_status=failure`,
        pending: `${frontendUrl}?order_id=${orderId}&payment_status=pending`,
    };
};

export const createPreference = async (req, res) => {
    const { order_id, items, customer_email } = req.body;
    const storeId = await getStoreId(req);

    if (!order_id || !items?.length) {
        return res.status(400).json({ status: 'error', message: 'Datos de pago incompletos.' });
    }

    const credentials = await getMPCredentials(storeId);

    // Sin credenciales MP: modo demo (aprobación automática)
    if (!credentials) {
        await query(
            `UPDATE orders SET payment_status = 'approved', status = 'confirmed', updated_at = NOW() WHERE id = $1`,
            [order_id]
        );
        return res.json({ status: 'success', data: { demo: true, order_id, message: 'Pedido confirmado (modo sin pago online)' } });
    }

    try {
        const { MercadoPagoConfig, Preference } = await import('mercadopago');
        const client = new MercadoPagoConfig({ accessToken: credentials.accessToken });
        const preference = new Preference(client);

        const frontendUrl = process.env.FRONTEND_URL || 'https://voraz-platform.vercel.app';
        const backendUrl  = process.env.BACKEND_URL  || 'https://voraz-platform-production.up.railway.app';

        const backUrls = buildBackUrls(frontendUrl, order_id);
        const notificationUrl = backendUrl.startsWith('https://')
            ? `${backendUrl}/api/payments/webhook?store_id=${storeId}`
            : undefined;

        const preferenceBody = {
            items: items.map(item => ({
                id: String(item.product_id),
                title: item.product_name,
                quantity: Number(item.quantity),
                unit_price: parseFloat(item.product_price),
                currency_id: 'ARS',
            })),
            payer: { email: customer_email || 'cliente@gastrored.com' },
            external_reference: String(order_id),
            statement_descriptor: (credentials.storeName || 'GASTRORED').substring(0, 22).toUpperCase(),
        };

        // Solo agregar back_urls si son HTTPS válidas (MercadoPago lo requiere)
        if (backUrls) {
            preferenceBody.back_urls = backUrls;
            preferenceBody.auto_return = 'approved';
        }

        // Solo agregar notification_url si es HTTPS válida
        if (notificationUrl) {
            preferenceBody.notification_url = notificationUrl;
        }

        const result = await preference.create({ body: preferenceBody });

        // Guardar preference_id en la orden
        await query(
            `UPDATE orders SET payment_id = $1, updated_at = NOW() WHERE id = $2`,
            [result.id, order_id]
        );

        res.json({
            status: 'success',
            data: {
                preference_id: result.id,
                init_point: credentials.sandbox ? result.sandbox_init_point : result.init_point,
                sandbox: credentials.sandbox,
                order_id,
            }
        });
    } catch (error) {
        console.error('MercadoPago Error:', error);
        res.status(500).json({ status: 'error', message: 'Error al crear la preferencia de pago: ' + error.message });
    }
};

export const webhook = async (req, res) => {
    const type = req.body?.type || req.query?.type;
    const paymentId = req.body?.data?.id || req.query?.id;

    if (type !== 'payment' || !paymentId) {
        return res.sendStatus(200);
    }

    const storeIdParam = req.query?.store_id;
    const storeId = storeIdParam != null && storeIdParam !== '' ? parseInt(storeIdParam, 10) : null;
    if (storeId == null || Number.isNaN(storeId)) {
        return res.sendStatus(200);
    }

    const credentials = await getMPCredentials(storeId);
    if (!credentials) return res.sendStatus(200);

    const xSignature = req.headers['x-signature'];
    const xRequestId = req.headers['x-request-id'];
    if (credentials.webhookSecret && xSignature) {
        const parts = xSignature.split(',');
        let ts = '';
        let v1 = '';
        for (const p of parts) {
            const [k, v] = p.split('=');
            if (k === 'ts') ts = (v || '').trim();
            if (k === 'v1') v1 = (v || '').trim();
        }
        if (!ts || !v1 || !xRequestId) {
            return res.status(401).send('Invalid webhook signature');
        }
        const dataId = String(paymentId);
        if (!validateMPSignature(credentials.webhookSecret, dataId, xRequestId, ts, v1)) {
            return res.status(401).send('Invalid webhook signature');
        }
    }

    try {
        const { MercadoPagoConfig, Payment } = await import('mercadopago');
        const client = new MercadoPagoConfig({ accessToken: credentials.accessToken });
        const paymentClient = new Payment(client);
        const paymentData = await paymentClient.get({ id: paymentId });

        const orderId = paymentData.external_reference;
        const mpStatus = paymentData.status;

        if (!orderId) return res.sendStatus(200);

        const paymentStatusMap = {
            approved: 'approved',
            pending: 'pending',
            in_process: 'pending',
            rejected: 'rejected',
            cancelled: 'cancelled',
            refunded: 'cancelled',
        };
        const newPaymentStatus = paymentStatusMap[mpStatus] || 'pending';

        if (newPaymentStatus === 'approved') {
            const orderCheck = await query('SELECT id, store_id, payment_status FROM orders WHERE id = $1', [orderId]);
            if (!orderCheck.rows.length) return res.sendStatus(200);
            if (orderCheck.rows[0].store_id !== storeId) return res.sendStatus(200);
            
            // Idempotencia: si ya está aprobado, no hacer nada más
            if (orderCheck.rows[0].payment_status === 'approved') {
                return res.sendStatus(200);
            }

            const result = await query(
                `UPDATE orders SET 
                 payment_status = 'approved', 
                 payment_id = $1,
                 status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
                 updated_at = NOW()
                 WHERE id = $2 RETURNING *`,
                [String(paymentId), orderId]
            );
            const order = result.rows[0];

            // Acreditación de puntos ELIMINADA de aquí.
            // Ahora se realiza únicamente cuando el administrador marca el pedido como 'entregado'.

        } else if (newPaymentStatus === 'rejected' || newPaymentStatus === 'cancelled') {
            const orderCheck = await query('SELECT id, payment_status, status FROM orders WHERE id = $1', [orderId]);
            if (!orderCheck.rows.length) return res.sendStatus(200);
            
            // Solo restauramos stock si la orden no estaba ya cancelada y el pago no era aprobado
            if (orderCheck.rows[0].payment_status !== 'approved' && orderCheck.rows[0].status !== 'cancelled') {
                // Restaurar stock
                await query(
                    `UPDATE products p
                     SET stock = p.stock + agg.total_qty
                     FROM (
                         SELECT product_id, SUM(quantity)::int AS total_qty
                         FROM order_items WHERE order_id = $1 GROUP BY product_id
                     ) agg
                     WHERE p.id = agg.product_id`,
                    [orderId]
                );
            }

            await query(
                `UPDATE orders SET payment_status = $1, status = 'cancelled', updated_at = NOW() WHERE id = $2`,
                [newPaymentStatus, orderId]
            );
        } else {
            await query(
                `UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2`,
                [newPaymentStatus, orderId]
            );
        }
    } catch (error) {
        console.error('Error procesando webhook MP:', error.message);
    }

    return res.sendStatus(200);
};

export const getPublicKey = async (req, res) => {
    const storeId = await getStoreId(req);
    const credentials = await getMPCredentials(storeId);
    if (!credentials?.publicKey) {
        return res.json({ status: 'success', data: { public_key: null, demo_mode: true } });
    }
    res.json({ status: 'success', data: { public_key: credentials.publicKey, sandbox: credentials.sandbox } });
};
