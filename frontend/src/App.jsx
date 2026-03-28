import { useEffect, useState } from 'react';
import { getMenu, getPromos, getVideos, getStores, getNews, resetPassword as apiResetPassword, updateTenantProfile } from './services/api';
import { Helmet } from 'react-helmet-async';
import { TENANT, formatPrice, loadTenantConfig } from './config/tenant.js';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from './context/CartContext';
import { useAuth } from './context/AuthContext';
import CartDrawer from './components/CartDrawer';
import OrderTracking from './components/OrderTracking';
import AuthModal from './components/AuthModal';
import LoyaltyClub from './components/LoyaltyClub';
import AdminPanel from './components/AdminPanel';
import GastroRedLanding from './components/GastroRedLanding';
import { useBranding } from './hooks/useBranding';
import { usePWAInstall } from './hooks/usePWAInstall';
import InstallPWABanner from './components/InstallPWABanner';

// Dominios que deben mostrar la landing de GastroRed en lugar de un tenant
const GASTRORED_ROOT_DOMAINS = [
  import.meta.env.VITE_GASTRORED_ROOT_DOMAIN || '',
  'gastrored.com.ar',
  'www.gastrored.com.ar',
].filter(Boolean);

const isGastroRedRootDomain = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  const matched = GASTRORED_ROOT_DOMAINS.some(d => d && host === d.toLowerCase());
  return matched;
};

function App() {
  const { itemCount, dispatch } = useCart();
  const { user } = useAuth();
  const branding = useBranding(); // Inyecta CSS vars dinámicas desde la BD al montar
  const { isInstallable, isInstalled, handleInstallClick } = usePWAInstall();

  // ── Detección de landing GastroRed ───────────────────────────────────────
  const [showLanding, setShowLanding] = useState(isGastroRedRootDomain());
  const [landingChecked, setLandingChecked] = useState(isGastroRedRootDomain());

  const [products, setProducts] = useState([]);
  const [promos, setPromos] = useState([]);
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
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // ── Recuperación de contraseña vía ?reset_token= en la URL ──────────────────
  const [resetToken, setResetToken] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('reset_token') || null;
    }
    return null;
  });
  const [resetNewPwd, setResetNewPwd] = useState('');
  const [resetNewPwd2, setResetNewPwd2] = useState('');
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetMsg, setResetMsg] = useState({ type: '', text: '' });
  const [resetDone, setResetDone] = useState(false);

  useEffect(() => {
    // Si ya sabemos que es el root domain, no hace falta chequear
    if (!landingChecked) {
      const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').trim();
      fetch(`${API_URL}/tenant-check`, {
        headers: { 'x-store-domain': window.location.hostname },
      })
        .then(r => r.json())
        .then(data => {
          setShowLanding(data.is_landing);
        })
        .catch(err => {
          console.error('[App] tenant-check error:', err);
        })
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
      const [menuData, promosData, videoData, storesData, newsData] = await Promise.all([
        getMenu(), getPromos(), getVideos(), getStores(), getNews()
      ]);
      if (menuData) {
        setProducts(menuData || []);
        setPromos(promosData || []);
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
        points_earned: product.points_earned || 0,
      }
    });
    setSelectedProduct(null);
    setIsCartOpen(true);
  };

  const handleOrderCreated = (orderId, points = 0) => {
    setActiveOrderId(orderId);
    setEarnedPoints(points);
    setCurrentView('tracking');
  };

  const getBadgeColor = (badge) => {
    switch (badge?.toUpperCase()) {
      case 'NUEVO': return 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]';
      case 'PICANTE': return 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]';
      case 'BEST SELLER': return 'bg-brand-secondary text-black shadow-[0_0_10px_rgba(var(--brand-secondary-rgb),0.4)]';
      case 'ÍCONO': return 'bg-brand-secondary text-black shadow-[0_0_10px_rgba(var(--brand-secondary-rgb),0.4)]';
      case 'TOP': return 'bg-brand-secondary text-black shadow-[0_0_10px_rgba(var(--brand-secondary-rgb),0.4)]';
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

  const scrollToCategory = (category) => {
    setActiveCategory(category);
    if (category === 'Todas') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const element = document.getElementById(`category-${category}`);
    if (element) {
      const headerHeight = window.innerWidth < 768 ? 56 : 96;
      const searchHeight = window.innerWidth < 768 ? 72 : 88;
      const navHeight = window.innerWidth < 768 ? 52 : 60;
      const offset = headerHeight + searchHeight + navHeight - 10; 
      
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (currentView !== 'menu') return;

    const handleScroll = () => {
      const categories = [...new Set(products.map(p => p.category))];
      const headerHeight = window.innerWidth < 768 ? 56 : 96;
      const searchHeight = window.innerWidth < 768 ? 72 : 88;
      const navHeight = window.innerWidth < 768 ? 52 : 60;
      const scrollPosition = window.scrollY + headerHeight + searchHeight + navHeight + 20;

      for (const cat of categories) {
        const element = document.getElementById(`category-${cat}`);
        if (element) {
          const { top, bottom } = element.getBoundingClientRect();
          const absoluteTop = top + window.pageYOffset;
          const absoluteBottom = bottom + window.pageYOffset;

          if (scrollPosition >= absoluteTop && scrollPosition < absoluteBottom) {
            if (!searchTerm) setActiveCategory(cat);
            break;
          }
        }
      }
    };

    const debouncedScroll = () => {
      window.requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', debouncedScroll);
    return () => window.removeEventListener('scroll', debouncedScroll);
  }, [currentView, products]);

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -10 }
  };

  const pageTransition = { type: "tween", ease: "anticipate", duration: 0.4 };

  const fmt = (n) => formatPrice(n);

  const renderMenuView = () => {
    const CATEGORY_ALIASES = {
      'Burgers': ['hamburguesas', 'hamburgesas', 'burguer', 'burguers', 'burgers', 'hanburguesas', 'burgerss', 'hamburguesas'],
      'Pizzas': ['pizas', 'pizzas', 'piza', 'pizza', 'picsas', 'picsa', 'pizaz'],
      'Bebidas': ['bebidas', 'vevidas', 'gaseosas', 'refrescos', 'cocas', 'birras', 'cervezas', 'alcohol', 'tomar', 'jugos'],
      'Milanesas': ['milanesas', 'milas', 'milanezas', 'milanessa'],
      'Postres': ['postres', 'helados', 'dulces', 'postresitos', 'chocolate'],
      'Combos': ['combos', 'conbos', 'promociones', 'ofertas', 'promos', 'convo'],
      'Entradas': ['entradas', 'picadas', 'entraditas', 'aperitivos', 'papas frita', 'bastoncitos'],
      'Sándwiches': ['sandwiches', 'sanguches', 'sanguche', 'sandwish', 'sanwich', 'baguette'],
      'Ensaladas': ['ensaladas', 'dieta', 'saludable', 'verdes', 'salad'],
      'Cafetería': ['cafe', 'cafeteria', 'desayuno', 'merienda', 'te', 'coffee']
    };

    const normalizeText = (text) => 
      text?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

    const categories = ['Todas', ...new Set(products.map(p => p.category))];
    const searchTermNormalized = normalizeText(searchTerm);

    // Búsqueda inteligente (Fuzzy): Considera nombre, descripción, categoría y alias
    const filterBySearch = (p) => {
      if (!searchTermNormalized) return true;
      const name = normalizeText(p.name);
      const desc = normalizeText(p.description);
      const cat = normalizeText(p.category);
      
      // Verificar si el término coincide con algún alias de la categoría del producto
      const aliases = CATEGORY_ALIASES[p.category] || [];
      const matchAlias = aliases.some(alias => normalizeText(alias).includes(searchTermNormalized));

      return name.includes(searchTermNormalized) || 
             desc.includes(searchTermNormalized) || 
             cat.includes(searchTermNormalized) ||
             matchAlias;
    };

    const filteredBySearch = products.filter(filterBySearch);
    const featuredProducts = products.filter(p => p.badge).slice(0, 5);
    
    // Función para agrupar que ignora el filtro de activeCategory para el DOM
    const groupByCategory = (items) => items.reduce((acc, item) => { 
      (acc[item.category] = acc[item.category] || []).push(item); return acc; 
    }, {});
    
    const menuDisplay = groupByCategory(filteredBySearch);

    return (
      <motion.div key="menu" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="pt-2 pb-28 md:pb-10">
        <Helmet><title>Menú | {TENANT.brandName}</title></Helmet>

        <div className="md:hidden mb-6 pl-4">
          <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Destacados</h3>
          <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2 pr-4">
            {featuredProducts.map(product => (
              <motion.div 
                whileTap={{ scale: 0.95 }} 
                key={`feat-${product.id}`} 
                onClick={() => setSelectedProduct(product)} 
                className="flex-shrink-0 w-72 h-44 rounded-2xl relative overflow-hidden shadow-2xl group cursor-pointer border border-white/10"
              >
                <img src={product.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
                <div className="absolute bottom-0 left-0 p-4 w-full">
                  <div className="bg-primary/90 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded mb-2 inline-block uppercase italic">{product.badge}</div>
                  <div className="text-white font-black leading-tight text-lg drop-shadow-lg">{product.name}</div>
                  <div className="text-brand-secondary font-black text-sm drop-shadow-md">{fmt(product.price)}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="container mx-auto px-4 mb-3 sticky top-14 md:top-24 z-40 pt-2">
          <div className="relative search-premium rounded-2xl group">
            <input
              type="text"
              placeholder="¿Qué vas a comer hoy?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent py-3 md:py-4 pl-12 pr-4 text-white placeholder-gray-400 focus:outline-none transition-all"
            />
            <svg className="absolute left-4 top-3 md:top-4 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        <nav className="sticky top-[120px] md:top-[184px] z-30 py-2 mb-6 bg-[#080C12]/80 backdrop-blur-xl border-b border-white/5">
          <div className="container mx-auto px-4 overflow-x-auto no-scrollbar">
            <div className="flex space-x-2 md:justify-center">
              {categories.map((cat) => (
                <button key={cat} onClick={() => scrollToCategory(cat)}
                  className={`category-pill px-5 py-1.5 rounded-full font-bold text-[10px] md:text-xs uppercase tracking-widest transition-all whitespace-nowrap
                    ${activeCategory === cat ? 'active bg-primary text-white shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.3)]' : 'bg-white/5 text-gray-400 hover:text-white border border-white/5'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </nav>

        <div className="container mx-auto px-4">
          {Object.keys(menuDisplay).length > 0 ? Object.keys(menuDisplay).map((category) => {
            const productsInCategory = menuDisplay[category];
            if (!productsInCategory.length) return null;

            return (
              <section key={category} id={`category-${category}`} className="mb-8 scroll-mt-40 md:scroll-mt-52">
                <div className="flex items-center space-x-3 mb-3">
                  <h3 className="text-xl md:text-2xl font-black uppercase text-white italic border-l-4 border-primary pl-3 tracking-tighter">{category}</h3>
                  <div className="h-px bg-gradient-to-r from-white/10 to-transparent flex-grow"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
                  {productsInCategory.map((product) => {
                  const outOfStock = product.stock != null && Number(product.stock) === 0;
                  return (
                    <motion.article
                      layoutId={`product-${product.id}`}
                      whileHover={outOfStock ? undefined : { y: -8 }}
                      whileTap={outOfStock ? undefined : { scale: 0.98 }}
                      key={product.id}
                      onClick={() => !outOfStock && setSelectedProduct(product)}
                      className={`card-premium rounded-[2rem] overflow-hidden group relative flex md:block h-32 md:h-auto ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      {product.badge && <div className={`absolute top-0 left-0 md:top-4 md:left-4 z-10 px-3 py-1 rounded-br-2xl md:rounded-xl text-[10px] font-black uppercase tracking-wider ${getBadgeColor(product.badge)}`}>{product.badge}</div>}
                      
                      <div className="w-32 md:w-full h-full md:h-56 relative flex-shrink-0">
                        <img src={product.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                      </div>
                      
                      <div className="p-3 md:p-5 flex flex-col justify-between flex-grow bg-brand-surface/40 backdrop-blur-sm">
                        <div>
                          <h4 className="text-base md:text-xl font-black text-white leading-tight mb-1.5 group-hover:text-primary transition-colors line-clamp-1 italic">{product.name}</h4>
                          <p className="text-gray-400 text-[10px] md:text-sm font-medium line-clamp-2 leading-relaxed opacity-80">{product.description}</p>
                        </div>
                        
                        <div className="flex justify-between items-end mt-2 md:mt-4">
                          <div className="flex flex-col">
                            <span className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-0.5">Precio</span>
                            <div className="text-brand-secondary font-black text-lg md:text-2xl italic tracking-tight">{fmt(product.price)}</div>
                            {TENANT.loyaltyEnabled && product.points_earned > 0 && (
                              <div className="flex items-center gap-1 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                <span className="text-green-400 text-[9px] font-black uppercase">{product.points_earned} pts</span>
                              </div>
                            )}
                          </div>
                          
                          {!outOfStock && (
                            <div className="bg-primary text-white p-2.5 md:p-3 rounded-2xl shadow-lg shadow-primary/20 group-hover:scale-110 group-hover:rotate-12 transition-all">
                              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4"></path></svg>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </section>
          );
        }) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 px-4 bg-white/5 rounded-[3rem] border border-dashed border-white/10"
          >
            <div className="text-6xl mb-6">🔍</div>
            <h3 className="text-2xl font-black text-white mb-2 italic uppercase">No encontramos coincidencias</h3>
            <p className="text-gray-500 max-w-xs mx-auto">Probá buscando con otras palabras o revisá si hay algún error de escritura.</p>
            <button 
              onClick={() => setSearchTerm('')}
              className="mt-8 bg-primary text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
            >
              Ver todo el menú
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

  const renderPromosView = () => (
    <motion.div key="promos" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="container mx-auto px-4 py-8 pb-32">
      <Helmet><title>Promos | {TENANT.brandName}</title></Helmet>
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-5xl font-black uppercase italic mb-2">
          Nuestras <span className="text-primary">Promos</span>
        </h2>
        <p className="text-gray-500 text-sm">Aprovechá las mejores ofertas que tenemos para vos.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promos.map((p) => (
          <motion.div 
            whileHover={{ y: -5 }} 
            key={p.id} 
            onClick={() => {
              const product = products.find(pr => pr.id === p.product_id);
              if (product) setSelectedProduct(product);
            }}
            className="group bg-brand-surface border border-brand-primary/20 rounded-3xl overflow-hidden shadow-2xl relative cursor-pointer"
          >
            <div className="h-48 relative">
              <img src={p.image_url || '/images/placeholder_promo.jpg'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={p.title} />
              <div className="absolute top-4 left-4">
                <span className="bg-primary text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase shadow-xl">
                  {p.promo_type}
                </span>
              </div>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-black text-white mb-2">{p.title}</h3>
              <p className="text-gray-400 text-xs line-clamp-2 mb-4 leading-relaxed">{p.description || 'Consultá disponibilidad.'}</p>
              
              <div className="flex items-center justify-between mt-auto">
                <div className="text-2xl font-black text-green-400">
                  ${Number(p.price).toLocaleString('es-AR')}
                </div>
                <button className="bg-white/10 hover:bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-colors">
                  Ver {p.product_id ? 'Producto' : 'Promo'}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        {promos.length === 0 && (
          <div className="col-span-full py-20 text-center opacity-30">
            <p className="text-xl font-bold">No hay promos activas en este momento.</p>
          </div>
        )}
      </div>
    </motion.div>
  );

  const [selectedVideo, setSelectedVideo] = useState(null);

  const renderVideosView = () => (
    <motion.div key="videos" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="container mx-auto px-4 py-8 pb-32">
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

  const renderLocationsView = () => (
    <motion.div key="locations" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="container mx-auto px-4 py-8 pb-32">
      <Helmet><title>Locales | {TENANT.brandName}</title></Helmet>
      <div className="pt-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stores.map((store) => {
          const mapsUrl = store.waze_link ||
            `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.address)}`;
          const deliveryUrl = store.delivery_link;
          return (
            <motion.div whileHover={{ y: -5 }} key={store.id} className="bg-brand-surface rounded-2xl overflow-hidden shadow-xl border border-brand-primary/20">
              <div className="h-40 relative">
                <img src={store.image_url} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black to-transparent">
                  <h3 className="text-xl font-bold text-white">{store.name}</h3>
                </div>
              </div>
              <div className="p-5">
                <p className="text-gray-300 text-sm mb-4 flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 text-brand-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
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
                      className="flex items-center justify-center gap-1.5 bg-brand-secondary text-black py-2.5 rounded-lg text-xs font-bold hover:opacity-90 active:opacity-80 transition-opacity"
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


  const renderDeliveryView = () => (
    <motion.div key="delivery" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="container mx-auto px-4 py-8 pb-32">
      <Helmet><title>Delivery | {TENANT.brandName}</title></Helmet>
      <div className="text-center mb-8"><h2 className="text-3xl md:text-5xl font-black uppercase italic mb-2">Delivery <span className="text-brand-primary">Express</span></h2></div>
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {stores.map((store) => (
          <motion.a whileTap={{ scale: 0.98 }} key={store.id} href={store.delivery_link} target="_blank" className="flex items-center p-4 bg-brand-surface rounded-xl border border-white/5 hover:border-brand-primary transition group">
            <img src={store.image_url} className="w-14 h-14 rounded-full object-cover border-2 border-white/10 mr-4" />
            <div className="flex-grow">
              <h3 className="text-lg font-bold text-white group-hover:text-primary">{store.name}</h3>
              <p className="text-gray-400 text-xs">{store.address}</p>
            </div>
            <div className="bg-brand-secondary text-black p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></div>
          </motion.a>
        ))}
      </div>
    </motion.div>
  );

  const renderBrandWorldView = () => (
    <motion.div key="brandworld" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="container mx-auto px-4 py-8 pb-32">
      <Helmet><title>Mundo | {TENANT.brandName}</title></Helmet>
      <div className="text-center mb-8"><h2 className="text-3xl md:text-5xl font-black uppercase italic mb-2">Mundo <span className="text-brand-secondary">{TENANT.brandName}</span></h2></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {news.map((item) => (
          <motion.article whileHover={{ y: -5 }} key={item.id} className="bg-brand-surface rounded-xl overflow-hidden border border-brand/20 border-brand-primary/20 shadow-xl">
            <div className="h-40 relative"><img src={item.image_url} className="w-full h-full object-cover" /><div className="absolute top-3 right-3 bg-black/70 px-2 py-1 rounded text-[10px] font-bold border border-white/10">{new Date(item.date).toLocaleDateString()}</div></div>
            <div className="p-4">
              <h3 className="text-lg font-black text-white mb-2 leading-tight">{item.title}</h3>
              <p className="text-gray-400 text-xs line-clamp-3 mb-4">{item.content}</p>
              <button className="text-brand-secondary font-bold uppercase text-xs hover:underline">Leer más</button>
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
          <div className="cursor-pointer hover:opacity-80 transition flex items-center space-x-3" onClick={() => setCurrentView('menu')}>
            {TENANT.logo && <img src={TENANT.logo} alt={TENANT.brandName} className="h-16 object-contain" />}
            <span className="text-2xl font-black uppercase italic text-brand-primary">{TENANT.brandName}</span>
          </div>
          <nav className="flex space-x-6">
            <NavButtonPC active={currentView === 'menu'} onClick={() => setCurrentView('menu')} image="/icons/menu.png" label="Menú" />
            <NavButtonPC active={currentView === 'promos'} onClick={() => setCurrentView('promos')} image="/icons/promos.png" label="Promos" />
            <NavButtonPC active={currentView === 'videos'} onClick={() => setCurrentView('videos')} image="/icons/videos.png" label="Videos" />
            <NavButtonPC active={currentView === 'locations'} onClick={() => setCurrentView('locations')} image="/icons/locales.png" label="Locales" />
            <NavButtonPC active={currentView === 'delivery'} onClick={() => setCurrentView('delivery')} image="/icons/delivery.png" label="Delivery" />
            <NavButtonPC active={currentView === 'brandworld'} onClick={() => setCurrentView('brandworld')} image="/icons/club.png" label={TENANT.brandName} />
          </nav>
          <div className="flex items-center space-x-3">
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => user ? setCurrentView('club') : setIsAuthOpen(true)}
              className="flex items-center space-x-2 bg-brand-secondary/10 hover:bg-brand-secondary/20 border border-brand-secondary/20 text-brand-secondary px-3 py-2 rounded-xl text-sm font-bold transition"
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
                className="flex items-center space-x-1 bg-brand-secondary/10 hover:bg-brand-secondary/20 border border-brand-secondary/30 text-brand-secondary px-3 py-2 rounded-xl text-sm font-bold transition"
                title="Panel Admin"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span>Admin</span>
              </motion.button>
            )}

          <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center space-x-2 bg-brand-secondary hover:opacity-90 text-black px-4 py-2 rounded-xl font-bold text-sm transition"
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
        <div className="flex items-center space-x-2">
          {TENANT.logo && <img src={TENANT.logo} className="h-8 object-contain" alt={TENANT.brandName} />}
          <span className="text-xl font-black uppercase italic text-brand-secondary">{TENANT.brandName}</span>
        </div>
        <div className="flex items-center space-x-2">
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => user ? setCurrentView('club') : setIsAuthOpen(true)}
            className="relative p-2 rounded-xl bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary"
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
              className="relative p-2 rounded-xl bg-brand-secondary/20 border border-brand-secondary/40 text-brand-secondary"
              title="Panel Admin"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </motion.button>
          )}
          <motion.button whileTap={{ scale: 0.9 }}
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 rounded-xl bg-brand-secondary text-black"
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
              {currentView === 'menu' && renderMenuView()}
              {currentView === 'promos' && renderPromosView()}
              {currentView === 'videos' && renderVideosView()}
              {currentView === 'locations' && renderLocationsView()}
              {currentView === 'delivery' && renderDeliveryView()}
              {currentView === 'brandworld' && renderBrandWorldView()}
              {currentView === 'tracking' && activeOrderId && (
                <OrderTracking 
                  key="tracking" 
                  orderId={activeOrderId} 
                  earnedPoints={earnedPoints}
                  onBack={() => setCurrentView('menu')} 
                />
              )}
              {currentView === 'club' && (
                <LoyaltyClub key="club" onBack={() => setCurrentView('menu')} onOpenAuth={() => setIsAuthOpen(true)} />
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
          <BottomNavItem image="/icons/menu.png" label="Menú" active={currentView === 'menu'} onClick={() => setCurrentView('menu')} />
          <BottomNavItem image="/icons/promos.png" label="Promos" active={currentView === 'promos'} onClick={() => setCurrentView('promos')} />
          <div className="relative -top-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentView('brandworld')}
              className={`w-14 h-14 rounded-full overflow-hidden flex items-center justify-center shadow-lg border-4 border-black ${currentView === 'brandworld' ? 'bg-brand-secondary text-black ring-2 ring-brand-secondary' : 'bg-[#111] text-brand-secondary'}`}>
              <img src="/icons/club.png" alt="Club" className="w-full h-full object-cover" />
            </motion.button>
          </div>
          <BottomNavItem image="/icons/locales.png" label="Ir" active={currentView === 'locations'} onClick={() => setCurrentView('locations')} />
          {isInstalled ? (
            <BottomNavItem image="/icons/videos.png" label="Videos" active={currentView === 'videos'} onClick={() => setCurrentView('videos')} />
          ) : (
            <BottomNavItem image="/icons/delivery.png" label="Dely" active={currentView === 'delivery'} onClick={() => setCurrentView('delivery')} />
          )}
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
              className="bg-brand-surface w-full md:max-w-4xl h-[85vh] md:h-auto rounded-t-[30px] md:rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative border-t md:border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-20 bg-black/50 text-white p-2 rounded-full hover:bg-primary transition backdrop-blur-md">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              <div className="h-[35vh] md:h-auto md:w-1/2 relative flex-shrink-0">
                <img src={selectedProduct.image_url} className="w-full h-full object-cover" />
                <div className="md:hidden absolute inset-0 bg-gradient-to-t from-brand-surface to-transparent"></div>
              </div>
              <div className="flex-grow p-6 md:p-10 flex flex-col justify-between overflow-y-auto">
                <div>
                  <div className="text-brand-secondary font-bold text-xs uppercase tracking-widest mb-2">{selectedProduct.category}</div>
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
                  {(selectedProduct.stock != null && Number(selectedProduct.stock) === 0) ? (
                    <div className="w-full bg-red-900/50 text-red-300 py-4 md:py-3 rounded-xl font-bold uppercase tracking-wide flex justify-center items-center gap-2">
                      <span>Agotado</span>
                    </div>
                  ) : (
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAddToCart(selectedProduct)}
                      className="w-full bg-primary text-white py-4 md:py-3 rounded-xl font-bold uppercase tracking-wide shadow-lg flex justify-between md:justify-center px-6 hover:opacity-90 transition"
                    >
                      <span>Agregar al pedido</span>
                      <span className="md:hidden">${fmt(selectedProduct.price)}</span>
                    </motion.button>
                  )}
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

      {/* PWA INSTALL BANNER */}
      <InstallPWABanner 
        isInstallable={isInstallable} 
        handleInstallClick={handleInstallClick}
        brandName={TENANT.brandName}
      />

      {/* AUTH MODAL */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      {/* RESET PASSWORD MODAL — se activa con ?reset_token= en la URL */}
      {resetToken && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#1E1E1E] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#E30613] to-[#c0001a] px-6 pt-6 pb-8">
              <h2 className="text-2xl font-black text-white">Nueva contraseña</h2>
              <p className="text-white/70 text-sm mt-1">Ingresá y confirmá tu nueva contraseña.</p>
            </div>
            <div className="px-6 py-6">
              {!resetDone ? (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setResetMsg({ type: '', text: '' });
                    if (resetNewPwd !== resetNewPwd2) {
                      setResetMsg({ type: 'error', text: 'Las contraseñas no coinciden.' });
                      return;
                    }
                    if (resetNewPwd.length < 6) {
                      setResetMsg({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
                      return;
                    }
                    setResetSubmitting(true);
                    try {
                      await apiResetPassword(resetToken, resetNewPwd);
                      setResetMsg({ type: 'success', text: '\u2705 Contraseña actualizada correctamente. Ya podés iniciar sesión.' });
                      setResetDone(true);
                      // Limpiar token de la URL sin recargar la página
                      const url = new URL(window.location.href);
                      url.searchParams.delete('reset_token');
                      window.history.replaceState({}, '', url.toString());
                    } catch (err) {
                      setResetMsg({ type: 'error', text: err.message || 'Error al restablecer contraseña.' });
                    }
                    setResetSubmitting(false);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Nueva contraseña</label>
                    <input
                      type="password"
                      placeholder="Mín. 6 caracteres"
                      value={resetNewPwd}
                      onChange={e => setResetNewPwd(e.target.value)}
                      minLength={6}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Confirmá contraseña</label>
                    <input
                      type="password"
                      placeholder="Repetí la contraseña"
                      value={resetNewPwd2}
                      onChange={e => setResetNewPwd2(e.target.value)}
                      minLength={6}
                      required
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-red-500 transition"
                    />
                  </div>
                  {resetMsg.text && (
                    <div className={`rounded-xl px-4 py-3 text-sm ${
                      resetMsg.type === 'error'
                        ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                        : 'bg-green-500/10 border border-green-500/30 text-green-400'
                    }`}>
                      {resetMsg.text}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={resetSubmitting}
                    className="w-full py-3 font-black text-white rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 transition uppercase tracking-wider"
                  >
                    {resetSubmitting ? 'Guardando...' : 'Guardar nueva contraseña'}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm font-bold">
                    {resetMsg.text}
                  </div>
                  <button
                    onClick={() => { setResetToken(null); setIsAuthOpen(true); }}
                    className="w-full py-3 font-black text-white rounded-xl bg-red-600 hover:bg-red-700 transition uppercase tracking-wider"
                  >
                    Iniciar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PANEL */}
      {isAdminOpen && <AdminPanel onClose={() => setIsAdminOpen(false)} />}

      {/* MODAL COMPLETAR REGISTRO (Solo para Admins con datos faltantes) */}
      <CompleteRegistrationModal />

      {/* OVERLAY PAGO PENDIENTE */}
      {!showLanding && branding.status === 'pending_payment' && <PendingPaymentOverlay />}
    </div>
  );
}

// ── COMPONENTE: MODAL COMPLETAR REGISTRO ─────────────────────────────────────
const CompleteRegistrationModal = () => {
    const { user } = useAuth();
    const branding = useBranding();
    const [show, setShow] = useState(false);
    const [form, setForm] = useState({ address: '', whatsapp: '' });
    const [accepted, setAccepted] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showTerms, setShowTerms] = useState(false);

    useEffect(() => {
        // Solo mostrar si es admin/manager y faltan datos, y si ya cargó el branding
        if (branding.loaded && user && (user.role === 'admin' || user.role === 'manager')) {
            const hasMissingData = !TENANT.address || !TENANT.whatsapp;
            // No mostrar si la landing está activa (estamos en gastrored.com.ar)
            const host = window.location.hostname.toLowerCase();
            const gastroredDomain = import.meta.env.VITE_GASTRORED_DOMAIN || 'gastrored.com.ar';
            const isRoot = host === gastroredDomain || host === `www.${gastroredDomain}`;
            
            if (hasMissingData && !isRoot) {
                setForm({ 
                    address: TENANT.address || '', 
                    whatsapp: TENANT.whatsapp || '' 
                });
                setShow(true);
            }
        }
    }, [user, branding.loaded]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!accepted) return setError('Debes aceptar los términos y condiciones.');
        if (!form.address || !form.whatsapp) return setError('Todos los campos son obligatorios.');
        
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('gastrored_token');
            await updateTenantProfile(form, token);
            
            // Actualizar objeto global TENANT para que el cambio sea inmediato en la UI
            TENANT.address = form.address;
            TENANT.whatsapp = form.whatsapp;
            
            setShow(false);
        } catch (err) {
            setError(err.message || 'Error al guardar los datos.');
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            >
                <div className="bg-[#0d1117] border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                    
                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">¡Hola, {user?.name}! 👋</h3>
                    <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                        Para finalizar la configuración de <strong className="text-white">{TENANT.brandName}</strong> y activar todas las funciones, necesitamos completar estos datos de contacto:
                    </p>

                    <form onSubmit={handleSave} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Dirección del Comercio</label>
                            <input 
                                type="text" 
                                placeholder="Ej: Av. Corrientes 1234, CABA"
                                value={form.address}
                                onChange={e => setForm({...form, address: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 transition outline-none text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">WhatsApp de Contacto</label>
                            <input 
                                type="text" 
                                placeholder="Ej: 5491112345678"
                                value={form.whatsapp}
                                onChange={e => setForm({...form, whatsapp: e.target.value})}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 transition outline-none text-sm"
                            />
                            <p className="text-[10px] text-gray-600 mt-1 ml-1">Incluir código de país (ej: 54 para Argentina)</p>
                        </div>

                        <div className="flex items-start gap-3 pt-2">
                            <input 
                                type="checkbox" id="tc_complete" 
                                checked={accepted} onChange={e => setAccepted(e.target.checked)}
                                className="mt-1 w-4 h-4 rounded border-white/10 bg-white/5 text-red-600 focus:ring-red-500"
                            />
                            <label htmlFor="tc_complete" className="text-xs text-gray-400 leading-relaxed cursor-pointer select-none">
                                Acepto los <button type="button" onClick={() => setShowTerms(true)} className="text-red-500 font-bold hover:underline">Términos y Condiciones</button> de GastroRed para comercios.
                            </label>
                        </div>

                        {error && <p className="text-red-500 text-xs font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</p>}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-red-600 hover:bg-red-500 py-4 rounded-xl font-black text-white text-sm uppercase tracking-widest shadow-lg shadow-red-900/20 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Finalizar Registro →'}
                        </button>
                    </form>
                </div>

                {/* MODAL DE TÉRMINOS (Lite) */}
                {showTerms && (
                    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md" onClick={() => setShowTerms(false)}>
                        <div className="bg-[#0d1117] border border-white/10 rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-black text-white uppercase italic">Términos y Condiciones — Comercios</h3>
                                <button onClick={() => setShowTerms(false)} className="text-white/50 hover:text-white text-2xl">✕</button>
                            </div>
                            <div className="text-sm text-gray-300 space-y-4 leading-relaxed">
                                <p><strong>1. Responsabilidad:</strong> El comercio es responsable de la veracidad de la información y la calidad de los productos ofrecidos.</p>
                                <p><strong>2. Pagos:</strong> Al utilizar la plataforma, el comercio acepta las comisiones de los procesadores de pago externos (MercadoPago).</p>
                                <p><strong>3. Servicio:</strong> GastroRed provee la infraestructura tecnológica y se reserva el derecho de suspender cuentas que infrinjan las normas de uso o tengan deudas pendientes.</p>
                                <p><strong>4. Datos:</strong> La información capturada se utiliza exclusivamente para la operación del comercio y la fidelización de sus clientes.</p>
                            </div>
                            <button onClick={() => setShowTerms(false)} className="w-full mt-8 py-4 bg-red-600 text-white font-black rounded-xl uppercase tracking-widest hover:bg-red-500 transition">Entendido</button>
                        </div>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

// ── COMPONENTE: PAGO PENDIENTE BLOQUEANTE ────────────────────────────────────
const PendingPaymentOverlay = () => {
    const gastroredDomain = import.meta.env.VITE_GASTRORED_DOMAIN || 'gastrored.com.ar';
    // Limpiamos el número de whatsapp por si tiene espacios o caracteres especiales
    const whatsappClean = (TENANT.whatsapp || '').replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${whatsappClean || '5491122334455'}`;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[1000] bg-[#080c12]/95 backdrop-blur-md flex items-center justify-center p-4 overflow-hidden"
        >
            {/* Fondo decorativo con luces suaves */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none text-red-500">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-600/10 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="relative bg-[#0d1117] border border-white/10 rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl"
            >
                <div className="mb-6 flex justify-center">
                    <div className="w-20 h-20 bg-red-600/10 rounded-3xl flex items-center justify-center border border-red-500/20 shadow-xl shadow-red-900/10">
                        <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                </div>

                <h2 className="text-3xl font-black text-white mb-4 uppercase italic tracking-tight">Comercio Desactivado</h2>
                <p className="text-gray-400 mb-8 leading-relaxed">
                    Tu tienda <strong className="text-white">{TENANT.brandName}</strong> se encuentra temporalmente desactivada hasta que se confirme el pago de la suscripción.
                </p>

                <div className="space-y-4">
                    <a
                        href={`https://${gastroredDomain}/#planes`}
                        className="flex items-center justify-center gap-2 w-full py-4 text-sm font-black text-white bg-red-600 hover:bg-red-500 rounded-2xl transition shadow-lg shadow-red-900/30 group uppercase"
                    >
                        CONTINUAR EL PAGO
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </a>

                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-4 text-sm font-bold text-white bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl transition uppercase"
                    >
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.588-5.946 0-6.556 5.332-11.888 11.888-11.888 3.176 0 6.161 1.237 8.404 3.48s3.481 5.229 3.481 8.404c0 6.556-5.332 11.888-11.888 11.888-2.01 0-3.988-.511-5.741-1.48L0 24zm6.202-3.693c1.614.957 3.514 1.464 5.435 1.465 5.86 0 10.626-4.767 10.627-10.627 0-2.839-1.105-5.508-3.111-7.513s-4.674-3.112-7.514-3.112c-5.86 0-10.626 4.766-10.627 10.627 0 1.884.494 3.725 1.43 5.352l-1.011 3.69 3.774-.982zm11.23-7.545c-.328-.164-1.936-.955-2.235-1.064-.298-.109-.516-.164-.733.164-.218.328-.843 1.064-1.033 1.282-.19.218-.379.246-.707.082-.328-.164-1.385-.511-2.639-1.63-1.025-.914-1.718-2.043-1.919-2.37-.2-.328-.021-.506.143-.669.148-.146.328-.382.492-.573.164-.19.218-.328.328-.546.109-.218.055-.409-.027-.573-.082-.164-.733-1.771-1.004-2.426-.264-.638-.53-.551-.733-.561-.188-.01-.403-.011-.62-.011-.218 0-.573.082-.871.409-.298.328-1.14 1.117-1.14 2.73 0 1.613 1.17 3.168 1.332 3.386.164.218 2.296 3.504 5.56 4.912.777.335 1.384.535 1.857.685.782.247 1.493.212 2.056.128.627-.094 1.936-.791 2.208-1.554.272-.763.272-1.418.19-1.554-.082-.136-.298-.218-.627-.382z" />
                        </svg>
                        SOPORTE POR WHATSAPP
                    </a>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-center gap-2">
                    <span className="text-[10px] text-gray-600 uppercase tracking-[0.2em] font-black">GastroRed Cloud Services</span>
                </div>
            </motion.div>
        </motion.div>
    );
};

const SkeletonCard = () => (
  <div className="bg-brand-surface rounded-xl overflow-hidden border border-white/5 h-28 md:h-auto flex md:block animate-pulse">
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
    <div className={`w-10 h-10 rounded-full overflow-hidden border-2 mb-1 transition-all ${active ? 'border-brand-secondary scale-110 shadow-lg' : 'border-transparent opacity-80'}`}>
      <img src={image} alt={label} className="w-full h-full object-cover" />
    </div>
    <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-brand-secondary' : 'text-gray-500'}`}>{label}</span>
  </button>
);

const BottomNavItem = ({ icon, image, label, active, onClick, count }) => {
  const getIcon = () => {
    if (icon === 'home') return <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />;
    if (icon === 'gift') return <path d="M20 12V8H4v4m16 0v8H4v-8m16 0H4m12-4V4H8v4m8 0H8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />;
    if (icon === 'cart') return <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />;
    if (icon === 'map') return <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />;
    if (icon === 'bike') return <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />;
    if (icon === 'film') return <><rect x="2" y="6" width="20" height="12" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><line x1="2" y1="12" x2="22" y2="12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /><line x1="12" y1="6" x2="12" y2="18" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" /></>;
    return null;
  };

  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center w-12 group relative">
      <motion.div
        animate={active ? { y: -5, opacity: 1 } : { y: 0, opacity: 0.6 }}
        className="transition-all duration-300"
      >
        {image ? (
          <div className={`w-7 h-7 rounded-full overflow-hidden border transition-all ${active ? 'border-brand-secondary ring-2 ring-brand-secondary/20 shadow-lg scale-110' : 'border-transparent'}`}>
            <img src={image} alt={label} className="w-full h-full object-cover" />
          </div>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">{getIcon()}</svg>
        )}
        {count > 0 && (
          <span className="absolute -top-1 -right-1 bg-brand-secondary text-black text-[8px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center">
            {count}
          </span>
        )}
      </motion.div>
      <span className={`text-[9px] font-bold uppercase mt-1 ${active ? 'text-white' : 'text-gray-600'}`}>{label}</span>
      {active && <motion.div layoutId="activeDot" className="absolute -bottom-1 w-1 h-1 bg-brand-secondary rounded-full" />}
    </button>
  );
};

export default App;
