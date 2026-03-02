import { query } from '../config/db.js';

// Obtiene las credenciales MP del tenant desde la BD, con fallback a env vars
const getMPCredentials = async (tenantId = 'voraz') => {
    try {
        const result = await query(
            'SELECT mp_access_token, mp_public_key, mp_sandbox, store_name FROM tenant_settings WHERE tenant_id = $1',
            [tenantId]
        );
        if (result.rows.length && result.rows[0].mp_access_token) {
            return {
                accessToken: result.rows[0].mp_access_token,
                publicKey: result.rows[0].mp_public_key,
                sandbox: result.rows[0].mp_sandbox,
                storeName: result.rows[0].store_name || 'Voraz Burger',
            };
        }
    } catch {}
    // Fallback a variables de entorno
    if (process.env.MP_ACCESS_TOKEN) {
        return {
            accessToken: process.env.MP_ACCESS_TOKEN,
            publicKey: process.env.MP_PUBLIC_KEY || '',
            sandbox: false,
            storeName: 'Voraz Burger',
        };
    }
    return null;
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
    const tenantId = req.headers['x-tenant-id'] || process.env.TENANT_ID || 'voraz';

    if (!order_id || !items?.length) {
        return res.status(400).json({ status: 'error', message: 'Datos de pago incompletos.' });
    }

    const credentials = await getMPCredentials(tenantId);

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
        const notificationUrl = backendUrl.startsWith('https://') ? `${backendUrl}/api/payments/webhook` : undefined;

        const preferenceBody = {
            items: items.map(item => ({
                id: String(item.product_id),
                title: item.product_name,
                quantity: Number(item.quantity),
                unit_price: parseFloat(item.product_price),
                currency_id: 'ARS',
            })),
            payer: { email: customer_email || 'cliente@voraz.com' },
            external_reference: String(order_id),
            statement_descriptor: (credentials.storeName || 'VORAZ BURGER').substring(0, 22).toUpperCase(),
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
    // MercadoPago puede enviar como query param o en el body
    const type = req.body?.type || req.query?.type;
    const paymentId = req.body?.data?.id || req.query?.id;

    if (type !== 'payment' || !paymentId) {
        return res.sendStatus(200);
    }

    try {
        // Buscar el tenant por el external_reference (order_id)
        // Primero obtenemos el pago desde MP para saber el external_reference
        const tenantId = process.env.TENANT_ID || 'voraz';
        const credentials = await getMPCredentials(tenantId);

        if (!credentials) return res.sendStatus(200);

        const { MercadoPagoConfig, Payment } = await import('mercadopago');
        const client = new MercadoPagoConfig({ accessToken: credentials.accessToken });
        const paymentClient = new Payment(client);

        const paymentData = await paymentClient.get({ id: paymentId });

        const orderId = paymentData.external_reference;
        const mpStatus = paymentData.status; // 'approved', 'pending', 'rejected', 'cancelled'

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

        // Actualizar orden según el estado del pago
        if (newPaymentStatus === 'approved') {
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

            // Acreditar puntos si el usuario tiene cuenta
            if (order?.user_id && order?.points_earned > 0) {
                const already = await query(
                    `SELECT id FROM points_history WHERE order_id = $1 AND type = 'earned'`,
                    [orderId]
                );
                if (!already.rows.length) {
                    await query('UPDATE users SET points = points + $1 WHERE id = $2', [order.points_earned, order.user_id]);
                    await query(
                        `INSERT INTO points_history (user_id, order_id, points, type, description) VALUES ($1,$2,$3,'earned',$4)`,
                        [order.user_id, orderId, order.points_earned, `Puntos ganados por pedido #${orderId}`]
                    );
                }
            }
            console.log(`✅ Pedido #${orderId} APROBADO por MercadoPago`);

        } else if (newPaymentStatus === 'rejected' || newPaymentStatus === 'cancelled') {
            await query(
                `UPDATE orders SET payment_status = $1, status = 'cancelled', updated_at = NOW() WHERE id = $2`,
                [newPaymentStatus, orderId]
            );
            console.log(`❌ Pedido #${orderId} RECHAZADO/CANCELADO en MercadoPago`);
        } else {
            await query(
                `UPDATE orders SET payment_status = $1, updated_at = NOW() WHERE id = $2`,
                [newPaymentStatus, orderId]
            );
        }

    } catch (error) {
        console.error('Error procesando webhook MP:', error.message);
    }

    res.sendStatus(200);
};

// Endpoint para obtener la public_key del tenant (usada por el frontend)
export const getPublicKey = async (req, res) => {
    const tenantId = req.headers['x-tenant-id'] || process.env.TENANT_ID || 'voraz';
    const credentials = await getMPCredentials(tenantId);
    if (!credentials?.publicKey) {
        return res.json({ status: 'success', data: { public_key: null, demo_mode: true } });
    }
    res.json({ status: 'success', data: { public_key: credentials.publicKey, sandbox: credentials.sandbox } });
};
