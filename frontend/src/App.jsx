import { useEffect, useState } from 'react';
import { getMenu, getInfluencers, getVideos, getStores, getNews } from './services/api';
import { Helmet } from 'react-helmet-async';

function App() {
  // --- ESTADOS ---
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

  useEffect(() => {
    loadAllData();
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [menuData, squadData, videoData, storesData, newsData] = await Promise.all([
        getMenu(), getInfluencers(), getVideos(), getStores(), getNews()
      ]);
      if (menuData) {
        setProducts(menuData || []); setInfluencers(squadData || []); setVideos(videoData || []); setStores(storesData || []); setNews(newsData || []);
        setError(null);
      } else { setError("Error de conexión con Voraz Server."); }
    } catch (err) { setError("Error crítico."); } finally { setLoading(false); }
  };

  const getBadgeColor = (badge) => {
    switch(badge?.toUpperCase()) {
      case 'NUEVO': return 'bg-green-500 text-white';
      case 'PICANTE': return 'bg-red-600 text-white';
      case 'BEST SELLER': return 'bg-voraz-yellow text-voraz-black';
      default: return 'bg-blue-600 text-white';
    }
  };

  // --- VISTAS ---

  const MenuView = () => {
    const categories = ['Todas', ...new Set(products.map(p => p.category))];
    const filteredProducts = activeCategory === 'Todas' ? products : products.filter(p => p.category === activeCategory);
    const featuredProducts = products.filter(p => p.badge).slice(0, 5);
    
    const groupByCategory = (items) => items.reduce((acc, item) => { (acc[item.category] = acc[item.category] || []).push(item); return acc; }, {});
    const menuDisplay = groupByCategory(filteredProducts);

    return (
      <div className="animate-fade-in pt-2 pb-28 md:pb-10">
        <Helmet><title>Menú | Voraz</title></Helmet>

        {/* DESTACADOS (Solo visible en Móvil) */}
        <div className="md:hidden mb-6 pl-4">
          <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Destacados</h3>
          <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2 pr-4">
            {featuredProducts.map(product => (
              <div key={`feat-${product.id}`} onClick={() => setSelectedProduct(product)} className="flex-shrink-0 w-60 h-36 rounded-xl relative overflow-hidden shadow-lg border border-white/5 active:scale-95 transition-transform">
                <img src={product.image_url} className="w-full h-full object-cover brightness-75" />
                <div className="absolute bottom-0 left-0 p-3 w-full bg-gradient-to-t from-black to-transparent">
                  <div className="text-white font-bold leading-none mb-1 text-sm">{product.name}</div>
                  <div className="text-voraz-yellow text-xs font-bold">${parseInt(product.price).toLocaleString('es-AR')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FILTROS (Sticky - SIN HUECOS) */}
        {/* Usamos top-14 (56px) que es la altura exacta del Header Movil */}
        {/* Usamos md:top-24 (96px) que es la altura exacta del Header PC */}
        {/* Background #121212 sólido para evitar transparencias fantasma */}
        <nav className="sticky top-14 md:top-24 z-30 py-3 mb-6 bg-[#121212] border-b border-white/10 shadow-2xl">
          <div className="container mx-auto px-4 overflow-x-auto no-scrollbar">
            <div className="flex space-x-2 md:justify-center">
              {categories.map((cat) => (
                <button key={cat} onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full font-bold text-xs md:text-sm uppercase tracking-wide transition-all whitespace-nowrap
                    ${activeCategory === cat ? 'bg-voraz-red text-white shadow-lg' : 'bg-voraz-gray text-gray-400 hover:text-white border border-white/5'}`}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </nav>

        {/* GRILLA PRODUCTOS */}
        <div className="container mx-auto px-4">
          {Object.keys(menuDisplay).length > 0 ? Object.keys(menuDisplay).map((category) => (
            <section key={category} className="mb-10">
              <div className="flex items-center space-x-3 mb-4">
                <h3 className="text-xl md:text-2xl font-black uppercase text-white italic border-l-4 border-voraz-red pl-3">{category}</h3>
                <div className="h-px bg-white/10 flex-grow"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {menuDisplay[category].map((product) => (
                  <article key={product.id} onClick={() => setSelectedProduct(product)}
                    className="bg-voraz-gray rounded-xl overflow-hidden hover:-translate-y-1 transition-all shadow-xl group cursor-pointer relative flex md:block h-28 md:h-auto border border-white/5 active:bg-white/5">
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
                        <div className="text-voraz-yellow font-black text-sm md:text-base">${parseInt(product.price).toLocaleString('es-AR')}</div>
                        <button className="hidden md:block bg-white/10 hover:bg-voraz-red text-white py-1 px-3 rounded text-xs uppercase font-bold transition">Ver</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )) : <div className="text-center py-20 text-gray-500">Sin productos.</div>}
        </div>
      </div>
    );
  };

  const CommunityView = () => (
    <div className="container mx-auto px-4 py-8 pb-32 animate-fade-in">
      <Helmet><title>Squad | Voraz</title></Helmet>
      <div className="text-center mb-8"><h2 className="text-3xl md:text-5xl font-black uppercase italic mb-2">Voraz <span className="text-voraz-yellow">Squad</span></h2></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {influencers.map((inf) => (
          <div key={inf.id} className="relative rounded-2xl overflow-hidden aspect-square group shadow-lg">
            <img src={inf.image_url} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
            <div className="absolute bottom-3 left-3">
              <p className="text-white font-bold text-sm">{inf.name}</p>
              <p className="text-voraz-yellow text-[10px] font-bold">{inf.social_handle}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const VideosView = () => (
    <div className="container mx-auto px-4 py-8 pb-32 animate-fade-in">
      <Helmet><title>Live | Voraz</title></Helmet>
      <div className="text-center mb-8"><h2 className="text-3xl md:text-5xl font-black uppercase italic mb-2">Voraz <span className="text-voraz-red">Live</span></h2></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {videos.map((vid) => (
          <div key={vid.id} className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl relative group cursor-pointer border border-white/5">
            <img src={vid.thumbnail_url} className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 flex items-center justify-center"><div className="w-14 h-14 bg-voraz-red/90 rounded-full flex items-center justify-center shadow-lg"><svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></div></div>
            <div className="absolute bottom-0 left-0 p-4 w-full bg-gradient-to-t from-black to-transparent"><h3 className="text-lg font-bold text-white">{vid.title}</h3></div>
          </div>
        ))}
      </div>
    </div>
  );

  const LocationsView = () => (
    <div className="container mx-auto px-4 py-8 pb-32 animate-fade-in">
      <Helmet><title>Spots | Voraz</title></Helmet>
      <div className="text-center mb-8"><h2 className="text-3xl md:text-5xl font-black uppercase italic mb-2">Nuestros <span className="text-white">Spots</span></h2></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stores.map((store) => (
          <div key={store.id} className="bg-voraz-gray rounded-2xl overflow-hidden shadow-xl border border-white/5">
            <div className="h-40 relative"><img src={store.image_url} className="w-full h-full object-cover" /><div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black to-transparent"><h3 className="text-xl font-bold text-white">{store.name}</h3></div></div>
            <div className="p-5">
              <p className="text-gray-300 text-sm mb-4 flex items-center"><svg className="w-4 h-4 mr-2 text-voraz-red" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>{store.address}</p>
              <div className="grid grid-cols-2 gap-3">
                <a href={store.waze_link} target="_blank" className="flex justify-center bg-white/5 text-white py-2 rounded-lg text-xs font-bold border border-white/10">Cómo llegar</a>
                <a href={store.delivery_link} target="_blank" className="flex justify-center bg-voraz-red text-white py-2 rounded-lg text-xs font-bold">Delivery</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const DeliveryView = () => (
    <div className="container mx-auto px-4 py-8 pb-32 animate-fade-in">
      <Helmet><title>Delivery | Voraz</title></Helmet>
      <div className="text-center mb-8"><h2 className="text-3xl md:text-5xl font-black uppercase italic mb-2">Delivery <span className="text-voraz-red">Express</span></h2></div>
      <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4">
        {stores.map((store) => (
          <a key={store.id} href={store.delivery_link} target="_blank" className="flex items-center p-4 bg-voraz-gray rounded-xl border border-white/5 hover:border-voraz-red transition group active:scale-[0.98]">
            <img src={store.image_url} className="w-14 h-14 rounded-full object-cover border-2 border-white/10 mr-4" />
            <div className="flex-grow">
              <h3 className="text-lg font-bold text-white group-hover:text-voraz-red">{store.name}</h3>
              <p className="text-gray-400 text-xs">{store.address}</p>
            </div>
            <div className="bg-voraz-red text-white p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></div>
          </a>
        ))}
      </div>
    </div>
  );

  const VorazBurgerView = () => (
    <div className="container mx-auto px-4 py-8 pb-32 animate-fade-in">
      <Helmet><title>Mundo | Voraz</title></Helmet>
      <div className="text-center mb-8"><h2 className="text-3xl md:text-5xl font-black uppercase italic mb-2">Mundo <span className="text-voraz-yellow">Voraz</span></h2></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {news.map((item) => (
          <article key={item.id} className="bg-voraz-gray rounded-xl overflow-hidden border border-white/5 shadow-xl">
            <div className="h-40 relative"><img src={item.image_url} className="w-full h-full object-cover" /><div className="absolute top-3 right-3 bg-black/70 px-2 py-1 rounded text-[10px] font-bold border border-white/10">{new Date(item.date).toLocaleDateString()}</div></div>
            <div className="p-4">
              <h3 className="text-lg font-black text-white mb-2 leading-tight">{item.title}</h3>
              <p className="text-gray-400 text-xs line-clamp-3 mb-4">{item.content}</p>
              <button className="text-voraz-red font-bold uppercase text-xs hover:underline">Leer más</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-voraz-black text-voraz-white font-sans selection:bg-voraz-red selection:text-white">
      
      {/* === 1. HEADER PC (Altura fija h-24 = 96px) === */}
      <header className={`hidden md:block sticky top-0 z-50 h-24 transition-all duration-300 ${isScrolled ? 'bg-[#121212] border-b border-white/10 shadow-xl' : 'bg-[#121212] py-4'}`}>
        <div className="container mx-auto px-4 h-full flex items-center justify-between">
          <div className="cursor-pointer hover:opacity-80 transition" onClick={() => setCurrentView('menu')}>
            <img src="/images/logo_voraz.jpg" alt="VORAZ" className="h-16 object-contain" />
          </div>
          <nav className="flex space-x-6">
            <NavButtonPC active={currentView === 'menu'} onClick={() => setCurrentView('menu')} image="/images/menu.jpg" label="Menú" />
            <NavButtonPC active={currentView === 'community'} onClick={() => setCurrentView('community')} image="/images/comunidad.jpg" label="Squad" />
            <NavButtonPC active={currentView === 'videos'} onClick={() => setCurrentView('videos')} image="/images/eventos.jpg" label="Videos" />
            <NavButtonPC active={currentView === 'locations'} onClick={() => setCurrentView('locations')} image="/images/locales.jpg" label="Locales" />
            <NavButtonPC active={currentView === 'delivery'} onClick={() => setCurrentView('delivery')} image="/images/delivery.jpg" label="Delivery" />
            <NavButtonPC active={currentView === 'vorazburger'} onClick={() => setCurrentView('vorazburger')} image="/images/vorazburger.jpg" label="Voraz" />
          </nav>
        </div>
      </header>

      {/* === 2. HEADER MÓVIL (Altura fija h-14 = 56px) === */}
      <header className="md:hidden sticky top-0 z-50 bg-[#121212] border-b border-white/10 h-14 flex items-center justify-center shadow-xl">
        <img src="/images/logo_voraz.jpg" className="h-8 object-contain" alt="Voraz" />
      </header>

      {/* === 3. CONTENIDO PRINCIPAL === */}
      <main className="min-h-screen">
        {loading && <div className="flex h-[50vh] items-center justify-center"><div className="w-10 h-10 border-4 border-voraz-red border-t-transparent rounded-full animate-spin"></div></div>}
        
        {!loading && !error && (
          <>
            {currentView === 'menu' && <MenuView />}
            {currentView === 'community' && <CommunityView />}
            {currentView === 'videos' && <VideosView />}
            {currentView === 'locations' && <LocationsView />}
            {currentView === 'delivery' && <DeliveryView />} 
            {currentView === 'vorazburger' && <VorazBurgerView />} 
          </>
        )}
      </main>

      {/* === 4. BOTTOM NAV (Mobile Only) === */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-[#121212] border-t border-white/10 z-50 px-6 pb-4 pt-2 safe-area-pb">
        <div className="flex justify-between items-end">
          <BottomNavItem icon="home" label="Menú" active={currentView === 'menu'} onClick={() => setCurrentView('menu')} />
          <BottomNavItem icon="users" label="Squad" active={currentView === 'community'} onClick={() => setCurrentView('community')} />
          <div className="relative -top-6">
             <button onClick={() => setCurrentView('vorazburger')}
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-90 border-4 border-voraz-black ${currentView === 'vorazburger' ? 'bg-voraz-yellow text-black' : 'bg-voraz-red text-white'}`}>
                <span className="font-black text-xs">V</span>
             </button>
          </div>
          <BottomNavItem icon="map" label="Spots" active={currentView === 'locations'} onClick={() => setCurrentView('locations')} />
          <BottomNavItem icon="bike" label="Dely" active={currentView === 'delivery'} onClick={() => setCurrentView('delivery')} />
        </div>
      </nav>

      {/* === 5. MODAL === */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedProduct(null)}>
          <div className="bg-voraz-gray w-full md:max-w-4xl h-[85vh] md:h-auto rounded-t-[30px] md:rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row relative animate-slide-up md:animate-none border-t md:border border-white/10" onClick={e => e.stopPropagation()}>
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
                  <div className="text-2xl font-black text-white">${parseInt(selectedProduct.price).toLocaleString('es-AR')}</div>
                </div>
                <button className="w-full bg-voraz-red text-white py-4 md:py-3 rounded-xl font-bold uppercase tracking-wide shadow-lg flex justify-between md:justify-center px-6">
                  <span>Agregar</span>
                  <span className="md:hidden">${parseInt(selectedProduct.price).toLocaleString('es-AR')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
    <button onClick={onClick} className="flex flex-col items-center justify-center w-12 group">
      <div className={`transition-all duration-200 ${active ? 'text-voraz-yellow -translate-y-1' : 'text-gray-500'}`}>
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">{getIcon()}</svg>
      </div>
      <span className={`text-[9px] font-bold uppercase mt-1 ${active ? 'text-white' : 'text-gray-600'}`}>{label}</span>
    </button>
  );
};

export default App;