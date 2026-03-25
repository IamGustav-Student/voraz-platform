import { useState, useEffect, useCallback, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
// No Recharts imports needed - Using Premium SVG for build stability
import { useAuth } from '../context/AuthContext';
import { adminFetch, patchOrdersPaused } from '../services/api';

// ── Skeletons de carga (Tailwind) para tablas ─────────────────────────────────
function TableRowSkeleton({ cols = 4 }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-4 py-3 border border-white/5 bg-white/5 animate-pulse">
      <div className="w-10 h-10 rounded bg-white/10 flex-shrink-0" />
      <div className="flex-1 min-w-0 flex gap-2">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-4 bg-white/10 rounded flex-1 max-w-[120px]" />
        ))}
      </div>
      <div className="w-16 h-6 rounded bg-white/10 flex-shrink-0" />
      <div className="w-14 h-6 rounded bg-white/10 flex-shrink-0" />
    </div>
  );
}

function ProductsTableSkeleton() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Productos</h2>
      <div className="bg-white/5 rounded-xl p-5 border border-white/10 mb-8 h-48 animate-pulse" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <TableRowSkeleton key={i} cols={2} />
        ))}
      </div>
    </div>
  );
}

function OrdersTableSkeleton() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Pedidos</h2>
      <div className="space-y-2 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <TableRowSkeleton key={i} cols={3} />
        ))}
      </div>
      <div className="h-4 w-32 bg-white/10 rounded animate-pulse mb-3" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg px-4 py-3 border border-white/5 bg-white/5 opacity-60 animate-pulse">
            <div className="w-12 h-3 bg-white/10 rounded" />
            <div className="flex-1 h-4 bg-white/10 rounded max-w-[200px]" />
            <div className="w-20 h-5 bg-white/10 rounded" />
            <div className="w-16 h-6 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

const SECTIONS = ['Dashboard', 'Categorías', 'Productos', 'Promociones', 'Locales', 'Fidelización', 'Videos', 'Noticias', 'Pedidos', 'MercadoPago', 'Branding', 'Menú QR', 'Suscripción'];

// ── Componente reutilizable: input de imagen (URL o archivo local) ──────────
function ImageInput({ value, onChange, label = 'Imagen', token, folder = 'general' }) {
  const [tab, setTab] = useState('url');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef();

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setUploadError('');
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const result = await adminFetch('/upload', token, {
          method: 'POST',
          body: JSON.stringify({ image_base64: ev.target.result, folder }),
        });
        onChange(result.url);
        setTab('url');
      } catch (err) {
        setUploadError(err.message);
      }
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="col-span-2">
      <div className="flex gap-2 mb-2">
        <span className="text-xs text-gray-500">{label}:</span>
        <button type="button" onClick={() => setTab('url')}
          className={`text-xs px-2 py-0.5 rounded ${tab === 'url' ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-white'}`}>
          Pegar URL
        </button>
        <button type="button" onClick={() => setTab('file')}
          className={`text-xs px-2 py-0.5 rounded ${tab === 'file' ? 'bg-white/20 text-white' : 'text-gray-500 hover:text-white'}`}>
          Subir archivo
        </button>
      </div>
      {tab === 'url' ? (
        <input
          placeholder="https://..."
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
        />
      ) : (
        <div>
          <input type="file" accept="image/*" ref={fileRef} onChange={handleFile} className="hidden" />
          <button type="button" onClick={() => fileRef.current.click()} disabled={uploading}
            className="w-full border border-dashed border-white/20 rounded-lg px-3 py-3 text-sm text-gray-400 hover:border-white/40 hover:text-white transition disabled:opacity-50">
            {uploading ? 'Subiendo...' : 'Hacer clic para seleccionar imagen'}
          </button>
          {uploadError && <p className="text-xs text-red-400 mt-1">{uploadError}</p>}
        </div>
      )}
      {value && (
        <img src={value} alt="preview" className="mt-2 h-16 w-16 object-cover rounded border border-white/10" />
      )}
    </div>
  );
}

// ── Panel principal ────────────────────────────────────────────────────────
export default function AdminPanel({ onClose }) {
  const { user, getToken } = useAuth();
  const token = getToken();
  const [section, setSection] = useState('Dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState({});
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const load = useCallback(async (sec, isBackground = false) => {
    if (!token) return;
    if (!isBackground) { setLoading(true); setError(''); }
    try {
      const map = {
        Dashboard: '/stats',
        Categorías: '/categories',
        Productos: ['/products', '/categories'],
        Promociones: ['/promos', '/products'],
        Locales: '/stores',
        Fidelización: '/loyalty',
        Pedidos: '/orders',
        MercadoPago: '/mercadopago',
        Branding: '/branding',
        'Menú QR': '/qr-config',
        Suscripción: '/subscription',
      };
      const path = map[sec];
      if (Array.isArray(path)) {
        if (sec === 'Productos') {
          const [products, categories] = await Promise.all(path.map(p => adminFetch(p, token)));
          setData(prev => ({ ...prev, Productos: products, _categories: categories }));
        } else if (sec === 'Promociones') {
          const [promos, products] = await Promise.all(path.map(p => adminFetch(p, token)));
          setData(prev => ({ ...prev, Promociones: promos, _allProducts: products }));
        }
      } else if (path) {
        const result = await adminFetch(path, token);
        setData(prev => ({ ...prev, [sec]: result }));
      }
    } catch (e) { if (!isBackground) setError(e.message); }
    if (!isBackground) setLoading(false);
  }, [token]);

  useEffect(() => { load(section); }, [section, load]);

  useEffect(() => {
    let interval;
    if (section === 'Pedidos') {
      interval = setInterval(() => {
        load('Pedidos', true);
      }, 15000); // Poll every 15 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [section, load]);

  const [menuOpen, setMenuOpen] = useState(false);

  const changeSection = (s) => { setSection(s); setMenuOpen(false); };

  const SECTION_ICONS = {
    Dashboard:   'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    'Categorías':'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
    Productos:   'M4 6h16M4 10h16M4 14h16M4 18h16',
    Promociones: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5a2 2 0 10-2 2h2zm0 0v4l2 2m-2-2l-2 2',
    Fidelización: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 11c-1.11 0-2.08-.402-2.599-1M12 18v1m-7-4a4 4 0 110-8 4 4 0 010 8zM17 11a4 4 0 110-8 4 4 0 010 8z',
    Videos:      'M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z',
    Noticias:    'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z',
    Locales:     'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 00-1-1h-2a1 1 0 00-1 1v5m4 0H9',
    Pedidos:     'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
    MercadoPago: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
    'Suscripción': 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    'Menú QR': 'M12 4v1m0 11v1m4-8h1m-11 0h1m2-2h5a2 2 0 012 2v5a2 2 0 01-2 2h-5a2 2 0 01-2-2v-5a2 2 0 012-2zm0 2h5v5h-5v-5zM8 8h2v2H8V8zm0 4h2v2H8v-2zm4-4h2v2h-2V8zm0 4h2v2h-2v-2z',
  };

  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
        <div className="bg-[#1a1a1a] p-8 rounded-2xl text-center text-white">
          <p className="text-red-400 text-xl mb-4">Acceso denegado</p>
          <button onClick={onClose} className="bg-red-600 px-6 py-2 rounded-lg">Volver</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-50 flex flex-col">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-white/10 flex-shrink-0">
        {/* Hamburguesa (solo mobile) */}
        <button
          onClick={() => setMenuOpen(p => !p)}
          className="md:hidden p-2 rounded-lg bg-white/5 border border-white/10 text-white"
          aria-label="Menú"
        >
          {menuOpen
            ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          }
        </button>
        <h1 className="text-white font-bold text-base md:text-xl flex-1 text-center md:text-left md:ml-0 ml-0">
          <span className="md:hidden">{section}</span>
          <span className="hidden md:inline">Panel de Administración</span>
        </h1>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10">
          &times;
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">

        {/* ── SIDEBAR DESKTOP (siempre visible en md+) ── */}
        <aside className="hidden md:flex w-48 bg-[#0d0d0d] border-r border-white/10 flex-col gap-1 p-4 overflow-y-auto flex-shrink-0">
          {SECTIONS.map(s => (
            <button key={s} onClick={() => changeSection(s)}
              className={`flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                section === s ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={SECTION_ICONS[s]} />
              </svg>
              {s}
            </button>
          ))}
        </aside>

        {/* ── MENÚ HAMBURGUESA MOBILE (overlay) ── */}
        {menuOpen && (
          <div className="md:hidden absolute inset-0 z-20 flex">
            <div className="w-72 max-w-full bg-[#0d0d0d] border-r border-white/10 flex flex-col p-4 overflow-y-auto">
              <p className="text-xs text-gray-600 uppercase tracking-widest mb-3 px-2">Secciones</p>
              {SECTIONS.map(s => (
                <button key={s} onClick={() => changeSection(s)}
                  className={`flex items-center gap-3 text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors mb-1 ${
                    section === s ? 'bg-red-600 text-white' : 'text-gray-400 active:bg-white/10'
                  }`}>
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={SECTION_ICONS[s]} />
                  </svg>
                  {s}
                </button>
              ))}
            </div>
            {/* Tap fuera para cerrar */}
            <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          </div>
        )}

        {/* ── CONTENIDO PRINCIPAL ── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 text-white min-w-0">
          {error && <div className="bg-red-900/50 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          {loading && section === 'Productos' ? (
            <ProductsTableSkeleton />
          ) : loading && section === 'Pedidos' ? (
            <OrdersTableSkeleton />
          ) : loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {section === 'Dashboard'   && <DashboardSection data={data.Dashboard} />}
              {section === 'Categorías'  && <CategoriesSection items={data['Categorías'] || []} token={token} reload={() => load('Categorías')} />}
              {section === 'Productos'   && <ProductsSection items={data.Productos || []} categories={data._categories || []} token={token} reload={() => load('Productos')} />}
              {section === 'Promociones' && <PromosSection items={data.Promociones || []} products={data._allProducts || []} token={token} reload={() => load('Promociones')} />}
              {section === 'Locales'     && <StoresSection items={data.Locales || []} token={token} reload={() => load('Locales')} showToast={showToast} />}
              {section === 'Fidelización' && <LoyaltySection items={data.Fidelización || {}} token={token} reload={() => load('Fidelización')} showToast={showToast} />}
              {section === 'Videos'      && <VideosSection token={token} />}
              {section === 'Noticias'    && <NewsSection token={token} />}
              {section === 'Pedidos'     && <OrdersSection items={data.Pedidos || []} token={token} reload={() => load('Pedidos')} mpData={data.MercadoPago} />}
              {section === 'MercadoPago' && <MercadoPagoSection data={data.MercadoPago} token={token} reload={() => load('MercadoPago')} />}
              {section === 'Branding'    && <BrandingSection token={token} onUpgrade={() => setSection('Suscripción')} />}
              {section === 'Menú QR'     && <QRSection token={token} onUpgrade={() => setSection('Suscripción')} />}
              {section === 'Suscripción' && <SubscriptionSection data={data['Suscripción']} token={token} reload={() => load('Suscripción')} />}
            </>
          )}
        </main>
      </div>

      {/* Toast global */}
      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-3 rounded-lg shadow-lg text-sm font-medium max-w-md animate-in fade-in duration-200 ${
            toast.type === 'error' ? 'bg-red-600 text-white' : toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-gray-800 text-white border border-white/20'
          }`}
          role="alert"
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ── Dashboard Components ─────────────────────────────────────────────────────

function DashboardHero({ subscription }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  
  useEffect(() => {
    if (!subscription?.expires_at) return;
    
    const target = new Date(subscription.expires_at).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = target - now;
      
      if (distance < 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [subscription?.expires_at]);

  const isExpert = subscription?.plan?.toLowerCase().includes('expert');
  const expiryDate = subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString('es-AR') : 'Sin vencimiento';
  
  const primaryColor = subscription?.primary_color || '#E30613';

  return (
    <div className={`relative overflow-hidden rounded-3xl p-8 mb-8 border border-white/10 shadow-2xl transition-all duration-500 bg-black`}
         style={{ 
           background: `linear-gradient(135deg, ${primaryColor}22 0%, #000 60%, #000 100%)`,
           boxShadow: `0 25px 50px -12px ${primaryColor}11`
         }}>
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20"
           style={{ backgroundColor: primaryColor }} />
      
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
             <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white`}
                   style={{ backgroundColor: primaryColor }}>
               Plan {subscription?.plan || 'Standard'}
             </span>
             <span className="text-xs text-gray-500 font-bold">Vence: {expiryDate}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-2">
            ¡Hola, {subscription?.brand_name || 'Comercio'}!
          </h2>
          <p className="text-gray-400 max-w-md">
            Tu tienda está funcionando al 100%. Seguí potenciando tus ventas con las métricas de hoy.
          </p>
          
          <button 
            onClick={() => window.print()}
            className="no-print mt-6 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl font-black text-xs transition-all border border-white/10 active:scale-95 shadow-lg w-full sm:w-auto"
          >
            <span>📥</span> Exportar Reporte (PDF)
          </button>
        </div>

        {subscription?.expires_at && (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 md:px-8 text-center min-w-[240px]">
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter mb-3">Tu suscripción expira en:</p>
            <div className="flex justify-center gap-4">
              {[
                { val: timeLeft.days, lab: 'DÍAS' },
                { val: timeLeft.hours, lab: 'HS' },
                { val: timeLeft.minutes, lab: 'MIN' },
                { val: timeLeft.seconds, lab: 'SEG' }
              ].map(t => (
                <div key={t.lab}>
                  <p className="text-2xl font-black text-white leading-none">{String(t.val).padStart(2, '0')}</p>
                  <p className="text-[8px] text-gray-500 font-bold mt-1">{t.lab}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ChartTooltip({ active, label, value, x, y, type = 'amount' }) {
  if (!active) return null;
  return (
    <div 
      className="absolute z-[100] bg-[#1a1a1a] border border-white/10 p-3 rounded-xl shadow-2xl pointer-events-none -translate-x-1/2 -translate-y-[calc(100%+10px)] transition-all duration-200"
      style={{ left: x, top: y }}
    >
      <p className="text-gray-400 text-[10px] font-black uppercase mb-1">{label}</p>
      <p className="text-white text-sm font-black whitespace-nowrap">
        {type === 'amount' ? `$${value.toLocaleString('es-AR')}` : `${value} pedidos`}
      </p>
    </div>
  );
}

function SimpleAreaChart({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.amount), 1);
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - (d.amount / max) * 100,
    ...d
  }));

  const pathData = `M 0 100 ` + points.map(p => `L ${p.x} ${p.y}`).join(' ') + ` L 100 100 Z`;
  const lineData = points.map((p, i) => (i === 0 ? `M` : `L`) + ` ${p.x} ${p.y}`).join(' ');

  const [hovered, setHovered] = useState(null);

  return (
    <div className="relative w-full h-full group/chart pt-4">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#facc15" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#facc15" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={pathData} fill="url(#gradRevenue)" />
        <path d={lineData} fill="none" stroke="#facc15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        
        {points.map((p, i) => (
          <rect
            key={i}
            x={p.x - 2} y="0" width="4" height="100"
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={(e) => {
              const rect = e.currentTarget.parentElement.getBoundingClientRect();
              setHovered({ ...p, screenX: (p.x / 100) * rect.width, screenY: (p.y / 100) * rect.height });
            }}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      {hovered && (
        <ChartTooltip 
          active={true} 
          label={hovered.day_label} 
          value={hovered.amount} 
          x={hovered.screenX} 
          y={hovered.screenY} 
        />
      )}
      <div className="flex justify-between mt-2 pt-2 border-t border-white/5">
        <span className="text-[8px] text-gray-600 font-bold">{data[0].day_label}</span>
        <span className="text-[8px] text-gray-600 font-bold">{data[data.length-1].day_label}</span>
      </div>
    </div>
  );
}

function SimpleBarChart({ data }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const [hovered, setHovered] = useState(null);

  return (
    <div className="relative w-full h-full flex flex-col pt-4">
      <div className="flex-1 flex items-end gap-2 group/chart">
        {data.map((d, i) => {
          const height = (d.count / max) * 100;
          return (
            <div 
              key={i} 
              className="flex-1 bg-blue-500/20 hover:bg-blue-500 rounded-t-lg transition-all relative cursor-pointer"
              style={{ height: `${Math.max(height, 5)}%` }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const parent = e.currentTarget.offsetParent.getBoundingClientRect();
                setHovered({ ...d, x: rect.left - parent.left + rect.width / 2, y: rect.top - parent.top });
              }}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="absolute inset-0 bg-blue-400 opacity-0 hover:opacity-10 rounded-t-lg transition-opacity" />
            </div>
          );
        })}
      </div>
      {hovered && (
        <ChartTooltip 
          active={true} 
          label={hovered.week_label} 
          value={hovered.count} 
          type="count"
          x={hovered.x} 
          y={hovered.y} 
        />
      )}
      <div className="flex justify-between mt-2 pt-2 border-t border-white/5">
        <span className="text-[8px] text-gray-600 font-bold">{data[0].week_label}</span>
        <span className="text-[8px] text-gray-600 font-bold">{data[data.length-1].week_label}</span>
      </div>
    </div>
  );
}

function DashboardSection({ data }) {
  if (!data) return <p className="text-gray-500">Cargando...</p>;
  const { subscription } = data;

  
  const cards = [
    { label: 'Ingresos (Total)', value: `$${(data.revenue || 0).toLocaleString('es-AR')}`, color: 'text-yellow-400', icon: '💰' },
    { label: 'Pedidos Totales', value: data.orders, color: 'text-blue-400', icon: '🛍️' },
    { label: 'Clientes Registrados', value: data.users, color: 'text-purple-400', icon: '👥' },
    { label: 'Puntos Circulando', value: data.assignedPoints || 0, color: 'text-orange-400', icon: '✨' },
    { label: 'Puntos Canjeados', value: data.redeemedPoints || 0, color: 'text-red-400', icon: '🎟️' },
    { label: 'Productos Activos', value: data.products, color: 'text-green-400', icon: '📦' },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div>
          <h2 className="text-4xl font-black text-white tracking-tighter uppercase">Dashboard</h2>
          <p className="text-gray-500 font-medium italic">Resumen de actividad de {subscription?.brand_name || 'tu comercio'}</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-2xl border border-white/10 transition-all flex items-center gap-2 font-bold text-sm shadow-xl shadow-black/20"
        >
          <span>📥</span> Descargar / Imprimir PDF
        </button>
      </div>
      
      {/* 1. Hero Banner Countdown */}
      <DashboardHero subscription={data.subscription} />

      {/* 2. Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10 group hover:border-white/20 transition-all flex flex-col justify-between min-h-[110px]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg opacity-80 group-hover:scale-110 transition-transform">{c.icon}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
            </div>
            <p className="text-gray-500 text-[10px] font-black uppercase tracking-wider mb-1 truncate">{c.label}</p>
            <p className={`text-xl font-black truncate ${c.color}`}>{c.value ?? '—'}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8">
        {/* 3. Gráfica de Ingresos Diarios */}
        <div className="bg-white/5 rounded-3xl p-5 sm:p-6 border border-white/10 h-[300px] sm:h-[350px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-white flex items-center gap-2">
              <span className="text-yellow-500">📈</span> Ingresos Diarios
            </h3>
            <span className="text-xs text-gray-500 font-bold">Últimos 14 días</span>
          </div>
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <SimpleAreaChart data={data.dailyRevenue} />
          </div>
        </div>

        {/* 4. Gráfica de Pedidos Semanales */}
        <div className="bg-white/5 rounded-3xl p-5 sm:p-6 border border-white/10 h-[300px] sm:h-[350px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-white flex items-center gap-2">
              <span className="text-blue-500">📊</span> Pedidos por Semana
            </h3>
            <span className="text-xs text-gray-500 font-bold">Mensual</span>
          </div>
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            <SimpleBarChart data={data.weeklyOrders} />
          </div>
        </div>
      </div>

      {/* 5. Best Sellers & Loyalty Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 bg-white/5 rounded-3xl p-5 sm:p-6 border border-white/10">
          <h3 className="font-black text-white flex items-center gap-2 mb-6 text-sm">
            <span className="text-red-500">🔥</span> Top Productos (Más Vendidos)
          </h3>
          <div className="space-y-4">
            {data.bestSellers && data.bestSellers.map((item, i) => (
              <div key={item.product_name} className="flex items-center gap-4 bg-white/5 px-4 py-3 rounded-2xl border border-white/5 group hover:border-red-500/30 transition-all">
                <span className="text-gray-600 font-black text-lg italic w-6">#{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-white truncate">{item.product_name}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">{item.total_qty} unidades vendidas</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-green-400">${parseFloat(item.total_amount).toLocaleString('es-AR')}</p>
                </div>
              </div>
            ))}
            {!data.bestSellers?.length && <p className="text-gray-500 text-sm italic">Aún no hay ventas registradas.</p>}
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/40 via-black to-black rounded-3xl p-5 sm:p-8 border border-white/10 flex flex-col justify-center items-center text-center">
          <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center text-3xl mb-4 border border-purple-500/20">
            ✨
          </div>
          <h3 className="font-black text-white mb-2">Fidelización {subscription?.brand_name || 'Comercio'}</h3>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            Tenés un total de <strong>{data.assignedPoints} puntos</strong> repartidos entre tus clientes. ¡Lanzá promociones para que los canjeen!
          </p>
          <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/5">
            <p className="text-[10px] text-gray-500 font-black uppercase mb-1 tracking-tighter">Retorno Inmediato</p>
            <p className="text-xl font-black text-purple-400">
               {data.orders > 0 ? ((data.users / data.orders) * 100).toFixed(1) : 0}% 
            </p>
            <p className="text-[8px] text-gray-600 font-bold">Tasa de recurrencia estimada</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Categorías ────────────────────────────────────────────────────────────────
function CategoriesSection({ items, token, reload }) {
  const emptyForm = { name: '', description: '', image_url: '' };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const startEdit = (cat) => {
    setEditing(cat.id);
    setForm({ name: cat.name, description: cat.description || '', image_url: cat.image_url || '' });
    setMsg('');
  };

  const cancelEdit = () => { setEditing(null); setForm(emptyForm); setMsg(''); };

  const submit = async (e) => {
    e.preventDefault(); setSubmitting(true); setMsg('');
    try {
      if (editing) {
        await adminFetch(`/categories/${editing}`, token, { method: 'PUT', body: JSON.stringify(form) });
        setMsg('Categoría actualizada');
      } else {
        await adminFetch('/categories', token, { method: 'POST', body: JSON.stringify(form) });
        setMsg('Categoría creada');
      }
      cancelEdit(); reload();
    } catch (e) { setMsg('Error: ' + e.message); }
    setSubmitting(false);
  };

  const del = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      await adminFetch(`/categories/${id}`, token, { method: 'DELETE' });
      reload();
    } catch (e) { setMsg('Error: ' + e.message); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Categorías</h2>
      <form onSubmit={submit} className="bg-white/5 rounded-xl p-5 border border-white/10 mb-8 grid grid-cols-2 gap-3">
        <h3 className="col-span-2 font-semibold text-gray-300">{editing ? 'Editar categoría' : 'Nueva categoría'}</h3>
        <input placeholder="Nombre *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />
        <input placeholder="Descripción" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        <ImageInput value={form.image_url} onChange={v => setForm(p => ({ ...p, image_url: v }))} label="Imagen categoría" token={token} folder="categories" />
        <div className="col-span-2 flex gap-2">
          <button type="submit" disabled={submitting}
            className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold disabled:opacity-50">
            {submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear categoría'}
          </button>
          {editing && (
            <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
              Cancelar
            </button>
          )}
        </div>
        {msg && <p className={`col-span-2 text-sm ${msg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>}
      </form>

      <div className="space-y-2">
        {items.map(cat => (
          <div key={cat.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3 border border-white/5">
            {cat.image_url && <img src={cat.image_url} alt="" className="w-10 h-10 object-cover rounded" />}
            <div className="flex-1">
              <p className="font-medium">{cat.name}</p>
              {cat.description && <p className="text-xs text-gray-500">{cat.description}</p>}
            </div>
            <button onClick={() => startEdit(cat)} className="text-xs text-blue-400 hover:text-blue-300">Editar</button>
            <button onClick={() => del(cat.id)} className="text-xs text-red-500 hover:text-red-300">Eliminar</button>
          </div>
        ))}
        {!items.length && <p className="text-gray-500 text-sm">No hay categorías</p>}
      </div>
    </div>
  );
}

// ── Productos ─────────────────────────────────────────────────────────────────
function ProductsSection({ items, categories, token, reload }) {
  const emptyForm = { name: '', description: '', price: '', category_id: '', image_url: '', badge: '', stock: '', points_earned: '0' };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const startEdit = (p) => {
    setEditing(p.id);
    setForm({
      name: p.name, description: p.description || '', price: p.price,
      category_id: p.category_id, image_url: p.image_url || '', badge: p.badge || '',
      stock: p.stock != null ? String(p.stock) : '0',
      points_earned: p.points_earned ?? 0,
    });
    setMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => { setEditing(null); setForm(emptyForm); setMsg(''); };

  const parseStock = (v) => {
    const n = parseInt(String(v).replace(/\D/g, '') || '0', 10);
    return Number.isNaN(n) ? 0 : Math.max(0, n);
  };

  const submit = async (e) => {
    e.preventDefault(); setSubmitting(true); setMsg('');
    try {
      const payload = { 
        ...form, 
        price: parseFloat(form.price), 
        stock: parseStock(form.stock),
        points_earned: parseInt(form.points_earned) || 0
      };
      if (editing) {
        await adminFetch(`/products/${editing}`, token, { method: 'PUT', body: JSON.stringify({ ...payload, is_active: true }) });
        setMsg('Producto actualizado');
      } else {
        await adminFetch('/products', token, { method: 'POST', body: JSON.stringify(payload) });
        setMsg('Producto creado');
      }
      cancelEdit(); reload();
    } catch (e) { setMsg('Error: ' + e.message); }
    setSubmitting(false);
  };

  const toggleActive = async (p) => {
    try {
      if (p.is_active) {
        await adminFetch(`/products/${p.id}`, token, { method: 'DELETE' });
      } else {
        await adminFetch(`/products/${p.id}`, token, { method: 'PUT', body: JSON.stringify({ ...p, is_active: true }) });
      }
      reload();
    } catch (e) { setMsg('Error: ' + e.message); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Productos</h2>
      <form onSubmit={submit} className="bg-white/5 rounded-xl p-5 border border-white/10 mb-8 grid grid-cols-2 gap-3">
        <h3 className="col-span-2 font-semibold text-gray-300">{editing ? 'Editar producto' : 'Agregar producto'}</h3>

        <input placeholder="Nombre *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />
        <input placeholder="Descripción" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />

        <input type="number" step="0.01" placeholder="Precio *" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />

        <select value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required>
          <option value="">-- Categoría *</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select value={form.badge} onChange={e => setForm(p => ({ ...p, badge: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm col-span-2">
          <option value="">Sin badge</option>
          <option value="NUEVO">NUEVO</option>
          <option value="BEST SELLER">BEST SELLER</option>
          <option value="PICANTE">PICANTE</option>
          <option value="PROMO">PROMO</option>
        </select>

        <input
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Stock inicial *"
          value={form.stock}
          onChange={e => {
            const v = e.target.value;
            if (v === '' || /^\d+$/.test(v)) setForm(p => ({ ...p, stock: v }));
          }}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          required
        />

        <input
          type="number"
          min={0}
          placeholder="Puntos ganados *"
          value={form.points_earned}
          onChange={e => setForm(p => ({ ...p, points_earned: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          required
        />

        <ImageInput value={form.image_url} onChange={v => setForm(p => ({ ...p, image_url: v }))} label="Imagen producto" token={token} folder="products" />

        <div className="col-span-2 flex gap-2">
          <button type="submit" disabled={submitting}
            className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold disabled:opacity-50">
            {submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear producto'}
          </button>
          {editing && (
            <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
              Cancelar
            </button>
          )}
        </div>
        {msg && <p className={`col-span-2 text-sm ${msg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>}
      </form>

      <div className="space-y-2">
        {items.map(p => {
          const stockNum = p.stock != null ? Number(p.stock) : 0;
          const stockClass = stockNum === 0 ? 'text-red-400 bg-red-900/50' : stockNum < 5 ? 'text-orange-400 bg-orange-900/50' : 'text-gray-400 bg-white/5';
          return (
            <div key={p.id} className={`flex items-center gap-3 rounded-lg px-4 py-3 border transition-opacity ${
              p.is_active ? 'bg-white/5 border-white/5' : 'bg-white/2 border-white/5 opacity-50'
            }`}>
              {p.image_url && <img src={p.image_url} alt="" className="w-10 h-10 object-cover rounded flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{p.name}</p>
                <p className="text-sm text-gray-400">{p.category_name} · ${p.price}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 font-medium ${stockClass}`} title="Stock">
                Stock: {stockNum}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${p.is_active ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
                {p.is_active ? 'Activo' : 'Inactivo'}
              </span>
              <button onClick={() => startEdit(p)} className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">Editar</button>
              <button onClick={() => toggleActive(p)} className={`text-xs flex-shrink-0 ${p.is_active ? 'text-gray-500 hover:text-red-400' : 'text-green-500 hover:text-green-300'}`}>
                {p.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Locales ───────────────────────────────────────────────────────────────────
const DELIVERY_APPS = [
  { value: '', label: 'Sin delivery online' },
  { value: 'pedidosya', label: 'PedidosYa' },
  { value: 'rappi', label: 'Rappi' },
  { value: 'mercado', label: 'MercadoDelivery' },
  { value: 'propio', label: 'Delivery propio (web/WhatsApp)' },
];

function StoresSection({ items, token, reload, showToast }) {
  const emptyForm = { name: '', address: '', image_url: '', google_maps_url: '', delivery_app: '', delivery_link: '', phone: '' };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [syncingMaps, setSyncingMaps] = useState(false);

  const syncWithGoogleMaps = useCallback(async () => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!apiKey || apiKey.trim() === '') {
      showToast?.('Faltan credenciales de Google Maps. Configurá VITE_GOOGLE_MAPS_API_KEY en el entorno del frontend.', 'error');
      return;
    }
    const address = (form.address || '').trim();
    if (!address) {
      showToast?.('Escribí la dirección antes de sincronizar con Maps.', 'error');
      return;
    }
    setSyncingMaps(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'REQUEST_DENIED') {
        showToast?.('Google Maps: acceso denegado. Revisá que la API Key tenga Geocoding API habilitada.', 'error');
        return;
      }
      if (data.status === 'OVER_QUERY_LIMIT') {
        showToast?.('Google Maps: se superó el límite de consultas. Probá más tarde.', 'error');
        return;
      }
      if (data.status === 'ZERO_RESULTS' || !data.results?.length) {
        showToast?.('No se encontró la dirección. Revisá que esté bien escrita.', 'error');
        return;
      }
      if (data.status !== 'OK') {
        showToast?.(`Google Maps: ${data.status}. ${data.error_message || 'Error desconocido.'}`, 'error');
        return;
      }
      const { lat, lng } = data.results[0].geometry.location;
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      setForm((prev) => ({ ...prev, google_maps_url: mapsUrl }));
      showToast?.('URL de Google Maps generada correctamente.', 'success');
    } catch (err) {
      const message = err.message || String(err);
      if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
        showToast?.('Error de red al conectar con Google Maps. Revisá tu conexión.', 'error');
      } else {
        showToast?.(`Error al sincronizar con Maps: ${message}`, 'error');
      }
    } finally {
      setSyncingMaps(false);
    }
  }, [form.address, showToast]);

  const startEdit = (s) => {
    setEditing(s.id);
    setForm({ name: s.name, address: s.address || '', image_url: s.image_url || '', google_maps_url: s.waze_link || '', delivery_app: '', delivery_link: s.delivery_link || '', phone: s.phone || '' });
    setMsg('');
  };
  const cancelEdit = () => { setEditing(null); setForm(emptyForm); setMsg(''); };

  const submit = async (e) => {
    e.preventDefault(); setSubmitting(true); setMsg('');
    try {
      const payload = { ...form };
      if (editing) {
        await adminFetch(`/stores/${editing}`, token, { method: 'PUT', body: JSON.stringify(payload) });
        setMsg('Local actualizado');
      } else {
        await adminFetch('/stores', token, { method: 'POST', body: JSON.stringify(payload) });
        setMsg('Local creado');
      }
      cancelEdit(); reload();
    } catch (e) { setMsg('Error: ' + e.message); }
    setSubmitting(false);
  };

  const del = async (id) => {
    if (!confirm('¿Eliminar este local?')) return;
    try { await adminFetch(`/stores/${id}`, token, { method: 'DELETE' }); reload(); }
    catch (e) { setMsg('Error: ' + e.message); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Locales</h2>
      <p className="text-gray-500 text-sm mb-6">Administrá las sucursales. El botón "Cómo llegar" usa la URL de Maps o la construye desde la dirección automáticamente.</p>

      <form onSubmit={submit} className="bg-white/5 rounded-xl p-5 border border-white/10 mb-8 grid grid-cols-2 gap-3">
        <h3 className="col-span-2 font-semibold text-gray-300">{editing ? 'Editar local' : 'Nuevo local'}</h3>

        <input placeholder="Nombre del local *" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          className="col-span-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />

        <input placeholder="Dirección completa * (ej: Av. Corrientes 1234, CABA)" value={form.address}
          onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
          className="col-span-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />

        <input placeholder="Teléfono / WhatsApp" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />

        <div className="col-span-2 flex gap-2">
          <input
            placeholder="URL Google Maps (opcional — si no, se usa la dirección)"
            value={form.google_maps_url}
            onChange={e => setForm(p => ({ ...p, google_maps_url: e.target.value }))}
            className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
          />
          <button
            type="button"
            onClick={syncWithGoogleMaps}
            disabled={syncingMaps || !form.address?.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium whitespace-nowrap"
          >
            {syncingMaps ? '...' : 'Sincronizar con Maps'}
          </button>
        </div>
        <p className="col-span-2 text-xs text-gray-600 -mt-1">
          Si dejás vacío "URL Google Maps", el botón "Cómo llegar" usará la dirección que escribiste arriba. Usá "Sincronizar con Maps" para generar la URL desde la dirección (requiere API Key de Google).
        </p>

        <div className="col-span-2">
          <label className="text-xs text-gray-400 block mb-1">App de Delivery</label>
          <select value={form.delivery_app} onChange={e => setForm(p => ({ ...p, delivery_app: e.target.value }))}
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
            {DELIVERY_APPS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>

        <input
          placeholder="URL del local en la app de delivery (o link de WhatsApp)"
          value={form.delivery_link} onChange={e => setForm(p => ({ ...p, delivery_link: e.target.value }))}
          className="col-span-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
        />
        <p className="col-span-2 text-xs text-gray-600 -mt-1">
          Ejemplo PedidosYa: <code>https://www.pedidosya.com.ar/restaurantes/...</code><br/>
          Ejemplo WhatsApp: <code>https://wa.me/5491112345678?text=Quiero%20hacer%20un%20pedido</code>
        </p>

        <ImageInput value={form.image_url} onChange={v => setForm(p => ({ ...p, image_url: v }))} label="Foto del local" token={token} folder="stores" />

        <div className="col-span-2 flex gap-2 mt-1">
          <button type="submit" disabled={submitting}
            className="flex-1 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold disabled:opacity-50">
            {submitting ? 'Guardando...' : editing ? 'Guardar cambios' : 'Agregar local'}
          </button>
          {editing && (
            <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm">
              Cancelar
            </button>
          )}
        </div>
        {msg && <p className={`col-span-2 text-sm ${msg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>}
      </form>

      <div className="space-y-3">
        {items.map(s => (
          <div key={s.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/5">
            {s.image_url && <img src={s.image_url} alt="" className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-semibold">{s.name}</p>
              <p className="text-xs text-gray-400 truncate">{s.address}</p>
              {s.phone && <p className="text-xs text-gray-500">{s.phone}</p>}
              <div className="flex gap-2 mt-1">
                {s.waze_link
                  ? <span className="text-xs text-green-500">Maps ✓</span>
                  : <span className="text-xs text-yellow-600">Maps (desde dirección)</span>
                }
                {s.delivery_link
                  ? <span className="text-xs text-blue-400">Delivery ✓</span>
                  : <span className="text-xs text-gray-600">Sin delivery</span>
                }
              </div>
            </div>
            <button onClick={() => startEdit(s)} className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">Editar</button>
            <button onClick={() => del(s.id)} className="text-xs text-red-500 hover:text-red-300 flex-shrink-0">Eliminar</button>
          </div>
        ))}
        {!items.length && <p className="text-gray-500 text-sm">No hay locales. Agregá el primero.</p>}
      </div>
    </div>
  );
}

// ── Cupones ───────────────────────────────────────────────────────────────────
function CouponsSection({ items, token, reload }) {
  const [form, setForm] = useState({ code: '', description: '', discount_type: 'percentage', discount_value: '', min_order: '', max_uses: '', expires_at: '' });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault(); setSubmitting(true); setMsg('');
    try {
      await adminFetch('/coupons', token, { method: 'POST', body: JSON.stringify(form) });
      setMsg('Cupón creado'); reload();
    } catch (e) { setMsg('Error: ' + e.message); }
    setSubmitting(false);
  };

  const toggle = async (id, active) => {
    await adminFetch(`/coupons/${id}`, token, { method: 'PATCH', body: JSON.stringify({ active: !active }) });
    reload();
  };

  const del = async (id) => {
    if (!confirm('¿Eliminar cupón?')) return;
    await adminFetch(`/coupons/${id}`, token, { method: 'DELETE' });
    reload();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Cupones</h2>
      <form onSubmit={submit} className="bg-white/5 rounded-xl p-5 border border-white/10 mb-8 grid grid-cols-2 gap-3">
        <h3 className="col-span-2 font-semibold text-gray-300">Nuevo cupón</h3>
        <input placeholder="Código (ej: PROMO10)" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm uppercase" required />
        <input placeholder="Descripción" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        <select value={form.discount_type} onChange={e => setForm(p => ({ ...p, discount_type: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
          <option value="percentage">Porcentaje (%)</option>
          <option value="fixed">Monto fijo ($)</option>
        </select>
        <input type="number" placeholder="Valor descuento" value={form.discount_value} onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />
        <input type="number" placeholder="Monto mínimo (opcional)" value={form.min_order} onChange={e => setForm(p => ({ ...p, min_order: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        <input type="number" placeholder="Usos máximos (opcional)" value={form.max_uses} onChange={e => setForm(p => ({ ...p, max_uses: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        <input type="date" value={form.expires_at} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))}
          className="col-span-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        <button type="submit" disabled={submitting}
          className="col-span-2 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold disabled:opacity-50">
          {submitting ? 'Guardando...' : 'Crear cupón'}
        </button>
        {msg && <p className={`col-span-2 text-sm ${msg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>}
      </form>
      <div className="space-y-2">
        {items.map(c => (
          <div key={c.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3 border border-white/5">
            <span className="font-mono font-bold text-yellow-400">{c.code}</span>
            <span className="text-sm text-gray-400 flex-1 truncate">
              {c.description} · {c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`}
            </span>
            <button onClick={() => toggle(c.id, c.active)}
              className={`text-xs px-2 py-1 rounded-full ${c.active ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
              {c.active ? 'Activo' : 'Inactivo'}
            </button>
            <button onClick={() => del(c.id)} className="text-xs text-red-500 hover:text-red-300">Eliminar</button>
          </div>
        ))}
        {!items.length && <p className="text-gray-500 text-sm">No hay cupones</p>}
      </div>
    </div>
  );
}

// ── Videos ────────────────────────────────────────────────────────────────────
function VideosSection({ token }) {
  const [form, setForm] = useState({ title: '', youtube_url: '' });
  const [msg, setMsg] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => {
    adminFetch('/stats', token).then(() => {}).catch(() => {});
  }, [token]);

  const submit = async (e) => {
    e.preventDefault(); setMsg('');
    try {
      const result = await adminFetch('/videos', token, { method: 'POST', body: JSON.stringify(form) });
      setMsg('Video agregado'); setForm({ title: '', youtube_url: '' });
      setItems(prev => [result, ...prev]);
    } catch (e) { setMsg('Error: ' + e.message); }
  };

  const del = async (id) => {
    await adminFetch(`/videos/${id}`, token, { method: 'DELETE' });
    setItems(prev => prev.filter(v => v.id !== id));
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Videos</h2>
      <form onSubmit={submit} className="bg-white/5 rounded-xl p-5 border border-white/10 mb-8 grid gap-3">
        <input placeholder="Título del video" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />
        <input placeholder="URL de YouTube (ej: https://youtube.com/watch?v=...)" value={form.youtube_url}
          onChange={e => setForm(p => ({ ...p, youtube_url: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />
        <button type="submit" className="bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold">Agregar video</button>
        {msg && <p className={`text-sm ${msg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>}
      </form>
      <div className="grid grid-cols-2 gap-3">
        {items.map(v => (
          <div key={v.id} className="bg-white/5 rounded-lg overflow-hidden border border-white/5">
            <img src={v.thumbnail_url} alt={v.title} className="w-full h-32 object-cover" />
            <div className="p-3 flex items-center gap-2">
              <p className="text-sm flex-1 truncate">{v.title}</p>
              <button onClick={() => del(v.id)} className="text-xs text-red-500 hover:text-red-300">Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Noticias ──────────────────────────────────────────────────────────────────
function NewsSection({ token }) {
  const [form, setForm] = useState({ title: '', content: '', image_url: '', date: '' });
  const [msg, setMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault(); setMsg('');
    try {
      await adminFetch('/news', token, { method: 'POST', body: JSON.stringify(form) });
      setMsg('Noticia publicada'); setForm({ title: '', content: '', image_url: '', date: '' });
    } catch (e) { setMsg('Error: ' + e.message); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Noticias</h2>
      <form onSubmit={submit} className="bg-white/5 rounded-xl p-5 border border-white/10 grid gap-3">
        <input placeholder="Título *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />
        <textarea placeholder="Contenido *" rows={4} value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />
        <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
          className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        <ImageInput value={form.image_url} onChange={v => setForm(p => ({ ...p, image_url: v }))} label="Imagen noticia" token={token} folder="news" />
        <button type="submit" className="bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold mt-1">Publicar noticia</button>
        {msg && <p className={`text-sm ${msg.startsWith('Error') ? 'text-red-400' : 'text-green-400'}`}>{msg}</p>}
      </form>
    </div>
  );
}

// ── Fidelización (Loyalty) ──────────────────────────────────────────────────
function LoyaltySection({ items, token, reload, showToast }) {
  const [config, setConfig] = useState({
    loyalty_enabled: items.loyalty_enabled ?? false,
    points_redeem_value: items.points_redeem_value ?? 500,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (items) {
      setConfig({
        loyalty_enabled: items.loyalty_enabled ?? false,
        points_redeem_value: items.points_redeem_value ?? 500,
      });
    }
  }, [items]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await adminFetch('/loyalty', token, {
        method: 'PATCH',
        body: JSON.stringify(config),
      });
      setMsg('Configuración guardada correctamente.');
      showToast?.('Configuración de fidelización actualizada', 'success');
      if (reload) reload();
    } catch (err) {
      setMsg('Error: ' + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold mb-2">Fidelización por Puntos</h2>
      <p className="text-gray-500 text-sm mb-6">
        Configurá cómo tus clientes acumulan y canjean puntos en tu local.
      </p>

      <div className={`rounded-xl p-4 border mb-6 flex items-center gap-4 ${config.loyalty_enabled ? 'bg-green-900/20 border-green-500/30' : 'bg-gray-800 border-white/10'}`}>
        <div className={`w-4 h-4 rounded-full ${config.loyalty_enabled ? 'bg-green-400' : 'bg-gray-500'}`} />
        <div>
          <p className={`font-semibold text-sm ${config.loyalty_enabled ? 'text-green-300' : 'text-gray-400'}`}>
            {config.loyalty_enabled ? 'Sistema de puntos activo' : 'Sistema de puntos desactivado'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {config.loyalty_enabled ? 'Los clientes pueden ganar y canjear puntos en sus pedidos.' : 'Nadie podrá acumular ni usar puntos actualmente.'}
          </p>
        </div>
        <button
          onClick={() => setConfig(p => ({ ...p, loyalty_enabled: !p.loyalty_enabled }))}
          className={`ml-auto px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${config.loyalty_enabled ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'}`}
        >
          {config.loyalty_enabled ? 'Desactivar' : 'Activar'}
        </button>
      </div>

      <form onSubmit={save} className="space-y-6">
        <div className="bg-white/5 rounded-xl p-5 border border-white/10">
          <h3 className="font-semibold text-gray-200 mb-4 text-sm uppercase tracking-wider">Valor del Canje</h3>
          
          <div className="flex items-center gap-4">
            <div className="bg-black/30 rounded-xl p-4 flex-1 border border-white/5 text-center">
              <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Bloque de canje</p>
              <p className="text-xl font-black text-white">500 pts</p>
            </div>
            
            <div className="text-gray-600 text-2xl">=</div>

            <div className="flex-1 bg-white/5 rounded-xl p-4 border border-white/10 relative">
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-black">$</span>
               <input 
                 type="number"
                 value={config.points_redeem_value}
                 onChange={e => setConfig(p => ({ ...p, points_redeem_value: parseInt(e.target.value) || 0 }))}
                 className="bg-transparent w-full pl-8 py-2 text-xl font-black text-white focus:outline-none"
               />
               <p className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] text-gray-500 uppercase font-bold whitespace-nowrap">
                 Valor en pesos
               </p>
            </div>
          </div>
          
          <div className="mt-10 bg-white/5 border border-white/10 rounded-lg p-4">
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              💡 <strong>¿Cómo funciona?</strong> Por cada producto que los clientes compren, sumarán los puntos que definas en la sección "Productos". Al llegar a 500 puntos, podrán canjearlos por <strong>${config.points_redeem_value}</strong> de descuento en su carrito.
            </p>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={saving}
          className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-xl font-bold text-white shadow-lg shadow-red-900/20 disabled:opacity-50 transition-all active:scale-95"
        >
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>

        {msg && (
          <p className={`text-center text-sm font-bold p-3 rounded-xl ${msg.startsWith('Error') ? 'bg-red-900/20 text-red-300' : 'bg-green-900/20 text-green-300'}`}>
            {msg}
          </p>
        )}
      </form>
    </div>
  );
}

// ── Pedidos ───────────────────────────────────────────────────────────────────
const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const PENDING_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];

function OrdersSection({ items, token, reload, mpData }) {
  const [updating, setUpdating] = useState(null);
  const [msg, setMsg] = useState('');
  const [ordersPaused, setOrdersPaused] = useState(mpData?.orders_paused ?? false);
  const [pauseLoading, setPauseLoading] = useState(false);

  // Sincronizar si cambia mpData desde afuera
  useEffect(() => {
    if (mpData && typeof mpData.orders_paused === 'boolean') {
      setOrdersPaused(mpData.orders_paused);
    }
  }, [mpData]);

  const togglePause = async () => {
    setPauseLoading(true);
    try {
      await patchOrdersPaused(!ordersPaused, token);
      setOrdersPaused(p => !p);
      setMsg(!ordersPaused ? '🔴 Pedidos pausados. Los clientes no podrán realizar nuevos pedidos.' : '✅ Pedidos activados. El comercio acepta nuevos pedidos.');
      setTimeout(() => setMsg(''), 4000);
    } catch (e) {
      setMsg('Error: ' + e.message);
    }
    setPauseLoading(false);
  };

  const markDelivered = async (id) => {
    setUpdating(id); setMsg('');
    try {
      await adminFetch(`/orders/${id}/status`, token, { method: 'PATCH', body: JSON.stringify({ status: 'delivered' }) });
      reload();
    } catch (e) { setMsg('Error: ' + e.message); }
    setUpdating(null);
  };

  const pending = items.filter(o => PENDING_STATUSES.includes(o.status));
  const delivered = items.filter(o => o.status === 'delivered' || o.status === 'cancelled');

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Pedidos</h2>

      {/* ── Toggle pausa de pedidos ── */}
      <div className={`mb-6 rounded-2xl p-5 border flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all ${
        ordersPaused
          ? 'bg-red-950/40 border-red-500/40'
          : 'bg-green-950/30 border-green-500/30'
      }`}>
        <div className="flex items-center gap-3 flex-1">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${ordersPaused ? 'bg-red-500 animate-pulse' : 'bg-green-400'}`} />
          <div>
            <p className={`font-bold text-sm ${ordersPaused ? 'text-red-300' : 'text-green-300'}`}>
              {ordersPaused ? '🔴 Pedidos pausados — los clientes no pueden pedir' : '🟢 Aceptando pedidos'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {ordersPaused
                ? 'Activá para volver a recibir pedidos cuando estés listo.'
                : 'Pausá si estás saturado de trabajo o cerrado temporalmente.'}
            </p>
          </div>
        </div>
        <button
          onClick={togglePause}
          disabled={pauseLoading}
          className={`flex-shrink-0 px-6 py-2.5 rounded-xl font-black text-sm uppercase tracking-wide transition-all disabled:opacity-50 ${
            ordersPaused
              ? 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/30'
              : 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/30'
          }`}
        >
          {pauseLoading ? '...' : ordersPaused ? '✅ Reactivar pedidos' : '🔴 Pausar pedidos'}
        </button>
      </div>

      {msg && <div className={`mb-4 px-4 py-2 rounded-lg text-sm font-bold ${
        msg.startsWith('Error') ? 'bg-red-900/50 text-red-300' : 'bg-blue-900/30 text-blue-300'
      }`}>{msg}</div>}

      {pending.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse inline-block" />
            Pendientes de entrega ({pending.length})
          </h3>
          <div className="space-y-2 mb-8">
            {pending.map(o => (
              <div key={o.id} className="flex items-center gap-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3">
                <span className="font-mono text-xs text-gray-400">#{o.id}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{o.user_name || o.user_email || 'Invitado'}</p>
                  <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleString('es-AR')}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-900/50 text-yellow-300 flex-shrink-0">
                  {STATUS_LABELS[o.status] || o.status}
                </span>
                <span className="font-bold text-yellow-400 flex-shrink-0">${o.total}</span>
                <button
                  onClick={() => markDelivered(o.id)}
                  disabled={updating === o.id}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg flex-shrink-0 disabled:opacity-50 font-semibold"
                >
                  {updating === o.id ? '...' : 'Entregado'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {delivered.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Historial</h3>
          <div className="space-y-2">
            {delivered.map(o => (
              <div key={o.id} className="flex items-center gap-4 bg-white/2 border border-white/5 rounded-lg px-4 py-3 opacity-50">
                <span className="font-mono text-xs text-gray-600">#{o.id}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-500">{o.user_name || o.user_email || 'Invitado'}</p>
                  <p className="text-xs text-gray-600">{new Date(o.delivered_at || o.created_at).toLocaleString('es-AR')}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                  o.status === 'delivered' ? 'bg-gray-800 text-gray-500' : 'bg-red-950 text-red-700'
                }`}>{STATUS_LABELS[o.status] || o.status}</span>
                <span className="text-gray-600 flex-shrink-0">${o.total}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {!items.length && <p className="text-gray-500 text-sm">No hay pedidos aún</p>}
    </div>
  );
}

// ── MercadoPago ───────────────────────────────────────────────────────────────
function MercadoPagoSection({ data, token, reload }) {
  const [form, setForm] = useState({
    mp_access_token: '',
    mp_public_key: data?.mp_public_key || '',
    mp_sandbox: data?.mp_sandbox ?? false,
    cash_on_delivery: data?.cash_on_delivery !== false,
    store_name: data?.store_name || '',
    store_email: data?.store_email || '',
    store_phone: data?.store_phone || '',
    store_address: data?.store_address || '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [showToken, setShowToken] = useState(false);

  useEffect(() => {
    if (data) {
      setForm(prev => ({
        ...prev,
        mp_public_key: data.mp_public_key || '',
        mp_sandbox: data.mp_sandbox ?? false,
        cash_on_delivery: data.cash_on_delivery !== false,
        store_name: data.store_name || '',
        store_email: data.store_email || '',
        store_phone: data.store_phone || '',
        store_address: data.store_address || '',
      }));
    }
  }, [data]);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('');
    try {
      const result = await adminFetch('/mercadopago', token, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setMsg(result.message || 'Guardado correctamente');
      setForm(prev => ({ ...prev, mp_access_token: '' }));
      reload();
    } catch (e) { setMsg('Error: ' + e.message); }
    setSaving(false);
  };

  const isConfigured = data?.access_token_set;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">MercadoPago</h2>
      <p className="text-gray-500 text-sm mb-6">Configurá las credenciales para recibir pagos online directamente en tu cuenta de MercadoPago.</p>

      {/* Estado actual */}
      <div className={`rounded-xl p-4 border mb-6 flex items-center gap-4 ${isConfigured ? 'bg-green-900/20 border-green-500/30' : 'bg-yellow-900/20 border-yellow-500/30'}`}>
        <div className={`w-4 h-4 rounded-full flex-shrink-0 ${isConfigured ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
        <div>
          <p className={`font-semibold text-sm ${isConfigured ? 'text-green-300' : 'text-yellow-300'}`}>
            {isConfigured ? 'MercadoPago configurado y activo' : 'MercadoPago no configurado — modo demo activo'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            {isConfigured
              ? `Modo: ${data.mp_sandbox ? 'Prueba (Sandbox)' : 'Producción (real)'}`
              : 'Los pedidos se confirman automáticamente sin cobro online.'}
          </p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* Credenciales MP */}
        <div className="bg-white/5 rounded-xl p-5 border border-white/10">
          <h3 className="font-semibold text-gray-200 mb-1">Credenciales de MercadoPago</h3>
          <p className="text-xs text-gray-500 mb-4">
            Obtenelas en <a href="https://www.mercadopago.com.ar/developers/panel/app" target="_blank" rel="noreferrer" className="text-blue-400 underline">mercadopago.com.ar/developers</a> → Tu aplicación → Credenciales.
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Access Token {isConfigured && <span className="text-green-500 ml-1">✓ ya guardado</span>}</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  placeholder={isConfigured ? 'Dejar vacío para mantener el actual...' : 'APP_USR-xxxx-xxxx'}
                  value={form.mp_access_token}
                  onChange={e => setForm(p => ({ ...p, mp_access_token: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm pr-16"
                />
                <button type="button" onClick={() => setShowToken(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-gray-300">
                  {showToken ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-1">Empieza con <code>APP_USR-</code> (producción) o <code>TEST-</code> (prueba)</p>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">Public Key {data?.mp_public_key && <span className="text-green-500 ml-1">✓ ya guardada</span>}</label>
              <input
                type="text"
                placeholder="APP_USR-xxxx-xxxx"
                value={form.mp_public_key}
                onChange={e => setForm(p => ({ ...p, mp_public_key: e.target.value }))}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm"
              />
            </div>

            <div className="flex items-center gap-3 py-2">
              <button type="button" onClick={() => setForm(p => ({ ...p, mp_sandbox: !p.mp_sandbox }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.mp_sandbox ? 'bg-yellow-500' : 'bg-gray-700'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.mp_sandbox ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <div>
                <p className="text-sm text-white">{form.mp_sandbox ? 'Modo Sandbox (prueba)' : 'Modo Producción'}</p>
                <p className="text-xs text-gray-500">{form.mp_sandbox ? 'Los pagos no son reales — ideal para testear' : 'Los pagos son reales — para tu negocio'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 py-2 border-t border-white/5 mt-1 pt-3">
              <button type="button" onClick={() => setForm(p => ({ ...p, cash_on_delivery: !p.cash_on_delivery }))}
                className={`relative w-11 h-6 rounded-full transition-colors ${form.cash_on_delivery ? 'bg-green-600' : 'bg-gray-700'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.cash_on_delivery ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
              <div>
                <p className="text-sm text-white">💵 Pago en Efectivo (contra entrega)</p>
                <p className="text-xs text-gray-500">{form.cash_on_delivery ? 'Activado — los clientes pueden elegir pagar en efectivo' : 'Desactivado — solo se acepta MercadoPago'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook URL */}
        {data?.webhook_url && (
          <div className="bg-black/30 rounded-xl p-4 border border-white/5">
            <p className="text-xs text-gray-500 mb-2">URL del Webhook (configurala en MercadoPago Developers → Notificaciones IPN):</p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-green-400 flex-1 break-all">{data.webhook_url}</code>
              <button type="button" onClick={() => navigator.clipboard.writeText(data.webhook_url)}
                className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded bg-white/10 flex-shrink-0">
                Copiar
              </button>
            </div>
          </div>
        )}

        {/* Datos del local */}
        <div className="bg-white/5 rounded-xl p-5 border border-white/10">
          <h3 className="font-semibold text-gray-200 mb-1">Datos del local</h3>
          <p className="text-xs text-gray-500 mb-4">Estos datos aparecen en el resumen de pago de MercadoPago.</p>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nombre del local (ej: Voraz Burger)" value={form.store_name}
              onChange={e => setForm(p => ({ ...p, store_name: e.target.value }))}
              className="col-span-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm" />
            <input placeholder="Email de contacto" value={form.store_email} type="email"
              onChange={e => setForm(p => ({ ...p, store_email: e.target.value }))}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm" />
            <input placeholder="Teléfono / WhatsApp" value={form.store_phone}
              onChange={e => setForm(p => ({ ...p, store_phone: e.target.value }))}
              className="bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm" />
            <input placeholder="Dirección del local" value={form.store_address}
              onChange={e => setForm(p => ({ ...p, store_address: e.target.value }))}
              className="col-span-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm" />
          </div>
        </div>

        <button type="submit" disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold text-white disabled:opacity-50 transition">
          {saving ? 'Guardando...' : 'Guardar configuración'}
        </button>

        {msg && (
          <div className={`px-4 py-3 rounded-lg text-sm ${msg.startsWith('Error') ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
            {msg}
          </div>
        )}
      </form>

      {/* Instrucciones paso a paso */}
      <div className="mt-8 bg-blue-950/30 border border-blue-500/20 rounded-xl p-5">
        <h3 className="font-semibold text-blue-300 mb-3 text-sm">Guía paso a paso para activar cobros online</h3>
        <ol className="text-xs text-gray-400 space-y-2 list-decimal list-inside">
          <li>Ingresá a <a href="https://www.mercadopago.com.ar/developers/panel/app" target="_blank" rel="noreferrer" className="text-blue-400 underline">mercadopago.com.ar/developers</a></li>
          <li>Creá una nueva aplicación o seleccioná la existente</li>
          <li>En <strong className="text-white">Credenciales de producción</strong>, copiá el <strong className="text-white">Access Token</strong> y la <strong className="text-white">Public Key</strong></li>
          <li>Pegá ambas en el formulario de arriba y guardá</li>
          <li>En la misma app de developers, andá a <strong className="text-white">Notificaciones IPN</strong> y pegá la URL del webhook</li>
          <li>Activá los eventos: <code className="bg-black/30 px-1 rounded">payment</code></li>
          <li>¡Listo! Los clientes ya pueden pagar con cualquier método de MercadoPago</li>
        </ol>
      </div>
    </div>
  );
}

// ── SECCIÓN BRANDING ──────────────────────────────────────────────────────
function BrandingSection({ token, onUpgrade }) {
  const [branding, setBranding] = useState({
    custom_branding_enabled: false, primary_color: '', secondary_color: '', font_family: '', logo_url: '', plan_type: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [loaded, setLoaded] = useState(false);

  const plan = branding.plan_type?.toLowerCase().trim();
  const enabled = plan === 'expert' || plan === 'full digital';

  useEffect(() => {
    if (!token) return;
    adminFetch('/branding', token)
      .then(d => { if (d) setBranding(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [token]);

  const handleSave = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('');
    try {
      await adminFetch('/branding', token, {
        method: 'PATCH',
        body: JSON.stringify({
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
          font_family: branding.font_family,
          logo_url: branding.logo_url,
        }),
      });
      setMsg('Branding actualizado correctamente.');
      if (branding.primary_color) {
        document.documentElement.style.setProperty('--primary-color', branding.primary_color);
        document.documentElement.style.setProperty('--brand-primary', branding.primary_color);
      }
      if (branding.secondary_color) {
        document.documentElement.style.setProperty('--secondary-color', branding.secondary_color);
        document.documentElement.style.setProperty('--brand-secondary', branding.secondary_color);
      }
    } catch (err) { setMsg('Error: ' + err.message); }
    setSaving(false);
  };

  if (!loaded) return <div className="p-6 text-gray-500 text-sm">Cargando...</div>;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-base">🎨</div>
        <div>
          <h2 className="font-black text-white text-lg leading-none">Branding Personalizado</h2>
          {enabled
            ? <p className="text-xs text-green-400 mt-0.5">Módulo activo (Plan Expert)</p>
            : <p className="text-xs text-yellow-500 mt-0.5">Módulo Premium — disponible en Plan Expert</p>
          }
        </div>
      </div>

      {!enabled && (
        <div className="mb-8 bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-2xl p-6 shadow-2xl overflow-hidden relative group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-700" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⭐</span>
              <p className="text-purple-300 font-bold tracking-tight">Módulo exclusivo del Plan Expert</p>
            </div>
            <p className="text-white/80 text-sm leading-relaxed mb-5">
              Mejorá tu plan para tener tu propia identidad visual, colores corporativos y App descargable (PWA) personalizada para tus clientes.
            </p>
            <button
              type="button"
              onClick={onUpgrade}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-purple-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              🚀 Mejorar mi Plan
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-2">Color Primario</label>
            <div className={`flex items-center gap-3 bg-black/30 border rounded-xl px-3 py-2.5 ${enabled ? 'border-white/10' : 'border-white/5 opacity-50'}`}>
              <input type="color" value={branding.primary_color || '#ef4444'}
                disabled={!enabled}
                onChange={e => setBranding(b => ({ ...b, primary_color: e.target.value }))}
                className="w-8 h-8 rounded-md border-0 cursor-pointer bg-transparent disabled:cursor-not-allowed" />
              <input type="text" value={branding.primary_color || ''}
                disabled={!enabled}
                onChange={e => setBranding(b => ({ ...b, primary_color: e.target.value }))}
                placeholder="#ef4444"
                className="bg-transparent text-white text-sm flex-1 outline-none font-mono disabled:cursor-not-allowed" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-2">Color Secundario</label>
            <div className={`flex items-center gap-3 bg-black/30 border rounded-xl px-3 py-2.5 ${enabled ? 'border-white/10' : 'border-white/5 opacity-50'}`}>
              <input type="color" value={branding.secondary_color || '#1f2937'}
                disabled={!enabled}
                onChange={e => setBranding(b => ({ ...b, secondary_color: e.target.value }))}
                className="w-8 h-8 rounded-md border-0 cursor-pointer bg-transparent disabled:cursor-not-allowed" />
              <input type="text" value={branding.secondary_color || ''}
                disabled={!enabled}
                onChange={e => setBranding(b => ({ ...b, secondary_color: e.target.value }))}
                placeholder="#1f2937"
                className="bg-transparent text-white text-sm flex-1 outline-none font-mono disabled:cursor-not-allowed" />
            </div>
          </div>
        </div>

        <div className={!enabled ? 'opacity-50 pointer-events-none' : ''}>
          <label className="text-xs text-gray-400 block mb-2">Tipografía</label>
          <select value={branding.font_family || ''}
            disabled={!enabled}
            onChange={e => setBranding(b => ({ ...b, font_family: e.target.value }))}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm disabled:cursor-not-allowed">
            <option value="">— Sin cambio (default) —</option>
            <option value="Inter, system-ui, sans-serif">Inter (recomendada)</option>
            <option value="'Poppins', sans-serif">Poppins</option>
            <option value="'Montserrat', sans-serif">Montserrat</option>
            <option value="'Playfair Display', serif">Playfair Display</option>
            <option value="'Roboto', sans-serif">Roboto</option>
          </select>
        </div>

        <div className={!enabled ? 'opacity-50 pointer-events-none' : ''}>
          <ImageInput
            label="Logo de la marca"
            value={branding.logo_url || ''}
            onChange={url => setBranding(b => ({ ...b, logo_url: url }))}
            token={token}
            folder="branding"
          />
        </div>

        {enabled && (
          <div className="bg-black/20 border border-white/5 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-3">Vista previa</p>
            <div className="flex gap-3 flex-wrap items-center">
              <button type="button"
                style={{ backgroundColor: branding.primary_color || '#ef4444' }}
                className="px-5 py-2 rounded-xl text-white text-sm font-bold">
                Botón primario
              </button>
              <button type="button"
                style={{ backgroundColor: branding.secondary_color || '#1f2937', border: '1px solid rgba(255,255,255,.15)' }}
                className="px-5 py-2 rounded-xl text-white text-sm font-bold">
                Botón secundario
              </button>
              {branding.logo_url && (
                <img src={branding.logo_url} alt="logo preview"
                  className="h-10 rounded-lg object-contain bg-white/5 p-1" />
              )}
            </div>
          </div>
        )}

        <button type="submit" disabled={saving || !enabled}
          style={enabled ? { backgroundColor: branding.primary_color || '#ef4444' } : {}}
          className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-40 hover:opacity-90 transition bg-gray-700">
          {saving ? 'Guardando...' : 'Aplicar Branding'}
        </button>

        {msg && (
          <div className={`px-4 py-3 rounded-lg text-sm ${msg.startsWith('Error') ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
            {msg}
          </div>
        )}
      </form>
    </div>
  );
}

// ── SECCIÓN SUSCRIPCIÓN ────────────────────────────────────────────────────
function SubscriptionSection({ data, token, reload }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  if (!data) return <div className="p-6 text-gray-500 text-sm italic">Cargando datos de suscripción...</div>;

  const currentPlan = data.plan_type || 'Trial';
  const expiresAt = data.subscription_expires_at ? new Date(data.subscription_expires_at).toLocaleDateString('es-AR') : '—';
  const isExpired = data.is_expired;

  const handleUpgrade = async (planType, period = 'monthly') => {
    setLoading(true); setMsg('');
    try {
      const res = await adminFetch('/subscription/upgrade', token, {
        method: 'POST',
        body: JSON.stringify({ plan_type: planType, period }),
      });
      if (res?.init_point) {
        window.location.href = res.init_point;
      } else {
        throw new Error('No se pudo generar el link de pago.');
      }
    } catch (err) {
      setMsg('Error: ' + err.message);
      setLoading(false);
    }
  };

  const plans = [
    { type: 'Full Digital', icon: '⭐', color: 'blue' },
    { type: 'Expert', icon: '🏆', color: 'yellow', best: true },
  ];

  return (
    <div className="p-6 max-w-4xl">

      <div className="mb-10">
        <h2 className="text-2xl font-black text-white mb-2">Mi Suscripción</h2>
        <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br ${currentPlan.toLowerCase().trim() === 'expert' ? 'from-yellow-500 to-orange-600' : 'from-blue-500 to-indigo-600 shadow-lg shadow-blue-900/20'}`}>
            {currentPlan.toLowerCase().trim() === 'expert' ? '🏆' : '⭐'}
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Plan Actual</p>
            <p className="text-xl font-black text-white">{currentPlan}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Vencimiento</p>
            <p className={`text-sm font-bold ${isExpired ? 'text-red-400' : 'text-gray-300'}`}>
              {expiresAt} {isExpired && '(Expirado)'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {plans.map(p => {
          const isCurrent = currentPlan.toLowerCase().trim() === p.type.toLowerCase().trim();
          const price = data.prices?.[p.type] || {};
          
          return (
            <div key={p.type} className={`relative rounded-3xl p-8 flex flex-col border transition-all ${
              p.best 
                ? 'bg-gradient-to-br from-yellow-900/30 to-black border-yellow-500/40 shadow-2xl shadow-yellow-900/20' 
                : 'bg-white/5 border-white/10'
            } ${isCurrent ? 'ring-2 ring-green-500/50' : ''}`}>
              
              {p.best && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-black uppercase px-3 py-1 rounded-full">
                  Máximo Poder
                </div>
              )}

              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-black text-white mb-1">{p.type}</h3>
                  <p className="text-gray-500 text-xs">Suscripción SaaS GastroRed</p>
                </div>
                <span className="text-2xl">{p.icon}</span>
              </div>

              <div className="mb-8">
                <p className="text-4xl font-black text-white mb-1">
                  ${(price.monthly || 0).toLocaleString('es-AR')}
                </p>
                <p className="text-xs text-gray-500 font-bold uppercase">/ mes (final)</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-green-500">✓</span> 
                  {p.type === 'Expert' ? 'Productos ilimitados' : 'Hasta 50 productos'}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-green-500">✓</span> 
                  {p.type === 'Expert' ? 'Múltiples sucursales' : 'Sucursal única'}
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-green-500">✓</span> 
                  Dominio + Subdominio
                </li>
                <li className={`flex items-center gap-2 text-sm ${p.type === 'Expert' ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className={p.type === 'Expert' ? 'text-green-500' : 'text-gray-700'}>✓</span> 
                  Branding & PWA
                </li>
              </ul>

              <button
                onClick={() => handleUpgrade(p.type)}
                disabled={loading || isCurrent}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
                  isCurrent 
                    ? 'bg-green-600/20 text-green-400 border border-green-500/30 cursor-default'
                    : p.best
                      ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-lg shadow-yellow-900/40'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                } disabled:opacity-50`}
              >
                {loading ? 'Procesando...' : isCurrent ? 'Plan Actual' : `Mejorar a ${p.type}`}
              </button>
            </div>
          );
        })}
      </div>

      {msg && (
        <div className={`mt-8 px-4 py-3 rounded-xl text-sm font-bold ${msg.startsWith('Error') ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
          {msg}
        </div>
      )}

      <div className="mt-12 bg-gray-900/50 border border-white/5 rounded-2xl p-6 text-center">
        <p className="text-sm text-gray-500 mb-2">¿Necesitás ayuda con tu suscripción o factura?</p>
        <a href="mailto:contacto@programadorgs.com.ar" className="text-blue-400 font-bold hover:underline">Contactar a Soporte 📩</a>
      </div>
    </div>
  );
}

// ── QR SECTION ─────────────────────────────────────────────────────────────
function QRSection({ token, onUpgrade }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminFetch('/qr-config', token)
      .then(d => { if (d) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="p-6 text-gray-500 text-sm">Cargando configuración...</div>;
  if (!data) return <div className="p-6 text-red-500 text-sm">Error cargando configuración.</div>;

  const enabled = data.plan_type?.toLowerCase().trim() === 'expert';
  const menuUrl = data.subdomain 
    ? `https://${data.subdomain}.${data.root_domain}`
    : `https://${data.root_domain}`;

  const downloadQR = () => {
    const canvas = document.getElementById('qr-gen');
    if (!canvas) return;
    const pngUrl = canvas
      .toDataURL("image/png")
      .replace("image/png", "image/octet-stream");
    let downloadLink = document.createElement("a");
    downloadLink.href = pngUrl;
    downloadLink.download = `QR_Menu_${data.subdomain || 'GastroRed'}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-base">📱</div>
        <div>
          <h2 className="font-black text-white text-lg leading-none">Tu Menú en QR</h2>
          {enabled
            ? <p className="text-xs text-green-400 mt-0.5">Módulo activo (Plan Expert)</p>
            : <p className="text-xs text-yellow-500 mt-0.5">Módulo Premium — disponible en Plan Expert</p>
          }
        </div>
      </div>

      {!enabled && (
        <div className="mb-8 bg-gradient-to-br from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-2xl p-6 shadow-2xl overflow-hidden relative group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-700" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⭐</span>
              <p className="text-blue-300 font-bold tracking-tight">Potenciá tu restaurante</p>
            </div>
            <p className="text-white/80 text-sm leading-relaxed mb-5">
              Con el Plan Expert podés generar tu propio QR dinámico para que los clientes escaneen desde la mesa y accedan directo a tu carta digital.
            </p>
            <button
              onClick={onUpgrade}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
            >
              🚀 Ver Planes
            </button>
          </div>
        </div>
      )}

      <div className={`flex flex-col items-center gap-8 ${!enabled ? 'opacity-30 pointer-events-none grayscale' : ''}`}>
        <div className="bg-white p-6 rounded-3xl shadow-2xl shadow-blue-900/20">
          <QRCodeCanvas 
            id="qr-gen"
            value={menuUrl} 
            size={256} 
            level="H"
            includeMargin={true}
          />
        </div>

        <div className="text-center">
          <p className="text-gray-400 text-sm mb-4">
            Link de tu carta:<br/>
            <span className="text-white font-mono text-xs">{menuUrl}</span>
          </p>
          <button
            onClick={downloadQR}
            className="bg-white text-black px-8 py-3 rounded-xl font-black text-sm hover:bg-gray-200 transition-all active:scale-95 flex items-center gap-2 mx-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Descargar Código QR (PNG)
          </button>
          <p className="text-[10px] text-gray-600 mt-4 max-w-xs uppercase tracking-widest font-bold">
            Podés imprimir este código y ponerlo en tus mesas o vidriera.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── PROMOS SECTION ────────────────────────────────────────────────────────
function PromosSection({ items, products, token, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    product_id: '',
    title: '',
    description: '',
    promo_type: 'Libre',
    price: 0,
    image_url: '',
    is_active: true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const isUpdate = !!editing;
      await adminFetch(isUpdate ? `/promos/${editing.id}` : '/promos', token, {
        method: isUpdate ? 'PUT' : 'POST',
        body: JSON.stringify(form)
      });
      reload();
      setShowForm(false);
      setEditing(null);
      setForm({ product_id: '', title: '', description: '', promo_type: 'Libre', price: 0, image_url: '', is_active: true });
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  const deletePromo = async (id) => {
    if (!confirm('¿Eliminar esta promoción?')) return;
    try {
      await adminFetch(`/promos/${id}`, token, { method: 'DELETE' });
      reload();
    } catch (e) { alert(e.message); }
  };

  const startEdit = (p) => {
    setEditing(p);
    setForm({
      product_id: p.product_id || '',
      title: p.title,
      description: p.description || '',
      promo_type: p.promo_type || 'Libre',
      price: p.price || 0,
      image_url: p.image_url || '',
      is_active: p.is_active
    });
    setShowForm(true);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-white">Promociones</h2>
          <p className="text-gray-500 text-sm">Gestioná tus ofertas y combos dinámicos.</p>
        </div>
        {!showForm && (
          <button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition shadow-lg shadow-red-900/20">
            + Nueva Promo
          </button>
        )}
      </div>

      {showForm ? (
        <form onSubmit={handleSubmit} className="max-w-2xl bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
          <h3 className="text-xl font-bold text-white mb-2">{editing ? 'Editar' : 'Crear'} Promoción</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1.5 block">Título de la Promo *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                placeholder="Ej: Combo Familiar, Mega Burger 2x1..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none transition" />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1.5 block">Descripción (opcional)</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Explicá en que consiste la promo..."
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none transition h-20 resize-none" />
            </div>

            <div>
              <label className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1.5 block">Producto Relacionado</label>
              <select value={form.product_id} onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none transition">
                <option value="">— Sin producto —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1.5 block">Tipo de Promo</label>
              <select value={form.promo_type} onChange={e => setForm(f => ({ ...f, promo_type: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none transition">
                <option value="Libre">Libre (Solo precio)</option>
                <option value="2x1">2 x 1</option>
                <option value="3x2">3 x 2</option>
                <option value="Envío Gratis">Envío Gratis</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1.5 block">Precio Promo (ARS)</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none transition" />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer group mb-3">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="hidden" />
                <div className={`w-10 h-6 rounded-full transition-colors relative ${form.is_active ? 'bg-green-600' : 'bg-gray-700'}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${form.is_active ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm font-bold text-gray-300">Mostrar públicamente</span>
              </label>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1.5 block">Imagen de la Promo</label>
              <ImageInput value={form.image_url} onChange={val => setForm(f => ({ ...f, image_url: val }))} token={token} folder="promos" />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={loading} className="flex-1 bg-white text-black hover:bg-gray-200 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition disabled:opacity-50">
              {loading ? 'Guardando...' : (editing ? 'Actualizar Promoción' : 'Crear Promoción')}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-8 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-xs uppercase hover:bg-white/10 transition">
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(p => (
            <div key={p.id} className={`group bg-white/5 border border-white/10 rounded-3xl overflow-hidden transition-all hover:border-white/30 ${!p.is_active ? 'opacity-60' : ''}`}>
              <div className="h-40 relative">
                <img src={p.image_url || '/images/placeholder_promo.png'} className="w-full h-full object-cover" alt="" />
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded-lg uppercase shadow-lg">
                    {p.promo_type}
                  </span>
                  {!p.is_active && <span className="bg-gray-800 text-gray-400 text-[10px] font-black px-2 py-1 rounded-lg uppercase">Oculta</span>}
                </div>
              </div>
              <div className="p-5">
                <h4 className="font-bold text-lg text-white mb-1">{p.title}</h4>
                <p className="text-gray-500 text-xs line-clamp-2 mb-4">{p.description || 'Sin descripción.'}</p>
                
                <div className="flex items-center justify-between mt-auto">
                   <div>
                      <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">Precio Especial</p>
                      <p className="text-xl font-black text-green-400">${Number(p.price).toLocaleString('es-AR')}</p>
                   </div>
                   <div className="flex gap-2">
                      <button onClick={() => startEdit(p)} className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition text-gray-400 hover:text-white" title="Editar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                      <button onClick={() => deletePromo(p.id)} className="p-2 bg-red-900/20 hover:bg-red-900/40 border border-red-500/20 rounded-xl transition text-red-500" title="Eliminar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                   </div>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div className="col-span-full py-20 bg-white/5 border border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center text-center px-4">
              <div className="text-4xl mb-4 opacity-30">🎁</div>
              <p className="text-gray-500 font-bold">No tenés promociones creadas.</p>
              <button onClick={() => setShowForm(true)} className="mt-4 text-red-500 text-xs font-black uppercase hover:underline">Crear mi primera promo</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


