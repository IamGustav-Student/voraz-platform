import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder, createPaymentPreference, validateCoupon, getTenantSettings } from '../services/api';

const STEPS = { CART: 'cart', CHECKOUT: 'checkout', PROCESSING: 'processing' };
const POINTS_TO_REDEEM = 100;
const POINTS_VALUE = 5;

const CartDrawer = ({ isOpen, onClose, stores, onOrderCreated, onOpenAuth }) => {
    const { items, total, itemCount, dispatch } = useCart();
    const { user, refreshUser, getToken } = useAuth();

    const [step, setStep] = useState(STEPS.CART);
    const [orderType, setOrderType] = useState('delivery');
    const [paymentMethod, setPaymentMethod] = useState('mercadopago');
    const [cashOnDeliveryEnabled, setCashOnDeliveryEnabled] = useState(true);
    const [form, setForm] = useState({ name: '', phone: '', address: '', store_id: '', notes: '' });
    const [couponCode, setCouponCode] = useState('');
    const [coupon, setCoupon] = useState(null);
    const [couponError, setCouponError] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);
    const [pointsToRedeem, setPointsToRedeem] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setForm(f => ({ ...f, name: f.name || user.name, phone: f.phone || (user.phone || '') }));
        }
    }, [user, isOpen]);

    useEffect(() => {
        getTenantSettings().then(s => setCashOnDeliveryEnabled(s.cash_on_delivery !== false));
    }, []);

    const maxRedeemable = user ? Math.floor(user.points / POINTS_TO_REDEEM) * POINTS_TO_REDEEM : 0;
    const pointsDiscount = pointsToRedeem * POINTS_VALUE;
    const couponDiscount = coupon?.discount || 0;
    const totalDiscount = couponDiscount + pointsDiscount;
    const finalTotal = Math.max(0, total - totalDiscount);
    const estimatedPoints = Math.floor(finalTotal / 100);

    const fmt = (n) => parseInt(n).toLocaleString('es-AR');

    const handleClose = () => {
        setStep(STEPS.CART);
        setError('');
        setCouponError('');
        onClose();
    };

    const handleQty = (product_id, qty) => dispatch({ type: 'UPDATE_QTY', payload: { product_id, qty } });

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        setCouponLoading(true);
        setCouponError('');
        try {
            const res = await validateCoupon({ code: couponCode.trim(), order_total: total });
            if (res) { setCoupon(res); } else { setCouponError('Cupón inválido.'); }
        } catch (err) {
            setCouponError(err.message || 'Cupón inválido.');
        } finally {
            setCouponLoading(false);
        }
    };

    const handleRemoveCoupon = () => { setCoupon(null); setCouponCode(''); setCouponError(''); };

    const handleCheckout = async () => {
        if (!form.name.trim() || !form.phone.trim()) { setError('Nombre y teléfono son obligatorios.'); return; }
        if (orderType === 'delivery' && !form.address.trim()) { setError('La dirección de entrega es obligatoria.'); return; }
        if (orderType === 'pickup' && !form.store_id) { setError('Seleccioná una sucursal para retiro.'); return; }

        setError('');
        setStep(STEPS.PROCESSING);

        try {
            const token = getToken();
            const orderPayload = {
                customer_name: form.name,
                customer_phone: form.phone,
                order_type: orderType,
                delivery_address: orderType === 'delivery' ? form.address : null,
                store_id: orderType === 'pickup' ? parseInt(form.store_id) : null,
                notes: form.notes || null,
                total,
                user_id: user?.id || null,
                coupon_id: coupon?.coupon_id || null,
                discount: totalDiscount,
                points_redeemed: pointsToRedeem,
                payment_method: paymentMethod,
                items: items.map(i => ({
                    product_id: i.product_id,
                    product_name: i.product_name,
                    product_price: i.product_price,
                    quantity: i.quantity,
                    subtotal: i.subtotal,
                })),
            };

            const orderRes = await createOrder(orderPayload, token);
            if (!orderRes?.order_id) throw new Error('No se pudo crear el pedido.');

            if (user) await refreshUser();

            dispatch({ type: 'CLEAR' });
            setCoupon(null);
            setCouponCode('');
            setPointsToRedeem(0);
            handleClose();

            if (paymentMethod === 'cash') {
                onOrderCreated(orderRes.order_id);
            } else {
                const payRes = await createPaymentPreference({
                    order_id: orderRes.order_id,
                    items: orderPayload.items,
                    customer_email: user?.email || '',
                }, token);

                if (payRes?.demo) {
                    onOrderCreated(orderRes.order_id);
                } else if (payRes?.init_point) {
                    window.location.href = payRes.init_point;
                } else {
                    onOrderCreated(orderRes.order_id);
                }
            }
        } catch (err) {
            setError(err.message || 'Error procesando el pedido. Intentá de nuevo.');
            setStep(STEPS.CHECKOUT);
        }
    };

    const isCash = paymentMethod === 'cash';

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[200] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 400 }}
                        className="bg-[#1a1a1a] w-full md:max-w-lg h-[90vh] md:h-auto md:max-h-[88vh] rounded-t-[30px] md:rounded-2xl flex flex-col border-t md:border border-white/10 shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10 flex-shrink-0">
                            <div className="flex items-center space-x-3">
                                {step !== STEPS.CART && (
                                    <button onClick={() => { setStep(STEPS.CART); setError(''); }} className="text-gray-400 hover:text-white mr-1">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                )}
                                <h2 className="text-lg font-black text-white uppercase tracking-wide">
                                    {step === STEPS.CART && 'Tu Pedido'}
                                    {step === STEPS.CHECKOUT && 'Confirmar'}
                                    {step === STEPS.PROCESSING && 'Procesando...'}
                                </h2>
                                {step === STEPS.CART && itemCount > 0 && (
                                    <span className="bg-voraz-red text-white text-xs font-bold px-2 py-0.5 rounded-full">{itemCount}</span>
                                )}
                            </div>
                            <button onClick={handleClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto">

                            {/* CART */}
                            {step === STEPS.CART && (
                                <div className="p-6">
                                    {items.length === 0 ? (
                                        <div className="text-center py-16">
                                            <div className="text-5xl mb-4">🍔</div>
                                            <p className="text-gray-400 font-bold">Tu carrito está vacío</p>
                                            <p className="text-gray-600 text-sm mt-1">Agregá alguna burger del menú</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-3 mb-5">
                                                {items.map(item => (
                                                    <div key={item.product_id} className="flex items-center bg-white/5 rounded-xl p-3 border border-white/5">
                                                        <img src={item.image_url} alt={item.product_name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0 mr-3" />
                                                        <div className="flex-grow min-w-0">
                                                            <p className="text-white font-bold text-sm truncate">{item.product_name}</p>
                                                            <p className="text-voraz-yellow font-black text-sm">${fmt(item.product_price)}</p>
                                                        </div>
                                                        <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                                                            <button onClick={() => handleQty(item.product_id, item.quantity - 1)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-voraz-red text-white font-bold text-sm flex items-center justify-center transition">-</button>
                                                            <span className="text-white font-bold w-5 text-center text-sm">{item.quantity}</span>
                                                            <button onClick={() => handleQty(item.product_id, item.quantity + 1)} className="w-7 h-7 rounded-full bg-white/10 hover:bg-voraz-red text-white font-bold text-sm flex items-center justify-center transition">+</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Cupón */}
                                            <div className="mb-4">
                                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Código de descuento</label>
                                                {!coupon ? (
                                                    <div className="flex space-x-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Ej: VORAZ10"
                                                            value={couponCode}
                                                            onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                                                            onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                                                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-voraz-yellow uppercase"
                                                        />
                                                        <button
                                                            onClick={handleApplyCoupon}
                                                            disabled={couponLoading || !couponCode.trim()}
                                                            className="bg-voraz-yellow text-black px-4 py-2.5 rounded-xl font-black text-xs uppercase disabled:opacity-50 hover:bg-yellow-300 transition"
                                                        >
                                                            {couponLoading ? '...' : 'Aplicar'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2.5">
                                                        <div>
                                                            <p className="text-green-400 font-black text-sm">{coupon.code} — {coupon.description}</p>
                                                            <p className="text-green-300 text-xs">-${fmt(coupon.discount)}</p>
                                                        </div>
                                                        <button onClick={handleRemoveCoupon} className="text-gray-500 hover:text-red-400 ml-3">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                                        </button>
                                                    </div>
                                                )}
                                                {couponError && <p className="text-red-400 text-xs mt-1 font-bold">{couponError}</p>}
                                            </div>

                                            {/* Canjear puntos */}
                                            {user && user.points >= POINTS_TO_REDEEM && (
                                                <div className="mb-4 bg-voraz-yellow/10 border border-voraz-yellow/20 rounded-xl p-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-voraz-yellow font-bold text-sm">⭐ Canjear puntos</p>
                                                        <p className="text-white text-xs font-bold">{user.points} pts disponibles</p>
                                                    </div>
                                                    <div className="flex items-center space-x-3">
                                                        <button
                                                            onClick={() => setPointsToRedeem(p => Math.max(0, p - POINTS_TO_REDEEM))}
                                                            disabled={pointsToRedeem === 0}
                                                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-voraz-yellow hover:text-black text-white font-bold flex items-center justify-center transition disabled:opacity-30"
                                                        >-</button>
                                                        <div className="flex-1 text-center">
                                                            <p className="text-white font-black">{pointsToRedeem} pts</p>
                                                            {pointsToRedeem > 0 && <p className="text-voraz-yellow text-xs">= -${fmt(pointsDiscount)}</p>}
                                                        </div>
                                                        <button
                                                            onClick={() => setPointsToRedeem(p => Math.min(maxRedeemable, p + POINTS_TO_REDEEM))}
                                                            disabled={pointsToRedeem >= maxRedeemable}
                                                            className="w-8 h-8 rounded-full bg-white/10 hover:bg-voraz-yellow hover:text-black text-white font-bold flex items-center justify-center transition disabled:opacity-30"
                                                        >+</button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Resumen de precios */}
                                            <div className="bg-white/5 rounded-xl p-4 border border-white/5 space-y-1.5">
                                                <div className="flex justify-between text-sm text-gray-400">
                                                    <span>Subtotal</span><span className="text-white">${fmt(total)}</span>
                                                </div>
                                                {couponDiscount > 0 && (
                                                    <div className="flex justify-between text-sm text-green-400">
                                                        <span>Descuento cupón</span><span>-${fmt(couponDiscount)}</span>
                                                    </div>
                                                )}
                                                {pointsDiscount > 0 && (
                                                    <div className="flex justify-between text-sm text-voraz-yellow">
                                                        <span>Canje de puntos</span><span>-${fmt(pointsDiscount)}</span>
                                                    </div>
                                                )}
                                                <div className="border-t border-white/10 pt-2 flex justify-between font-black">
                                                    <span className="text-white uppercase text-sm">Total</span>
                                                    <span className="text-voraz-yellow text-lg">${fmt(finalTotal)}</span>
                                                </div>
                                                {estimatedPoints > 0 && (
                                                    <p className="text-green-400 text-[10px] text-right">+{estimatedPoints} pts al completar el pedido</p>
                                                )}
                                            </div>

                                            {/* Login prompt */}
                                            {!user && (
                                                <button
                                                    onClick={() => { handleClose(); onOpenAuth(); }}
                                                    className="w-full mt-3 py-2.5 rounded-xl border border-voraz-yellow/30 text-voraz-yellow text-xs font-bold uppercase tracking-wide hover:bg-voraz-yellow/10 transition"
                                                >
                                                    ⭐ Iniciá sesión para ganar {estimatedPoints} puntos
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* CHECKOUT */}
                            {step === STEPS.CHECKOUT && (
                                <div className="p-6 space-y-5">
                                    {/* Tipo de pedido */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Tipo de pedido</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['delivery', 'pickup'].map(type => (
                                                <button key={type} onClick={() => setOrderType(type)}
                                                    className={`py-3 rounded-xl font-bold text-sm uppercase border transition ${orderType === type ? 'bg-voraz-red border-voraz-red text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}>
                                                    {type === 'delivery' ? '🛵 Delivery' : '🏪 Retiro'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Método de pago */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">¿Cómo querés pagar?</label>
                                        <div className={`grid gap-3 ${cashOnDeliveryEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
                                            <button
                                                onClick={() => setPaymentMethod('mercadopago')}
                                                className={`py-3 px-4 rounded-xl font-bold text-sm border transition flex flex-col items-center gap-1 ${paymentMethod === 'mercadopago' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                                            >
                                                <span className="text-lg">💳</span>
                                                <span>MercadoPago</span>
                                            </button>
                                            {cashOnDeliveryEnabled && (
                                                <button
                                                    onClick={() => setPaymentMethod('cash')}
                                                    className={`py-3 px-4 rounded-xl font-bold text-sm border transition flex flex-col items-center gap-1 ${paymentMethod === 'cash' ? 'bg-green-600 border-green-500 text-white' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
                                                >
                                                    <span className="text-lg">💵</span>
                                                    <span>Efectivo</span>
                                                </button>
                                            )}
                                        </div>
                                        {isCash && (
                                            <div className="mt-2 flex items-start gap-2 bg-green-900/20 border border-green-500/30 rounded-xl px-4 py-3">
                                                <span className="text-green-400 text-lg flex-shrink-0">💵</span>
                                                <p className="text-green-300 text-xs font-bold">
                                                    Tenés que tener el efectivo preparado cuando llegue el repartidor.<br />
                                                    <span className="text-green-400 font-black">Total a pagar: ${fmt(finalTotal)}</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Datos personales */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Tus datos</label>
                                        <input type="text" placeholder="Tu nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-voraz-red" />
                                        <input type="tel" placeholder="Teléfono / WhatsApp" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-voraz-red" />
                                    </div>

                                    {orderType === 'delivery' && (
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Dirección de entrega</label>
                                            <input type="text" placeholder="Calle, número, piso..." value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-voraz-red" />
                                        </div>
                                    )}
                                    {orderType === 'pickup' && (
                                        <div>
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Sucursal de retiro</label>
                                            <select value={form.store_id} onChange={e => setForm(f => ({ ...f, store_id: e.target.value }))}
                                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-voraz-red">
                                                <option value="">Elegí un local...</option>
                                                {stores.map(s => <option key={s.id} value={s.id}>{s.name} — {s.address}</option>)}
                                            </select>
                                        </div>
                                    )}

                                    <div>
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">Notas (opcional)</label>
                                        <textarea placeholder="Sin cebolla, extra cheddar..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-voraz-red resize-none" />
                                    </div>

                                    {error && <p className="text-red-400 text-sm font-bold bg-red-500/10 px-4 py-2 rounded-lg">{error}</p>}

                                    {/* Resumen */}
                                    <div className="bg-white/5 rounded-xl p-4 space-y-1 border border-white/5">
                                        {items.map(i => (
                                            <div key={i.product_id} className="flex justify-between text-sm">
                                                <span className="text-gray-400">{i.product_name} x{i.quantity}</span>
                                                <span className="text-white font-bold">${fmt(i.subtotal)}</span>
                                            </div>
                                        ))}
                                        {totalDiscount > 0 && (
                                            <div className="flex justify-between text-sm text-green-400">
                                                <span>Descuentos</span><span>-${fmt(totalDiscount)}</span>
                                            </div>
                                        )}
                                        <div className="border-t border-white/10 pt-2 mt-2 flex justify-between">
                                            <span className="text-white font-black uppercase text-sm">Total</span>
                                            <span className="text-voraz-yellow font-black">${fmt(finalTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PROCESSING */}
                            {step === STEPS.PROCESSING && (
                                <div className="flex flex-col items-center justify-center py-20 px-6">
                                    <div className="w-14 h-14 border-4 border-voraz-red border-t-transparent rounded-full animate-spin mb-5"></div>
                                    <p className="text-white font-bold text-lg">
                                        {isCash ? 'Confirmando tu pedido...' : 'Procesando tu pago...'}
                                    </p>
                                    <p className="text-gray-500 text-sm mt-1">Un segundo</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {step !== STEPS.PROCESSING && (
                            <div className="px-6 py-5 border-t border-white/10 flex-shrink-0">
                                {step === STEPS.CART ? (
                                    <motion.button whileTap={{ scale: 0.97 }}
                                        onClick={() => items.length > 0 && setStep(STEPS.CHECKOUT)}
                                        disabled={items.length === 0}
                                        className={`w-full py-4 rounded-xl font-black uppercase tracking-wide text-sm flex items-center justify-between px-6 transition ${items.length > 0 ? 'bg-voraz-red text-white shadow-lg hover:bg-red-700' : 'bg-white/5 text-gray-600 cursor-not-allowed'}`}
                                    >
                                        <span>Continuar</span>
                                        <span>${fmt(finalTotal)}</span>
                                    </motion.button>
                                ) : (
                                    <motion.button whileTap={{ scale: 0.97 }}
                                        onClick={handleCheckout}
                                        className={`w-full py-4 rounded-xl font-black uppercase tracking-wide text-sm flex items-center justify-between px-6 transition shadow-lg ${isCash ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-voraz-red hover:bg-red-700 text-white'}`}
                                    >
                                        <span>{isCash ? '✅ Confirmar Pedido' : '💳 Confirmar y Pagar'}</span>
                                        <span>${fmt(finalTotal)}</span>
                                    </motion.button>
                                )}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CartDrawer;
