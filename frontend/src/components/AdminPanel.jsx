import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminFetch } from '../services/api';

const SECTIONS = ['Dashboard', 'Categorías', 'Productos', 'Cupones', 'Videos', 'Noticias', 'Pedidos', 'MercadoPago'];

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

  const load = useCallback(async (sec) => {
    if (!token) return;
    setLoading(true); setError('');
    try {
      const map = {
        Dashboard: '/stats',
        Categorías: '/categories',
        Productos: ['/products', '/categories'],
        Cupones: '/coupons',
        Pedidos: '/orders',
        MercadoPago: '/mercadopago',
      };
      const path = map[sec];
      if (Array.isArray(path)) {
        const [products, categories] = await Promise.all(path.map(p => adminFetch(p, token)));
        setData(prev => ({ ...prev, Productos: products, _categories: categories }));
      } else if (path) {
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
        <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
      </div>
      <div className="flex flex-1 overflow-hidden">
        <aside className="w-48 bg-[#0d0d0d] border-r border-white/10 flex flex-col gap-1 p-4 overflow-y-auto">
          {SECTIONS.map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`text-left px-4 py-2 rounded-lg text-sm transition-colors ${
                section === s ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'
              }`}>{s}</button>
          ))}
        </aside>
        <main className="flex-1 overflow-y-auto p-6 text-white">
          {error && <div className="bg-red-900/50 text-red-300 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {section === 'Dashboard' && <DashboardSection data={data.Dashboard} />}
              {section === 'Categorías' && <CategoriesSection items={data['Categorías'] || []} token={token} reload={() => load('Categorías')} />}
              {section === 'Productos' && <ProductsSection items={data.Productos || []} categories={data._categories || []} token={token} reload={() => load('Productos')} />}
              {section === 'Cupones' && <CouponsSection items={data.Cupones || []} token={token} reload={() => load('Cupones')} />}
              {section === 'Videos' && <VideosSection token={token} />}
              {section === 'Noticias' && <NewsSection token={token} />}
              {section === 'Pedidos' && <OrdersSection items={data.Pedidos || []} token={token} reload={() => load('Pedidos')} />}
              {section === 'MercadoPago' && <MercadoPagoSection data={data.MercadoPago} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function DashboardSection({ data }) {
  if (!data) return <p className="text-gray-500">Cargando...</p>;
  const cards = [
    { label: 'Productos activos', value: data.products, color: 'text-green-400' },
    { label: 'Pedidos totales', value: data.orders, color: 'text-blue-400' },
    { label: 'Ingresos', value: `$${(data.revenue || 0).toLocaleString('es-AR')}`, color: 'text-yellow-400' },
    { label: 'Usuarios', value: data.users, color: 'text-purple-400' },
    { label: 'Cupones activos', value: data.activeCoupons, color: 'text-red-400' },
  ];
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white/5 rounded-xl p-5 border border-white/10">
            <p className="text-gray-400 text-sm mb-1">{c.label}</p>
            <p className={`text-3xl font-bold ${c.color}`}>{c.value ?? '—'}</p>
          </div>
        ))}
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
  const emptyForm = { name: '', description: '', price: '', category_id: '', image_url: '', badge: '' };
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const startEdit = (p) => {
    setEditing(p.id);
    setForm({
      name: p.name, description: p.description || '', price: p.price,
      category_id: p.category_id, image_url: p.image_url || '', badge: p.badge || '',
    });
    setMsg('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => { setEditing(null); setForm(emptyForm); setMsg(''); };

  const submit = async (e) => {
    e.preventDefault(); setSubmitting(true); setMsg('');
    try {
      const payload = { ...form, price: parseFloat(form.price) };
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
        {items.map(p => (
          <div key={p.id} className={`flex items-center gap-3 rounded-lg px-4 py-3 border transition-opacity ${
            p.is_active ? 'bg-white/5 border-white/5' : 'bg-white/2 border-white/5 opacity-50'
          }`}>
            {p.image_url && <img src={p.image_url} alt="" className="w-10 h-10 object-cover rounded flex-shrink-0" />}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{p.name}</p>
              <p className="text-sm text-gray-400">{p.category_name} · ${p.price}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${p.is_active ? 'bg-green-900/50 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
              {p.is_active ? 'Activo' : 'Inactivo'}
            </span>
            <button onClick={() => startEdit(p)} className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">Editar</button>
            <button onClick={() => toggleActive(p)} className={`text-xs flex-shrink-0 ${p.is_active ? 'text-gray-500 hover:text-red-400' : 'text-green-500 hover:text-green-300'}`}>
              {p.is_active ? 'Desactivar' : 'Activar'}
            </button>
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
    if (!confirm('¿Eliminar cupón?')) return;
    await adminFetch(`/coupons/${id}`, token, { method: 'DELETE' });
    reload();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Cupones</h2>
      <form onSubmit={submit} className="bg-white/5 rounded-xl p-5 border border-white/10 mb-8 grid grid-cols-2 gap-3">
        <h3 className="col-span-2 font-semibold text-gray-300">Nuevo cupón</h3>
        <input placeholder="Código (ej: VORAZ20)" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
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

function OrdersSection({ items, token, reload }) {
  const [updating, setUpdating] = useState(null);
  const [msg, setMsg] = useState('');

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
      <h2 className="text-2xl font-bold mb-6">Pedidos</h2>
      {msg && <div className="bg-red-900/50 text-red-300 px-4 py-2 rounded-lg mb-4 text-sm">{msg}</div>}

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
                  <p className="text-xs text-gray-600">{new Date(o.created_at).toLocaleString('es-AR')}</p>
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
function MercadoPagoSection({ data }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Configuración MercadoPago</h2>

      <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
        <h3 className="font-semibold text-gray-300 mb-4">Estado actual</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${data?.access_token_set ? 'bg-green-400' : 'bg-red-500'}`} />
            <span className="text-sm">Access Token: {data?.access_token_set ? 'Configurado' : 'No configurado'}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${data?.public_key ? 'bg-green-400' : 'bg-red-500'}`} />
            <span className="text-sm">Public Key: {data?.public_key || 'No configurada'}</span>
          </div>
          {data?.webhook_url && (
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-1">URL del Webhook:</p>
              <code className="text-xs bg-black/40 px-3 py-1.5 rounded text-green-400 block break-all">{data.webhook_url}</code>
            </div>
          )}
        </div>
      </div>

      <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-6">
        <h3 className="font-semibold text-blue-300 mb-3">Cómo configurar MercadoPago</h3>
        <ol className="text-sm text-gray-400 space-y-3 list-decimal list-inside">
          <li>Ingresá a <a href="https://www.mercadopago.com.ar/developers/panel/app" target="_blank" rel="noreferrer" className="text-blue-400 underline">MercadoPago Developers</a></li>
          <li>Creá o seleccioná tu aplicación</li>
          <li>Copiá el <strong className="text-white">Access Token</strong> de producción</li>
          <li>Copiá la <strong className="text-white">Public Key</strong> de producción</li>
          <li>En Railway → tu servicio backend → <strong className="text-white">Variables</strong>, agregá:
            <div className="mt-2 space-y-1">
              <code className="block bg-black/40 px-3 py-1.5 rounded text-yellow-300 text-xs">MP_ACCESS_TOKEN=APP_USR-xxxx</code>
              <code className="block bg-black/40 px-3 py-1.5 rounded text-yellow-300 text-xs">MP_PUBLIC_KEY=APP_USR-xxxx</code>
            </div>
          </li>
          <li>Configurá el webhook en MercadoPago apuntando a:
            <code className="block mt-1 bg-black/40 px-3 py-1.5 rounded text-green-300 text-xs break-all">{data?.webhook_url || 'https://TU_BACKEND.up.railway.app/api/payments/webhook'}</code>
          </li>
          <li>Hacé un Redeploy en Railway para aplicar los cambios</li>
        </ol>
      </div>
    </div>
  );
}
