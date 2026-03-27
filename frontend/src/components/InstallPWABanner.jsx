import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPWABanner({ isInstallable, handleInstallClick, brandName }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isInstallable) {
      // Pequeño delay para no abrumar apenas carga
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isInstallable]);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-24 md:bottom-8 left-6 right-6 md:left-auto md:right-8 md:w-96 z-[60]"
      >
        <div className="glass-premium border-red-500/30 rounded-[2rem] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)] relative overflow-hidden group">
          {/* Decoración de fondo */}
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-brand-primary/10 rounded-full blur-2xl group-hover:bg-brand-primary/20 transition-all duration-700" />
          
          <div className="flex items-start gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-primary to-brand-primary-hover flex items-center justify-center text-white text-xl shadow-lg shadow-brand-primary/20 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            
            <div className="flex-grow">
              <h3 className="text-white font-black text-lg leading-none mb-1 tracking-tighter">
                Instalar {brandName}
              </h3>
              <p className="text-gray-400 text-xs font-medium leading-relaxed mb-4">
                Llevá tu restaurante al escritorio. Pedidos más rápidos, experiencia 100% nativa.
              </p>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={handleInstallClick}
                  className="bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all active:scale-95 shadow-[0_10px_20px_rgba(227,6,19,0.3)]"
                >
                  Instalar App
                </button>
                <button
                  onClick={() => setShow(false)}
                  className="text-gray-500 hover:text-white text-[10px] font-black uppercase tracking-widest px-3 py-3 transition-colors opacity-60 hover:opacity-100"
                >
                  Ahora no
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setShow(false)}
              className="text-gray-600 hover:text-gray-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
