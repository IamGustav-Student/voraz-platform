import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { TENANT } from '../config/tenant.js';

const AuthModal = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const { loginUser, registerUser, error, setError } = useAuth();

  if (!isOpen) return null;

  const handleClose = () => {
    setError(null);
    setFormData({ name: '', email: '', password: '' });
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    let ok;
    if (isLogin) {
      ok = await loginUser(formData.email, formData.password);
    } else {
      ok = await registerUser(formData);
    }
    setSubmitting(false);
    if (ok) handleClose();
  };

  const switchMode = () => {
    setError(null);
    setIsLogin(!isLogin);
  };

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
            {isLogin ? 'Bienvenido de vuelta' : 'Crear cuenta'}
          </h2>
          <p className="text-white/70 text-sm mt-1">
            {isLogin ? 'Ingresá para ver tus puntos y pedidos' : 'Registrate y ganá 50 puntos de bienvenida'}
          </p>
        </div>

        {/* Form */}
        <div className="px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
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
              {submitting ? 'Cargando...' : isLogin ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button onClick={switchMode} className="text-sm text-white/50 hover:text-white/80 transition">
              {isLogin ? '¿No tenés cuenta? Registrate gratis' : '¿Ya tenés cuenta? Ingresá'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
