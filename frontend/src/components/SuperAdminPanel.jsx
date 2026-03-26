import { useState, useEffect, useCallback } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import InstallPWABanner from './InstallPWABanner';

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
  // Editar
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  // Config
  const [config, setConfig] = useState(null);
  const [configForm, setConfigForm] = useState({});
  const [savingConfig, setSavingConfig] = useState(false);
  // Reset contraseña admin
  const [resetModal, setResetModal] = useState(null); // { tenantId, adminEmail }
  const [resetPwd, setResetPwd] = useState('');
  const [resetting, setResetting] = useState(false);
  // Historial de Trials (Bloqueos)
  const [trialHistory, setTrialHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // PWA Install logic
  const { isInstallable, handleInstallClick } = usePWAInstall();

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

  const loadTrialHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await sfetch('/trial-history', token);
      setTrialHistory(data);
    } catch (e) { setMsg('Error cargando historial: ' + e.message); }
    setLoadingHistory(false);
  };

  const deleteTrialHistoryEntry = async (id) => {
    if (!window.confirm('¿Desbloquear este registro? Podrá volver a usarse para una prueba gratuita.')) return;
    try {
      await sfetch(`/trial-history/${id}`, token, { method: 'DELETE' });
      setMsg('✅ Registro desbloqueado correctamente');
      loadTrialHistory();
    } catch (e) { setMsg('Error: ' + e.message); }
  };

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

  const handleResetAdminPassword = async (e) => {
    e.preventDefault();
    if (!resetPwd || resetPwd.length < 6) { setMsg('La contraseña debe tener al menos 6 caracteres.'); return; }
    setResetting(true);
    try {
      const res = await sfetch(`/stores/${resetModal.tenantId}/reset-admin-password`, token, {
        method: 'PATCH',
        body: JSON.stringify({ new_password: resetPwd }),
      });
      setMsg(`✅ Contraseña del admin "${res.admin_email || resetModal.tenantId}" actualizada correctamente.`);
      setResetModal(null);
      setResetPwd('');
    } catch (e) { setMsg('Error: ' + e.message); }
    setResetting(false);
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
  
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      await sfetch(`/stores/${editForm.id}`, token, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      });
      setMsg('✅ Datos del comercio actualizados');
      setShowEdit(false);
      load();
    } catch (e) {
      setMsg('Error: ' + e.message);
    }
    setSaving(false);
  };

  const handleDeleteTenant = async (id, name) => {
    if (!window.confirm(`⚠️ ADVERTENCIA ⚠️\n\n¿Estás seguro que deseas ELIMINAR COMPLETAMENTE el comercio "${name}"?\nEsta acción es irreversible.`)) {
      return;
    }
    setMsg('Eliminando comercio...');
    try {
      await sfetch(`/stores/${id}`, token, { method: 'DELETE' });
      setMsg(`✅ Comercio "${name}" eliminado correctamente.`);
      load();
    } catch (e) { setMsg('Error: ' + e.message); }
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 px-6 py-5">
          {[
            { label: 'Total Comercios', value: stats.total_tenants, icon: '🏪' },
            { label: 'Activos', value: stats.active_tenants, icon: '✅' },
            { label: 'Nuevos (30d)', value: stats.new_tenants_30d, icon: '📈' },
            { label: 'Órdenes Totales', value: stats.total_orders, icon: '🛒' },
            { label: 'Ingresos (30d)', value: `$${fmt(stats.revenue_30d)}`, icon: '📊' },
            { label: 'Ingresos Hist.', value: `$${fmt(stats.total_revenue)}`, icon: '💰' },
          ].map(s => (
            <div key={s.label} className="bg-white/5 rounded-xl p-4 border border-white/5 group hover:border-white/20 transition">
              <p className="text-2xl mb-1 opacity-80 group-hover:opacity-100 transition">{s.icon}</p>
              <p className="text-xl font-black text-white">{s.value}</p>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{s.label}</p>
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
        {[
          { id: 'stores', label: `🏪 Comercios (${stores.length})` },
          { id: 'crear', label: '➕ Nuevo Comercio' },
          { id: 'history', label: '🚫 Bloqueos Trial' },
          { id: 'config', label: '⚙️ Configuración' }
        ].map(t => (
          <button key={t.id} onClick={() => { 
            setTab(t.id); 
            setShowCreate(t.id === 'crear'); 
            if (t.id === 'config') loadConfig(); 
            if (t.id === 'history') loadTrialHistory();
          }}
            className={`px-4 py-2 rounded-xl text-sm font-bold uppercase transition ${tab === t.id ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
        <button onClick={() => { load(); if(tab === 'history') loadTrialHistory(); }} className="ml-auto text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg bg-white/5">↻ Actualizar</button>
      </div>

      <div className="px-6 pb-20">
        {/* Top 5 Tenants (Solo en dashboard principal) */}
        {tab === 'stores' && stats?.top_tenants?.length > 0 && !showCreate && (
          <div className="mb-8">
            <h3 className="text-white font-bold text-xs mb-4 flex items-center gap-2 opacity-60 uppercase tracking-widest">
              🏆 Top 5 Comercios con más actividad
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {stats.top_tenants.map((t, idx) => (
                <div key={idx} className="bg-gradient-to-br from-white/10 to-transparent border border-white/5 rounded-2xl p-4 flex flex-col items-center text-center group hover:border-red-500/30 transition">
                  <span className="text-2xl mb-2">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '✨'}</span>
                  <p className="text-xs font-bold text-white truncate w-full group-hover:text-red-400 transition">{t.name}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">{t.order_count} pedidos</p>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  {/* Botón editar comercio */}
                  <button
                    onClick={() => {
                      setEditForm({ ...s });
                      setShowEdit(true);
                      setMsg('');
                    }}
                    className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold"
                    title="Editar todos los datos de este comercio"
                  >
                    ✏️ Editar
                  </button>
                  {/* Botón reset contraseña admin */}
                  <button
                    onClick={() => { setResetModal({ tenantId: s.id, adminEmail: s.admin_email }); setResetPwd(''); setMsg(''); }}
                    className="text-xs px-3 py-1.5 bg-orange-900/30 hover:bg-orange-900/50 border border-orange-500/30 text-orange-300 rounded-lg font-bold transition"
                    title="Cambiar contraseña del admin de este comercio"
                  >
                    🔑 Resetear pwd admin
                  </button>
                  {/* Botón eliminar comercio */}
                  <button
                    onClick={() => handleDeleteTenant(s.id, s.brand_name || s.name)}
                    className="text-xs px-3 py-1.5 bg-red-900/30 hover:bg-red-600 border border-red-500/30 text-red-300 hover:text-white rounded-lg font-bold transition"
                    title="Eliminar este comercio completamente"
                  >
                    🗑️ Eliminar
                  </button>
                </div>

                {/* Modal inline de reset contraseña */}
                {resetModal?.tenantId === s.id && (
                  <div className="mt-4 bg-orange-950/30 border border-orange-500/20 rounded-xl p-4">
                    <p className="text-orange-300 text-xs font-bold mb-3">🔑 Nueva contraseña para el admin {resetModal.adminEmail || s.id}</p>
                    <form onSubmit={handleResetAdminPassword} className="flex gap-2 flex-wrap">
                      <input
                        type="password"
                        placeholder="Nueva contraseña (mín. 6 caracteres)"
                        value={resetPwd}
                        onChange={e => setResetPwd(e.target.value)}
                        minLength={6}
                        required
                        className="flex-1 min-w-[200px] bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                      />
                      <button
                        type="submit"
                        disabled={resetting}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 rounded-lg text-white text-xs font-bold transition"
                      >
                        {resetting ? 'Guardando...' : '✔ Confirmar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setResetModal(null); setResetPwd(''); }}
                        className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-400 text-xs"
                      >
                        Cancelar
                      </button>
                    </form>
                  </div>
                )}
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
                    <p className="text-xs text-red-500 font-mono mb-1">Token actual: {config.mp_access_token_masked}</p>
                  )}
                  {config?.mp_token_from_env && (
                    <p className="text-xs text-yellow-400 mb-1">⚠️ Token tomado del env var GASTRORED_MP_ACCESS_TOKEN</p>
                  )}
                  <input
                    type="password"
                    placeholder="APP_USR-... (dejá vacío para no cambiar)"
                    value={configForm.mp_access_token || ''}
                    onChange={e => setConfigForm(f => ({ ...f, mp_access_token: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500 font-mono"
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
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
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
                    className="w-32 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">URL del Frontend (para redirecciones de MP)</label>
                  <input type="url" value={configForm.frontend_url || ''}
                    onChange={e => setConfigForm(f => ({ ...f, frontend_url: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">URL del Backend (para webhooks de MP)</label>
                  <input type="url" value={configForm.backend_url || ''}
                    onChange={e => setConfigForm(f => ({ ...f, backend_url: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Email de contacto</label>
                  <input type="email" value={configForm.contact_email || ''}
                    onChange={e => setConfigForm(f => ({ ...f, contact_email: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={savingConfig}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-3 rounded-xl font-black uppercase tracking-wide transition">
              {savingConfig ? 'Guardando...' : '💾 Guardar configuración'}
            </button>
          </form>
        )}

        {/* ── Gestión de Bloqueos (Trial History) ─────────────────────────────── */}
        {tab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Historial de Trials y Bloqueos</h3>
              <p className="text-gray-500 text-xs">Aquí se registran los nombres y subdominios que ya usaron el plan gratuito.</p>
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/10 text-gray-300 font-bold uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Valor Bloqueado</th>
                    <th className="px-6 py-4">ID Original</th>
                    <th className="px-6 py-4 text-center">Fecha Registro</th>
                    <th className="px-6 py-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loadingHistory && (
                    <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500">Cargando historial...</td></tr>
                  )}
                  {!loadingHistory && trialHistory.length === 0 && (
                    <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500">No hay registros de bloqueos de trial.</td></tr>
                  )}
                  {trialHistory.map(h => (
                    <tr key={h.id} className="hover:bg-white/5 transition group">
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          h.type === 'subdomain' ? 'bg-blue-900/40 text-blue-400' : 
                          h.type === 'name' ? 'bg-purple-900/40 text-purple-400' : 'bg-gray-800 text-gray-400'
                        }`}>
                          {h.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-gray-200">{h.value}</td>
                      <td className="px-6 py-4 text-xs text-gray-500">{h.original_tenant_id}</td>
                      <td className="px-6 py-4 text-xs text-gray-500 text-center">
                        {new Date(h.registered_at).toLocaleDateString('es-AR')} {new Date(h.registered_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => deleteTrialHistoryEntry(h.id)}
                          className="bg-red-900/30 hover:bg-red-600 text-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto"
                        >
                          🔓 Desbloquear
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* PWA INSTALL BANNER EXCLUSIVO SUPERADMIN */}
      {token && (
        <InstallPWABanner 
          isInstallable={isInstallable} 
          handleInstallClick={handleInstallClick}
          brandName="GastroRed SuperAdmin"
        />
      )}

      {/* MODAL DE EDICIÓN COMPLETO */}
      {showEdit && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 w-full max-w-2xl my-8 relative max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#111] py-2 z-10 border-b border-white/5">
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Editar Comercio</h2>
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">ID: {editForm.id}</p>
              </div>
              <button onClick={() => setShowEdit(false)} className="text-gray-500 hover:text-white text-3xl">&times;</button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Nombre del Negocio (Legal/Interno)</label>
                  <input 
                    value={editForm.name || ''} 
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 outline-none"
                    placeholder="Ej: McDonald's Argentina"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Nombre de Marca (App)</label>
                  <input 
                    value={editForm.brand_name || ''} 
                    onChange={e => setEditForm({...editForm, brand_name: e.target.value})}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 outline-none"
                    placeholder="Ej: McDonald's"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Subdominio (SaaS ID)</label>
                  <input 
                    value={editForm.id || ''} 
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-gray-500 text-sm outline-none cursor-not-allowed font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Dominio Propio</label>
                  <input 
                    value={editForm.custom_domain || ''} 
                    onChange={e => setEditForm({...editForm, custom_domain: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 outline-none font-mono"
                    placeholder="ej: pedidos.miweb.com"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Plan del SaaS</label>
                  <select 
                    value={editForm.plan_type || ''} 
                    onChange={e => setEditForm({...editForm, plan_type: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 outline-none"
                  >
                    <option value="Full Digital">Full Digital</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Periodo de Cobro</label>
                  <select 
                    value={editForm.subscription_period || ''} 
                    onChange={e => setEditForm({...editForm, subscription_period: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 outline-none"
                  >
                    <option value="monthly">Mensual</option>
                    <option value="annual">Anual</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Email Administrador (Dueño)</label>
                  <input 
                    type="email"
                    value={editForm.admin_email || ''} 
                    onChange={e => setEditForm({...editForm, admin_email: e.target.value})}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Nombre del Dueño</label>
                  <input 
                    value={editForm.admin_name || ''} 
                    onChange={e => setEditForm({...editForm, admin_name: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 outline-none"
                    placeholder="Ej: Juan Pérez"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Nueva Contraseña (Dejar vacío para no cambiar)</label>
                  <input 
                    type="password"
                    value={editForm.admin_password || ''} 
                    onChange={e => setEditForm({...editForm, admin_password: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Dirección Sucursal Principal</label>
                  <input 
                    value={editForm.address || ''} 
                    onChange={e => setEditForm({...editForm, address: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 outline-none"
                    placeholder="Calle 123, Ciudad"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">WhatsApp Comercio</label>
                  <input 
                    value={editForm.whatsapp || ''} 
                    onChange={e => setEditForm({...editForm, whatsapp: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 outline-none"
                    placeholder="54911..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Slogan / Frase</label>
                  <input 
                    value={editForm.slogan || ''} 
                    onChange={e => setEditForm({...editForm, slogan: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Color Primario</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={editForm.brand_color_primary || '#E30613'} 
                      onChange={e => setEditForm({...editForm, brand_color_primary: e.target.value})}
                      className="w-12 h-10 bg-white/5 border border-white/10 rounded-xl cursor-pointer"
                    />
                    <input 
                      value={editForm.brand_color_primary || '#E30613'} 
                      onChange={e => setEditForm({...editForm, brand_color_primary: e.target.value})}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 text-white text-xs font-mono outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Color Secundario</label>
                  <div className="flex gap-2">
                    <input 
                      type="color"
                      value={editForm.brand_color_secondary || '#1A1A1A'} 
                      onChange={e => setEditForm({...editForm, brand_color_secondary: e.target.value})}
                      className="w-12 h-10 bg-white/5 border border-white/10 rounded-xl cursor-pointer"
                    />
                    <input 
                      value={editForm.brand_color_secondary || '#1A1A1A'} 
                      onChange={e => setEditForm({...editForm, brand_color_secondary: e.target.value})}
                      className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 text-white text-xs font-mono outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Estado Tenant</label>
                  <select 
                    value={editForm.status || ''} 
                    onChange={e => setEditForm({...editForm, status: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 outline-none"
                  >
                    <option value="active">Activo</option>
                    <option value="suspended">Suspendido</option>
                    <option value="trial">Trial</option>
                    <option value="pending_payment">Pago Pendiente</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 block">Vencimiento Suscripción</label>
                  <input 
                    type="date"
                    value={editForm.subscription_expires_at ? new Date(editForm.subscription_expires_at).toISOString().split('T')[0] : ''} 
                    onChange={e => setEditForm({...editForm, subscription_expires_at: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 sticky bottom-0 bg-[#111] py-4 border-t border-white/5">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 py-3 rounded-xl font-black text-sm uppercase tracking-wide transition"
                >
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowEdit(false)}
                  className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-bold transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
