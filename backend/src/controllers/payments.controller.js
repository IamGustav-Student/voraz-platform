import { query } from '../config/db.js';

export const createPreference = async (req, res) => {
    const { order_id, items, customer_email } = req.body;

    if (!order_id || !items?.length) {
        return res.status(400).json({ status: 'error', message: 'Datos de pago incompletos.' });
    }

    if (!process.env.MP_ACCESS_TOKEN) {
        await query(
            `UPDATE orders SET payment_status = 'approved', status = 'confirmed', updated_at = NOW() WHERE id = $1`,
            [order_id]
        );
        return res.json({ status: 'success', data: { demo: true, order_id } });
    }

    try {
        const { MercadoPagoConfig, Preference } = await import('mercadopago');

        const client = new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
        const preference = new Preference(client);

        const result = await preference.create({
            body: {
                items: items.map(item => ({
                    id: String(item.product_id),
                    title: item.product_name,
                    quantity: Number(item.quantity),
                    unit_price: parseFloat(item.product_price),
                    currency_id: 'ARS',
                })),
                payer: { email: customer_email || 'cliente@voraz.com' },
                back_urls: {
                    success: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pedido/${order_id}?status=success`,
                    failure: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pedido/${order_id}?status=failure`,
                    pending: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/pedido/${order_id}?status=pending`,
                },
                auto_return: 'approved',
                external_reference: String(order_id),
                notification_url: `${process.env.BACKEND_URL || 'http://localhost:3000'}/api/payments/webhook`,
            }
        });

        res.json({
            status: 'success',
            data: {
                preference_id: result.id,
                init_point: result.init_point,
                sandbox_init_point: result.sandbox_init_point,
            }
        });
    } catch (error) {
        console.error('MercadoPago Error:', error);
        res.status(500).json({ status: 'error', message: 'Error al crear la preferencia de pago.' });
    }
};

export const webhook = async (req, res) => {
    const { type, data } = req.body;

    if (type === 'payment' && data?.id) {
        try {
            console.log('MP Webhook recibido, payment_id:', data.id);
        } catch (error) {
            console.error('Error procesando webhook:', error);
        }
    }

    res.sendStatus(200);
};
