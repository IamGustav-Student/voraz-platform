import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminFetch } from '../services/api';

const SECTIONS = ['Dashboard', 'Productos', 'Cupones', 'Videos', 'Noticias', 'Pedidos'];

export default function AdminPanel({ onClose }) {
  const { user, getToken } = useAuth();
  const token = getToken();
  const [section, setSection] = useState('Dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [data, setData] = useState({});

  const load = useCallback(async (sec) => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const map = {
        Dashboard: '/stats',
        Productos: '/products',
        Cupones: '/coupons',
        Videos: null,
        Noticias: null,
        Pedidos: '/orders',
      };
      const path = map[sec];
      if (path) {
        const result = await adminFetch(path, token);
        setData(prev => ({ ...prev, [sec]: result }));
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(section); }, [section, load]);

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
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 bg-[#111] border-b border-white/10">
        <h1 className="text-white font-bold text-xl">Panel de Administración</h1>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-48 bg-[#0d0d0d] border-r border-white/10 flex flex-col gap-1 p-4">
          {SECTIONS.map(s => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                section === s ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >{s}</button>
          ))}
        </aside>
        <main className="flex-1 overflow-y-auto p-6 text-white">
          {error && <div className="bg-red-900/50 text-red-300 px-4 py-3 rounded-lg mb-4">{error}</div>}
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {section === 'Dashboard' && <DashboardSection data={data.Dashboard} />}
              {section === 'Productos' && <ProductsSection items={data.Productos || []} token={token} reload={() => load('Productos')} />}
              {section === 'Cupones' && <CouponsSection items={data.Cupones || []} token={token} reload={() => load('Cupones')} />}
              {section === 'Videos' && <VideosSection token={token} />}
              {section === 'Noticias' && <NewsSection token={token} />}
              {section === 'Pedidos' && <OrdersSection items={data.Pedidos || []} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function DashboardSection({ data }) {
  if (!data) return null;
  const cards = [
    { label: 'Productos activos', value: data.products },
    { label: 'Pedidos totales', value: data.orders },
    { label: 'Ingresos', value: `$${(data.revenue || 0).toLocaleString('es-AR')}` },
    { label: 'Usuarios', value: data.users },
    { label: 'Cupones activos', value: data.activeCoupons },
  ];
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white/5 rounded-xl p-5 border border-white/10">
            <p className="text-gray-400 text-sm mb-1">{c.label}</p>
            <p className="text-3xl font-bold text-red-400">{c.value ?? '—'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Productos ────────────────────────────────────────────────────────────────
function ProductsSection({ items, token, reload }) {
  const [form, setForm] = useState({ name: '', description: '', price: '', category_id: '', image_url: '', badge: '' });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault(); setSubmitting(true); setMsg('');
    try {
      await adminFetch('/products', token, {
        method: 'POST',
        body: JSON.stringify({ ...form, price: parseFloat(form.price) }),
      });
      setMsg('Producto creado'); setForm({ name: '', description: '', price: '', category_id: '', image_url: '', badge: '' });
      reload();
    } catch (e) { setMsg('Error: ' + e.message); }
    setSubmitting(false);
  };

  const deactivate = async (id) => {
    await adminFetch(`/products/${id}`, token, { method: 'DELETE' });
    reload();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Productos</h2>
      <form onSubmit={submit} className="bg-white/5 rounded-xl p-5 border border-white/10 mb-8 grid grid-cols-2 gap-3">
        <h3 className="col-span-2 font-semibold text-gray-300">Agregar producto</h3>
        {[['name','Nombre'],['description','Descripción'],['price','Precio'],['category_id','ID Categoría'],['image_url','URL Imagen'],['badge','Badge (ej: Nuevo)']].map(([k,l]) => (
          <input key={k} placeholder={l} value={form[k]} onChange={e => setForm(p=>({...p,[k]:e.target.value}))}
            className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required={['name','price','category_id'].includes(k)} />
        ))}
        <button type="submit" disabled={submitting} className="col-span-2 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold disabled:opacity-50">
          {submitting ? 'Guardando...' : 'Crear producto'}
        </button>
        {msg && <p className="col-span-2 text-sm text-green-400">{msg}</p>}
      </form>
      <div className="space-y-2">
        {items.map(p => (
          <div key={p.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3 border border-white/5">
            {p.image_url && <img src={p.image_url} alt="" className="w-10 h-10 object-cover rounded" />}
            <div className="flex-1">
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-gray-400">{p.category_name} · ${p.price}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${p.is_active ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              {p.is_active ? 'Activo' : 'Inactivo'}
            </span>
            {p.is_active && (
              <button onClick={() => deactivate(p.id)} className="text-xs text-gray-500 hover:text-red-400">Desactivar</button>
            )}
          </div>
        ))}
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
    await adminFetch(`/coupons/${id}`, token, { method: 'DELETE' });
    reload();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Cupones</h2>
      <form onSubmit={submit} className="bg-white/5 rounded-xl p-5 border border-white/10 mb-8 grid grid-cols-2 gap-3">
        <h3 className="col-span-2 font-semibold text-gray-300">Nuevo cupón</h3>
        <input placeholder="Código (ej: VORAZ20)" value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value}))} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm uppercase" required />
        <input placeholder="Descripción" value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        <select value={form.discount_type} onChange={e=>setForm(p=>({...p,discount_type:e.target.value}))} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
          <option value="percentage">Porcentaje (%)</option>
          <option value="fixed">Monto fijo ($)</option>
        </select>
        <input type="number" placeholder="Valor descuento" value={form.discount_value} onChange={e=>setForm(p=>({...p,discount_value:e.target.value}))} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />
        <input type="number" placeholder="Monto mínimo (opcional)" value={form.min_order} onChange={e=>setForm(p=>({...p,min_order:e.target.value}))} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        <input type="number" placeholder="Usos máximos (opcional)" value={form.max_uses} onChange={e=>setForm(p=>({...p,max_uses:e.target.value}))} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        <input type="date" placeholder="Expira el (opcional)" value={form.expires_at} onChange={e=>setForm(p=>({...p,expires_at:e.target.value}))} className="col-span-2 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        <button type="submit" disabled={submitting} className="col-span-2 bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold disabled:opacity-50">
          {submitting ? 'Guardando...' : 'Crear cupón'}
        </button>
        {msg && <p className="col-span-2 text-sm text-green-400">{msg}</p>}
      </form>
      <div className="space-y-2">
        {items.map(c => (
          <div key={c.id} className="flex items-center gap-3 bg-white/5 rounded-lg px-4 py-3 border border-white/5">
            <span className="font-mono font-bold text-yellow-400">{c.code}</span>
            <span className="text-sm text-gray-400 flex-1">{c.description} · {c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`}</span>
            <button onClick={() => toggle(c.id, c.active)} className={`text-xs px-2 py-1 rounded-full ${c.active ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
              {c.active ? 'Activo' : 'Inactivo'}
            </button>
            <button onClick={() => del(c.id)} className="text-xs text-red-500 hover:text-red-300">Eliminar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Videos ────────────────────────────────────────────────────────────────────
function VideosSection({ token }) {
  const [form, setForm] = useState({ title: '', youtube_url: '' });
  const [msg, setMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault(); setMsg('');
    try {
      await adminFetch('/videos', token, { method: 'POST', body: JSON.stringify(form) });
      setMsg('Video agregado'); setForm({ title: '', youtube_url: '' });
    } catch (e) { setMsg('Error: ' + e.message); }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Videos</h2>
      <form onSubmit={submit} className="bg-white/5 rounded-xl p-5 border border-white/10 grid gap-3">
        <input placeholder="Título del video" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />
        <input placeholder="URL de YouTube (ej: https://youtube.com/watch?v=...)" value={form.youtube_url} onChange={e=>setForm(p=>({...p,youtube_url:e.target.value}))} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />
        <button type="submit" className="bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold">Agregar video</button>
        {msg && <p className="text-sm text-green-400">{msg}</p>}
      </form>
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
        <input placeholder="Título" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />
        <textarea placeholder="Contenido" rows={4} value={form.content} onChange={e=>setForm(p=>({...p,content:e.target.value}))} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" required />
        <input placeholder="URL de imagen (opcional)" value={form.image_url} onChange={e=>setForm(p=>({...p,image_url:e.target.value}))} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        <input type="date" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        <button type="submit" className="bg-red-600 hover:bg-red-700 py-2 rounded-lg font-semibold">Publicar noticia</button>
        {msg && <p className="text-sm text-green-400">{msg}</p>}
      </form>
    </div>
  );
}

// ── Pedidos ───────────────────────────────────────────────────────────────────
function OrdersSection({ items }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Pedidos recientes</h2>
      <div className="space-y-2">
        {items.map(o => (
          <div key={o.id} className="flex items-center gap-4 bg-white/5 rounded-lg px-4 py-3 border border-white/5">
            <span className="font-mono text-xs text-gray-500">#{o.id}</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{o.user_name || o.user_email || 'Invitado'}</p>
              <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleString('es-AR')}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              o.status === 'delivered' ? 'bg-green-900/50 text-green-400' :
              o.status === 'cancelled' ? 'bg-red-900/50 text-red-400' :
              'bg-yellow-900/50 text-yellow-400'
            }`}>{o.status}</span>
            <span className="font-bold text-red-400">${o.total}</span>
          </div>
        ))}
        {!items.length && <p className="text-gray-500 text-sm">No hay pedidos aún</p>}
      </div>
    </div>
  );
}
