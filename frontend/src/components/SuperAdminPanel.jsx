import { useState, useEffect, useCallback } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').trim();
// Dominio base de GastroRed para preview de URLs de tenant
const GASTRORED_DOMAIN = (import.meta.env.VITE_GASTRORED_DOMAIN || 'gastrored.com.ar').trim();

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

const PLAN_COLORS = {
  'Full Digital': 'text-blue-400 bg-blue-900/20 border-blue-500/30',
  'Expert': 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
};
const STATUS_COLORS = {
  active: 'text-green-400 bg-green-900/20',
  suspended: 'text-red-400 bg-red-900/20',
  trial: 'text-yellow-400 bg-yellow-900/20',
};

const EMPTY_FORM = {
  name: '', brand_name: '', subdomain: '', custom_domain: '',
  plan_type: 'Full Digital', subscription_period: 'monthly',
  admin_email: '', admin_name: '', admin_password: '',
  brand_color_primary: '#E30613',
  brand_color_secondary: '#1A1A1A', slogan: '',
};

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
  const [createForm, setCreateForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [lastCreated, setLastCreated] = useState(null);
  // Config
  const [config, setConfig] = useState(null);
  const [configForm, setConfigForm] = useState({});
  const [savingConfig, setSavingConfig] = useState(false);

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

  useEffect(() => { if (token) { load(); loadConfig(); } }, [token, load]);

  const setStatus = async (id, status) => {
    try { await sfetch(`/stores/${id}/status`, token, { method: 'PATCH', body: JSON.stringify({ status }) }); load(); }
    catch (e) { setMsg('Error: ' + e.message); }
  };

  const setPlan = async (id, plan_type) => {
    try { await sfetch(`/stores/${id}/plan`, token, { method: 'PATCH', body: JSON.stringify({ plan_type }) }); load(); }
    catch (e) { setMsg('Error: ' + e.message); }
  };

  const toggleBranding = async (id, current) => {
    try {
      await sfetch(`/tenants/${id}/branding-toggle`, token, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !current }),
      });
      setMsg(!current ? '🎨 Branding personalizado activado' : '🔒 Branding personalizado desactivado');
      load();
    } catch (e) { setMsg('Error: ' + e.message); }
  };

  const handleCreate = async (e) => {
    e.preventDefault(); setMsg(''); setCreating(true); setLastCreated(null);
    try {
      const store = await sfetch('/stores', token, { method: 'POST', body: JSON.stringify(createForm) });
      setLastCreated(store);
      setMsg('✅ Comercio creado correctamente');
      setShowCreate(false);
      setTab('stores');
      setCreateForm(EMPTY_FORM);
      load();
    } catch (e) { setMsg('Error: ' + e.message); }
    setCreating(false);
  };

  const loadConfig = async () => {
    try {
      const res = await fetch(`${API_URL}/superadmin/config`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error al cargar config');
      const cfg = data.data ?? data;
      setConfig(cfg);
      setConfigForm({
        mp_access_token: '',
        mp_sandbox_mode: cfg.mp_sandbox_mode || 'false',
        price_full_digital_monthly: cfg.price_full_digital_monthly || '60000',
        price_full_digital_annual: cfg.price_full_digital_annual || '600000',
        price_expert_monthly: cfg.price_expert_monthly || '100000',
        price_expert_annual: cfg.price_expert_annual || '1000000',
        trial_days: cfg.trial_days || '7',
        frontend_url: cfg.frontend_url || '',
        backend_url: cfg.backend_url || '',
        contact_email: cfg.contact_email || '',
      });
    } catch (e) { setMsg('Error al cargar config: ' + e.message); }
  };

  const saveConfig = async (e) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      // Solo enviar mp_access_token si el usuario ingresó algo
      const payload = { ...configForm };
      if (!payload.mp_access_token.trim()) delete payload.mp_access_token;
      const res = await fetch(`${API_URL}/superadmin/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setMsg('✅ Configuración guardada');
      loadConfig();
    } catch (e) { setMsg('Error: ' + e.message); }
    setSavingConfig(false);
  };

  // Helper: preview URL del tenant
  const tenantUrl = (store) => {
    if (store.custom_domain) return `https://${store.custom_domain}`;
    if (store.subdomain) return `https://${store.subdomain}.${GASTRORED_DOMAIN}`;
    return null;
  };

  const fmt = (n) => parseInt(n || 0).toLocaleString('es-AR');

  // ── LOGIN ──────────────────────────────────────────────────────────────────
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
            <input type="email" placeholder="Email superadmin" value={loginForm.email}
              onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500" required />
            <input type="password" placeholder="Contraseña" value={loginForm.password}
              onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
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

  // ── PANEL PRINCIPAL ────────────────────────────────────────────────────────
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
          <button onClick={() => { sessionStorage.removeItem('sa_token'); setToken(''); }}
            className="text-xs text-red-500 hover:text-red-300 px-3 py-1.5 rounded-lg bg-white/5">
            Cerrar sesión
          </button>
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

      {/* Mensaje de feedback */}
      {msg && (
        <div className={`mx-6 px-4 py-3 rounded-xl text-sm font-bold mb-2 ${msg.startsWith('Error') ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400'}`}>
          {msg} <button onClick={() => setMsg('')} className="ml-2 opacity-60">✕</button>
        </div>
      )}

      {/* URLs del último tenant creado */}
      {lastCreated && (
        <div className="mx-6 mb-4 bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
          <p className="text-blue-300 font-bold text-sm mb-2">🎉 Tenant creado — URLs de acceso:</p>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Subdomain:</span>
              <a href={`https://${lastCreated.subdomain}.${GASTRORED_DOMAIN}`} target="_blank" rel="noreferrer"
                className="text-blue-400 hover:underline">{lastCreated.subdomain}.{GASTRORED_DOMAIN}</a>
            </div>
            {lastCreated.custom_domain && (
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Dominio propio:</span>
                <a href={`https://${lastCreated.custom_domain}`} target="_blank" rel="noreferrer"
                  className="text-blue-400 hover:underline">{lastCreated.custom_domain}</a>
                <span className="text-yellow-500 text-[10px]">⚠️ Requiere configurar DNS</span>
              </div>
            )}
            {lastCreated.admin_user && (
              <div className="mt-3 bg-green-900/20 border border-green-500/20 rounded-lg p-3 space-y-1">
                <p className="text-green-400 font-bold not-italic">🔑 Credenciales del Admin</p>
                <p><span className="text-gray-400">Email: </span><span className="text-white">{lastCreated.admin_user.email}</span></p>
                <p><span className="text-gray-400">Contraseña: </span><span className="text-yellow-300">(la que ingresaste al crear)</span></p>
                <p><span className="text-gray-400">Panel: </span>
                  <a href={lastCreated.admin_user.login_url} target="_blank" rel="noreferrer"
                    className="text-blue-400 hover:underline">{lastCreated.admin_user.login_url}</a>
                </p>
              </div>
            )}
          </div>
          <button onClick={() => setLastCreated(null)} className="mt-2 text-xs text-gray-500 hover:text-white">Cerrar</button>
        </div>
      )}


      {/* Tabs */}
      <div className="px-6 flex gap-2 mb-6 flex-wrap">
        {['stores', 'crear', 'config'].map(t => (
          <button key={t} onClick={() => { setTab(t); setShowCreate(t === 'crear'); if (t === 'config') loadConfig(); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold uppercase transition ${tab === t ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
            {t === 'stores' ? `🏪 Comercios (${stores.length})` : t === 'crear' ? '➕ Nuevo Comercio' : '⚙️ Configuración'}
          </button>
        ))}
        <button onClick={() => load()} className="ml-auto text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg bg-white/5">↻ Actualizar</button>
      </div>

      <div className="px-6 pb-20">
        {/* Lista de comercios */}
        {tab === 'stores' && !showCreate && (
          <div className="space-y-3">
            {loading && <p className="text-gray-500 text-sm">Cargando...</p>}
            {stores.map(s => (
              <div key={s.id} className="bg-white/5 border border-white/5 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    {s.brand_logo_url
                      ? <img src={s.brand_logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-black text-white"
                        style={{ background: s.brand_color_primary || '#E30613' }}>
                        {(s.brand_name || s.name)?.[0]?.toUpperCase()}
                      </div>
                    }
                    <div>
                      <p className="font-bold text-white">{s.brand_name || s.name}</p>
                      {/* URL de acceso del tenant */}
                      <div className="text-xs text-gray-500 space-y-0.5">
                        {s.subdomain && (
                          <p>
                            <span className="text-gray-600">sub: </span>
                            <a href={`https://${s.subdomain}.${GASTRORED_DOMAIN}`} target="_blank" rel="noreferrer"
                              className="text-blue-500 hover:text-blue-400 hover:underline">
                              {s.subdomain}.{GASTRORED_DOMAIN}
                            </a>
                          </p>
                        )}
                        {s.custom_domain && (
                          <p>
                            <span className="text-gray-600">dominio: </span>
                            <a href={`https://${s.custom_domain}`} target="_blank" rel="noreferrer"
                              className="text-green-500 hover:text-green-400 hover:underline">
                              {s.custom_domain}
                            </a>
                          </p>
                        )}
                      </div>
                      {s.admin_email && <p className="text-xs text-gray-600 mt-0.5">{s.admin_email}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${PLAN_COLORS[s.plan_type] || 'text-gray-400'}`}>{s.plan_type}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLORS[s.status] || 'text-gray-400 bg-gray-900/20'}`}>{s.status}</span>
                    <span className="text-xs text-gray-600 font-mono">id:{s.id}</span>
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
                  {/* Toggle branding personalizado */}
                  <button
                    onClick={() => toggleBranding(s.id, s.custom_branding_enabled)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold border transition ${
                      s.custom_branding_enabled
                        ? 'bg-purple-900/30 border-purple-500/40 text-purple-300 hover:bg-purple-900/50'
                        : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
                    }`}
                    title={s.custom_branding_enabled ? 'Deshabilitar branding personalizado' : 'Habilitar branding personalizado'}
                  >
                    {s.custom_branding_enabled ? '🎨 Branding ON' : '🎨 Branding OFF'}
                  </button>
                  {s.subscription_expires_at && (
                    <span className={`text-xs px-2 py-1.5 rounded-lg ${new Date(s.subscription_expires_at) < new Date() ? 'bg-red-900/30 text-red-400' : 'bg-white/5 text-gray-400'}`}>
                      {new Date(s.subscription_expires_at) < new Date()
                        ? '⚠️ Expiró'
                        : `Vence: ${new Date(s.subscription_expires_at).toLocaleDateString('es-AR')}`}
                    </span>
                  )}
                  {tenantUrl(s) && (
                    <a href={tenantUrl(s)} target="_blank" rel="noreferrer"
                      className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg font-bold text-gray-400 hover:text-white">
                      🔗 Ver sitio
                    </a>
                  )}
                </div>
              </div>
            ))}
            {!loading && !stores.length && <p className="text-gray-500 text-sm">No hay comercios registrados.</p>}
          </div>
        )}

        {/* Formulario de creación */}
        {showCreate && (
          <form onSubmit={handleCreate} className="bg-white/5 border border-white/10 rounded-2xl p-6 max-w-2xl space-y-4">
            <h2 className="font-black text-xl text-white">Nuevo Comercio</h2>

            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Nombre del negocio *" value={createForm.name}
                onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} required
                className="col-span-2 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />

              <input placeholder="Nombre de marca (para la app)" value={createForm.brand_name}
                onChange={e => setCreateForm(f => ({ ...f, brand_name: e.target.value }))}
                className="col-span-2 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />

              {/* Subdomain con preview en tiempo real */}
              <div className="col-span-2">
                <input placeholder="Subdomain * (ej: miburguer)" value={createForm.subdomain}
                  onChange={e => setCreateForm(f => ({ ...f, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} required
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
                {createForm.subdomain && (
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                    <span className="text-gray-500">URL del tenant:</span>
                    <span className="text-green-400 font-mono font-bold">{createForm.subdomain}.{GASTRORED_DOMAIN}</span>
                  </div>
                )}
              </div>

              {/* Dominio propio con instrucción DNS */}
              <div className="col-span-2">
                <input placeholder="Dominio propio (opcional, ej: pedir.miburguer.com)" value={createForm.custom_domain}
                  onChange={e => setCreateForm(f => ({ ...f, custom_domain: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />
                {createForm.custom_domain.trim() && (
                  <div className="mt-1.5 text-xs text-yellow-500 bg-yellow-900/20 rounded-lg px-3 py-2">
                    ⚠️ Para que funcione, el cliente debe configurar un CNAME en su DNS:<br />
                    <code className="font-mono">{createForm.custom_domain.toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] || 'su-dominio.com'}</code>
                    {' → '}
                    <code className="font-mono text-green-400">{API_URL.replace('/api', '').replace('https://', '').replace('http://', '')}</code>
                  </div>
                )}
              </div>

              <input placeholder="Email del dueño (será el usuario admin) *" type="email" value={createForm.admin_email}
                onChange={e => setCreateForm(f => ({ ...f, admin_email: e.target.value }))}
                required
                className="col-span-2 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />

              {/* Credenciales del administrador */}
              <div className="col-span-2 bg-yellow-900/10 border border-yellow-500/20 rounded-xl p-4">
                <p className="text-yellow-400 text-xs font-bold mb-3">🔑 Credenciales del Administrador</p>
                <div className="space-y-2">
                  <input placeholder="Nombre del administrador *" value={createForm.admin_name}
                    onChange={e => setCreateForm(f => ({ ...f, admin_name: e.target.value }))}
                    required
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" />
                  <input type="password" placeholder="Contraseña del admin (mín. 6 caracteres) *"
                    value={createForm.admin_password}
                    onChange={e => setCreateForm(f => ({ ...f, admin_password: e.target.value }))}
                    required minLength={6}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" />
                </div>
                <p className="text-gray-500 text-[11px] mt-2">El dueño usará este email y contraseña para acceder al panel /admin de su comercio.</p>
              </div>

              <input placeholder="Slogan" value={createForm.slogan}
                onChange={e => setCreateForm(f => ({ ...f, slogan: e.target.value }))}
                className="col-span-2 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm" />

              <div>
                <label className="text-xs text-gray-400 block mb-1">Color primario</label>
                <input type="color" value={createForm.brand_color_primary}
                  onChange={e => setCreateForm(f => ({ ...f, brand_color_primary: e.target.value }))}
                  className="w-full h-10 bg-black/30 border border-white/10 rounded-xl cursor-pointer" />
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Color secundario</label>
                <input type="color" value={createForm.brand_color_secondary}
                  onChange={e => setCreateForm(f => ({ ...f, brand_color_secondary: e.target.value }))}
                  className="w-full h-10 bg-black/30 border border-white/10 rounded-xl cursor-pointer" />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Plan</label>
                <select value={createForm.plan_type}
                  onChange={e => setCreateForm(f => ({ ...f, plan_type: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm">
                  <option value="Full Digital">Full Digital — $60.000/mes</option>
                  <option value="Expert">Expert — $100.000/mes</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">Período</label>
                <select value={createForm.subscription_period}
                  onChange={e => setCreateForm(f => ({ ...f, subscription_period: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm">
                  <option value="monthly">Mensual</option>
                  <option value="annual">Anual (2 meses gratis)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={creating}
                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 py-3 rounded-xl font-black text-sm uppercase">
                {creating ? 'Creando...' : 'Crear Comercio'}
              </button>
              <button type="button" onClick={() => { setShowCreate(false); setTab('stores'); }}
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-sm">
                Cancelar
              </button>
            </div>
          </form>
        )}

        {/* ── Panel de Configuración ──────────────────────────────────────────── */}
        {tab === 'config' && (
          <form onSubmit={saveConfig} className="max-w-2xl space-y-6">
            {/* MercadoPago */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-bold text-base mb-1 flex items-center gap-2">💳 MercadoPago</h3>
              <p className="text-gray-500 text-xs mb-4">Configurá las credenciales con las que GastroRed cobra las suscripciones.</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Access Token</label>
                  {config?.mp_access_token_masked && (
                    <p className="text-xs text-teal-400 font-mono mb-1">Token actual: {config.mp_access_token_masked}</p>
                  )}
                  {config?.mp_token_from_env && (
                    <p className="text-xs text-yellow-400 mb-1">⚠️ Token tomado del env var GASTRORED_MP_ACCESS_TOKEN</p>
                  )}
                  <input
                    type="password"
                    placeholder="APP_USR-... (dejá vacío para no cambiar)"
                    value={configForm.mp_access_token || ''}
                    onChange={e => setConfigForm(f => ({ ...f, mp_access_token: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-gray-400">Modo:</label>
                  <button type="button" onClick={() => setConfigForm(f => ({ ...f, mp_sandbox_mode: f.mp_sandbox_mode === 'true' ? 'false' : 'true' }))}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${configForm.mp_sandbox_mode === 'true' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                    {configForm.mp_sandbox_mode === 'true' ? '🧪 Sandbox (testing)' : '🚀 Producción'}
                  </button>
                  <span className="text-xs text-gray-600">{configForm.mp_sandbox_mode === 'true' ? 'Pagos de prueba, no se cobra realmente' : 'Pagos reales'}</span>
                </div>
              </div>
            </div>

            {/* Precios */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-bold text-base mb-4">💰 Precios de planes (ARS)</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'price_full_digital_monthly', label: 'Full Digital — Mensual' },
                  { key: 'price_full_digital_annual', label: 'Full Digital — Anual' },
                  { key: 'price_expert_monthly', label: 'Expert — Mensual' },
                  { key: 'price_expert_annual', label: 'Expert — Anual' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                    <input type="number" value={configForm[key] || ''}
                      onChange={e => setConfigForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Otros parámetros */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-white font-bold text-base mb-4">⚙️ Parámetros generales</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Días de prueba gratuita</label>
                  <input type="number" min="1" max="30" value={configForm.trial_days || '7'}
                    onChange={e => setConfigForm(f => ({ ...f, trial_days: e.target.value }))}
                    className="w-32 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">URL del Frontend (para redirecciones de MP)</label>
                  <input type="url" value={configForm.frontend_url || ''}
                    onChange={e => setConfigForm(f => ({ ...f, frontend_url: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">URL del Backend (para webhooks de MP)</label>
                  <input type="url" value={configForm.backend_url || ''}
                    onChange={e => setConfigForm(f => ({ ...f, backend_url: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Email de contacto</label>
                  <input type="email" value={configForm.contact_email || ''}
                    onChange={e => setConfigForm(f => ({ ...f, contact_email: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={savingConfig}
              className="w-full bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-white py-3 rounded-xl font-black uppercase tracking-wide transition">
              {savingConfig ? 'Guardando...' : '💾 Guardar configuración'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
