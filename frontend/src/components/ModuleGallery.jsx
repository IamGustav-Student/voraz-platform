import { useState, useEffect } from 'react';

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
  const [selectedMod, setSelectedMod] = useState(null);

  useEffect(() => {
    if (selectedMod) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
  }, [selectedMod]);

  return (
    <section 
      id="ecosistema-gastrored" 
      className="bg-[#05080d] py-20 px-4 md:px-8" 
      aria-labelledby="gallery-title"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header de la sección */}
        <div className="mb-16 text-center md:text-left">
            <h2 id="gallery-title" className="text-4xl md:text-7xl font-black text-white leading-tight tracking-tighter mb-4">
                Explorá el <br className="hidden md:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-gradient text-glow">Ecosistema</span>
            </h2>
            <p className="text-gray-500 max-w-xl font-bold text-xs md:text-sm leading-tight uppercase tracking-[0.2em] opacity-60">
                20 Módulos de Sincronización Total para la Gastronomía Profesional, ahora en una vista simplificada y potente.
            </p>
        </div>

        {/* Grid de módulos corregido (Sin GSAP) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
          {modules.map((mod) => (
            <div 
              key={mod.id} 
              onClick={() => setSelectedMod(mod)}
              className="group relative glass-premium rounded-[2.5rem] p-2 shadow-2xl overflow-hidden hover:border-red-500/50 transition-all duration-500 cursor-pointer flex flex-col"
            >
              <div className="h-full flex flex-col p-5">
                {/* Imagen o Icono */}
                <div className="aspect-[16/10] bg-[#0a0f18] rounded-[1.8rem] flex items-center justify-center overflow-hidden border border-white/10 relative group-hover:shadow-[0_0_40px_rgba(227,6,19,0.2)] transition-all duration-500">
                  {mod.img ? (
                    <img 
                      src={mod.img} 
                      alt={`Módulo ${mod.title}`} 
                      className="w-full h-full object-cover opacity-90 transition-all duration-700 group-hover:scale-105 group-hover:opacity-100"
                    />
                  ) : (
                    <div className="text-7xl opacity-20 group-hover:opacity-100 transition-opacity duration-500">{mod.icon}</div>
                  )}
                  {/* Overlay sutil */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-20 transition-opacity" />
                </div>
                
                <div className="pt-5">
                  <h3 className="text-xl md:text-2xl font-black text-white mb-2 group-hover:text-red-500 transition-colors tracking-tight italic">
                    {mod.title}
                  </h3>
                  <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] line-clamp-1">
                    {mod.desc}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">ACTIVO</span>
                  </div>
                  <div className="text-red-500/80 text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">+ Detalles</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LIGHTBOX MODAL (Simplificado) */}
      {selectedMod && (
        <div 
            className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-300"
            onClick={() => setSelectedMod(null)}
        >
            <button className="absolute top-6 right-6 text-white text-3xl hover:text-red-500 transition-colors z-20">✕</button>
            <div 
                className="max-w-5xl w-full bg-[#0d1117] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl cursor-default animate-in zoom-in-95 duration-500"
                onClick={e => e.stopPropagation()}
            >
                <div className="relative aspect-video">
                  <img 
                      src={selectedMod.img} 
                      alt={selectedMod.title} 
                      className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d1117] via-transparent to-transparent" />
                </div>
                <div className="p-8 md:p-12 relative -mt-20">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(227,6,19,1)]" />
                        <span className="text-red-500 font-black uppercase text-xs tracking-[0.3em]">Módulo GastroRed</span>
                    </div>
                    <h3 className="text-4xl md:text-6xl font-black text-white mb-4 tracking-tighter italic">{selectedMod.title}</h3>
                    <p className="text-lg md:text-xl text-gray-400 max-w-3xl leading-relaxed font-medium">{selectedMod.desc}</p>
                </div>
            </div>
        </div>
      )}
    </section>
  );
}
