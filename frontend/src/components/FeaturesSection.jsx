import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Registrar el plugin de GSAP
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const features = [
  {
    title: "Dashboard Pro",
    description: "Analizá el rendimiento con métricas en vivo y reportes de ventas.",
    action: "Monitoreá tus ingresos, pedidos y métricas de clientes desde un solo lugar para tomar mejores decisiones.",
    icon: "📊"
  },
  {
    title: "Pedidos en Tiempo Real",
    description: "Optimizá la recepción con un carrito intuitivo y confirmación instantánea.",
    action: "Recibí y gestioná pedidos por el panel web con carrito inteligente que agiliza la atención.",
    icon: "🛒"
  },
  {
    title: "Múltiples Sucursales",
    description: "Escalá tu negocio administrando varias sucursales desde un solo panel.",
    action: "Controlá todos tus locales, horarios y logística de delivery desde una cuenta centralizada.",
    icon: "📍"
  },
  {
    title: "Promociones Dinámicas",
    description: "Impulsá tu facturación creando combos y descuentos en segundos.",
    action: "Atraé más clientes con un motor de ofertas automáticas y cupones personalizados.",
    icon: "🎟️"
  },
  {
    title: "Pagos Flexibles",
    description: "Cobrá de forma segura integrando MercadoPago o gestionando efectivo.",
    action: "Integración nativa para pagos online y seguimiento de cobros contra entrega.",
    icon: "💳"
  }
];

export default function FeaturesSection() {
  const containerRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    // Contexto de GSAP para limpieza automática
    let ctx = gsap.context(() => {
      gsap.from(cardsRef.current, {
        opacity: 0,
        y: 30,
        duration: 0.8,
        stagger: 0.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          once: true,
          // La contradicción en el request: "once: true" vs "reiniciar al subir/bajar"
          // Mantenemos "once: true" según el requerimiento explícito Final,
          // pero ScrollTrigger se encarga de dispararlo en el punto justo.
        }
      });
    }, containerRef);

    return () => ctx.revert(); // Cleanup total de GSAP
  }, []);

  return (
    <section 
      id="funcionalidades-premium" 
      ref={containerRef}
      className="py-24 px-4 bg-[#080c12] overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
            Potencial <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 font-black">Ilimitado</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Descubrí por qué GastroRed es la plataforma de sincronización total elegida por los comercios gastronómicos líderes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              ref={el => cardsRef.current[index] = el}
              className="group relative bg-white/[0.03] border border-white/10 rounded-3xl p-8 hover:border-red-500/50 transition-colors duration-500 shadow-2xl"
            >
              {/* Efecto de luz al hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
              
              <div className="relative z-10">
                <div className="text-5xl mb-6 bg-red-500/10 w-20 h-20 rounded-2xl flex items-center justify-center border border-red-500/20 group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-red-900/20">
                  {feature.icon}
                </div>
                
                <h3 className="text-2xl font-black text-white mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-red-500 text-sm font-bold mb-4 uppercase tracking-widest">
                  {feature.description}
                </p>
                
                <p className="text-gray-400 text-sm leading-relaxed">
                  {feature.action}
                </p>
                
                {/* Decoración premium */}
                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-mono tracking-tighter">MÓDULO ACTIVO</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                </div>
              </div>
            </div>
          ))}

          {/* Tarjeta de Cierre (Call to Action) */}
          <div
            ref={el => cardsRef.current[5] = el}
            className="group relative bg-gradient-to-br from-red-600 to-red-900 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl shadow-red-900/40"
          >
            <div className="relative z-10">
              <h3 className="text-3xl font-black text-white mb-4">
                ¿Listo para escalar?
              </h3>
              <p className="text-white/80 mb-8 font-medium">
                Únite a GastroRed hoy y llevá tu restaurante al siguiente nivel digital.
              </p>
              <a 
                href="#planes" 
                className="inline-block bg-white text-red-600 font-black px-8 py-4 rounded-2xl hover:bg-gray-100 transition-all duration-300 transform group-hover:scale-105 active:scale-95 uppercase tracking-wide text-sm shadow-xl"
              >
                Ver Planes Ahora
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
