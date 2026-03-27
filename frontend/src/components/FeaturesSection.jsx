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
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter">
            Potencial <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-gradient text-glow">Ilimitado</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg font-medium">
            Descubrí por qué GastroRed es el ecosistema de sincronización total elegido por los comercios gastronómicos más ambiciosos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              ref={el => cardsRef.current[index] = el}
              className="group relative glass-premium glass-premium-hover rounded-[2.5rem] p-10 transition-all duration-700 hover:translate-y-[-10px]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 rounded-[2.5rem]" />
              
              <div className="relative z-10">
                <div className="text-5xl mb-8 bg-red-600/10 w-24 h-24 rounded-3xl flex items-center justify-center border border-red-600/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-2xl shadow-red-900/20">
                  {feature.icon}
                </div>
                
                <h3 className="text-3xl font-black text-white mb-4 tracking-tight">
                  {feature.title}
                </h3>
                
                <p className="text-red-500 text-[10px] font-black mb-5 uppercase tracking-[0.2em] opacity-80">
                  {feature.description}
                </p>
                
                <p className="text-gray-400 text-sm leading-relaxed font-medium">
                  {feature.action}
                </p>
                
                <div className="mt-10 pt-8 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[10px] text-gray-600 font-black tracking-widest uppercase">MÓDULO ACTIVO</span>
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.6)]" />
                </div>
              </div>
            </div>
          ))}

          {/* Tarjeta de Cierre (Call to Action) */}
          <div
            ref={el => cardsRef.current[5] = el}
            className="group relative bg-gradient-to-br from-red-600 to-red-900 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center shadow-[0_20px_50px_rgba(227,6,19,0.3)] transition-all duration-700 hover:scale-[1.02]"
          >
            <div className="relative z-10">
              <h3 className="text-4xl font-black text-white mb-6 tracking-tighter">
                ¿Listo para escalar?
              </h3>
              <p className="text-white/90 mb-10 font-bold text-lg leading-tight">
                Únite a la red hoy y llevá tu negocio al nivel digital que merece.
              </p>
              <a 
                href="#planes" 
                className="inline-block bg-white text-red-600 font-black px-10 py-5 rounded-2xl hover:bg-gray-100 transition-all duration-500 transform group-hover:scale-105 active:scale-95 uppercase tracking-widest text-xs shadow-2xl"
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
