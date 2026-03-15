import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getPointsHistory, getUserOrders } from '../services/api';

// Points constants moved to TENANT config logic

const fmt = (n) => parseInt(n).toLocaleString('es-AR');

const typeConfig = {
    earned:   { label: 'Ganados',   color: 'text-green-400',  bg: 'bg-green-500/10',  sign: '+' },
    redeemed: { label: 'Canjeados', color: 'text-red-400',    bg: 'bg-red-500/10',    sign: '' },
    bonus:    { label: 'Bonus',     color: 'text-voraz-yellow', bg: 'bg-yellow-500/10', sign: '+' },
};

const VorazClub = ({ onBack, onOpenAuth }) => {
    const { user, logout, refreshUser, getToken } = useAuth();
    const [activeTab, setActiveTab] = useState('puntos');
    const [pointsData, setPointsData] = useState({ points: 0, history: [] });
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) { setLoading(false); return; }
        const token = getToken();
        Promise.all([
            getPointsHistory(user.id, token),
            getUserOrders(user.id, token),
        ]).then(([pts, ords]) => {
            if (pts) setPointsData(pts);
            if (ords) setOrders(ords);
        }).finally(() => setLoading(false));
    }, [user]);

    const POINTS_BLOCK = 500;
    const pointsInPesos = Math.floor(pointsData.points / POINTS_BLOCK) * (TENANT.pointsRedeemValue || 0);
    const canRedeem = pointsData.points >= POINTS_BLOCK;

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center pb-32">
                <div className="text-7xl mb-4">⭐</div>
                <h2 className="text-3xl font-black text-white uppercase mb-2">Voraz <span className="text-voraz-yellow">Club</span></h2>
                <p className="text-gray-400 text-sm mb-8 max-w-xs">Iniciá sesión para ver tus puntos, historial de pedidos y beneficios exclusivos.</p>
                <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={onOpenAuth}
                    className="bg-voraz-red text-white px-8 py-4 rounded-xl font-black uppercase tracking-wide text-sm shadow-lg hover:bg-red-700 transition"
                >
                    Ingresar / Registrarse
                </motion.button>
                <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-sm">
                    {[
                        { icon: '🛒', title: 'Puntos por pedido', desc: 'Acumulá puntos en cada producto' },
                        { icon: '🎁', title: 'Canjear puntos', desc: `500 pts = $${TENANT.pointsRedeemValue || 0}` },
                        { icon: '🎉', title: 'Beneficios', desc: 'Descuentos exclusivos' },
                    ].map(b => (
                        <div key={b.title} className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                            <div className="text-2xl mb-1">{b.icon}</div>
                            <p className="text-white text-[10px] font-bold leading-tight">{b.title}</p>
                            <p className="text-gray-500 text-[9px] mt-0.5">{b.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="container mx-auto px-4 py-6 pb-32 max-w-lg"
        >
            {/* Header */}
            <div className="flex items-center mb-6">
                <button onClick={onBack} className="text-gray-400 hover:text-white mr-3 p-2 rounded-full hover:bg-white/10 transition">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="flex-grow">
                    <h2 className="text-2xl font-black text-white uppercase">Voraz <span className="text-voraz-yellow">Club</span></h2>
                    <p className="text-gray-500 text-xs">Hola, {user.name.split(' ')[0]} 👋</p>
                </div>
                <button onClick={() => { logout(); onBack(); }} className="text-gray-500 hover:text-red-400 text-xs font-bold uppercase transition p-2">Salir</button>
            </div>

            {/* Tarjeta de puntos */}
            <div className="relative bg-gradient-to-br from-voraz-red via-red-800 to-black rounded-2xl p-6 mb-6 overflow-hidden shadow-2xl border border-red-900/50">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-10 translate-x-10"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/20 rounded-full translate-y-8 -translate-x-8"></div>
                <div className="relative">
                    <p className="text-white/60 text-xs uppercase tracking-widest font-bold mb-1">Tu saldo</p>
                    <div className="flex items-end space-x-2 mb-3">
                        <span className="text-5xl font-black text-white">{pointsData.points}</span>
                        <span className="text-voraz-yellow font-bold text-lg mb-1">pts</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${canRedeem ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                        <p className="text-white/70 text-xs">
                            {canRedeem
                                ? `Podés canjear hasta $${fmt(pointsInPesos)} de descuento`
                                : `Te faltan ${POINTS_BLOCK - (pointsData.points % POINTS_BLOCK)} pts para canjear`}
                        </p>
                    </div>
                    <div className="mt-3 bg-black/20 rounded-full h-1.5">
                        <div
                            className="bg-voraz-yellow h-1.5 rounded-full transition-all"
                            style={{ width: `${Math.min(100, (pointsData.points % POINTS_BLOCK) / POINTS_BLOCK * 100)}%` }}
                        ></div>
                    </div>
                    <p className="text-white/40 text-[10px] mt-1 text-right">{pointsData.points % POINTS_BLOCK}/{POINTS_BLOCK} pts para próximo canje</p>
                </div>
            </div>

            {/* Cómo funciona */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                    { icon: '🛒', title: 'Comprá', desc: 'Acumulá puntos' },
                    { icon: '⭐', title: 'Acumulá', desc: `500 pts = $${TENANT.pointsRedeemValue || 0}` },
                    { icon: '🎁', title: 'Canjea', desc: 'En tu próximo pedido' },
                ].map(b => (
                    <div key={b.title} className="bg-white/5 border border-white/5 rounded-xl p-3 text-center">
                        <div className="text-xl mb-1">{b.icon}</div>
                        <p className="text-white text-[10px] font-bold">{b.title}</p>
                        <p className="text-gray-500 text-[9px] mt-0.5">{b.desc}</p>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="flex bg-white/5 rounded-xl p-1 mb-5">
                {[['puntos', 'Mis Puntos'], ['pedidos', 'Mis Pedidos']].map(([key, label]) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition ${activeTab === key ? 'bg-voraz-red text-white shadow' : 'text-gray-500 hover:text-white'}`}
                    >
                        {label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />)}
                </div>
            ) : activeTab === 'puntos' ? (
                <div className="space-y-2">
                    {pointsData.history.length === 0 ? (
                        <div className="text-center py-10 text-gray-600">
                            <p className="text-3xl mb-2">⭐</p>
                            <p className="text-sm">Aún no tenés movimientos de puntos.</p>
                        </div>
                    ) : pointsData.history.map(item => {
                        const cfg = typeConfig[item.type] || typeConfig.bonus;
                        return (
                            <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border border-white/5 ${cfg.bg}`}>
                                <div>
                                    <p className="text-white text-sm font-bold">{item.description}</p>
                                    <p className="text-gray-500 text-[10px]">{new Date(item.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-black text-base ${cfg.color}`}>{cfg.sign}{Math.abs(item.points)} pts</p>
                                    <p className="text-[9px] text-gray-600 uppercase font-bold">{cfg.label}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="space-y-2">
                    {orders.length === 0 ? (
                        <div className="text-center py-10 text-gray-600">
                            <p className="text-3xl mb-2">📋</p>
                            <p className="text-sm">Aún no tenés pedidos realizados.</p>
                        </div>
                    ) : orders.map(order => (
                        <div key={order.id} className="bg-white/5 border border-white/5 rounded-xl p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="text-white font-bold text-sm">Pedido #{order.id}</p>
                                    <p className="text-gray-500 text-[10px]">{new Date(order.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${order.status === 'delivered' ? 'bg-green-500/20 text-green-400' : order.status === 'cancelled' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {order.status}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <p className="text-gray-400 text-xs capitalize">{order.order_type === 'delivery' ? '🛵 Delivery' : '🏪 Retiro'}</p>
                                <div className="text-right">
                                    <p className="text-voraz-yellow font-black text-sm">${fmt(order.total)}</p>
                                    {order.points_earned > 0 && <p className="text-[9px] text-green-400">+{order.points_earned} pts</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

export default VorazClub;
