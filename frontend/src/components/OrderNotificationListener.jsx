import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminFetch } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Componente global que monitorea pedidos nuevos para administradores.
 * Emite un sonido potente por 5 segundos cuando detecta un pedido nuevo.
 */
export default function OrderNotificationListener() {
  const { user, getToken } = useAuth();
  const token = getToken();
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('voraz_notifications_muted') === 'true');
  const lastOrderIdRef = useRef(localStorage.getItem('voraz_last_order_id'));
  
  // URL de un sonido profesional y potente
  const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/1001/1001-preview.mp3';
  const audioRef = useRef(new Audio(NOTIFICATION_SOUND_URL));
  const stopTimeoutRef = useRef(null);

  useEffect(() => {
    // Solo si el usuario es admin o manager y tenemos token
    if (!user || !token || (user.role !== 'admin' && user.role !== 'manager')) return;

    // Precargar el sonido y ajustar volumen al máximo
    audioRef.current.volume = 1.0;

    const checkNewOrders = async () => {
      try {
        const orders = await adminFetch('/orders', token);
        if (orders && orders.length > 0) {
          const newestOrder = orders[0]; // Asumiendo que vienen ordenados por ID desc o fecha
          const newestId = String(newestOrder.id);

          // Si nunca guardamos un ID, lo inicializamos sin sonar
          if (!lastOrderIdRef.current) {
            lastOrderIdRef.current = newestId;
            localStorage.setItem('voraz_last_order_id', newestId);
            return;
          }

          // Si el ID más reciente es mayor al que tenemos guardado
          if (parseInt(newestId) > parseInt(lastOrderIdRef.current)) {
            console.log(`🔔 ¡Nuevo pedido detectado! ID: ${newestId}`);
            
            // Solo reproducir si no está silenciado
            if (!localStorage.getItem('voraz_notifications_muted') || localStorage.getItem('voraz_notifications_muted') === 'false') {
              // Detener cualquier reproducción previa
              if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
              audioRef.current.currentTime = 0;
              
              audioRef.current.play().catch(err => {
                console.warn('⚠️ No se pudo reproducir el sonido automáticamente.', err);
              });

              // Limitar duración a 5 segundos
              stopTimeoutRef.current = setTimeout(() => {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
              }, 5000);
            }

            // Actualizar referencia y storage
            lastOrderIdRef.current = newestId;
            localStorage.setItem('voraz_last_order_id', newestId);
          }
        }
      } catch (err) {
        console.error('❌ Error en el monitoreo global de pedidos:', err);
      }
    };

    // Ejecutar inmediatamente y luego cada 15 segundos
    checkNewOrders();
    const interval = setInterval(checkNewOrders, 15000);

    return () => {
      clearInterval(interval);
      if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);
    };
  }, [user, token]);

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    localStorage.setItem('voraz_notifications_muted', String(newMuted));
    if (newMuted) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  // Solo mostrar el botón si el usuario es admin/manager
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) return null;

  return (
    <div className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-[60]">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={toggleMute}
        className={`p-3 rounded-full shadow-2xl backdrop-blur-md border border-white/10 transition-colors ${
          isMuted ? 'bg-red-600/20 text-red-500' : 'bg-primary/20 text-primary'
        }`}
        title={isMuted ? "Notificaciones silenciadas" : "Notificaciones activas"}
      >
        {isMuted ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        )}
      </motion.button>
    </div>
  );
}
