import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const modules = [
  { id: 1, title: "Dashboard Pro", desc: "Métricas en tiempo real de tu negocio.", icon: "📊", img: "/images/gallery/dashboard.jpg" },
  { id: 2, title: "Gestión de Productos", desc: "Control total de precios, fotos y stock.", icon: "🍔", img: "/images/gallery/productos.jpg" },
  { id: 3, title: "Pedidos en Vivo", desc: "Comandas digitales recibidas al instante.", icon: "📋", img: "/images/gallery/pedidos.jpg" },
  { id: 4, title: "Categorías Dinámicas", desc: "Organizá tu menú por secciones ilimitadas.", icon: "📂", img: "/images/gallery/categorias_v2.jpg" },
  { id: 5, title: "Pagos Online", desc: "Cobros seguros integrados con MercadoPago.", icon: "💳", img: "/images/gallery/mercadopago.jpg" },
  { id: 6, title: "Multi-Sucursal", desc: "Gestioná todos tus locales desde un solo lugar.", icon: "📍", img: "/images/gallery/locales.jpg" },
  { id: 7, title: "Suscripciones Pro", desc: "Planes que escalan junto a tu crecimiento.", icon: "⭐", img: "/images/gallery/suscripciones_v2.jpg" },
  { id: 8, title: "Promociones y Combos", desc: "Motor de ofertas para impulsar tus ventas.", icon: "🎟️", img: "/images/gallery/promociones.jpg" },
  { id: 9, title: "Sistema de Puntos", desc: "Fidelizá a tus clientes con cada compra.", icon: "💎", img: "/images/gallery/fidelizacion.jpg" },
  { id: 10, title: "Loyalty Club", desc: "Panel exclusivo de beneficios para comensales.", icon: "👑", img: "/images/gallery/club.jpg" },
  { id: 11, title: "Menú QR Inteligente", desc: "Sincronización total con tu carta física.", icon: "📱", img: "/images/gallery/menu_qr.jpg" },
  { id: 12, title: "Branding Total", desc: "Tu logo, tus colores, tu identidad visual.", icon: "🎨", img: "/images/gallery/branding.jpg" },
  { id: 13, title: "Carrito Inteligente", desc: "Experiencia de pedidos fluida y moderna.", icon: "🛒", img: "/images/gallery/carrito_v2.jpg" },
  { id: 14, title: "Checkout Veloz", desc: "Finalización de pedidos en pocos clics.", icon: "🚀", img: "/images/gallery/checkout_v2.jpg" },
  { id: 15, title: "Noticias y Novedades", desc: "Mantené informada a tu comunidad.", icon: "📰", img: "/images/gallery/noticias.jpg" },
  { id: 16, title: "Contenido en Video", desc: "Marketing multimedia para tu restaurante.", icon: "🎥", img: "/images/gallery/videos.jpg" },
  { id: 17, title: "Detalle de Producto", desc: "Vistas detalladas que aumentan el apetito.", icon: "🍔", img: "/images/gallery/detalle_producto.jpg" },
  { id: 18, title: "Historial de Pedidos", desc: "Transparencia total para tus clientes.", icon: "🕒", img: "/images/gallery/mi_pedido.jpg" },
  { id: 19, title: "Carta Digital", desc: "Visualización optimizada para dispositivos móviles.", icon: "🍽️", img: "/images/gallery/menu_items.jpg" },
  { id: 20, title: "Categorías Pro", desc: "Organización avanzada para grandes cartas.", icon: "📂", img: "/images/gallery/categorias.jpg" }
];

export default function ModuleGallery() {
  const sectionRef = useRef(null);
  const triggerRef = useRef(null);
  const cardsRef = useRef([]);

  useEffect(() => {
    const section = sectionRef.current;
    
    let ctx = gsap.context(() => {
      // Pin horizontal scroll
      gsap.to(section, {
        x: () => -(section.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: triggerRef.current,
          start: "top top",
          end: () => "+=" + section.scrollWidth,
          scrub: 1,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });

      // Efecto de inclinación (Tilt) 3D en hover
      cardsRef.current.forEach((card) => {
        if (!card) return;
        
        card.addEventListener("mousemove", (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const rotateX = (y - centerY) / 10;
          const rotateY = (centerX - x) / 10;

          gsap.to(card, {
            rotateX: rotateX,
            rotateY: rotateY,
            scale: 1.05,
            duration: 0.5,
            ease: "power2.out",
            overwrite: "auto",
            transformPerspective: 1000
          });
        });

        card.addEventListener("mouseleave", () => {
          gsap.to(card, {
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            duration: 0.5,
            ease: "power2.out",
            overwrite: "auto"
          });
        });
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <section 
      id="ecosistema-gastrored" 
      className="bg-[#05080d] overflow-hidden" 
      aria-labelledby="gallery-title"
    >
      <div ref={triggerRef}>
        <div className="h-screen flex items-center relative">
            {/* SEO: Título h2 oculto pero disponible para lectores */}
            <h2 id="gallery-title" className="sr-only">Ecosistema Completo de GastroRed - 20 Módulos</h2>

            {/* Header de la sección (fijo al principio) */}
            <div className="absolute top-12 left-12 z-20 pointer-events-none">
                <div className="text-4xl md:text-6xl font-black text-white leading-tight">
                    Explorá el ecosistema <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">GastroRed</span>
                </div>
                <p className="text-gray-500 mt-4 max-w-md font-medium">
                    20 módulos diseñados para digitalizar cada aspecto de la gestión gastronómica moderna.
                </p>
            </div>

            <div ref={sectionRef} className="flex gap-16 px-[15vw] md:px-[25vw]">
            {modules.map((mod, index) => (
                <div 
                key={mod.id} 
                ref={el => cardsRef.current[index] = el}
                className="flex-shrink-0 w-[70vw] md:w-[40vw] aspect-[16/10] bg-gradient-to-br from-white/10 to-transparent border border-white/10 rounded-[2.5rem] p-1 shadow-2xl overflow-hidden group hover:border-red-500/50 transition-colors duration-500 relative cursor-pointer"
                style={{ transformStyle: "preserve-3d" }}
                >
                <div className="h-full flex flex-col p-6 pointer-events-none">
                    {/* Imagen o Icono */}
                    <div 
                      className="flex-1 bg-[#0a0f18] rounded-2xl flex items-center justify-center overflow-hidden border border-white/5 relative group-hover:shadow-[0_0_30px_rgba(239,68,68,0.2)] transition-shadow duration-500"
                      style={{ transform: "translateZ(30px)" }}
                    >
                      {mod.img ? (
                        <img 
                          src={mod.img} 
                          alt={`Captura del módulo ${mod.title} de GastroRed`} 
                          loading="lazy"
                          className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 group-hover:scale-110"
                        />
                      ) : (
                        <div className="text-9xl opacity-40 group-hover:opacity-100 transition-opacity duration-500">{mod.icon}</div>
                      )}
                      
                      {/* Overlay Gradiente */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-20 transition-opacity" />
                    </div>
                    
                    <div className="pt-8" style={{ transform: "translateZ(50px)" }}>
                        <h3 className="text-3xl font-black text-white mb-2 group-hover:text-red-500 transition-colors">
                          {mod.title}
                        </h3>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-wider">
                          {mod.desc}
                        </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <span className="text-[11px] font-black text-red-500/80 uppercase tracking-[0.3em]">Módulo {mod.id} / 20</span>
                        </div>
                        <span className="text-white/20 font-mono text-xs">#SAAS_VOZ_OFF</span>
                    </div>
                </div>
                </div>
            ))}
            </div>

            {/* Decoración SEO/Visual: Background Elements */}
            <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-red-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[40vw] h-[40vh] bg-orange-600/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
        </div>
      </div>
    </section>
  );
}
