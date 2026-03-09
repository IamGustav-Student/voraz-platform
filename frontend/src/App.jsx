import { useEffect, useState } from 'react';
import { getMenu, getInfluencers, getVideos, getStores, getNews } from './services/api';
import { Helmet } from 'react-helmet-async';
import { TENANT, formatPrice, loadTenantConfig } from './config/tenant.js';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from './context/CartContext';
import { useAuth } from './context/AuthContext';
import CartDrawer from './components/CartDrawer';
import OrderTracking from './components/OrderTracking';
import AuthModal from './components/AuthModal';
import VorazClub from './components/VorazClub';
import AdminPanel from './components/AdminPanel';
import GastroRedLanding from './components/GastroRedLanding';

// Dominios que deben mostrar la landing de GastroRed en lugar de un tenant
const GASTRORED_ROOT_DOMAINS = [
  import.meta.env.VITE_GASTRORED_ROOT_DOMAIN || '',
  'gastrored.com.ar',
  'www.gastrored.com.ar',
].filter(Boolean);

const isGastroRedRootDomain = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return GASTRORED_ROOT_DOMAINS.some(d => d && host === d.toLowerCase());
};

function App() {
  const { itemCount, dispatch } = useCart();
  const { user } = useAuth();

  // ── Detección de landing GastroRed ───────────────────────────────────────
  const [showLanding, setShowLanding] = useState(isGastroRedRootDomain());
  const [landingChecked, setLandingChecked] = useState(isGastroRedRootDomain());

  const [products, setProducts] = useState([]);
  const [influencers, setInfluencers] = useState([]);
  const [videos, setVideos] = useState([]);
  const [stores, setStores] = useState([]);
  const [news, setNews] = useState([]);

  const [currentView, setCurrentView] = useState('menu');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategory, setActiveCategory] = useState('Todas');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  useEffect(() => {
    // Cargar branding dinámico del tenant desde la API
    loadTenantConfig();

    // Si ya sabemos que es el root domain, no hace falta chequear
    if (!landingChecked) {
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').trim();
      fetch(`${API_URL}/tenant-check`, {
        headers: { 'x-store-domain': window.location.hostname },
      })
        .then(r => r.json())
        .then(data => {
          if (data.is_landing) setShowLanding(true);
        })
        .catch(() => { }) // fallback silencioso → muestra tenant
        .finally(() => setLandingChecked(true));
    }
    loadAllData();
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (currentView !== 'tracking') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  const loadAllData = async () => {
    try {
      const [menuData, squadData, videoData, storesData, newsData] = await Promise.all([
        getMenu(), getInfluencers(), getVideos(), getStores(), getNews()
      ]);
      if (menuData) {
        setProducts(menuData || []);
        setInfluencers(squadData || []);
        setVideos(videoData || []);
        setStores(storesData || []);
        setNews(newsData || []);
        setError(null);
      } else {
        setError(`Error de conexión con ${TENANT.brandName} Server.`);
      }
    } catch {
      setError("Error crítico.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product) => {
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        product_id: product.id,
        product_name: product.name,
        product_price: parseFloat(product.price),
        image_url: product.image_url,
      }
    });
    setSelectedProduct(null);
    setIsCartOpen(true);
  };

  const handleOrderCreated = (orderId) => {
    setActiveOrderId(orderId);
    setCurrentView('tracking');
  };

  const getBadgeColor = (badge) => {
    switch (badge?.toUpperCase()) {
      case 'NUEVO': return 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]';
      case 'PICANTE': return 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]';
      case 'BEST SELLER': return 'bg-voraz-yellow text-voraz-black shadow-[0_0_10px_rgba(242,201,76,0.4)]';
      case 'ÍCONO': return 'bg-voraz-yellow text-voraz-black shadow-[0_0_10px_rgba(242,201,76,0.4)]';
      case 'TOP': return 'bg-voraz-yellow text-voraz-black shadow-[0_0_10px_rgba(242,201,76,0.4)]';
      case 'CLÁSICO': return 'bg-gray-600 text-white';
      case 'COLLAB': return 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.4)]';
      case 'COSCU': return 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.4)]';
      case 'FYE': return 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.4)]';
      case 'VEGGIE': return 'bg-green-600 text-white shadow-[0_0_10px_rgba(22,163,74,0.4)]';
      case 'KIDS': return 'bg-blue-500 text-white';
      case 'GOURMET': return 'bg-amber-600 text-white';
      case 'DULCE': return 'bg-pink-500 text-white';
      case '+18': return 'bg-gray-800 text-white border border-white/20';
      default: return 'bg-blue-600 text-white';
    }
  };

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -10 }
  };

  const pageTransition = { type: "tween", ease: "anticipate", duration: 0.4 };

  const fmt = (n) => formatPrice(n);

  const MenuView = () => {
    const categories = ['Todas', ...new Set(products.map(p => p.category))];
    const filteredProducts = activeCategory === 'Todas' ? products : products.filter(p => p.category === activeCategory);
    const featuredProducts = products.filter(p => p.badge).slice(0, 5);
    const groupByCategory = (items) => items.reduce((acc, item) => { (acc[item.category] = acc[item.category] || []).push(item); return acc; }, {});
    const menuDisplay = groupByCategory(filteredProducts);

    return (
      <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="pt-2 pb-28 md:pb-10">
        <Helmet><title>Menú | {TENANT.brandName}</title></Helmet>

        <div className="md:hidden mb-6 pl-4">
          <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Destacados</h3>
          <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2 pr-4">
            {featuredProducts.map(product => (
              <motion.div whileTap={{ scale: 0.95 }} key={`feat-${product.id}`} onClick={() => setSelectedProduct(product)} className="flex-shrink-0 w-60 h-36 rounded-xl relative overflow-hidden shadow-lg border border-white/5">
                <img src={product.image_url} className="w-full h-full object-cover brightness-75" />
                <div className="absolute bottom-0 left-0 p-3 w-full bg-gradient-to-t from-black to-transparent">
                  <div className="text-white font-bold leading-none mb-1 text-sm">{product.name}</div>
                  <div className="text-voraz-yellow text-xs font-bold">${fmt(product.price)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <nav className="sticky top-14 md:top-24 z-30 py-3 mb-6 bg-[#121212] border-b border-white/10 shadow-2xl">
          <div className="container mx-auto px-4 overflow-x-auto no-scrollbar">
            <div className="flex space-x-2 md:justify-center">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full font-bold text-xs md:text-sm uppercase tracking-wide transition-all whitespace-nowrap active:scale-95
                    ${activeCategory === cat ? 'bg-voraz-red text-white shadow-lg' : 'bg-voraz-gray text-gray-400 hover:text-white border border-white/5'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4">
          {Object.keys(menuDisplay).length > 0 ? Object.keys(menuDisplay).map((category) => (
            <section key={category} className="mb-10">
              <div className="flex items-center space-x-3 mb-4">
                <h3 className="text-xl md:text-2xl font-black uppercase text-white italic border-l-4 border-voraz-red pl-3">{category}</h3>
                <div className="h-px bg-white/10 flex-grow"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {menuDisplay[category].map((product) => (
                  <motion.article
                    layoutId={`product-${product.id}`}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.98 }}
                    key={product.id}
                    onClick={() => setSelectedProduct(product)}
                    className="bg-voraz-gray rounded-xl overflow-hidden shadow-xl group cursor-pointer relative flex md:block h-28 md:h-auto border border-white/5"
                  >
                    {product.badge && <div className={`absolute top-0 left-0 md:top-3 md:left-3 z-10 px-2 py-0.5 rounded-br-lg md:rounded text-[9px] font-black uppercase ${getBadgeColor(product.badge)}`}>{product.badge}</div>}
                    <div className="w-28 md:w-full h-full md:h-48 relative flex-shrink-0">
                      <img src={product.image_url} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3 md:p-4 flex flex-col justify-between flex-grow">
                      <div>
                        <h4 className="text-base md:text-lg font-bold text-white leading-tight mb-1 line-clamp-1">{product.name}</h4>
                        <p className="text-gray-400 text-[10px] md:text-xs line-clamp-2">{product.description}</p>
                      </div>
                      <div className="flex justify-between items-end mt-1 md:mt-4">
                        <div className="text-voraz-yellow font-black text-sm md:text-base">${fmt(product.price)}</div>
                        <div className="md:hidden bg-voraz-red text-white p-1 rounded-full"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg></div>
                        <button className="hidden md:block bg-white/10 hover:bg-voraz-red text-white py-1 px-3 rounded text-xs uppercase font-bold transition">Ver</button>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            </section>
          )) : <div className="text-center py-20 text-gray-500">Sin productos.</div>}
        </div>
      </motion.div>
    );
  };

  const CommunityView = () => (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="container mx-auto px-4 py-8 pb-32">
      <Helmet><title>Squad | {TENANT.brandName}</title></Helmet>
      <div className="text-center mb-8"><h2 className="text-3xl md:text-5xl font-black uppercase italic mb-2">{TENANT.brandName} <span className="text-brand-secondary">Squad</span></h2></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {influencers.map((inf) => (
          <motion.div whileHover={{ scale: 1.05 }} key={inf.id} className="relative rounded-2xl overflow-hidden aspect-square group shadow-lg">
            <img src={inf.image_url} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
            <div className="absolute bottom-3 left-3">
              <p className="text-white font-bold text-sm">{inf.name}</p>
              <p className="text-voraz-yellow text-[10px] font-bold">{inf.social_handle}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );

  const [selectedVideo, setSelectedVideo] = useState(null);

  const VideosView = () => (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="container mx-auto px-4 py-8 pb-32">
      <Helmet><title>Live | {TENANT.brandName}</title></Helmet>
      <div className="text-center mb-8"><h2 className="text-3xl md:text-5xl font-black uppercase italic mb-2">{TENANT.brandName} <span className="text-brand-primary">Live</span></h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {videos.map((vid) => (
          <motion.div
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            key={vid.id}
            onClick={() => setSelectedVideo(vid)}
            className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative group cursor-pointer border border-white/5"
          >
            <img src={vid.thumbnail_url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-red-600/90 group-hover:bg-red-500 rounded-full flex items-center justify-center shadow-lg transition-colors">
                <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 p-4 w-full bg-gradient-to-t from-black to-transparent">
              <h3 className="text-lg font-bold text-white">{vid.title}</h3>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Modal reproductor YouTube */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 px-4"
            onClick={() => setSelectedVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-3xl"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-lg truncate pr-4">{selectedVideo.title}</h3>
                <button onClick={() => setSelectedVideo(null)} className="text-gray-400 hover:text-white text-3xl leading-none flex-shrink-0">&times;</button>
              </div>
              <div className="aspect-video w-full rounded-xl overflow-hidden shadow-2xl bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${selectedVideo.youtube_id}?autoplay=1&rel=0`}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const LocationsView = () => (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="container mx-auto px-4 py-8 pb-32">
      <Helmet><title>Spots | {TENANT.brandName}</title></Helmet>
      <div className="text-center mb-8"><h2 className="text-3xl md:text-5xl font-black uppercase italic mb-2">Nuestros <span className="text-white">Spots</span></h2></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stores.map((store) => {
          const mapsUrl = store.waze_link ||
            `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.address)}`;
          const deliveryUrl = store.delivery_link;
          return (
            <motion.div whileHover={{ y: -5 }} key={store.id} className="bg-voraz-gray rounded-2xl overflow-hidden shadow-xl border border-white/5">
              <div className="h-40 relative">
                <img src={store.image_url} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black to-transparent">
                  <h3 className="text-xl font-bold text-white">{store.name}</h3>
                </div>
              </div>
              <div className="p-5">
                <p className="text-gray-300 text-sm mb-4 flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 text-brand-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {store.address}
                </p>
                {store.phone && (
                  <p className="text-gray-400 text-xs mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {store.phone}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 bg-white/5 text-white py-2.5 rounded-lg text-xs font-bold border border-white/10 active:bg-white/10 hover:bg-white/10 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                    Cómo llegar
                  </a>
                  {deliveryUrl ? (
                    <a
                      href={deliveryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 bg-brand-primary text-white py-2.5 rounded-lg text-xs font-bold hover:opacity-90 active:opacity-80 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      Delivery
                    </a>
                  ) : (
                    <button disabled className="flex items-center justify-center gap-1.5 bg-white/5 text-gray-500 py-2.5 rounded-lg text-xs font-bold border border-white/5 cursor-not-allowed">
                      Sin delivery
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );

  const DeliveryView = () => (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="container mx-auto px-4 py-8 pb-32">
      <Helmet><title>Delivery | {TENANT.brandName}</title></Helmet>
      <div className="text-center mb-8"><h2 className="text-3xl md:text-5xl font-black uppercase italic mb-2">Delivery <span className="text-brand-primary">Express</span></h2></div>
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {stores.map((store) => (
          <motion.a whileTap={{ scale: 0.98 }} key={store.id} href={store.delivery_link} target="_blank" className="flex items-center p-4 bg-voraz-gray rounded-xl border border-white/5 hover:border-voraz-red transition group">
            <img src={store.image_url} className="w-14 h-14 rounded-full object-cover border-2 border-white/10 mr-4" />
            <div className="flex-grow">
              <h3 className="text-lg font-bold text-white group-hover:text-voraz-red">{store.name}</h3>
              <p className="text-gray-400 text-xs">{store.address}</p>
            </div>
            <div className="bg-voraz-red text-white p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></div>
          </motion.a>
        ))}
      </div>
    </motion.div>
  );

  const BrandWorldView = () => (
    <motion.div initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="container mx-auto px-4 py-8 pb-32">
      <Helmet><title>Mundo | {TENANT.brandName}</title></Helmet>
      <div className="text-center mb-8"><h2 className="text-3xl md:text-5xl font-black uppercase italic mb-2">Mundo <span className="text-brand-secondary">{TENANT.brandName}</span></h2></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {news.map((item) => (
          <motion.article whileHover={{ y: -5 }} key={item.id} className="bg-voraz-gray rounded-xl overflow-hidden border border-white/5 shadow-xl">
            <div className="h-40 relative"><img src={item.image_url} className="w-full h-full object-cover" /><div className="absolute top-3 right-3 bg-black/70 px-2 py-1 rounded text-[10px] font-bold border border-white/10">{new Date(item.date).toLocaleDateString()}</div></div>
            <div className="p-4">
              <h3 className="text-lg font-black text-white mb-2 leading-tight">{item.title}</h3>
              <p className="text-gray-400 text-xs line-clamp-3 mb-4">{item.content}</p>
              <button className="text-voraz-red font-bold uppercase text-xs hover:underline">Leer más</button>
            </div>
          </motion.article>
        ))}
      </div>
    </motion.div>
  );

  // ── Mostrar landing GastroRed si el dominio no es un tenant conocido ──────
  if (showLanding) return <GastroRedLanding />;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans selection:bg-brand-primary selection:text-white">

      {/* HEADER PC */}
      <header className={`hidden md:block sticky top-0 z-50 h-24 transition-all duration-300 ${isScrolled ? 'bg-[#121212] border-b border-white/10 shadow-xl' : 'bg-[#121212] py-4'}`}>
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="cursor-pointer hover:opacity-80 transition" onClick={() => setCurrentView('menu')}>
            {TENANT.logo
              ? <img src={TENANT.logo} alt={TENANT.brandName} className="h-16 object-contain" />
              : <span className="text-2xl font-black uppercase italic text-brand-primary">{TENANT.brandName}</span>
            }
          </div>
          <nav className="flex space-x-6">
            <NavButtonPC active={currentView === 'menu'} onClick={() => setCurrentView('menu')} image="/images/menu.jpg" label="Menú" />
            <NavButtonPC active={currentView === 'community'} onClick={() => setCurrentView('community')} image="/images/comunidad.jpg" label="Squad" />
            <NavButtonPC active={currentView === 'videos'} onClick={() => setCurrentView('videos')} image="/images/eventos.jpg" label="Videos" />
            <NavButtonPC active={currentView === 'locations'} onClick={() => setCurrentView('locations')} image="/images/locales.jpg" label="Locales" />
            <NavButtonPC active={currentView === 'delivery'} onClick={() => setCurrentView('delivery')} image="/images/delivery.jpg" label="Delivery" />
            <NavButtonPC active={currentView === 'brandworld'} onClick={() => setCurrentView('brandworld')} image="/images/vorazburger.jpg" label={TENANT.brandName} />
          </nav>
          <div className="flex items-center space-x-3">
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => user ? setCurrentView('club') : setIsAuthOpen(true)}
              className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white px-3 py-2 rounded-xl text-sm font-bold transition"
            >
              {user?.avatar_url
                ? <img src={user.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              }
              {user
                ? <span className="flex items-center space-x-1"><span>{user.name.split(' ')[0]}</span><span className="text-brand-secondary text-xs">⭐{user.points}</span></span>
                : <span>Ingresar</span>
              }
            </motion.button>
            {user && (user.role === 'admin' || user.role === 'manager') && (
              <motion.button
                whileTap={{ scale: 0.93 }}
                onClick={() => setIsAdminOpen(true)}
                className="flex items-center space-x-1 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 px-3 py-2 rounded-xl text-sm font-bold transition"
                title="Panel Admin"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>Admin</span>
              </motion.button>
            )}

            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center space-x-2 bg-brand-primary hover:bg-brand-primary-hover text-white px-4 py-2 rounded-xl font-bold text-sm transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              <span>Pedido</span>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-brand-secondary text-black text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {itemCount}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {/* HEADER MÓVIL */}
      <header className="md:hidden sticky top-0 z-40 bg-[#121212] border-b border-white/10 h-14 flex items-center justify-between px-4 shadow-xl">
        {TENANT.logo
          ? <img src={TENANT.logo} className="h-8 object-contain" alt={TENANT.brandName} />
          : <span className="text-xl font-black uppercase italic text-brand-primary">{TENANT.brandName}</span>
        }
        <div className="flex items-center space-x-2">
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => user ? setCurrentView('club') : setIsAuthOpen(true)}
            className="relative p-2 rounded-xl bg-white/5 border border-white/10 text-white"
          >
            {user?.avatar_url
              ? <img src={user.avatar_url} className="w-5 h-5 rounded-full object-cover" alt="" />
              : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            }
            {user && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full"></span>}
          </motion.button>
          {user && (user.role === 'admin' || user.role === 'manager') && (
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={() => setIsAdminOpen(true)}
              className="relative p-2 rounded-xl bg-yellow-500/20 border border-yellow-500/40 text-yellow-400"
              title="Panel Admin"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 rounded-xl bg-brand-primary text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-brand-secondary text-black text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </motion.button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="min-h-screen">
        <AnimatePresence mode='wait'>
          {loading ? (
            <motion.div key="loader" exit={{ opacity: 0 }} className="container mx-auto px-4 pt-10">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
              </div>
            </motion.div>
          ) : !error ? (
            <>
              {currentView === 'menu' && <MenuView key="menu" />}
              {currentView === 'community' && <CommunityView key="community" />}
              {currentView === 'videos' && <VideosView key="videos" />}
              {currentView === 'locations' && <LocationsView key="locations" />}
              {currentView === 'delivery' && <DeliveryView key="delivery" />}
              {currentView === 'brandworld' && <BrandWorldView key="brandworld" />}
              {currentView === 'vorazburger' && <BrandWorldView key="vorazburger" />}
              {currentView === 'tracking' && activeOrderId && (
                <OrderTracking key="tracking" orderId={activeOrderId} onBack={() => setCurrentView('menu')} />
              )}
              {currentView === 'club' && (
                <VorazClub key="club" onBack={() => setCurrentView('menu')} onOpenAuth={() => setIsAuthOpen(true)} />
              )}
            </>
          ) : (
            <div className="flex h-[50vh] items-center justify-center flex-col">
              <div className="text-red-500 font-bold mb-4">{error}</div>
              <button onClick={loadAllData} className="bg-brand-primary text-white px-6 py-2 rounded-lg font-bold">Reintentar</button>
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* BOTTOM NAV */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#121212] border-t border-white/10 z-50 px-6 pb-4 pt-2 safe-area-pb">
        <div className="flex justify-between items-end">
          <BottomNavItem icon="home" label="Menú" active={currentView === 'menu'} onClick={() => setCurrentView('menu')} />
          <BottomNavItem icon="users" label="Squad" active={currentView === 'community'} onClick={() => setCurrentView('community')} />
          <div className="relative -top-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentView('vorazburger')}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg border-4 border-voraz-black ${currentView === 'vorazburger' ? 'bg-voraz-yellow text-black' : 'bg-voraz-red text-white'}`}>
              <span className="font-black text-xs">{TENANT.brandName[0]}</span>
            </motion.button>
          </div>
          <BottomNavItem icon="map" label="Spots" active={currentView === 'locations'} onClick={() => setCurrentView('locations')} />
          <BottomNavItem icon="bike" label="Dely" active={currentView === 'delivery'} onClick={() => setCurrentView('delivery')} />
        </div>
      </nav>

      {/* MODAL DE PRODUCTO */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedProduct(null)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 500 }}
              className="bg-voraz-gray w-full md:max-w-4xl h-[85vh] md:h-auto rounded-t-[30px] md:rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative border-t md:border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-20 bg-black/50 text-white p-2 rounded-full hover:bg-voraz-red transition backdrop-blur-md">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              <div className="h-[35vh] md:h-auto md:w-1/2 relative flex-shrink-0">
                <img src={selectedProduct.image_url} className="w-full h-full object-cover" />
                <div className="md:hidden absolute inset-0 bg-gradient-to-t from-voraz-gray to-transparent"></div>
              </div>
              <div className="flex-grow p-6 md:p-10 flex flex-col justify-between overflow-y-auto">
                <div>
                  <div className="text-voraz-yellow font-bold text-xs uppercase tracking-widest mb-2">{selectedProduct.category}</div>
                  <h2 className="text-3xl md:text-4xl font-black text-white leading-none mb-4">{selectedProduct.name}</h2>
                  <p className="text-gray-300 text-sm md:text-lg font-light leading-relaxed mb-6">{selectedProduct.description}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {['Carne Premium', 'Pan de Papa', 'Casero'].map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-gray-400 text-xs font-bold">{tag}</span>
                    ))}
                  </div>
                </div>
                <div className="mt-auto pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between mb-4 md:hidden">
                    <span className="text-gray-400 text-sm">Total</span>
                    <div className="text-2xl font-black text-white">${fmt(selectedProduct.price)}</div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleAddToCart(selectedProduct)}
                    className="w-full bg-voraz-red text-white py-4 md:py-3 rounded-xl font-bold uppercase tracking-wide shadow-lg flex justify-between md:justify-center px-6 hover:bg-red-700 transition"
                  >
                    <span>Agregar al pedido</span>
                    <span className="md:hidden">${fmt(selectedProduct.price)}</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CART DRAWER */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        stores={stores}
        onOrderCreated={handleOrderCreated}
        onOpenAuth={() => { setIsCartOpen(false); setIsAuthOpen(true); }}
      />

      {/* AUTH MODAL */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* ADMIN PANEL */}
      {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}
    </div>
  );
}
function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    });
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choice) => {
      if (choice.outcome === 'accepted') {
        console.log(`Usuario instaló ${TENANT.brandName}`);
      }
      setInstallPrompt(null);
    });
  };

  return { isInstallable: !!installPrompt, handleInstallClick };
}

const SkeletonCard = () => (
  <div className="bg-voraz-gray rounded-xl overflow-hidden border border-white/5 h-28 md:h-auto flex md:block animate-pulse">
    <div className="w-28 md:w-full h-full md:h-48 bg-white/5"></div>
    <div className="p-3 md:p-4 flex-grow flex flex-col justify-between">
      <div>
        <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-white/5 rounded w-full mb-1"></div>
        <div className="h-3 bg-white/5 rounded w-1/2"></div>
      </div>
      <div className="h-6 bg-white/10 rounded w-1/4 mt-2"></div>
    </div>
  </div>
);

const NavButtonPC = ({ active, onClick, image, label }) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all group ${active ? 'bg-white/5 -translate-y-1' : 'hover:bg-white/5'}`}>
    <div className={`w-10 h-10 rounded-full overflow-hidden border-2 mb-1 transition-all ${active ? 'border-voraz-yellow scale-110 shadow-lg' : 'border-transparent opacity-80'}`}>
      <img src={image} alt={label} className="w-full h-full object-cover" />
    </div>
    <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-voraz-yellow' : 'text-gray-500'}`}>{label}</span>
  </button>
);

const BottomNavItem = ({ icon, label, active, onClick }) => {
  const getIcon = () => {
    if (icon === 'home') return <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />;
    if (icon === 'users') return <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />;
    if (icon === 'map') return <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />;
    if (icon === 'bike') return <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />;
    return null;
  };
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center w-12 group relative">
      <motion.div
        animate={active ? { y: -5, color: '#F2C94C' } : { y: 0, color: '#6B7280' }}
        className="transition-colors duration-300"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">{getIcon()}</svg>
      </motion.div>
      <span className={`text-[9px] font-bold uppercase mt-1 ${active ? 'text-white' : 'text-gray-600'}`}>{label}</span>
      {active && <motion.div layoutId="activeDot" className="absolute -bottom-1 w-1 h-1 bg-voraz-yellow rounded-full" />}
    </button>
  );
};

export default App;
