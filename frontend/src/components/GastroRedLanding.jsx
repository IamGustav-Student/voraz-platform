import { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// ── Mouse Glow Background Effect ──────────────────────────────────────────────
function MouseGlow() {
    useEffect(() => {
        const glow = document.getElementById('mouse-glow');
        if (!glow) return;
        const moveHandler = (e) => {
            gsap.to(glow, {
                x: e.clientX,
                y: e.clientY,
                duration: 0.8,
                ease: 'power2.out'
            });
        };
        window.addEventListener('mousemove', moveHandler);
        return () => window.removeEventListener('mousemove', moveHandler);
    }, []);

    return (
        <div 
            id="mouse-glow" 
            className="fixed top-0 left-0 w-[800px] h-[800px] bg-red-600/20 blur-[180px] rounded-full pointer-events-none z-[1] -translate-x-1/2 -translate-y-1/2 opacity-60"
        />
    );
}
import SuperAdminPanel from './SuperAdminPanel';
import FeaturesSection from './FeaturesSection';
import ModuleGallery from './ModuleGallery';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').trim();
const GASTRORED_DOMAIN = (import.meta.env.VITE_GASTRORED_DOMAIN || 'gastrored.com.ar').trim();

// ── Logo GastroRed como SVG inline (sin dependencia de archivo externo) ──────
// ── Logo GastroRed como SVG inline (colores gastronómicos) ──────
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
            <text x="88" y="44" fontFamily="'Outfit', sans-serif" fontWeight="900" fontSize="34" fill="#FFFFFF" letterSpacing="-1">Gastro</text>
            {/* Text: Red */}
            <text x="195" y="44" fontFamily="'Outfit', sans-serif" fontWeight="900" fontSize="34" fill="url(#textGrad)" letterSpacing="-1">Red</text>
            {/* Tagline */}
            <text x="89" y="62" fontFamily="'Outfit', sans-serif" fontWeight="700" fontSize="10" fill="#E30613" letterSpacing="3">PLATAFORMA INTELIGENTE</text>
            <defs>
                <linearGradient id="hatGrad" x1="8" y1="7" x2="76" y2="60">
                    <stop offset="0%" stopColor="#E30613" />
                    <stop offset="100%" stopColor="#8B0000" />
                </linearGradient>
                <linearGradient id="textGrad" x1="197" y1="20" x2="240" y2="50">
                    <stop offset="0%" stopColor="#E30613" />
                    <stop offset="100%" stopColor="#FF4500" />
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
                background: 'radial-gradient(circle, #E30613, transparent)',
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
            className="group relative glass-premium glass-premium-hover rounded-3xl p-8 transition-all duration-700 hover:translate-y-[-8px]"
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="absolute inset-0 transition-opacity duration-700 opacity-0 rounded-3xl bg-gradient-to-br from-red-600/10 to-transparent group-hover:opacity-100" />
            <div className="relative">
                <div className="flex items-center justify-center w-14 h-14 mb-6 text-3xl transition-all duration-500 border rounded-2xl bg-red-600/10 border-red-600/20 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-red-600/20 shadow-lg shadow-red-900/10">
                    {icon}
                </div>
                <h3 className="mb-3 text-xl font-black text-white tracking-tight">{title}</h3>
                <p className="text-sm leading-relaxed text-gray-400 font-medium">{desc}</p>
            </div>
        </div>
    );
}

// ── Step card ─────────────────────────────────────────────────────────────────
function StepCard({ number, title, desc, icon }) {
    return (
        <div className="flex items-start gap-6 group">
            <div className="flex items-center justify-center flex-shrink-0 text-3xl transition-all duration-500 shadow-2xl w-16 h-16 rounded-2xl bg-gradient-to-br from-red-600 to-red-800 shadow-red-900/50 group-hover:scale-110 group-hover:rotate-3">
                {icon}
            </div>
            <div>
                <div className="mb-1.5 text-xs font-black tracking-widest text-red-500 uppercase opacity-80">Fase {number}</div>
                <h4 className="mb-2 text-xl font-black leading-tight text-white tracking-tight">{title}</h4>
                <p className="text-sm leading-relaxed text-gray-400 font-medium">{desc}</p>
            </div>
        </div>
    );
}

// ── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({ name, price, period, badge, features, cta, highlighted = false, badgeColor = 'red', onSelect }) {
    const badgeColors = {
        teal: 'bg-red-500 text-white',
        red: 'bg-red-600 text-white shadow-lg shadow-red-900/50',
        yellow: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-black shadow-lg shadow-orange-900/30',
        gray: 'bg-white/10 text-gray-300 backdrop-blur-md',
    };
    return (
        <div className={`relative rounded-[2.5rem] p-10 flex flex-col transition-all duration-700 hover:translate-y-[-10px] ${highlighted
            ? 'glass-premium border-red-500/50 shadow-[0_20px_50px_rgba(227,6,19,0.2)] bg-gradient-to-br from-red-950/40 to-transparent'
            : 'glass-premium hover:border-red-500/30'
            }`}>
            {badge && (
                <div className={`absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${badgeColors[badgeColor]}`}>
                    {badge}
                </div>
            )}
            <div className="mb-8">
                <h3 className="mb-2 text-3xl font-black text-white tracking-tighter">{name}</h3>
                <div className="flex items-end gap-2">
                    {price === 0 ? (
                        <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-red-600">GRATIS</span>
                    ) : (
                        <>
                            <span className="text-5xl font-black text-white tracking-tighter">${price.toLocaleString('es-AR')}</span>
                            <span className="mb-2 text-sm text-gray-500 font-bold">/{period}</span>
                        </>
                    )}
                </div>
            </div>
            <ul className="flex-1 mb-10 space-y-4">
                {features.map((f, i) => (
                    <li key={i} className={`flex items-start gap-4 text-sm ${f.disabled ? 'opacity-30' : ''}`}>
                        <span className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${f.disabled ? 'bg-white/5 text-gray-600' : 'bg-red-600/20 text-red-500 shadow-inner'
                            }`}>
                            {f.disabled ? '\u2715' : '\u2713'}
                        </span>
                        <span className={`font-medium ${f.disabled ? 'text-gray-600' : 'text-gray-300'}`}>{f.text}</span>
                    </li>
                ))}
            </ul>
            <button
                onClick={onSelect}
                className={`block w-full text-center py-5 rounded-2xl font-black uppercase tracking-[0.1em] text-xs transition-all duration-500 ${highlighted
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-[0_10px_30px_rgba(227,6,19,0.4)] scale-[1.02] hover:scale-[1.05]'
                    : 'bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-red-500/50'
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
            <div className="mb-1 text-4xl font-black text-transparent md:text-5xl bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">{value}</div>
            <div className="text-sm text-gray-400">{label}</div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// TERMS MODAL
// ════════════════════════════════════════════════════════════════════════════
function TermsModal({ onClose }) {
    return (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-[#0d1117] border border-white/10 rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-white">Términos y Condiciones — GastroRed</h2>
                    <button onClick={onClose} className="flex items-center justify-center text-gray-400 transition w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white">✕</button>
                </div>
                <div className="space-y-6 text-sm leading-relaxed text-gray-300">
                    <section>
                        <h3 className="mb-2 text-lg font-bold text-white">1. Aceptación de los Términos</h3>
                        <p>Al registrarse en GastroRed, el comercio acepta estos términos en su totalidad. El acceso y uso de la plataforma constituye su consentimiento legal a los presentes términos.</p>
                    </section>
                    <section>
                        <h3 className="mb-2 text-lg font-bold text-white">2. Servicios</h3>
                        <p>GastroRed provee herramientas de menú digital, gestión de pedidos y fidelización. La disponibilidad del servicio depende de la infraestructura cloud y servicios de terceros. GastroRed se reserva el derecho de actualizar o modificar las funcionalidades en cualquier momento.</p>
                    </section>
                    <section>
                        <h3 className="mb-2 text-lg font-bold text-white">3. Responsabilidades del Comercio</h3>
                        <p>El comercio es el único responsable de la veracidad de la información publicada (precios, descripción de productos, stock), así como de la atención al cliente final y la correcta configuración de sus credenciales de pago.</p>
                    </section>
                    <section>
                        <h3 className="mb-2 text-lg font-bold text-white">4. Pagos y Comisiones</h3>
                        <p>GastroRed solicita un costo fijo de suscripción mensual o anual según el plan seleccionado. GastroRed <strong>no cobra comisiones</strong> por las ventas realizadas a través de la plataforma. El comercio reconoce que las plataformas de pago (como MercadoPago) aplican sus propias comisiones por transacción, las cuales son ajenas a GastroRed.</p>
                    </section>
                    <section>
                        <h3 className="mb-2 text-lg font-bold text-white">5. Propiedad Intelectual</h3>
                        <ul className="list-disc pl-5 space-y-2">
                            <li><strong>Del Código:</strong> El código fuente, la arquitectura y la lógica de la plataforma son propiedad exclusiva de El Desarrollador. El Cliente recibe una licencia de uso no exclusiva y no transferible mientras mantenga el abono vigente.</li>
                            <li><strong>De los Datos:</strong> Todos los datos de productos, clientes y ventas cargados en la plataforma son propiedad de El Cliente.</li>
                        </ul>
                    </section>
                    <section>
                        <h3 className="mb-2 text-lg font-bold text-white">6. Cancelación y Reembolsos</h3>
                        <p>La suscripción puede cancelarse en cualquier momento desde el panel de administración. No se realizarán reembolsos por períodos ya facturados o transcurridos, independientemente del uso efectivo de la plataforma durante dicho periodo.</p>
                    </section>
                </div>
                <button onClick={onClose} className="block w-full py-4 mt-8 font-black text-white uppercase transition bg-red-600 hover:bg-red-500 rounded-xl">
                    Entendido
                </button>
            </div>
        </div>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// CHECKOUT MODAL
// ════════════════════════════════════════════════════════════════════════════
function CheckoutModal({ plan, onClose }) {
    const isTrial = plan.plan_type === 'Trial';
    const EMPTY = {
        name: '', subdomain: '', admin_email: '',
        admin_name: '', admin_password: '',
        slogan: '', subscription_period: 'monthly',
        address: '', whatsapp: ''
    };
    const [form, setForm] = useState(EMPTY);
    const [mode, setMode] = useState('new'); // 'new' | 'renew'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(null);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [showTerms, setShowTerms] = useState(false);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
    const cleanSub = form.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, '');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!acceptedTerms) {
            setError('Debes aceptar los términos y condiciones para continuar.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            if (isTrial) {
                const res = await fetch(`${API_URL}/subscriptions/trial`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...form, subdomain: cleanSub, accepted_terms: true }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.message);
                setSuccess(data.data);
            } else {
                const endpoint = mode === 'renew' ? '/subscriptions/renew-checkout' : '/subscriptions/checkout-public';
                const res = await fetch(`${API_URL}${endpoint}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...form,
                        subdomain: cleanSub,
                        plan_type: plan.plan_type,
                        accepted_terms: true,
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
                <div className="bg-[#0d1117] border border-red-500/30 rounded-3xl p-8 max-w-md w-full text-center" onClick={e => e.stopPropagation()}>
                    <div className="mb-4 text-6xl">🎉</div>
                    <h3 className="mb-2 text-2xl font-black text-white">¡Tu prueba comenzó!</h3>
                    <p className="mb-6 text-sm text-gray-400">{success.message}</p>
                    <div className="p-4 mb-6 text-left border bg-red-900/30 border-red-500/30 rounded-xl">
                        <p className="mb-1 text-xs text-gray-400">Tu carta está en:</p>
                        <a href={`https://${success.subdomain}.${GASTRORED_DOMAIN}`} target="_blank" rel="noreferrer"
                            className="font-mono text-sm font-bold text-red-500 hover:underline">
                            {success.subdomain}.{GASTRORED_DOMAIN}
                        </a>
                        <p className="mt-2 text-xs text-gray-500">
                            Válido hasta: <strong className="text-white">{new Date(success.subscription_expires_at).toLocaleDateString('es-AR')}</strong>
                        </p>
                        <div className="pt-3 mt-3 border-t border-red-500/20">
                            <p className="text-xs text-gray-400">🔑 Acceso al panel admin:</p>
                            <p className="font-mono text-xs text-white">{form.admin_email}</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <a href={`https://${success.subdomain}.${GASTRORED_DOMAIN}/admin`} target="_blank" rel="noreferrer"
                            className="block w-full py-3 text-sm font-black text-white bg-red-600 hover:bg-red-500 rounded-xl">
                            Ir al panel de admin →
                        </a>
                        <button onClick={onClose} className="block w-full py-2 text-sm text-gray-500 hover:text-white">Cerrar</button>
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
                        <div className="text-xs text-red-500 font-bold uppercase tracking-widest mb-0.5">{isTrial ? 'Prueba gratuita' : 'Suscripción'}</div>
                        <h2 className="text-2xl font-black text-white">Plan {plan.plan_type}</h2>
                        {!isTrial && (
                            <p className="text-sm text-gray-400">
                                ${(plan.prices?.[form.subscription_period] || 0).toLocaleString('es-AR')}/mes
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="flex items-center justify-center text-gray-400 transition w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 hover:text-white">
                        ✕
                    </button>
                </div>

                {!isTrial && (
                    <div className="flex flex-col gap-2 mb-6">
                        <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
                            <button type="button" onClick={() => setMode('new')}
                                className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition ${mode === 'new' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}>
                                Comercio Nuevo
                            </button>
                            <button type="button" onClick={() => setMode('renew')}
                                className={`flex-1 py-1.5 rounded-lg text-sm font-bold transition ${mode === 'renew' ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}>
                                Ya tengo cuenta / Upgrade
                            </button>
                        </div>
                        {mode === 'renew' && (
                            <p className="text-[11px] text-gray-500 text-center px-4">
                                Si estás activo y elegís un plan diferente, el saldo de tus días restantes se convertirá <strong>automática y equitativamente</strong> en días del nuevo plan.
                            </p>
                        )}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Período (solo para planes pagos) */}
                    {!isTrial && (
                        <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
                            <button type="button" onClick={() => set('subscription_period', 'monthly')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${form.subscription_period === 'monthly' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                                    }`}>
                                Mensual
                            </button>
                            <button type="button" onClick={() => set('subscription_period', 'annual')}
                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${form.subscription_period === 'annual' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'
                                    }`}>
                                Anual <span className="text-xs text-orange-400">(2 meses gratis)</span>
                            </button>
                        </div>
                    )}

                    {mode === 'new' && (
                        <input placeholder="Nombre del restaurante *" value={form.name}
                            onChange={e => set('name', e.target.value)} required={mode === 'new'}
                            className="w-full px-4 py-3 text-sm text-white border bg-black/30 border-white/10 rounded-xl focus:outline-none focus:border-red-500" />
                    )}

                    <div>
                        <input placeholder="Subdomain * (ej: miburguer)" value={form.subdomain}
                            onChange={e => set('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} required
                            className="w-full px-4 py-3 text-sm text-white border bg-black/30 border-white/10 rounded-xl focus:outline-none focus:border-red-500" />
                        {cleanSub && mode === 'new' && (
                            <p className="mt-1.5 text-xs text-red-500 font-mono">
                                Tu carta estará en: <strong>{cleanSub}.{GASTRORED_DOMAIN}</strong>
                            </p>
                        )}
                    </div>

                    <input placeholder={mode === 'renew' ? "Email con el que ingresás al panel *" : "Email del dueño *"} type="email" value={form.admin_email}
                        onChange={e => set('admin_email', e.target.value)} required
                        className="w-full px-4 py-3 text-sm text-white border bg-black/30 border-white/10 rounded-xl focus:outline-none focus:border-red-500" />

                    {mode === 'new' && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <input placeholder="Dirección del comercio *" value={form.address}
                                onChange={e => set('address', e.target.value)} required={mode === 'new'}
                                className="w-full px-4 py-3 text-sm text-white border bg-black/30 border-white/10 rounded-xl focus:outline-none focus:border-red-500" />
                            <input placeholder="WhatsApp del comercio *" value={form.whatsapp}
                                onChange={e => set('whatsapp', e.target.value)} required={mode === 'new'}
                                className="w-full px-4 py-3 text-sm text-white border bg-black/30 border-white/10 rounded-xl focus:outline-none focus:border-red-500" />
                        </div>
                    )}

                    {/* Credenciales de acceso al panel */}
                    <div className="p-4 space-y-3 border bg-white/5 border-white/10 rounded-xl">
                        <p className="text-xs font-bold text-red-500">{mode === 'renew' ? '🔑 Verificá tu identidad' : '🔑 Credenciales para el panel de administración'}</p>
                        {mode === 'new' && (
                            <input placeholder="Tu nombre *" value={form.admin_name}
                                onChange={e => set('admin_name', e.target.value)} required={mode === 'new'}
                                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500" />
                        )}
                        <input type="password" placeholder={mode === 'renew' ? "Contraseña de tu cuenta admin *" : "Contraseña para ingresar al panel (mín. 6 caracteres) *"}
                            value={form.admin_password}
                            onChange={e => set('admin_password', e.target.value)} required minLength={mode === 'new' ? 6 : undefined}
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500" />
                        <p className="text-gray-600 text-[11px]">{mode === 'renew' ? 'Necesitamos verificar que sos el dueño para permitir la renovación.' : 'Con estas credenciales vas a poder acceder al panel /admin de tu comercio.'}</p>
                    </div>

                    {error && (
                        <div className="px-4 py-3 text-sm text-red-400 border bg-red-900/30 border-red-500/30 rounded-xl">
                            {error}
                        </div>
                    )}

                    {/* Aceptación de T&C */}
                    <div className="flex items-start gap-3 p-3 transition border bg-white/5 border-white/5 rounded-2xl hover:bg-white/10">
                        <div className="relative flex items-center pt-1 cursor-pointer">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={acceptedTerms}
                                onChange={e => setAcceptedTerms(e.target.checked)}
                                className="w-5 h-5 transition-all bg-black border-2 rounded-lg appearance-none cursor-pointer border-white/20 checked:bg-red-600 checked:border-red-600 focus:outline-none"
                            />
                            {acceptedTerms && (
                                <span className="absolute left-0 right-0 flex items-center justify-center text-white pointer-events-none text-[10px]">
                                    ✓
                                </span>
                            )}
                        </div>
                        <label htmlFor="terms" className="text-xs leading-relaxed text-gray-400 cursor-pointer">
                            Acepto los <button type="button" onClick={() => setShowTerms(true)} className="font-bold transition text-red-400/80 hover:text-red-400 hover:underline">términos y condiciones</button> de GastroRed.
                        </label>
                    </div>

                    {showTerms && <TermsModal onClose={() => setShowTerms(false)} />}

                    <button type="submit" disabled={loading}
                        className="w-full py-4 font-black tracking-wide text-white uppercase transition bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl">
                        {loading
                            ? 'Procesando...'
                            : isTrial
                                ? 'Activar prueba gratuita →'
                                : `Ir a pagar $${(plan.prices?.[form.subscription_period] || 0).toLocaleString('es-AR')} →`}
                    </button>

                    <p className="text-xs text-center text-gray-600">
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
// POST PAYMENT — Pantalla de activación (retorno desde MercadoPago)
// ════════════════════════════════════════════════════════════════════════════
function PostPaymentScreen({ storeId, subResult, onContinue }) {
    const [status, setStatus] = useState('loading');   // loading | active | pending | failed
    const [store, setStore] = useState(null);
    const [attempts, setAttempts] = useState(0);
    const MAX_ATTEMPTS = 12; // 12 × 3s = 36 segs

    useEffect(() => {
        let timer;
        const checkStatus = async () => {
            try {
                // En sandbox: intentar activar primero (bypass al webhook)
                if (subResult === 'success') {
                    await fetch(`${API_URL}/subscriptions/activate-sandbox`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ store_id: parseInt(storeId) }),
                    }).catch(() => { }); // silencioso si falla
                }

                const res = await fetch(`${API_URL}/subscriptions/status/${storeId}`);
                const data = await res.json();
                if (data?.data?.status === 'active') {
                    setStore(data.data);
                    setStatus('active');
                    return;
                }
                if (data?.data?.status === 'suspended') {
                    setStatus('failed');
                    return;
                }
            } catch { /* silencioso */ }

            setAttempts(a => {
                const next = a + 1;
                if (next >= MAX_ATTEMPTS) {
                    setStatus('pending');
                    return next;
                }
                timer = setTimeout(checkStatus, 3000);
                return next;
            });
        };
        checkStatus();
        return () => clearTimeout(timer);
    }, [storeId, subResult]);

    if (status === 'loading') return (
        <div className="fixed inset-0 z-[200] bg-[#080c12] flex flex-col items-center justify-center text-white gap-4">
            <div className="w-12 h-12 border-4 border-red-600 rounded-full border-t-transparent animate-spin" />
            <p className="text-lg font-bold">Verificando tu pago…</p>
            <p className="text-sm text-gray-500">Esto tarda unos segundos</p>
        </div>
    );

    if (status === 'active' && store) return (
        <div className="fixed inset-0 z-[200] bg-[#080c12] flex flex-col items-center justify-center text-white gap-6 px-4">
            <div className="text-7xl">🎉</div>
            <h2 className="text-3xl font-black text-center">¡Tu comercio está activo!</h2>
            <div className="max-w-md p-6 text-center border bg-red-900/30 border-red-500/30 rounded-2xl">
                <p className="mb-2 text-sm text-gray-400">Accedé a tu carta en:</p>
                <a href={`https://${store.subdomain || ''}.${GASTRORED_DOMAIN}`}
                    target="_blank" rel="noreferrer"
                    className="block mb-4 font-mono text-lg font-bold text-red-500 hover:underline">
                    {store.subdomain}.{GASTRORED_DOMAIN}
                </a>
                <p className="text-xs text-gray-500">
                    Plan: <strong className="text-white">{store.plan_type}</strong>
                    {store.subscription_expires_at && ` · Válido hasta: ${new Date(store.subscription_expires_at).toLocaleDateString('es-AR')}`}
                </p>
            </div>
            <div className="flex flex-col w-full max-w-sm gap-3">
                <a href={`https://${store.subdomain}.${GASTRORED_DOMAIN}/admin`}
                    target="_blank" rel="noreferrer"
                    className="w-full py-4 text-sm font-black text-center text-white bg-red-600 hover:bg-red-500 rounded-xl">
                    Ir al panel de admin →
                </a>
                <button onClick={onContinue} className="py-2 text-sm text-gray-500 hover:text-white">
                    Volver a la landing
                </button>
            </div>
        </div>
    );

    // pending o failed → instrucciones manuales
    return (
        <div className="fixed inset-0 z-[200] bg-[#080c12] flex flex-col items-center justify-center text-white gap-5 px-4">
            <div className="text-5xl">{status === 'failed' ? '⚠️' : '⏳'}</div>
            <h2 className="text-2xl font-black text-center">
                {status === 'failed' ? 'Pago no confirmado' : 'Activación pendiente'}
            </h2>
            <p className="max-w-md text-sm text-center text-gray-400">
                {status === 'failed'
                    ? 'No se pudo confirmar el pago. Si el cargo ya fue realizado, contactanos y lo activamos manualmente.'
                    : 'Tu pago está siendo procesado. En unos minutos recibirás un email con el acceso a tu comercio.'}
            </p>
            <p className="font-mono text-xs text-gray-600">store_id: {storeId}</p>
            <div className="flex flex-col w-full max-w-sm gap-3">
                <a href={`mailto:contacto@programadorgs.com.ar?subject=Activación%20store%20${storeId}`}
                    className="w-full py-3 text-sm font-bold text-center text-white bg-white/10 hover:bg-white/20 rounded-xl">
                    Contactar soporte 📩
                </a>
                <button onClick={onContinue} className="py-2 text-sm text-gray-500 hover:text-white">
                    Volver a la landing
                </button>
            </div>
        </div>
    );
}


const FALLBACK_PLANS = [
    {
        plan_type: 'Trial',
        name: 'Prueba Gratis',
        price: 0,
        period: '7 días',
        badge: '🎁 Sin tarjeta',
        badgeColor: 'gray',
        cta: 'Empezar gratis',
        prices: { monthly: 0, annual: 0 },
        features: [
            { text: 'Menú digital completo' },
            { text: 'Pedidos online' },
            { text: 'Productos ilimitados' },
            { text: 'Múltiples sucursales' },
            { text: 'Cupones de descuento' },
            { text: 'Sistema de puntos / fidelización' },
            { text: 'Código QR de tu carta' },
            { text: 'Branding personalizado' },
            { text: 'MercadoPago integrado' },
            { text: 'Dominio propio' },
            { text: 'Soporte prioritario 24hs por WhatsApp' },
        ],
    },
    {
        plan_type: 'Full Digital',
        name: 'Full Digital',
        price: 60000,
        period: 'mes',
        badge: '⭐ Más elegido',
        badgeColor: 'red',
        highlighted: true,
        cta: 'Empezar ahora',
        prices: { monthly: 60000, annual: 600000 },
        features: [
            { text: 'Menú digital completo' },
            { text: 'Pedidos online' },
            { text: 'Hasta 50 productos activos' },
            { text: 'Cupones de descuento' },
            { text: 'Sistema de puntos / fidelización' },
            { text: 'Análisis de ventas y pedidos' },
            { text: 'Subdominio + Dominio propio' },
            { text: 'MercadoPago integrado' },
            { text: 'Código QR de carta', disabled: true },
            { text: 'Branding personalizado' },
            { text: 'Soporte L-V 9 a 20hs por email' },
        ],
    },
    {
        plan_type: 'Expert',
        name: 'Expert',
        price: 100000,
        period: 'mes',
        badge: '🏆 Máximo poder',
        badgeColor: 'yellow',
        cta: 'Quiero Expert',
        prices: { monthly: 100000, annual: 1000000 },
        features: [
            { text: 'Todo lo de Full Digital' },
            { text: 'Productos ilimitados' },
            { text: 'Múltiples sucursales' },
            { text: 'Código QR de tu carta' },
            { text: 'Noticias y blog de marca' },
            { text: 'Branding personalizado' },
            { text: 'Acceso anticipado a nuevas funciones' },
            { text: 'Soporte prioritario 24hs por WhatsApp' },
        ],
    },
];

export default function GastroRedLanding() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null); // abre el modal
    const [showSuperAdmin, setShowSuperAdmin] = useState(false);
    const [plans, setPlans] = useState(FALLBACK_PLANS);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [postPayment, setPostPayment] = useState(null); // abre pantalla post-pago

    // Extraer días de trial dinámicos desde los planes cargados de la API
    const trialPlan = plans.find(p => p.plan_type === 'Trial');
    const trialDaysLabel = trialPlan?.period || '7 días';

    // Cargar planes dinámicos
    useEffect(() => {
        fetch(`${API_URL}/subscriptions/plans`)
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') setPlans(data.data);
                setLoadingPlans(false);
            })
            .catch(() => setLoadingPlans(false));
    }, []);

    // Detectar retorno desde MercadoPago (?sub=success|failure|pending&store=ID)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const sub = params.get('sub');
        const storeId = params.get('store');
        if (sub && storeId) {
            setPostPayment({ storeId, result: sub });
            // Limpiar params de la URL sin recargar
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

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


    // ── GSAP Reveals ────────────────────────────────────────────────────────────
    useEffect(() => {
        // Reveal Hero
        gsap.from('#hero-content > *', {
            y: 40,
            opacity: 0,
            duration: 1.2,
            stagger: 0.2,
            ease: 'expo.out',
            delay: 0.5
        });

        // Reveal sections on scroll
        const reveals = [
            { selector: '#problema h2', y: 30 },
            { selector: '#problema p', y: 20 },
            { selector: '#problema .grid > div', stagger: 0.15 },
            { selector: '#como-funciona h2', x: -40 },
            { selector: '.reveal-step', stagger: 0.2 },
            { selector: '#planes .text-center > *', y: 30, stagger: 0.2 },
            { selector: '#planes .grid > div', y: 40, opacity: 0, stagger: 0.2 },
            { selector: '#contacto .glass-premium', scale: 0.9, opacity: 0 }
        ];

        reveals.forEach(r => {
            gsap.from(r.selector, {
                scrollTrigger: {
                    trigger: r.selector,
                    start: 'top 85%',
                    toggleActions: 'play none none none'
                },
                y: r.y || (r.x ? 0 : 30),
                x: r.x || 0,
                scale: r.scale || 1,
                opacity: 0,
                duration: 1,
                stagger: r.stagger || 0,
                ease: 'power3.out'
            });
        });

        return () => {
            ScrollTrigger.getAll().forEach(t => t.kill());
        };
    }, []);

    return (
        <div className="min-h-screen bg-[#080c12] text-white font-sans overflow-x-hidden relative">
            <Helmet>
                <title>GastroRed | Digitalizá tu Restaurante en Minutos</title>
                <meta name="description" content="GastroRed es la plataforma SaaS líder en Argentina para gastronomía. Menú digital, pedidos online, cobros con MercadoPago y fidelización de clientes." />
                <meta name="keywords" content="restaurante, gastronómico, menú digital, pedidos online, mercadopago, qr, argentina, saas, gestión gastronómica" />
                <meta property="og:title" content="GastroRed | Sincronización Total para tu Negocio Gastronómico" />
                <meta property="og:description" content="Convertí tu restaurante en una experiencia digital completa. Sin comisiones por ventas." />
                <meta property="og:image" content="/images/gallery/dashboard.jpg" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            </Helmet>

            <MouseGlow />

            {/* Pantalla post-pago (retorno desde MercadoPago) */}
            {postPayment && (
                <PostPaymentScreen
                    storeId={postPayment.storeId}
                    subResult={postPayment.result}
                    onContinue={() => setPostPayment(null)}
                />
            )}

            {/* Modal de checkout */}
            {selectedPlan && <CheckoutModal plan={selectedPlan} onClose={() => setSelectedPlan(null)} />}

            {/* Modal Superadmin */}
            {showSuperAdmin && (
                <div className="fixed inset-0 z-[300] overflow-y-auto">
                    <SuperAdminPanel onBack={() => setShowSuperAdmin(false)} />
                </div>
            )}

            {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-[#080c12]/80 backdrop-blur-2xl border-b border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)]' : 'bg-transparent'
                }`}>
                <div className="flex items-center justify-between h-16 px-4 mx-auto max-w-7xl md:px-8 md:h-20">
                    <GastroRedLogo size={36} />
                    <div className="items-center hidden gap-8 md:flex">
                        {navLinks.map(l => (
                            <a key={l.href} href={l.href} className="text-sm font-medium text-gray-400 transition-colors duration-200 hover:text-white hover:text-red-500">
                                {l.label}
                            </a>
                        ))}
                    </div>
                    <div className="items-center hidden gap-4 md:flex">
                        <a href="#contacto" className="px-5 py-2.5 text-sm font-bold text-gray-300 transition-all hover:text-white rounded-2xl hover:bg-white/5">
                            Contacto
                        </a>
                        <a href="#planes" className="px-7 py-3 text-sm font-black text-white transition-all bg-red-600 shadow-[0_10px_20px_rgba(227,6,19,0.3)] hover:bg-red-500 rounded-2xl hover:scale-105 active:scale-95">
                            VER PLANES →
                        </a>
                    </div>
                    {/* Mobile menu button */}
                    <button onClick={() => setMobileMenuOpen(p => !p)} className="p-2 md:hidden rounded-xl bg-white/5">
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
                                className="block py-2 font-medium text-gray-300 border-b hover:text-red-500 border-white/5">
                                {l.label}
                            </a>
                        ))}
                        <a href="#planes" className="block py-3 mt-2 font-bold text-center text-white bg-red-600 rounded-xl">
                            Ver planes →
                        </a>
                    </div>
                )}
            </nav>

            {/* ── HERO ───────────────────────────────────────────────────────────── */}
            <section id="inicio" className="relative flex items-center min-h-screen overflow-hidden">
                {/* Fondo animado */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '4s' }} />
                    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/8 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-red-500/5 rounded-full" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border border-red-500/5 rounded-full" />
                </div>

                <div className="relative w-full px-4 pb-20 mx-auto max-w-7xl md:px-8 pt-28">
                    <div id="hero-content" className="max-w-3xl mx-auto text-center">

                        <div className="inline-flex items-center gap-3 px-6 py-2.5 mb-10 text-[10px] font-black tracking-[0.2em] text-red-500 border glass-premium border-red-500/30 rounded-full uppercase">
                            <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping"></span>
                            SAAS GASTRONÓMICO · LÍDER EN ARGENTINA
                        </div>

                        <h1 className="mb-8 text-6xl font-black leading-[0.9] md:text-8xl tracking-tighter">
                            Tu restaurante,{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-[length:200%_auto] animate-gradient text-glow">
                                digitalizado
                            </span>
                            <br />en minutos.
                        </h1>

                        <p className="max-w-2xl mx-auto mb-12 text-lg md:text-xl leading-relaxed text-gray-400 font-medium">
                            GastroRed es el motor digital que eleva tu negocio.
                            Menú interactivo, pedidos inteligentes y fidelización extrema —{' '}
                            <strong className="text-white text-glow">todo en el mismo ecosistema.</strong>
                        </p>

                        <div className="flex flex-col justify-center gap-6 sm:flex-row">
                            <button onClick={() => trialPlan && setSelectedPlan(trialPlan)}
                                className="inline-flex items-center justify-center gap-3 px-10 py-5 text-sm font-black text-white transition-all bg-red-600 shadow-[0_20px_40px_rgba(227,6,19,0.4)] hover:bg-red-500 rounded-2xl hover:scale-105 active:scale-95 uppercase tracking-widest">
                                Probá gratis {trialDaysLabel}
                                <span className="text-xl">→</span>
                            </button>
                            <a href="#como-funciona"
                                className="inline-flex items-center justify-center gap-3 px-10 py-5 text-sm font-black text-white transition-all border glass-premium hover:bg-white/10 border-white/20 rounded-2xl hover:scale-105 active:scale-95 uppercase tracking-widest">
                                Cómo funciona
                            </a>
                        </div>

                        {/* Stats rápidos */}
                        <div className="flex flex-wrap justify-center gap-8 mt-16 md:gap-16">
                            <Stat value="5 min" label="Para estar online" />
                            <Stat value="0%" label="Comisión por pedido" />
                            <Stat value="100%" label="Tu marca, tu negocio" />
                        </div>
                    </div>
                </div>

                {/* Scroll indicator */}
                <div className="absolute flex flex-col items-center gap-2 -translate-x-1/2 bottom-8 left-1/2 animate-bounce">
                    <div className="flex items-start justify-center w-6 h-10 pt-2 border-2 rounded-full border-white/20">
                        <div className="w-1 h-2 rounded-full bg-white/40"></div>
                    </div>
                </div>
            </section>

            {/* ── EL PROBLEMA ──────────────────────────────────────────────────────── */}
            <section id="problema" className="relative py-16 md:py-24">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-950/10 to-transparent" />
                <div className="relative px-4 mx-auto max-w-7xl md:px-8">
                    <div className="mb-16 text-center">
                        <div className="mb-4 text-sm font-bold tracking-widest text-red-500 uppercase">El problema</div>
                        <h2 className="mb-8 text-5xl font-black md:text-7xl tracking-tighter">
                            ¿Cuánto tiempo perdés{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500 text-glow">
                                sin digitalización?
                            </span>
                        </h2>
                        <p className="max-w-2xl mx-auto text-lg text-gray-400">
                            La mayoría de los restaurantes argentinos siguen dependiendo de WhatsApp, llamados y hojas de papel para gestionar su negocio.
                        </p>
                    </div>
                    <div className="grid gap-6 mb-12 md:grid-cols-3">
                        {[
                            { icon: '😤', title: 'Pedidos caóticos', desc: 'WhatsApp saturado y comendas perdidas. Caos total en cada servicio.' },
                            { icon: '💸', title: 'Sin métricas', desc: 'No sabés qué platos venden más ni cuánto ingresás realmente.' },
                            { icon: '😴', title: 'Trabajo manual', desc: 'Precios desactualizados y tareas repetitivas que queman a tu equipo.' },
                        ].map(p => (
                            <div key={p.title} className="p-8 glass-premium glass-premium-hover rounded-[2.5rem] transition-all duration-700">
                                <div className="mb-6 text-5xl transition-transform duration-500 group-hover:scale-110">{p.icon}</div>
                                <h3 className="mb-3 text-2xl font-black text-white tracking-tight">{p.title}</h3>
                                <p className="text-sm leading-relaxed text-gray-400 font-medium">{p.desc}</p>
                            </div>
                        ))}
                    </div>
                    <div className="text-center">
                        <div className="inline-flex items-center gap-3 px-8 py-4 text-lg font-bold text-red-100 border bg-red-600/10 border-red-500/30 rounded-2xl">
                            <span className="text-2xl">✨</span>
                            GastroRed resuelve todo esto desde el día 1
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FUNCIONALIDADES PREMIUM (GSAP) ─────────────────────────────────── */}
            <FeaturesSection />

            {/* ── GALERÍA DE MÓDULOS (SCROLL HORIZONTAL) ─────────────────────────── */}
            <ModuleGallery />

            {/* ── CÓMO FUNCIONA ────────────────────────────────────────────────────── */}
            <section id="como-funciona" className="relative py-16 md:py-24">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-950/15 to-transparent" />
                <div className="relative px-4 mx-auto max-w-7xl md:px-8">
                    <div className="grid items-center gap-16 lg:grid-cols-2">
                        <div>
                            <div className="mb-4 text-sm font-bold tracking-widest text-red-500 uppercase">Cómo funciona</div>
                            <h2 className="mb-6 text-4xl font-black md:text-5xl">
                                De cero a{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
                                    vender online
                                </span>
                                <br />en 4 pasos.
                            </h2>
                            <p className="mb-10 text-lg text-gray-400">
                                Sin instalar nada, sin conocimientos técnicos. GastroRed se encarga de toda la infraestructura para que vos te concentrés en cocinar.
                            </p>
                            <div className="space-y-10 mt-12">
                                {steps.map((s, i) => (
                                    <div key={s.number} className="reveal-step">
                                        <StepCard {...s} />
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Panel preview mock */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-red-500/10 rounded-3xl blur-3xl" />
                            <div className="relative bg-gradient-to-br from-[#0d1117] to-[#131b26] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
                                {/* Browser chrome */}
                                <div className="bg-[#0a0e16] px-4 py-3 border-b border-white/5 flex items-center gap-3">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-500/70" />
                                        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                                        <div className="w-3 h-3 rounded-full bg-green-500/70" />
                                    </div>
                                    <div className="flex-1 px-3 py-1 font-mono text-xs text-gray-500 rounded-lg bg-white/5">
                                        mirestaurante.gastrored.com.ar/admin
                                    </div>
                                </div>
                                {/* Admin UI Mock */}
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <div className="font-bold text-white">Panel Admin</div>
                                            <div className="text-xs text-gray-500">Mi Restaurante · Hoy</div>
                                        </div>
                                        <div className="flex items-center justify-center w-8 h-8 text-sm bg-red-600 rounded-full">🍔</div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        {[
                                            { label: 'Pedidos hoy', value: '24', color: 'text-blue-400' },
                                            { label: 'Ingresos', value: '$186k', color: 'text-green-400' },
                                            { label: 'Productos', value: '42', color: 'text-yellow-400' },
                                            { label: 'Clientes', value: '318', color: 'text-purple-400' },
                                        ].map(s => (
                                            <div key={s.label} className="p-3 border bg-white/5 rounded-xl border-white/5">
                                                <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                                                <div className="text-xs text-gray-500">{s.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Mini order list */}
                                    <div className="border divide-y bg-white/5 rounded-xl border-white/5 divide-white/5">
                                        {[
                                            { order: 'Burger (Triple) x2', status: 'Preparando', amt: '$48.400', color: 'text-yellow-400' },
                                            { order: 'Crispy Chicken x1', status: 'Listo', amt: '$14.800', color: 'text-green-400' },
                                            { order: 'Papas + Coca x3', status: 'Entregado', amt: '$21.000', color: 'text-gray-500' },
                                        ].map((o, i) => (
                                            <div key={i} className="flex items-center justify-between px-3 py-2.5">
                                                <div className="flex-1 text-xs text-gray-300 truncate">{o.order}</div>
                                                <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full mx-2 ${o.color} bg-current/10`} style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>{o.status}</div>
                                                <div className="flex-shrink-0 text-xs font-bold text-white">{o.amt}</div>
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
            <section id="planes" className="relative py-16 md:py-24 scroll-mt-20">
                <div className="px-4 mx-auto max-w-7xl md:px-8">
                    <div className="mb-16 text-center">
                        <div className="mb-4 text-sm font-black tracking-[0.3em] text-red-500 uppercase opacity-60">Inversión Inteligente</div>
                        <h2 className="mb-6 text-5xl font-black md:text-7xl tracking-tighter">
                            Escalá tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-gradient text-glow">negocio.</span>
                        </h2>
                        <p className="max-w-xl mx-auto text-lg text-gray-400 font-medium">Sin comisiones. Sin intermediarios. Tu éxito es 100% tuyo.</p>
                    </div>

                    <div className="grid gap-6 mt-8 md:grid-cols-3">
                        {loadingPlans ? (
                            [1, 2, 3].map(i => (
                                <div key={i} className="h-[500px] bg-white/5 animate-pulse rounded-3xl" />
                            ))
                        ) : (
                            plans.map((p, i) => (
                                <PlanCard key={i} {...p} onSelect={() => setSelectedPlan(p)} />
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* ── PARA EL DUEÑO ────────────────────────────────────────────────────── */}
            <section className="relative py-16 md:py-24">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-red-950/10 to-transparent" />
                <div className="relative px-4 mx-auto max-w-7xl md:px-8">
                    <div className="mb-16 text-center">
                        <div className="mb-4 text-sm font-bold tracking-widest text-red-500 uppercase">Para el dueño del comercio</div>
                        <h2 className="mb-4 text-4xl font-black md:text-5xl">
                            Vos mandás.{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">Nosotros ponemos la tech.</span>
                        </h2>
                    </div>
                    <div className="grid gap-8 md:grid-cols-2">
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
                            <div key={f.title} className="flex gap-5 p-6 transition-all border bg-white/3 border-white/8 rounded-2xl hover:border-red-500/20">
                                <div className="flex-shrink-0 text-4xl">{f.icon}</div>
                                <div>
                                    <h3 className="mb-2 text-lg font-bold text-white">{f.title}</h3>
                                    <p className="text-sm leading-relaxed text-gray-400">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA FINAL ────────────────────────────────────────────────────────── */}
            <section id="contacto" className="py-20 md:py-32 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-red-600/5 rounded-full blur-[200px]" />
                <div className="max-w-5xl px-4 mx-auto text-center md:px-8">
                    <div className="relative p-16 md:p-24 overflow-hidden glass-premium border-red-500/30 rounded-[3rem] shadow-[0_0_80px_rgba(227,6,19,0.15)]">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                        <div className="relative z-10">
                            <div className="mb-8 text-6xl">🔥</div>
                            <h2 className="mb-6 text-5xl font-black md:text-7xl tracking-tighter leading-none">
                                Dominá el mercado <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 text-glow">gastronómico.</span>
                            </h2>
                            <p className="max-w-2xl mx-auto mb-12 text-xl text-gray-400 font-medium">
                                Sumate a la revolución digital. Arrancá hoy con {trialDaysLabel} de acceso total gratuito.
                                Tu restaurante merece este nivel.
                            </p>
                            <div className="flex flex-col justify-center gap-6 sm:flex-row">
                                <a
                                    href="mailto:contacto@programadorgs.com.ar?subject=Quiero sumarme a GastroRed&body=Hola! Me interesa probar GastroRed para mi restaurante."
                                    className="inline-flex items-center justify-center gap-3 px-12 py-5 text-sm font-black text-white transition-all bg-red-600 shadow-[0_20px_40px_rgba(227,6,19,0.4)] hover:bg-red-500 rounded-2xl hover:scale-105 active:scale-95 uppercase tracking-widest"
                                >
                                    Escribinos por Email ✉️
                                </a>
                                <a
                                    href="https://wa.me/5492473468486?text=Hola!%20Quiero%20probar%20GastroRed%20para%20mi%20restaurante."
                                    target="_blank" rel="noreferrer"
                                    className="inline-flex items-center justify-center gap-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] px-12 py-5 rounded-2xl font-black text-sm transition-all hover:scale-105 active:scale-95 uppercase tracking-widest shadow-[0_10px_30px_rgba(37,211,102,0.15)]"
                                >
                                    WhatsApp Directo 💬
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
            <footer className="py-12 border-t border-white/5">
                <div className="px-4 mx-auto max-w-7xl md:px-8">
                    <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                        <GastroRedLogo size={28} />
                        <div className="flex gap-6 text-sm text-gray-500">
                            <a href="#funcionalidades" className="transition hover:text-red-500">Funcionalidades</a>
                            <a href="#planes" className="transition hover:text-red-500">Planes</a>
                            <a href="#contacto" className="transition hover:text-red-500">Contacto</a>
                        </div>
                        <div className="flex items-center gap-4">
                            <p className="text-sm text-gray-600">© 2026 GastroRed — By ProgramadorGS</p>
                            <button
                                onClick={() => setShowSuperAdmin(true)}
                                className="px-2 py-1 text-xs text-gray-700 transition border rounded hover:text-red-500 border-white/5 hover:border-red-500/30"
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
