import { useState, useEffect, useCallback } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').trim();

const superadminHeaders = (token) => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
});

const sfetch = async (path, token, options = {}) => {
  const res = await fetch(`${API_URL}/superadmin${path}`, {
    ...options,
    headers: { ...superadminHeaders(token), ...(options.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error');
  return data.data ?? data;
};

const PLAN_COLORS = { 'Full Digital': 'text-blue-400 bg-blue-900/20 border-blue-500/30', 'Expert': 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30' };
const STATUS_COLORS = { active: 'text-green-400 bg-green-900/20', suspended: 'text-red-400 bg-red-900/20', trial: 'text-yellow-400 bg-yellow-900/20' };

export default function SuperAdminPanel({ onBack }) {
  const [token, setToken] = useState(() => sessionStorage.getItem('sa_token') || '');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginErr, setLoginErr] = useState('');
  const [tab, setTab] = useState('stores');
  const [stores, setStores] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', brand_name: '', subdomain: '', custom_domain: '', plan_type: 'Full Digital',
    subscription_period: 'monthly', admin_email: '', brand_color_primary: '#E30613',
    brand_color_secondary: '#1A1A1A', slogan: '',
  });

  const load = useCallback(async (t) => {
    const tk = t || token;
    if (!tk) return;
    setLoading(true);
    try {
      const [s, st] = await Promise.all([sfetch('/stores', tk), sfetch('/stats', tk)]);
      setStores(Array.isArray(s) ? s : []);
      setStats(st);
    } catch (e) { setMsg('Error: ' + e.message); }
    setLoading(false);
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault(); setLoginErr('');
    try {
      const res = await fetch(`${API_URL}/superadmin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Credenciales inválidas');
      sessionStorage.setItem('sa_token', data.data.token);
      setToken(data.data.token);
      load(data.data.token);
    } catch (e) { setLoginErr(e.message); }
  };

  useEffect(() => { if (token) load(); }, [token, load]);

  const setStatus = async (id, status) => {
    try { await sfetch(`/stores/${id}/status`, token, { method: 'PATCH', body: JSON.stringify({ status }) }); load(); }
    catch (e) { setMsg('Error: ' + e.message); }
  };

  const setPlan = async (id, plan_type) => {
    try { await sfetch(`/stores/${id}/plan`, token, { method: 'PATCH', body: JSON.stringify({ plan_type }) }); load(); }
    catch (e) { setMsg('Error: ' + e.message); }
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setMsg('');
    try {
      await sfetch('/stores', token, { method: 'POST', body: JSON.stringify(createForm) });
      setMsg('Comercio creado correctamente');
      setShowCreate(false);
      setCreateForm({ name: '', brand_name: '', subdomain: '', custom_domain: '', plan_type: 'Full Digital', subscription_period: 'monthly', admin_email: '', brand_color_primary: '#E30613', brand_color_secondary: '#1A1A1A', slogan: '' });
      load();
    } catch (e) { setMsg('Error: ' + e.message); }
  };

  const fmt = (n) => parseInt(n || 0).toLocaleString('es-AR');

  if (!token) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="bg-[#111] border border-white/10 rounded-2xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🍽️</div>
            <h1 className="text-2xl font-black text-white">GastroRed</h1>
            <p className="text-gray-500 text-sm">Panel de Administración SaaS</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" placeholder="Email superadmin" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500" required />
            <input type="password" placeholder="Contraseña" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500" required />
            {loginErr && <p className="text-red-400 text-xs font-bold">{loginErr}</p>}
            <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-black uppercase tracking-wide transition">
              Ingresar
            </button>
          </form>
          {onBack && <button onClick={onBack} className="w-full mt-3 text-gray-600 hover:text-gray-400 text-xs py-2">← Volver</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍽️</span>
          <div>
            <h1 className="font-black text-white text-lg leading-none">GastroRed</h1>
            <p className="text-gray-500 text-xs">Panel SaaS — Superadmin</p>
          </div>
        </div>
        <div className="flex gap-2">
          {onBack && <button onClick={onBack} className="text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg bg-white/5">← Volver</button>}
          <button onClick={() => { sessionStorage.removeItem('sa_token'); setToken(''); }} className="text-xs text-red-500 hover:text-red-300 px-3 py-1.5 rounded-lg bg-white/5">Cerrar sesión</button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-5">
          {[
            { label: 'Total Comercios', value: stats.total_stores, icon: '🏪' },
            { label: 'Activos', value: stats.active_stores, icon: '✅' },
            { label: 'Suspendidos', value: stats.suspended_stores, icon: '⏸️' },
            { label: 'Ingresos totales', value: `$${fmt(stats.total_revenue)}`, icon: '💰' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-4 border border-white/5">
              <p className="text-2xl mb-1">{s.icon}</p>
              <p className="text-xl font-black text-white">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {msg && (
        <div className={`mx-6 px-4 py-3 rounded-xl text-sm font-bold mb-4 ${msg.startsWith('Error') ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
          {msg} <button onClick={() => setMsg('')} className="ml-2 opacity-60">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 flex gap-2 mb-6">
        {['stores', 'crear'].map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === 'crear') setShowCreate(true); else setShowCreate(false); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold uppercase transition ${tab === t ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
            {t === 'stores' ? `🏪 Comercios (${stores.length})` : '➕ Nuevo Comercio'}
          </button>
        ))}
        <button onClick={() => load()} className="ml-auto text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg bg-white/5">↻ Actualizar</button>
      </div>

      <div className="px-6 pb-20">
        {/* Lista comercios */}
        {tab === 'stores' && !showCreate && (
          <div className="space-y-3">
            {loading && <p className="text-gray-500 text-sm">Cargando...</p>}
            {stores.map(s => (
              <div key={s.id} className="bg-white/5 border border-white/5 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    {s.brand_logo_url
                      ? <img src={s.brand_logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: s.brand_color_primary || '#E30613' }}>
                          {(s.brand_name || s.name)?.[0]?.toUpperCase()}
                        </div>
                    }
                    <div>
                      <p className="font-bold text-white">{s.brand_name || s.name}</p>
                      <p className="text-xs text-gray-500">{s.subdomain}.gastrored.com.ar {s.custom_domain && `· ${s.custom_domain}`}</p>
                      {s.admin_email && <p className="text-xs text-gray-600">{s.admin_email}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${PLAN_COLORS[s.plan_type] || 'text-gray-400'}`}>{s.plan_type}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLORS[s.status] || 'text-gray-400 bg-gray-900/20'}`}>{s.status}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 flex-wrap">
                  {s.status !== 'active' && (
                    <button onClick={() => setStatus(s.id, 'active')} className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg font-bold">✅ Activar</button>
                  )}
                  {s.status === 'active' && (
                    <button onClick={() => setStatus(s.id, 'suspended')} className="text-xs px-3 py-1.5 bg-red-700 hover:bg-red-800 rounded-lg font-bold">⏸ Suspender</button>
                  )}
                  {s.plan_type !== 'Expert' && (
                    <button onClick={() => setPlan(s.id, 'Expert')} className="text-xs px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-bold">⬆️ → Expert</button>
                  )}
                  {s.plan_type !== 'Full Digital' && (
                    <button onClick={() => setPlan(s.id, 'Full Digital')} className="text-xs px-3 py-1.5 bg-blue-700 hover:bg-blue-800 rounded-lg font-bold">⬇️ → Full Digital</button>
                  )}
                  {s.subscription_expires_at && (
                    <span className={`text-xs px-2 py-1.5 rounded-lg ${new Date(s.subscription_expires_at) < new Date() ? 'bg-red-900/30 text-red-400' : 'bg-white/5 text-gray-400'}`}>
                      {new Date(s.subscription_expires_at) < new Date() ? '⚠️ Expiró' : `Vence: ${new Date(s.subscription_expires_at).toLocaleDateString('es-AR')}`}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {!loading && !stores.length && <p className="text-gray-500 text-sm">No hay comercios registrados.</p>}
          </div>
        )}

        {/* Crear comercio */}
        {showCreate && (
          <form onSubmit={handleCreate} className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-2xl space-y-4">
            <h2 className="font-black text-xl text-white">Nuevo Comercio</h2>

            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Nombre del negocio *" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} required
                className="col-span-2 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
              <input placeholder="Nombre de marca (para la app)" value={createForm.brand_name} onChange={e => setCreateForm(f => ({ ...f, brand_name: e.target.value }))}
                className="col-span-2 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
              <div className="col-span-2">
                <input placeholder="Subdomain * (ej: miburguer → miburguer.gastrored.com.ar)" value={createForm.subdomain}
                  onChange={e => setCreateForm(f => ({ ...f, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} required
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
                {createForm.subdomain && <p className="text-xs text-green-400 mt-1">URL: {createForm.subdomain}.gastrored.com.ar</p>}
              </div>
              <input placeholder="Dominio propio (opcional, ej: miburguer.com.ar)" value={createForm.custom_domain}
                onChange={e => setCreateForm(f => ({ ...f, custom_domain: e.target.value }))}
                className="col-span-2 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
              <input placeholder="Email del dueño" type="email" value={createForm.admin_email}
                onChange={e => setCreateForm(f => ({ ...f, admin_email: e.target.value }))}
                className="col-span-2 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
              <input placeholder="Slogan" value={createForm.slogan} onChange={e => setCreateForm(f => ({ ...f, slogan: e.target.value }))}
                className="col-span-2 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
              <div>
                <label className="text-xs text-gray-400 block mb-1">Color primario</label>
                <input type="color" value={createForm.brand_color_primary} onChange={e => setCreateForm(f => ({ ...f, brand_color_primary: e.target.value }))}
                  className="w-full h-10 bg-black/30 border border-white/10 rounded-xl cursor-pointer" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Color secundario</label>
                <input type="color" value={createForm.brand_color_secondary} onChange={e => setCreateForm(f => ({ ...f, brand_color_secondary: e.target.value }))}
                  className="w-full h-10 bg-black/30 border border-white/10 rounded-xl cursor-pointer" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Plan</label>
                <select value={createForm.plan_type} onChange={e => setCreateForm(f => ({ ...f, plan_type: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm">
                  <option value="Full Digital">Full Digital — $60.000/mes</option>
                  <option value="Expert">Expert — $100.000/mes</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Período</label>
                <select value={createForm.subscription_period} onChange={e => setCreateForm(f => ({ ...f, subscription_period: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm">
                  <option value="monthly">Mensual</option>
                  <option value="annual">Anual (2 meses gratis)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-xl font-black text-sm uppercase">Crear Comercio</button>
              <button type="button" onClick={() => { setShowCreate(false); setTab('stores'); }} className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-sm">Cancelar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
