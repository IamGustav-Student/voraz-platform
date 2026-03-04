import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getOrderById } from '../services/api';

const STATUS_FLOW = {
    pending:    { label: 'Pedido recibido',    icon: '📋', step: 0 },
    confirmed:  { label: 'Pedido confirmado',  icon: '✅', step: 1 },
    preparing:  { label: 'En la parrilla',     icon: '🔥', step: 2 },
    ready:      { label: 'Listo para entregar',icon: '📦', step: 3 },
    delivering: { label: 'En camino',          icon: '🛵', step: 4 },
    delivered:  { label: '¡Entregado!',        icon: '🎉', step: 5 },
    cancelled:  { label: 'Cancelado',          icon: '❌', step: -1 },
};

const STEPS_DELIVERY   = ['pending', 'confirmed', 'preparing', 'ready', 'delivering', 'delivered'];
const STEPS_PICKUP     = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];

const fmt = (n) => parseInt(n).toLocaleString('es-AR');

const OrderTracking = ({ orderId, onBack }) => {
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchOrder = async () => {
        try {
            const data = await getOrderById(orderId);
            if (data) setOrder(data);
            else setError('No se encontró el pedido.');
        } catch {
            setError('Error cargando el pedido.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();
        const interval = setInterval(fetchOrder, 5000);
        return () => clearInterval(interval);
    }, [orderId]);

    const isDelivered = order?.status === 'delivered';
    const isCancelled = order?.status === 'cancelled';

    useEffect(() => {
        if (isDelivered) return;
        if (!isCancelled) return;
    }, [isDelivered, isCancelled]);

    const currentStatus = order ? (STATUS_FLOW[order.status] || STATUS_FLOW.pending) : null;
    const steps = order?.order_type === 'pickup' ? STEPS_PICKUP : STEPS_DELIVERY;
    const currentStep = currentStatus ? currentStatus.step : 0;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-voraz-red border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-400">Cargando pedido...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="text-center py-16 px-4">
                <p className="text-red-400 font-bold mb-4">{error || 'Pedido no encontrado.'}</p>
                <button onClick={onBack} className="bg-white/10 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-white/20 transition">Volver al menú</button>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="container mx-auto px-4 py-8 pb-32 max-w-lg"
        >
            {/* Header */}
            <div className="flex items-center mb-6">
                <button onClick={onBack} className="text-gray-400 hover:text-white mr-3 p-2 rounded-full hover:bg-white/10 transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
                </button>
                <div>
                    <h2 className="text-2xl font-black text-white uppercase">Pedido <span className="text-voraz-yellow">#{order.id}</span></h2>
                    <p className="text-gray-500 text-xs">Se actualiza automáticamente</p>
                </div>
            </div>

            {/* Estado grande */}
            {!isCancelled ? (
                <div className="bg-voraz-gray rounded-2xl p-6 mb-6 text-center border border-white/5 shadow-xl">
                    <motion.div
                        key={order.status}
                        initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="text-6xl mb-3"
                    >
                        {currentStatus.icon}
                    </motion.div>
                    <h3 className="text-2xl font-black text-white mb-1">{currentStatus.label}</h3>
                    {order.order_type === 'delivery' && order.status === 'delivering' && (
                        <p className="text-gray-400 text-sm">Tu pedido está en camino. ¡Preparate!</p>
                    )}
                    {order.order_type === 'delivery' && order.status === 'delivering' && order.payment_method === 'cash' && (
                        <div className="mt-3 flex items-center gap-2 bg-green-900/30 border border-green-500/40 rounded-xl px-4 py-3">
                            <span className="text-2xl">💵</span>
                            <p className="text-green-300 font-bold text-sm text-left">
                                Ten preparado el efectivo para cuando llegue el repartidor.<br />
                                <span className="text-green-400 font-black">Total: ${fmt(order.total)}</span>
                            </p>
                        </div>
                    )}
                    {order.status === 'delivered' && (
                        <p className="text-voraz-yellow font-bold">¡Gracias por elegir Voraz!</p>
                    )}

                    {/* Barra de progreso */}
                    {!isDelivered && (
                        <div className="mt-5">
                            <div className="flex justify-between mb-2">
                                {steps.map((s, idx) => {
                                    const info = STATUS_FLOW[s];
                                    const active = info.step <= currentStep;
                                    const current = info.step === currentStep;
                                    return (
                                        <div key={s} className="flex flex-col items-center flex-1">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${current ? 'bg-voraz-red shadow-lg scale-110' : active ? 'bg-voraz-red/50' : 'bg-white/10'}`}>
                                                {active ? info.icon : <span className="text-gray-600 text-xs">{idx + 1}</span>}
                                            </div>
                                            {idx < steps.length - 1 && (
                                                <div className={`h-0.5 w-full mt-4 -mb-4 transition-all ${active ? 'bg-voraz-red/50' : 'bg-white/10'}`}></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-6 mb-6 text-center">
                    <div className="text-5xl mb-3">❌</div>
                    <h3 className="text-xl font-black text-red-400">Pedido Cancelado</h3>
                </div>
            )}

            {/* Info del pedido */}
            <div className="bg-voraz-gray rounded-2xl p-5 mb-4 border border-white/5">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Detalle del pedido</h4>
                <div className="space-y-2 mb-3">
                    {order.items?.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-gray-300">{item.product_name} <span className="text-gray-600">x{item.quantity}</span></span>
                            <span className="text-white font-bold">${fmt(item.subtotal)}</span>
                        </div>
                    ))}
                </div>
                <div className="border-t border-white/10 pt-3 flex justify-between">
                    <span className="text-white font-black uppercase text-sm">Total</span>
                    <span className="text-voraz-yellow font-black">${fmt(order.total)}</span>
                </div>
            </div>

            {/* Info contacto/envío */}
            <div className="bg-voraz-gray rounded-2xl p-5 border border-white/5 space-y-2">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Tipo</span>
                    <span className="text-white font-bold capitalize">{order.order_type === 'delivery' ? '🛵 Delivery' : '🏪 Retiro en local'}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Pago</span>
                    <span className={`font-bold ${order.payment_method === 'cash' ? 'text-green-400' : 'text-blue-400'}`}>
                        {order.payment_method === 'cash' ? '💵 Efectivo' : '💳 MercadoPago'}
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Cliente</span>
                    <span className="text-white font-bold">{order.customer_name}</span>
                </div>
                {order.delivery_address && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Dirección</span>
                        <span className="text-white font-bold text-right max-w-[60%]">{order.delivery_address}</span>
                    </div>
                )}
                {order.store_name && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Sucursal</span>
                        <span className="text-white font-bold">{order.store_name}</span>
                    </div>
                )}
                {order.notes && (
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Notas</span>
                        <span className="text-white text-right max-w-[60%]">{order.notes}</span>
                    </div>
                )}
            </div>

            <button onClick={onBack} className="w-full mt-6 py-3 rounded-xl font-bold text-sm text-gray-400 hover:text-white border border-white/10 hover:border-white/20 transition uppercase tracking-wide">
                Volver al menú
            </button>
        </motion.div>
    );
};

export default OrderTracking;
