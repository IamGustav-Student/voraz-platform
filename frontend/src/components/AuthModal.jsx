import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TENANT } from '../config/tenant.js';
import { forgotPassword as apiForgotPassword } from '../services/api.js';

// Modos del modal: 'login' | 'register' | 'forgot' | 'forgot_sent'
const AuthModal = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMsg, setForgotMsg] = useState('');
  const [forgotDevUrl, setForgotDevUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { loginUser, registerUser, error, setError } = useAuth();

  if (!isOpen) return null;

  const handleClose = () => {
    setError(null);
    setFormData({ name: '', email: '', password: '' });
    setMode('login');
    setForgotEmail('');
    setForgotMsg('');
    setForgotDevUrl('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    let ok;
    if (mode === 'login') {
      ok = await loginUser(formData.email, formData.password);
    } else {
      ok = await registerUser(formData);
    }
    setSubmitting(false);
    if (ok) handleClose();
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setForgotMsg('');
    setForgotDevUrl('');
    try {
      const res = await apiForgotPassword(forgotEmail);
      setForgotMsg(res.message || 'Si el email existe, recibirás un link de recuperación.');
      // En modo dev sin SMTP, mostrar el link directamente
      if (res._dev_reset_url) setForgotDevUrl(res._dev_reset_url);
      setMode('forgot_sent');
    } catch (err) {
      setForgotMsg(err.message || 'Error al enviar solicitud.');
    }
    setSubmitting(false);
  };

  const switchMode = () => {
    setError(null);
    setMode(mode === 'login' ? 'register' : 'login');
  };

  // ── FORGOT SENT ─────────────────────────────────────────────────────────
  if (mode === 'forgot_sent') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="relative w-full max-w-md bg-[#1E1E1E] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-brand-primary px-6 pt-6 pb-8">
            <button onClick={handleClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <p className="text-white/80 text-sm font-semibold uppercase tracking-widest">{TENANT.brandName}</p>
            <h2 className="text-2xl font-black text-white mt-1">📧 Email enviado</h2>
          </div>
          <div className="px-6 py-6 space-y-4">
            <p className="text-white/70 text-sm">{forgotMsg}</p>
            <button
              onClick={() => { setMode('login'); setForgotMsg(''); }}
              className="w-full py-2.5 text-sm font-bold text-white/10 hover:text-white transition"
            >
              ← Volver al login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FORGOT PASSWORD FORM ─────────────────────────────────────────────────
  if (mode === 'forgot') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="relative w-full max-w-md bg-[#1E1E1E] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-brand-primary px-6 pt-6 pb-8">
            <button onClick={handleClose} className="absolute top-4 right-4 text-white/70 hover:text-white transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <p className="text-white/80 text-sm font-semibold uppercase tracking-widest">{TENANT.brandName}</p>
            <h2 className="text-2xl font-black text-white mt-1">Recuperar contraseña</h2>
            <p className="text-white/70 text-sm mt-1">Te enviamos un link por email</p>
          </div>
          <div className="px-6 py-6">
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Email</label>
                <input
                  type="email"
                  placeholder="tu@email.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-primary transition"
                  required
                />
              </div>
              {forgotMsg && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <p className="text-red-400 text-sm">{forgotMsg}</p>
                </div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 font-black text-white rounded-xl bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-50 transition uppercase tracking-wider"
              >
                {submitting ? 'Enviando...' : 'Enviar link de recuperación'}
              </button>
            </form>
            <div className="mt-4 text-center">
              <button onClick={() => setMode('login')} className="text-sm text-white/50 hover:text-white/80 transition">
                ← Volver al login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LOGIN / REGISTER ─────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#1E1E1E] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-brand-primary px-6 pt-6 pb-8">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <p className="text-white/80 text-sm font-semibold uppercase tracking-widest">{TENANT.brandName}</p>
          <h2 className="text-2xl font-black text-white mt-1">
            {mode === 'login' ? 'Bienvenido de vuelta' : 'Crear cuenta'}
          </h2>
          <p className="text-white/70 text-sm mt-1">
            {mode === 'login' ? 'Ingresá para ver tus puntos y pedidos' : 'Registrate y ganá 50 puntos de bienvenida'}
          </p>
        </div>

        {/* Form */}
        <div className="px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Tu nombre"
                  value={formData.name}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-primary transition"
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-primary transition"
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Contraseña</label>
              <input
                type="password"
                placeholder="••••••••"
                value={formData.password}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-brand-primary transition"
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 font-black text-white rounded-xl bg-brand-primary hover:bg-brand-primary-hover disabled:opacity-50 transition uppercase tracking-wider"
            >
              {submitting ? 'Cargando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </form>

          <div className="mt-4 space-y-2 text-center">
            <div>
              <button onClick={switchMode} className="text-sm text-white/50 hover:text-white/80 transition">
                {mode === 'login' ? '¿No tenés cuenta? Registrate gratis' : '¿Ya tenés cuenta? Ingresá'}
              </button>
            </div>
            {mode === 'login' && (
              <div>
                <button
                  onClick={() => { setError(null); setMode('forgot'); }}
                  className="text-xs text-white/30 hover:text-white/60 transition"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
