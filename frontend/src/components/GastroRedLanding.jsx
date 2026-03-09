import { useState, useEffect, useCallback } from 'react';
import SuperAdminPanel from './SuperAdminPanel';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').trim();
const GASTRORED_DOMAIN = (import.meta.env.VITE_GASTRORED_DOMAIN || 'gastrored.com.ar').trim();

// ── Logo GastroRed como SVG inline (sin dependencia de archivo externo) ──────
function GastroRedLogo({ size = 48, className = '' }) {
    return (
        <svg width={size * 2.8} height={size} viewBox="0 0 280 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            {/* Chef hat */}
            <path d="M28 52 C16 52 8 44 8 34 C8 26 13 20 20 18 C20 12 25 7 32 7 C36 7 40 9 42 12 C44 9 48 7 52 7 C59 7 64 12 64 18 C71 20 76 26 76 34 C76 44 68 52 56 52 Z" fill="url(#hatGrad)" opacity="0.9" />
            {/* Hat base band */}
            <rect x="18" y="50" width="48" height="8" rx="2" fill="url(#hatGrad)" />
            {/* Fork */}
            <line x1="34" y1="22" x2="34" y2="44" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <line x1="31" y1="22" x2="31" y2="30" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="37" y1="22" x2="37" y2="30" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            {/* Knife */}
            <line x1="42" y1="22" x2="42" y2="44" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M42 22 C42 22 46 24 46 28 L42 30" stroke="white" strokeWidth="1.5" fill="none" />
            {/* Spoon */}
            <line x1="50" y1="30" x2="50" y2="44" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <ellipse cx="50" cy="26" rx="4" ry="5" fill="white" opacity="0.9" />
            {/* Text: Gastro */}
            <text x="88" y="44" fontFamily="'Segoe UI', system-ui, sans-serif" fontWeight="800" fontSize="32" fill="#1a3a4a" letterSpacing="-0.5">Gastro</text>
            {/* Text: Red */}
            <text x="197" y="44" fontFamily="'Segoe UI', system-ui, sans-serif" fontWeight="800" fontSize="32" fill="url(#textGrad)" letterSpacing="-0.5">Red</text>
            {/* Tagline */}
            <text x="89" y="60" fontFamily="'Segoe UI', system-ui, sans-serif" fontWeight="400" fontSize="11" fill="#0d9488" letterSpacing="2">SINCRONIZACIÓN TOTAL</text>
            <defs>
                <linearGradient id="hatGrad" x1="8" y1="7" x2="76" y2="60">
                    <stop offset="0%" stopColor="#0d9488" />
                    <stop offset="100%" stopColor="#1a3a4a" />
                </linearGradient>
                <linearGradient id="textGrad" x1="197" y1="20" x2="240" y2="50">
                    <stop offset="0%" stopColor="#0d9488" />
                    <stop offset="100%" stopColor="#059669" />
                </linearGradient>
            </defs>
        </svg>
    );
}

// ── Partículas de fondo ───────────────────────────────────────────────────────
function FloatingParticle({ delay, duration, x, size }) {
    return (
        <div
            className="absolute rounded-full opacity-20 animate-pulse"
            style={{
                left: `${x}%`,
                bottom: '-20px',
                width: size,
                height: size,
                background: 'radial-gradient(circle, #0d9488, transparent)',
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
            }}
        />
    );
}

// ── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, delay = 0 }) {
    return (
        <div
            className="group relative bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6 hover:border-teal-500/40 transition-all duration-500 hover:translate-y-[-4px]"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                    {icon}
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

// ── Step card ─────────────────────────────────────────────────────────────────
function StepCard({ number, title, desc, icon }) {
    return (
        <div className="flex gap-5 items-start group">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 flex items-center justify-center text-2xl shadow-lg shadow-teal-900/40 group-hover:scale-105 transition-transform">
                {icon}
            </div>
            <div>
                <div className="text-xs text-teal-400 font-bold uppercase tracking-widest mb-1">Paso {number}</div>
                <h4 className="text-white font-bold text-lg leading-tight mb-1">{title}</h4>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({ name, price, period, badge, features, cta, highlighted = false, badgeColor = 'teal', onSelect }) {
    const badgeColors = {
        teal: 'bg-teal-500 text-white',
        yellow: 'bg-yellow-400 text-black',
        gray: 'bg-gray-700 text-gray-200',
    };
    return (
        <div className={`relative rounded-3xl p-8 flex flex-col transition-all duration-500 hover:translate-y-[-6px] ${highlighted
            ? 'bg-gradient-to-br from-teal-900/60 to-teal-800/20 border-2 border-teal-500/60 shadow-2xl shadow-teal-900/40'
            : 'bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-teal-500/30'
            }`}>
            {badge && (
                <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider ${badgeColors[badgeColor]}`}>
                    {badge}
                </div>
            )}
            <div className="mb-6">
                <h3 className="text-white font-black text-2xl mb-1">{name}</h3>
                <div className="flex items-end gap-2 mb-1">
                    {price === 0 ? (
                        <span className="text-4xl font-black text-teal-400">GRATIS</span>
                    ) : (
                        <>
                            <span className="text-4xl font-black text-white">${price.toLocaleString('es-AR')}</span>
                            <span className="text-gray-400 text-sm mb-1">/{period}</span>
                        </>
                    )}
                </div>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
                {features.map((f, i) => (
                    <li key={i} className={`flex items-start gap-3 text-sm ${f.disabled ? 'opacity-40' : ''}`}>
                        <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${f.disabled ? 'bg-gray-700 text-gray-500' : 'bg-teal-500/20 text-teal-400'
                            }`}>
                            {f.disabled ? '\u2715' : '\u2713'}
                        </span>
                        <span className={f.disabled ? 'text-gray-600' : 'text-gray-300'}>{f.text}</span>
                    </li>
                ))}
            </ul>
            <button
                onClick={onSelect}
                className={`block w-full text-center py-4 rounded-xl font-black uppercase tracking-wide text-sm transition-all duration-300 ${highlighted
                    ? 'bg-teal-500 hover:bg-teal-400 text-white shadow-lg shadow-teal-900/50'
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/10'
                    }`}
            >
                {cta}
            </button>
        </div>
    );
}

// ── Stat ─────────────────────────────────────────────────────────────────────
function Stat({ value, label }) {
    return (
        <div className="text-center">
            <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 mb-1">{value}</div>
            <div className="text-gray-400 text-sm">{label}</div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// CHECKOUT MODAL
// ════════════════════════════════════════════════════════════════════════════
function CheckoutModal({ plan, onClose }) {
    const isTrial = plan.plan_type === 'Trial';
    const EMPTY = { name: '', subdomain: '', admin_email: '', slogan: '', subscription_period: 'monthly' };
    const [form, setForm] = useState(EMPTY);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(null);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const cleanSub = form.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isTrial) {
                const res = await fetch(`${API_URL}/subscriptions/trial`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...form, subdomain: cleanSub }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message);
                setSuccess(data.data);
            } else {
                const res = await fetch(`${API_URL}/subscriptions/checkout-public`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...form,
                        subdomain: cleanSub,
                        plan_type: plan.plan_type,
                    }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message);
                // Redirigir a MercadoPago
                window.location.href = data.data.init_point;
            }
        } catch (err) {
            setError(err.message || 'Error inesperado. Intentá de nuevo.');
        }
        setLoading(false);
    };

    // Pantalla de éxito para trial
    if (success) {
        return (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
                <div className="bg-[#0d1117] border border-teal-500/30 rounded-3xl p-8 max-w-md w-full text-center" onClick={e => e.stopPropagation()}>
                    <div className="text-6xl mb-4">🎉</div>
                    <h3 className="text-2xl font-black text-white mb-2">¡Tu prueba comenzó!</h3>
                    <p className="text-gray-400 text-sm mb-6">{success.message}</p>
                    <div className="bg-teal-900/30 border border-teal-500/30 rounded-xl p-4 mb-6 text-left">
                        <p className="text-xs text-gray-400 mb-1">Tu carta está en:</p>
                        <a href={`https://${success.subdomain}.${GASTRORED_DOMAIN}`} target="_blank" rel="noreferrer"
                            className="text-teal-400 font-mono font-bold hover:underline text-sm">
                            {success.subdomain}.{GASTRORED_DOMAIN}
                        </a>
                        <p className="text-xs text-gray-500 mt-2">store_id: <strong className="text-white">{success.id}</strong> — válido hasta: <strong className="text-white">{new Date(success.subscription_expires_at).toLocaleDateString('es-AR')}</strong></p>
                    </div>
                    <div className="space-y-2">
                        <a href={`https://${success.subdomain}.${GASTRORED_DOMAIN}/admin`} target="_blank" rel="noreferrer"
                            className="block w-full bg-teal-500 hover:bg-teal-400 text-white py-3 rounded-xl font-black text-sm">
                            Ir al panel de admin →
                        </a>
                        <button onClick={onClose} className="block w-full text-gray-500 hover:text-white py-2 text-sm">Cerrar</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#0d1117] border border-white/10 rounded-3xl p-8 max-w-lg w-full" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <div className="text-xs text-teal-400 font-bold uppercase tracking-widest mb-0.5">{isTrial ? 'Prueba gratuita' : 'Suscripción'}</div>
                        <h2 className="text-2xl font-black text-white">Plan {plan.plan_type}</h2>
                        {!isTrial && (
                            <p className="text-sm text-gray-400">
                                ${(plan.prices?.[form.subscription_period] || 0).toLocaleString('es-AR')}/mes
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Período (solo para planes pagos) */}
                    {!isTrial && (
                        <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
                            <button type="button" onClick={() => set('subscription_period', 'monthly')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${form.subscription_period === 'monthly' ? 'bg-teal-500 text-white' : 'text-gray-400 hover:text-white'
                                    }`}>
                                Mensual
                            </button>
                            <button type="button" onClick={() => set('subscription_period', 'annual')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${form.subscription_period === 'annual' ? 'bg-teal-500 text-white' : 'text-gray-400 hover:text-white'
                                    }`}>
                                Anual <span className="text-xs text-green-400">(2 meses gratis)</span>
                            </button>
                        </div>
                    )}

                    <input placeholder="Nombre del restaurante *" value={form.name}
                        onChange={e => set('name', e.target.value)} required
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500" />

                    <div>
                        <input placeholder="Subdomain * (ej: miburguer)" value={form.subdomain}
                            onChange={e => set('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} required
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500" />
                        {cleanSub && (
                            <p className="mt-1.5 text-xs text-teal-400 font-mono">
                                Tu carta: <strong>{cleanSub}.{GASTRORED_DOMAIN}</strong>
                            </p>
                        )}
                    </div>

                    <input placeholder="Email del dueño *" type="email" value={form.admin_email}
                        onChange={e => set('admin_email', e.target.value)} required
                        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500" />

                    {error && (
                        <div className="bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <button type="submit" disabled={loading}
                        className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white py-4 rounded-xl font-black uppercase tracking-wide transition">
                        {loading
                            ? 'Procesando...'
                            : isTrial
                                ? 'Activar prueba gratuita →'
                                : `Ir a pagar $${(plan.prices?.[form.subscription_period] || 0).toLocaleString('es-AR')} →`}
                    </button>

                    <p className="text-center text-xs text-gray-600">
                        {isTrial
                            ? 'Sin tarjeta de crédito. Cancelá cuando quieras.'
                            : 'Redirigimos a MercadoPago de forma segura.'}
                    </p>
                </form>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// LANDING PAGE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function GastroRedLanding() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null); // abre el modal
    const [showSuperAdmin, setShowSuperAdmin] = useState(false);

    useEffect(() => {
        const handler = () => setScrolled(window.scrollY > 30);
        window.addEventListener('scroll', handler);
        return () => window.removeEventListener('scroll', handler);
    }, []);

    const navLinks = [
        { href: '#problema', label: 'El Problema' },
        { href: '#funcionalidades', label: 'Funcionalidades' },
        { href: '#como-funciona', label: 'Cómo Funciona' },
        { href: '#planes', label: 'Planes' },
    ];

    const features = [
        { icon: '🛒', title: 'Menú Digital', desc: 'Carta digital interactiva con fotos, categorías, badges y precios actualizados en tiempo real. Sin apps que descargar.' },
        { icon: '📦', title: 'Gestión de Pedidos', desc: 'Recibí pedidos online desde la app y gestioná el estado de cada uno desde el panel de admin.' },
        { icon: '💳', title: 'Pagos con Mercado Pago', desc: 'Checkout integrado con MercadoPago. Cada comercio conecta su propia cuenta. Sin intermediarios.' },
        { icon: '🎟️', title: 'Cupones y Fidelización', desc: 'Creá cupones de descuento personalizados. Sistema de puntos para premiar la lealtad de tus clientes.' },
        { icon: '📊', title: 'Panel Admin Completo', desc: 'Dashboard con métricas de ventas, gestión de productos, categorías, locales y más desde cualquier dispositivo.' },
        { icon: '🔗', title: 'Dominio Propio', desc: 'Cada comercio accede desde su propio dominio o subdominio. Tu marca, tu URL, tu identidad.' },
        { icon: '🎨', title: 'Branding Personalizado', desc: 'Colores de marca, logo, slogan. La app se adapta completamente a la identidad visual de cada negocio.' },
        { icon: '📍', title: 'Locales y Delivery', desc: 'Mostrá todas tus sucursales con mapa y links de delivery integrados (PedidosYa, Rappi, WhatsApp).' },
        { icon: '☁️', title: 'Infraestructura Cloud', desc: 'Servidor en Railway, imágenes en Cloudinary. Alta disponibilidad sin que te preocupés por la tecnología.' },
    ];

    const steps = [
        { number: 1, icon: '📋', title: 'GastroRed te da de alta', desc: 'Completás un formulario con el nombre del negocio, colores de marca, dominio y email. En minutos tu plataforma está activa.' },
        { number: 2, icon: '🎨', title: 'Personalizás tu espacio', desc: 'Entrás al panel de admin y cargás tus categorías, productos con fotos y precios, los locales y cualquier configuración de tu negocio.' },
        { number: 3, icon: '💰', title: 'Conectás Mercado Pago', desc: 'Ingresás tus credenciales de MercadoPago en el panel. Los pagos van directo a tu cuenta — GastroRed nunca toca tu plata.' },
        { number: 4, icon: '🚀', title: 'Comenzás a vender', desc: 'Compartís el link de tu carta, tus clientes hacen pedidos y pagos desde el celular, y vos gestionás todo desde el admin.' },
    ];

    const plans = [
        {
            plan_type: 'Trial',
            name: 'Prueba Gratis',
            price: 0,
            period: '7 días',
            badge: '\uD83C\uDF81 Sin tarjeta',
            badgeColor: 'gray',
            cta: 'Empezar gratis',
            prices: { monthly: 0, annual: 0 },
            features: [
                { text: 'Menú digital completo' },
                { text: 'Panel de administración' },
                { text: 'Hasta 20 productos' },
                { text: 'Pedidos online' },
                { text: 'MercadoPago integrado' },
                { text: 'Soporte por email' },
                { text: 'Subdominio de GastroRed', disabled: false },
                { text: 'Dominio propio', disabled: true },
            ],
        },
        {
            plan_type: 'Full Digital',
            name: 'Full Digital',
            price: 60000,
            period: 'mes',
            badge: '\u2B50 Más elegido',
            badgeColor: 'teal',
            highlighted: true,
            cta: 'Empezar ahora',
            prices: { monthly: 60000, annual: 600000 },
            features: [
                { text: 'Todo lo de Prueba Gratis' },
                { text: 'Hasta 50 productos activos' },
                { text: 'Cupones de descuento' },
                { text: 'Sistema de puntos / fidelización' },
                { text: 'Análisis de ventas y pedidos' },
                { text: 'Subdominio + Dominio propio' },
                { text: 'Soporte prioritario' },
                { text: 'Branding personalizado' },
            ],
        },
        {
            plan_type: 'Expert',
            name: 'Expert',
            price: 100000,
            period: 'mes',
            badge: '\uD83C\uDFC6 Máximo poder',
            badgeColor: 'yellow',
            cta: 'Quiero Expert',
            prices: { monthly: 100000, annual: 1000000 },
            features: [
                { text: 'Todo lo de Full Digital' },
                { text: 'Productos ilimitados' },
                { text: 'Múltiples sucursales' },
                { text: 'Influencers y videos integrados' },
                { text: 'Noticias y blog de marca' },
                { text: 'Gestión avanzada de pedidos' },
                { text: 'Soporte directo por WhatsApp' },
                { text: 'Acceso anticipado a nuevas funciones' },
            ],
        },
    ];

    return (
        <div className="min-h-screen bg-[#080c12] text-white font-sans overflow-x-hidden">

            {/* Modal de checkout */}
            {selectedPlan && <CheckoutModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />}

            {/* Modal Superadmin */}
            {showSuperAdmin && (
                <div className="fixed inset-0 z-[300] overflow-y-auto">
                    <SuperAdminPanel onBack={() => setShowSuperAdmin(false)} />
                </div>
            )}

            {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#080c12]/90 backdrop-blur-xl border-b border-white/5 shadow-2xl' : 'bg-transparent'
                }`}>
                <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
                    <GastroRedLogo size={36} />
                    <div className="hidden md:flex items-center gap-8">
                        {navLinks.map(l => (
                            <a key={l.href} href={l.href} className="text-gray-400 hover:text-white text-sm font-medium transition-colors duration-200 hover:text-teal-400">
                                {l.label}
                            </a>
                        ))}
                    </div>
                    <div className="hidden md:flex items-center gap-3">
                        <a href="#contacto" className="text-gray-300 hover:text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-white/5 transition">
                            Contacto
                        </a>
                        <a href="#planes" className="bg-teal-500 hover:bg-teal-400 text-white px-5 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-teal-900/30">
                            Ver planes →
                        </a>
                    </div>
                    {/* Mobile menu button */}
                    <button onClick={() => setMobileMenuOpen(p => !p)} className="md:hidden p-2 rounded-xl bg-white/5">
                        <div className="w-5 h-0.5 bg-white mb-1.5"></div>
                        <div className="w-5 h-0.5 bg-white mb-1.5"></div>
                        <div className="w-5 h-0.5 bg-white"></div>
                    </button>
                </div>
                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-[#0d1117] border-b border-white/10 px-4 py-4 space-y-3">
                        {navLinks.map(l => (
                            <a key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)}
                                className="block text-gray-300 hover:text-teal-400 font-medium py-2 border-b border-white/5">
                                {l.label}
                            </a>
                        ))}
                        <a href="#planes" className="block text-center bg-teal-500 text-white py-3 rounded-xl font-bold mt-2">
                            Ver planes →
                        </a>
                    </div>
                )}
            </nav>

            {/* ── HERO ───────────────────────────────────────────────────────────── */}
            <section id="inicio" className="relative min-h-screen flex items-center overflow-hidden">
                {/* Fondo animado */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/8 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-teal-500/5 rounded-full" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border border-teal-500/5 rounded-full" />
                </div>

                <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-20 w-full">
                    <div className="max-w-3xl mx-auto text-center">

                        <div className="inline-flex items-center gap-2 bg-teal-500/10 border border-teal-500/20 rounded-full px-4 py-2 text-sm text-teal-400 mb-8 font-medium">
                            <span className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></span>
                            Plataforma SaaS para Gastronomía Argentina
                        </div>

                        <h1 className="text-5xl md:text-7xl font-black leading-none mb-6">
                            Tu restaurante,{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                                digitalizado
                            </span>
                            <br />en minutos.
                        </h1>

                        <p className="text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10">
                            GastroRed es la plataforma que convierte tu negocio gastronómico en una experiencia digital completa.
                            Menú online, pedidos, pagos y fidelización —{' '}
                            <strong className="text-white">todo desde un solo lugar.</strong>
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <a href="#planes"
                                className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-white px-8 py-4 rounded-xl font-black text-lg transition-all shadow-2xl shadow-teal-900/50 hover:shadow-teal-900/70 hover:-translate-y-1">
                                Probá gratis 7 días
                                <span>→</span>
                            </a>
                            <a href="#como-funciona"
                                className="inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all">
                                Cómo funciona
                            </a>
                        </div>

                        {/* Stats rápidos */}
                        <div className="mt-16 flex flex-wrap justify-center gap-8 md:gap-16">
                            <Stat value="5 min" label="Para estar online" />
                            <Stat value="0%" label="Comisión por pedido" />
                            <Stat value="100%" label="Tu marca, tu negocio" />
                        </div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
                    <div className="w-6 h-10 border-2 border-white/20 rounded-full flex items-start justify-center pt-2">
                        <div className="w-1 h-2 bg-white/40 rounded-full"></div>
                    </div>
                </div>
            </section>

            {/* ── EL PROBLEMA ──────────────────────────────────────────────────────── */}
            <section id="problema" className="py-24 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-teal-950/10 to-transparent" />
                <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
                    <div className="text-center mb-16">
                        <div className="text-teal-400 text-sm font-bold uppercase tracking-widest mb-4">El problema</div>
                        <h2 className="text-4xl md:text-5xl font-black mb-6">
                            ¿Cuánto tiempo perdés{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-rose-600">
                                sin digitalización?
                            </span>
                        </h2>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                            La mayoría de los restaurantes argentinos siguen dependiendo de WhatsApp, llamados y hojas de papel para gestionar su negocio.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6 mb-12">
                        {[
                            { icon: '😤', title: 'Pedidos caóticos', desc: 'WhatsApp saturado, pedidos que se pierden, clientes que no saben el menú actualizado. Caos en hora pico.' },
                            { icon: '💸', title: 'Sin datos de ventas', desc: 'No sabés qué platos venden más, a qué hora tenés más demanda, ni cuánto ingresás por semana.' },
                            { icon: '😴', title: 'Trabajo manual infinito', desc: 'Actualizar precios manualmente, hacer carteles, responder consultas repetitivas. Horas que podrían automatizarse.' },
                        ].map(p => (
                            <div key={p.title} className="bg-gradient-to-br from-red-900/20 to-rose-900/10 border border-red-500/20 rounded-2xl p-6">
                                <div className="text-4xl mb-4">{p.icon}</div>
                                <h3 className="text-white font-bold text-lg mb-2">{p.title}</h3>
                                <p className="text-gray-400 text-sm leading-relaxed">{p.desc}</p>
                            </div>
                        ))}
                    </div>
                    <div className="text-center">
                        <div className="inline-flex items-center gap-3 bg-teal-500/10 border border-teal-500/30 rounded-2xl px-8 py-4 text-teal-300 font-bold text-lg">
                            <span className="text-2xl">✨</span>
                            GastroRed resuelve todo esto desde el día 1
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FUNCIONALIDADES ─────────────────────────────────────────────────── */}
            <section id="funcionalidades" className="py-24">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="text-center mb-16">
                        <div className="text-teal-400 text-sm font-bold uppercase tracking-widest mb-4">Funcionalidades</div>
                        <h2 className="text-4xl md:text-5xl font-black mb-4">
                            Todo lo que necesitás,{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">nada más.</span>
                        </h2>
                        <p className="text-gray-400 text-lg max-w-xl mx-auto">Sin bloat, sin configuraciones infinitas. Cada función fue pensada para el gastronómico argentino.</p>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {features.map((f, i) => <FeatureCard key={i} {...f} delay={i * 50} />)}
                    </div>
                </div>
            </section>

            {/* ── CÓMO FUNCIONA ────────────────────────────────────────────────────── */}
            <section id="como-funciona" className="py-24 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-teal-950/15 to-transparent" />
                <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <div className="text-teal-400 text-sm font-bold uppercase tracking-widest mb-4">Cómo funciona</div>
                            <h2 className="text-4xl md:text-5xl font-black mb-6">
                                De cero a{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                                    vender online
                                </span>
                                <br />en 4 pasos.
                            </h2>
                            <p className="text-gray-400 text-lg mb-10">
                                Sin instalar nada, sin conocimientos técnicos. GastroRed se encarga de toda la infraestructura para que vos te concentrés en cocinar.
                            </p>
                            <div className="space-y-8">
                                {steps.map(s => <StepCard key={s.number} {...s} />)}
                            </div>
                        </div>
                        {/* Panel preview mock */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-teal-500/10 rounded-3xl blur-3xl" />
                            <div className="relative bg-gradient-to-br from-[#0d1117] to-[#131b26] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                {/* Browser chrome */}
                                <div className="bg-[#0a0e16] px-4 py-3 border-b border-white/5 flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500/70" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/70" />
                                    </div>
                                    <div className="flex-1 bg-white/5 rounded-lg px-3 py-1 text-xs text-gray-500 font-mono">
                                        mirestaurante.gastrored.com.ar/admin
                                    </div>
                                </div>
                                {/* Admin UI Mock */}
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <div className="text-white font-bold">Panel Admin</div>
                                            <div className="text-xs text-gray-500">Mi Restaurante · Hoy</div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-sm">🍔</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        {[
                                            { label: 'Pedidos hoy', value: '24', color: 'text-blue-400' },
                                            { label: 'Ingresos', value: '$186k', color: 'text-green-400' },
                                            { label: 'Productos', value: '42', color: 'text-yellow-400' },
                                            { label: 'Clientes', value: '318', color: 'text-purple-400' },
                                        ].map(s => (
                                            <div key={s.label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                                                <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                                                <div className="text-xs text-gray-500">{s.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Mini order list */}
                                    <div className="bg-white/5 rounded-xl border border-white/5 divide-y divide-white/5">
                                        {[
                                            { order: 'Voraz Burger x2', status: 'Preparando', amt: '$48.400', color: 'text-yellow-400' },
                                            { order: 'Crispy Chicken x1', status: 'Listo', amt: '$14.800', color: 'text-green-400' },
                                            { order: 'Papas + Coca x3', status: 'Entregado', amt: '$21.000', color: 'text-gray-500' },
                                        ].map((o, i) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-2.5">
                                                <div className="text-xs text-gray-300 truncate flex-1">{o.order}</div>
                                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full mx-2 ${o.color} bg-current/10`} style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>{o.status}</div>
                                                <div className="text-xs font-bold text-white flex-shrink-0">{o.amt}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── PLANES ──────────────────────────────────────────────────────────── */}
            <section id="planes" className="py-24">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="text-center mb-16">
                        <div className="text-teal-400 text-sm font-bold uppercase tracking-widest mb-4">Planes y Precios</div>
                        <h2 className="text-4xl md:text-5xl font-black mb-4">
                            Empezá gratis.{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">
                                Crecé con nosotros.
                            </span>
                        </h2>
                        <p className="text-gray-400 text-lg max-w-xl mx-auto">
                            7 días sin costo, sin tarjeta de crédito. Cuando querés seguir, elegís el plan que se adapte a tu negocio.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6 mt-8">
                        {plans.map(p => <PlanCard key={p.name} {...p} onSelect={() => setSelectedPlan(p)} />)}
                    </div>
                    <p className="text-center text-gray-600 text-sm mt-8">
                        Precios en ARS. Facturación mensual. Podés cancelar cuando quieras.
                    </p>
                </div>
            </section>

            {/* ── PARA EL DUEÑO ────────────────────────────────────────────────────── */}
            <section className="py-24 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-teal-950/10 to-transparent" />
                <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
                    <div className="text-center mb-16">
                        <div className="text-teal-400 text-sm font-bold uppercase tracking-widest mb-4">Para el dueño del comercio</div>
                        <h2 className="text-4xl md:text-5xl font-black mb-4">
                            Vos mandás.{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Nosotros ponemos la tech.</span>
                        </h2>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8">
                        {[
                            {
                                icon: '📱', title: 'Gestionás desde el celular',
                                desc: 'El panel de administración funciona perfecto en mobile. Editá precios, chequeá pedidos y gestioná tu negocio desde donde estés.'
                            },
                            {
                                icon: '💰', title: 'La plata es tuya desde el minuto 0',
                                desc: 'Conectás tu propia cuenta de MercadoPago. Cada pago va directo a vos. GastroRed no cobra comisión por venta, solo la suscripción.'
                            },
                            {
                                icon: '🎨', title: 'Tu marca, tu identidad',
                                desc: 'Definís colores, subís tu logo, ponés tu slogan. Tus clientes ven tu marca, no "GastroRed". La plataforma es invisible.'
                            },
                            {
                                icon: '🔒', title: 'Sin contratos, sin letra chica',
                                desc: 'Subscripción mensual, cancelás cuando querés. No hay penalidades, no hay períodos mínimos. Transparencia total.'
                            },
                        ].map(f => (
                            <div key={f.title} className="flex gap-5 bg-white/3 border border-white/8 rounded-2xl p-6 hover:border-teal-500/20 transition-all">
                                <div className="text-4xl flex-shrink-0">{f.icon}</div>
                                <div>
                                    <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA FINAL ────────────────────────────────────────────────────────── */}
            <section id="contacto" className="py-24">
                <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
                    <div className="relative bg-gradient-to-br from-teal-900/40 to-teal-800/20 border border-teal-500/30 rounded-3xl p-12 md:p-16 overflow-hidden">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-teal-500/15 rounded-full blur-3xl" />
                        <div className="relative">
                            <div className="text-5xl mb-6">🍽️</div>
                            <h2 className="text-4xl md:text-5xl font-black mb-4">
                                ¿Listo para digitalizar{' '}
                                <span className="text-teal-400">tu restaurante?</span>
                            </h2>
                            <p className="text-gray-300 text-lg mb-8 max-w-xl mx-auto">
                                Arrancá con 7 días gratis. Sin técnicos, sin complicaciones, sin letra chica.
                                En minutos tu carta está online.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <a
                                    href="mailto:hola@gastrored.com.ar?subject=Quiero sumarme a GastroRed&body=Hola! Me interesa probar GastroRed para mi restaurante."
                                    className="inline-flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-400 text-white px-8 py-4 rounded-xl font-black text-lg transition-all shadow-2xl shadow-teal-900/50 hover:-translate-y-1"
                                >
                                    Escribinos por email 📩
                                </a>
                                <a
                                    href="https://wa.me/5491112345678?text=Hola!%20Quiero%20probar%20GastroRed%20para%20mi%20restaurante."
                                    target="_blank" rel="noreferrer"
                                    className="inline-flex items-center justify-center gap-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] px-8 py-4 rounded-xl font-black text-lg transition-all"
                                >
                                    WhatsApp 💬
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
            <footer className="border-t border-white/5 py-12">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <GastroRedLogo size={28} />
                        <div className="flex gap-6 text-sm text-gray-500">
                            <a href="#funcionalidades" className="hover:text-teal-400 transition">Funcionalidades</a>
                            <a href="#planes" className="hover:text-teal-400 transition">Planes</a>
                            <a href="#contacto" className="hover:text-teal-400 transition">Contacto</a>
                        </div>
                        <div className="flex items-center gap-4">
                            <p className="text-gray-600 text-sm">© 2026 GastroRed — Sincronización Total</p>
                            <button
                                onClick={() => setShowSuperAdmin(true)}
                                className="text-xs text-gray-700 hover:text-teal-500 transition px-2 py-1 rounded border border-white/5 hover:border-teal-500/30"
                                title="Acceso Superadmin"
                            >
                                🔒 Superadmin
                            </button>
                        </div>
                    </div>
                </div>
            </footer>

        </div>
    );
}
