import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const modules = [
  { id: 19, title: "Carta Digital", desc: "Visualización optimizada para dispositivos móviles.", icon: "🍽️", img: "/images/gallery/menu_items.jpg" },
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
  { id: 20, title: "Categorías Pro", desc: "Organización avanzada para grandes cartas.", icon: "📂", img: "/images/gallery/categorias.jpg" }
];

export default function ModuleGallery() {
  const sectionRef = useRef(null);
  const triggerRef = useRef(null);
  const cardsRef = useRef([]);
  const [selectedMod, setSelectedMod] = useState(null);
  const modalRef = useRef(null);
  const modalImgRef = useRef(null);

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

  // Animación del Modal
  useEffect(() => {
    if (selectedMod) {
        gsap.fromTo(modalRef.current, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "power2.out" });
        gsap.fromTo(modalImgRef.current, { scale: 0.8, y: 20 }, { scale: 1, y: 0, duration: 0.6, ease: "back.out(1.7)" });
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
  }, [selectedMod]);

  return (
    <section 
      id="ecosistema-gastrored" 
      className="bg-[#05080d] overflow-hidden" 
      aria-labelledby="gallery-title"
    >
      <div ref={triggerRef}>
        <div className="h-screen flex items-center relative">
            <h2 id="gallery-title" className="sr-only">Ecosistema Completo de GastroRed - 20 Módulos</h2>

            {/* Header de la sección (fijo al principio) */}
            <div className="absolute top-12 left-8 md:left-24 z-20 pointer-events-none">
                <div className="text-4xl md:text-7xl font-black text-white leading-[0.8] tracking-tighter">
                    Explorá el <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-gradient text-glow">Ecosistema</span>
                </div>
                <p className="text-gray-500 mt-4 max-w-xs md:max-w-md font-bold text-xs md:text-sm leading-tight uppercase tracking-[0.2em] opacity-60">
                    20 Módulos de Sincronización Total para la Gastronomía Pro.
                </p>
            </div>

            <div ref={sectionRef} className="flex gap-10 md:gap-16 px-[10vw] md:px-[20vw]">
            {modules.map((mod, index) => (
                <div 
                key={mod.id} 
                ref={el => cardsRef.current[index] = el}
                onClick={() => setSelectedMod(mod)}
                className="flex-shrink-0 w-[80vw] md:w-[45vw] aspect-[16/10] glass-premium rounded-[3rem] p-2 shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden group hover:border-red-500/50 transition-all duration-700 cursor-pointer"
                style={{ transformStyle: "preserve-3d" }}
                >
                <div className="h-full flex flex-col p-6 pointer-events-none">
                    {/* Imagen o Icono */}
                    <div 
                      className="flex-1 bg-[#0a0f18] rounded-[2rem] flex items-center justify-center overflow-hidden border border-white/10 relative group-hover:shadow-[0_0_50px_rgba(227,6,19,0.3)] transition-all duration-700"
                      style={{ transform: "translateZ(40px)" }}
                    >
                      {mod.img ? (
                        <img 
                          src={mod.img} 
                          alt={`Módulo ${mod.title}`} 
                          className="w-full h-full object-cover opacity-100 transition-all duration-1000 group-hover:scale-110"
                        />
                      ) : (
                        <div className="text-9xl opacity-20 group-hover:opacity-100 transition-opacity duration-700">{mod.icon}</div>
                      )}
                      
                      {/* Overlay Gradiente */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80 group-hover:opacity-30 transition-opacity" />
                    </div>
                    
                    <div className="pt-6" style={{ transform: "translateZ(80px)" }}>
                        <h3 className="text-2xl md:text-3xl font-black text-white mb-2 group-hover:text-red-500 transition-colors tracking-tighter italic">
                          {mod.title}
                        </h3>
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">
                          {mod.desc}
                        </p>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping" />
                          <span className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.4em]">ACTIVO · {mod.id} / 20</span>
                        </div>
                        <div className="text-white/20 text-[10px] font-black uppercase tracking-widest group-hover:text-red-500 transition-colors">Click para Expandir +</div>
                    </div>
                </div>
                </div>
            ))}
            </div>

            {/* Decoración Visual */}
            <div className="absolute top-0 right-0 w-[50vw] h-[50vh] bg-red-600/5 blur-[120px] rounded-full pointer-events-none" />
        </div>
      </div>

      {/* LIGHTBOX MODAL */}
      {selectedMod && (
        <div 
            ref={modalRef}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
            onClick={() => setSelectedMod(null)}
        >
            <button className="absolute top-8 right-8 text-white text-4xl hover:text-red-500 transition-colors">✕</button>
            <div 
                ref={modalImgRef}
                className="max-w-7xl w-full bg-[#0d1117] border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl cursor-default"
                onClick={e => e.stopPropagation()}
            >
                <img 
                    src={selectedMod.img} 
                    alt={selectedMod.title} 
                    className="w-full h-auto max-h-[75vh] object-contain border-b border-white/5"
                />
                <div className="p-8 md:p-12 bg-gradient-to-br from-white/5 to-transparent">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-2 h-2 bg-red-500 rounded-full" />
                        <span className="text-red-500 font-black uppercase text-xs tracking-widest">Módulo {selectedMod.id} de GastroRed</span>
                    </div>
                    <h3 className="text-4xl md:text-5xl font-black text-white mb-4">{selectedMod.title}</h3>
                    <p className="text-xl text-gray-400 max-w-3xl leading-relaxed">{selectedMod.desc}</p>
                </div>
            </div>
        </div>
      )}
    </section>
  );
}
