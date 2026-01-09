
import React, { useState, useEffect } from 'react';
import { Category, MenuItem, CartItem, AppConfig, ItemVariant } from './types';
import { MENU_ITEMS as DEFAULT_MENU } from './data';
import { MenuItemCard } from './components/MenuItemCard';
import { Cart } from './components/Cart';
import { ProductDetailModal } from './components/ProductDetailModal';
import { getRecommendation } from './services/geminiService';
import { supabase } from './services/supabaseClient';
import { POSManager } from './components/POS/POSManager';

const App: React.FC = () => {
  const [view, setView] = useState<'customer' | 'pos'>('customer');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Customer State
  const [showMenu, setShowMenu] = useState(false);
  const [showModalitySelector, setShowModalitySelector] = useState(false);
  const [orderModality, setOrderModality] = useState<'delivery' | 'pickup' | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // AI State
  const [displayedAiText, setDisplayedAiText] = useState<string>("");
  const [userInput, setUserInput] = useState("");
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);

  useEffect(() => {
    // Ruteo simple basado en query params
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'pos') {
      setView('pos');
    }
    loadData();
    window.addEventListener('scroll', () => setScrolled(window.scrollY > 30));
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: menuData } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false });
      const { data: configData } = await supabase.from('app_config').select('*').eq('id', 1).single();
      const { data: catData } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
      
      if (catData) setCategories(catData);

      const mappedMenu = (menuData || []).map((item: any) => ({
        ...item,
        isPopular: item.is_popular,
        isCombo: item.is_combo,
        comboItems: item.combo_items || [],
        variants: item.variants || []
      }));

      const newConfig: AppConfig = {
        menu: (mappedMenu.length > 0) ? mappedMenu : DEFAULT_MENU,
        images: configData?.images || {
          logo: "https://i.ibb.co/3mN9fL8/logo-churre.png",
          menuLogo: "https://i.ibb.co/3mN9fL8/logo-churre.png",
          selectorLogo: "https://i.ibb.co/3mN9fL8/logo-churre.png",
          aiAvatar: "https://i.ibb.co/3mN9fL8/logo-churre.png",
          slideBackgrounds: ["https://i.ibb.co/6P2T8F7/puesto-churre.jpg"],
          menuBackground: ""
        },
        whatsappNumber: configData?.whatsapp_number || "51936494711",
        socialMedia: configData?.social_media || { facebook: "", instagram: "", tiktok: "" },
        paymentQr: configData?.payment_qr || "",
        paymentName: configData?.payment_name || "Churre Malcriado"
      };
      setConfig(newConfig);
    } catch (e) {
      console.error("Init Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'customer' && !showMenu && !showModalitySelector && config?.images.slideBackgrounds) {
      const timer = setInterval(() => setCurrentSlide(s => (s + 1) % config.images.slideBackgrounds.length), 4000);
      return () => clearInterval(timer);
    }
  }, [view, showMenu, showModalitySelector, config]);

  const addToCart = (item: MenuItem, selectedVariant?: ItemVariant) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id && i.selectedVariant?.id === selectedVariant?.id);
      if (existing) {
        return prev.map(i => (i.id === item.id && i.selectedVariant?.id === selectedVariant?.id) ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, selectedVariant }];
    });
  };

  const handleAskAi = async () => {
    if (!userInput.trim() || isAskingAi || !config) return;
    setIsAskingAi(true);
    setDisplayedAiText("...");
    try {
      const resp = await getRecommendation(userInput, config.menu);
      setRecommendedIds(resp.suggestedItemIds);
      setDisplayedAiText(resp.recommendationText);
    } catch (e) {
      setDisplayedAiText("¡Sobrino, algo pasó con la IA!");
    } finally {
      setIsAskingAi(false);
      setUserInput("");
    }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#e91e63]">
      <div className="loader mb-4"></div>
      <p className="text-white font-black text-[10px] uppercase tracking-widest animate-pulse">Cargando Sazón...</p>
    </div>
  );

  if (view === 'pos') {
    return <POSManager menu={config!.menu} categories={categories} config={config!} />;
  }

  return (
    <div className="min-h-screen bg-white">
      {!showMenu && !showModalitySelector ? (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#e91e63] relative overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center opacity-40 scale-110 blur-sm" style={{ backgroundImage: `url("${config!.images.slideBackgrounds[currentSlide % config!.images.slideBackgrounds.length]}")` }}></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/90"></div>
          <div className="relative z-10 text-center px-8">
            <img src={config!.images.logo} className="w-40 mb-10 mx-auto animate-float" />
            <h1 className="text-white text-7xl md:text-9xl font-black brand-font mb-8 leading-none tracking-tighter">EL CHURRE<br/><span className="text-[#fdd835]">MALCRIADO</span></h1>
            <button onClick={() => setShowModalitySelector(true)} className="bg-[#e91e63] text-white px-14 py-6 rounded-full font-black text-xl shadow-2xl border-2 border-white/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-[0.2em]">Ver La Carta</button>
          </div>
        </div>
      ) : showModalitySelector && !showMenu ? (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-[#e91e63] text-center">
          <img src={config!.images.logo} className="w-32 mb-12" />
          <h2 className="text-white text-5xl font-black brand-font mb-14 leading-tight">¿Cómo pides hoy,<br/><span className="text-[#fdd835]">sobrino?</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-2xl">
            <button onClick={() => { setOrderModality('delivery'); setShowMenu(true); }} className="bg-white p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center gap-4 hover:scale-105 transition-all">
              <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center text-[#e91e63] text-3xl"><i className="fa-solid fa-motorcycle"></i></div>
              <h3 className="font-black text-2xl text-gray-800 brand-font">Delivery</h3>
            </button>
            <button onClick={() => { setOrderModality('pickup'); setShowMenu(true); }} className="bg-white p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center gap-4 hover:scale-105 transition-all">
              <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center text-[#e91e63] text-3xl"><i className="fa-solid fa-shop"></i></div>
              <h3 className="font-black text-2xl text-gray-800 brand-font">Recojo</h3>
            </button>
          </div>
        </div>
      ) : (
        <>
          <header className={`sticky top-0 z-[100] px-6 transition-all duration-500 flex items-center justify-between ${scrolled ? 'py-4 bg-white/80 backdrop-blur-xl shadow-lg' : 'py-8 bg-transparent'}`}>
            <img src={config!.images.menuLogo} className={`transition-all ${scrolled ? 'w-12' : 'w-20'}`} />
            <button onClick={() => setIsCartOpen(true)} className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center text-[#e91e63] relative ring-1 ring-gray-100">
              <i className="fa-solid fa-basket-shopping text-xl"></i>
              {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-[#e91e63] text-white text-[10px] w-6 h-6 rounded-full flex items-center justify-center border-4 border-white font-black">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}
            </button>
          </header>

          <section className="max-w-4xl mx-auto px-6 mt-12 mb-16">
            <div className="bg-gradient-to-br from-[#e91e63] to-[#880e4f] rounded-[3.5rem] p-10 text-white shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <img src={config!.images.aiAvatar} className="w-14 h-14 bg-white/20 rounded-2xl" />
                <h3 className="text-2xl font-black brand-font italic">¡Habla churre! ¿Qué antoja?</h3>
              </div>
              <div className="relative">
                <input type="text" placeholder="¿Qué me recomiendas para el almuerzo?" className="w-full bg-white/10 border-2 border-white/20 rounded-full px-8 py-5 text-white outline-none focus:border-[#fdd835]" value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAskAi()} />
                <button onClick={handleAskAi} className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#fdd835] text-[#e91e63] w-12 h-12 rounded-full shadow-lg"><i className={`fa-solid ${isAskingAi ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i></button>
              </div>
              {displayedAiText && <div className="mt-6 p-6 bg-black/20 rounded-3xl text-sm font-bold brand-font animate-fade-in-up">{displayedAiText}</div>}
            </div>
          </section>

          <main className="max-w-6xl mx-auto px-6 pb-20">
             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-10 sticky top-[90px] z-40 bg-white/50 backdrop-blur-sm pt-2">
                <button onClick={() => { setActiveCategory('Todos'); setRecommendedIds([]); }} className={`px-8 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === 'Todos' && recommendedIds.length === 0 ? 'bg-[#e91e63] text-white' : 'bg-gray-100 text-gray-400'}`}>Todos</button>
                {categories.map(c => <button key={c.id} onClick={() => { setActiveCategory(c.name); setRecommendedIds([]); }} className={`px-8 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${activeCategory === c.name && recommendedIds.length === 0 ? 'bg-[#e91e63] text-white' : 'bg-gray-100 text-gray-400'}`}>{c.name}</button>)}
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {(recommendedIds.length > 0 ? config!.menu.filter(i => recommendedIds.includes(i.id)) : activeCategory === 'Todos' ? config!.menu : config!.menu.filter(i => i.category === activeCategory)).map(item => (
                  <MenuItemCard key={item.id} item={item} onAddToCart={() => addToCart(item)} onShowDetails={() => setSelectedItem(item)} />
                ))}
             </div>
          </main>
        </>
      )}

      {selectedItem && <ProductDetailModal item={selectedItem} onClose={() => setSelectedItem(null)} onAddToCart={addToCart} />}
      <Cart items={cart} onRemove={(id, vid) => setCart(prev => prev.filter(i => !(i.id === id && i.selectedVariant?.id === vid)))} onUpdateQuantity={(id, d, vid) => setCart(prev => prev.map(i => (i.id === id && i.selectedVariant?.id === vid) ? {...i, quantity: Math.max(1, i.quantity + d)} : i))} onClearCart={() => setCart([])} isOpen={isCartOpen} onToggle={() => setIsCartOpen(!isCartOpen)} initialModality={orderModality || 'pickup'} whatsappNumber={config!.whatsappNumber} paymentQr={config!.paymentQr} paymentName={config!.paymentName} />
    </div>
  );
};

export default App;
