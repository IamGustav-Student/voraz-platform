import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { registerUser, loginUser } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const BACKEND_URL = API_URL.replace('/api', '');
const GOOGLE_OAUTH_URL = `${BACKEND_URL}/api/auth/google`;

const AuthModal = ({ isOpen, onClose }) => {
    const { login } = useAuth();
    const [mode, setMode] = useState('login');
    const [form, setForm] = useState({ email: '', password: '', name: '', phone: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleClose = () => { setError(''); setForm({ email: '', password: '', name: '', phone: '' }); onClose(); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = mode === 'login'
                ? await loginUser({ email: form.email, password: form.password })
                : await registerUser({ email: form.email, password: form.password, name: form.name, phone: form.phone });
            login(res.user, res.token);
            handleClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const InputField = ({ type, placeholder, value, onChange, autoComplete }) => (
        <input
            type={type} placeholder={placeholder} value={value} onChange={onChange}
            autoComplete={autoComplete}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-voraz-red transition"
        />
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[300] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 400 }}
                        className="bg-[#1a1a1a] w-full md:max-w-md rounded-t-[30px] md:rounded-2xl border-t md:border border-white/10 shadow-2xl overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-white uppercase">
                                    {mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                                </h2>
                                <p className="text-gray-500 text-xs mt-0.5">
                                    {mode === 'login' ? '¡Bienvenido de vuelta!' : 'Sumáte al Voraz Club y ganá puntos'}
                                </p>
                            </div>
                            <button onClick={handleClose} className="text-gray-500 hover:text-white p-1 rounded-full hover:bg-white/10 transition">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Google OAuth */}
                            <a
                                href={GOOGLE_OAUTH_URL}
                                className="w-full flex items-center justify-center space-x-3 bg-white text-gray-900 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition shadow"
                            >
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                <span>Continuar con Google</span>
                            </a>

                            <div className="flex items-center space-x-3">
                                <div className="flex-1 h-px bg-white/10"></div>
                                <span className="text-gray-600 text-xs uppercase font-bold tracking-wider">o</span>
                                <div className="flex-1 h-px bg-white/10"></div>
                            </div>

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-3">
                                {mode === 'register' && (
                                    <>
                                        <InputField type="text" placeholder="Tu nombre" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoComplete="name" />
                                        <InputField type="tel" placeholder="Teléfono (opcional)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} autoComplete="tel" />
                                    </>
                                )}
                                <InputField type="email" placeholder="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} autoComplete="email" />
                                <InputField type="password" placeholder="Contraseña" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

                                {error && <p className="text-red-400 text-sm bg-red-500/10 px-3 py-2 rounded-lg">{error}</p>}

                                <motion.button
                                    whileTap={{ scale: 0.97 }}
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-voraz-red hover:bg-red-700 text-white py-3.5 rounded-xl font-black uppercase tracking-wide text-sm transition disabled:opacity-50"
                                >
                                    {loading ? 'Procesando...' : mode === 'login' ? 'Ingresar' : 'Crear cuenta'}
                                </motion.button>
                            </form>

                            {/* Toggle */}
                            <p className="text-center text-gray-500 text-sm">
                                {mode === 'login' ? '¿No tenés cuenta?' : '¿Ya tenés cuenta?'}{' '}
                                <button
                                    onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
                                    className="text-voraz-yellow font-bold hover:underline"
                                >
                                    {mode === 'login' ? 'Registrarse' : 'Iniciar sesión'}
                                </button>
                            </p>

                            {mode === 'register' && (
                                <div className="bg-voraz-yellow/10 border border-voraz-yellow/20 rounded-xl p-3 flex items-start space-x-2">
                                    <span className="text-lg">⭐</span>
                                    <p className="text-voraz-yellow text-xs font-bold">¡Bienvenido bonus! Registrarte te da <span className="text-white">50 puntos</span> en el Voraz Club.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AuthModal;
