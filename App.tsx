
import React, { useState, useEffect } from 'react';
import { Category, MenuItem, CartItem, AppConfig, ItemVariant } from './types';
import { MENU_ITEMS as DEFAULT_MENU } from './data';
import { MenuItemCard } from './components/MenuItemCard';
import { Cart } from './components/Cart';
import { ProductDetailModal } from './components/ProductDetailModal';
import { getRecommendation } from './services/geminiService';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [clickCount, setClickCount] = useState(0);
  const [activeAdminTab, setActiveAdminTab] = useState<'products' | 'categories' | 'design' | 'slides'>('products');

  const [showMenu, setShowMenu] = useState(false);
  const [showModalitySelector, setShowModalitySelector] = useState(false);
  const [orderModality, setOrderModality] = useState<'delivery' | 'pickup' | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  
  const [displayedAiText, setDisplayedAiText] = useState<string>("");
  const [userInput, setUserInput] = useState("");
  const [isAskingAi, setIsAskingAi] = useState(false);
  const [recommendedIds, setRecommendedIds] = useState<string[]>([]);
  
  const [cartAnimate, setCartAnimate] = useState(false);
  
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [editingConfig, setEditingConfig] = useState<AppConfig | null>(null);
  const [newSlideUrl, setNewSlideUrl] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  // Variant helper states
  const [newVarName, setNewVarName] = useState("");
  const [newVarPrice, setNewVarPrice] = useState<number>(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: menuData } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false });
      const { data: configData } = await supabase.from('app_config').select('*').eq('id', 1).single();
      const { data: catData } = await supabase.from('categories').select('*').order('name', { ascending: true });

      if (catData) setCategories(catData);

      const mappedMenu = (menuData || []).map((item: any) => ({
        ...item,
        isPopular: item.is_popular,
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
        socialMedia: configData?.social_media || { facebook: "", instagram: "", tiktok: "" }
      };
      setConfig(newConfig);
      setEditingConfig(JSON.parse(JSON.stringify(newConfig)));
    } catch (e) {
      console.error("Init Error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!showMenu && !showModalitySelector && !isAdminOpen && config?.images.slideBackgrounds) {
      const bgCount = config.images.slideBackgrounds.length;
      if (bgCount <= 1) return;
      const timer = setInterval(() => setCurrentSlide(s => (s + 1) % bgCount), 4000);
      return () => clearInterval(timer);
    }
  }, [showMenu, showModalitySelector, isAdminOpen, config]);

  const handleLogoClick = () => {
    setClickCount(prev => {
      const next = prev + 1;
      if (next === 3) { setShowPasswordModal(true); return 0; }
      return next;
    });
    setTimeout(() => setClickCount(0), 1500);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "admin123") { setIsAdminOpen(true); setShowPasswordModal(false); }
    else { alert("Clave incorrecta, sobrino."); }
    setPasswordInput("");
  };

  const saveProduct = async () => {
    if (!editingProduct) return;
    try {
      const payload = {
        id: editingProduct.id,
        name: editingProduct.name,
        description: editingProduct.description,
        price: editingProduct.price,
        category: editingProduct.category,
        image: editingProduct.image,
        is_popular: editingProduct.isPopular || false,
        tags: editingProduct.tags || [],
        variants: editingProduct.variants || []
      };
      const { error } = await supabase.from('menu_items').upsert(payload);
      if (!error) { await loadData(); setEditingProduct(null); alert("¡Plato actualizado!"); }
    } catch (err: any) { alert(`Error: ${err.message}`); }
  };

  const handleAddVariant = () => {
    if (!newVarName.trim() || !editingProduct) return;
    const variant: ItemVariant = {
      id: Date.now().toString(),
      name: newVarName.trim(),
      price: newVarPrice
    };
    setEditingProduct({
      ...editingProduct,
      variants: [...(editingProduct.variants || []), variant]
    });
    setNewVarName("");
    setNewVarPrice(0);
  };

  const handleRemoveVariant = (id: string) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      variants: (editingProduct.variants || []).filter(v => v.id !== id)
    });
  };

  const saveAllConfig = async () => {
    if (!editingConfig) return;
    try {
      const { error } = await supabase.from('app_config').upsert({
        id: 1, 
        images: editingConfig.images,
        whatsapp_number: editingConfig.whatsappNumber,
        social_media: editingConfig.socialMedia
      });
      if (!error) { setConfig(editingConfig); alert("¡Configuración Guardada!"); }
    } catch (err: any) { alert(`Error: ${err.message}`); }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const { error } = await supabase.from('categories').insert({ name: newCategoryName.trim() });
    if (!error) { setNewCategoryName(""); await loadData(); }
  };

  const handleDeleteCategory = async (id: number | string) => {
    if (confirm("¿Seguro que quieres borrar esta categoría? Los platos podrían quedar huérfanos.")) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (!error) await loadData();
    }
  };

  const handleAddSlide = () => {
    if (!newSlideUrl.trim() || !editingConfig) return;
    const updatedSlides = [...editingConfig.images.slideBackgrounds, newSlideUrl.trim()];
    setEditingConfig({ ...editingConfig, images: { ...editingConfig.images, slideBackgrounds: updatedSlides } });
    setNewSlideUrl("");
  };

  const handleRemoveSlide = (index: number) => {
    if (!editingConfig) return;
    const updatedSlides = editingConfig.images.slideBackgrounds.filter((_, i) => i !== index);
    setEditingConfig({ ...editingConfig, images: { ...editingConfig.images, slideBackgrounds: updatedSlides } });
  };

  const addToCart = (item: MenuItem, selectedVariant?: ItemVariant) => {
    setCart(prev => {
      const existing = prev.find(i => 
        i.id === item.id && 
        i.selectedVariant?.id === selectedVariant?.id
      );
      if (existing) {
        return prev.map(i => 
          (i.id === item.id && i.selectedVariant?.id === selectedVariant?.id) 
            ? { ...i, quantity: i.quantity + 1 } 
            : i
        );
      }
      return [...prev, { ...item, quantity: 1, selectedVariant }];
    });
    setCartAnimate(true);
    setTimeout(() => setCartAnimate(false), 500);
  };

  const handleAskAi = async () => {
    if (!userInput.trim() || isAskingAi || !config) return;
    setIsAskingAi(true);
    setDisplayedAiText("... Churre está pensando ...");
    try {
      const response = await getRecommendation(userInput, config.menu);
      setRecommendedIds(response.suggestedItemIds);
      let currentText = "";
      const text = response.recommendationText;
      setDisplayedAiText("");
      for (let i = 0; i < text.length; i++) {
        currentText += text[i];
        setDisplayedAiText(currentText);
        await new Promise(r => setTimeout(r, 12));
      }
    } catch (e) { setDisplayedAiText("¡Habla sobrino! Hubo un problema."); }
    finally { setIsAskingAi(false); setUserInput(""); }
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#e91e63]">
      <span className="loader mb-6"></span>
      <p className="text-white font-black brand-font animate-pulse tracking-widest text-sm uppercase">Cargando la sazón...</p>
    </div>
  );

  const safeConfig = config!;

  if (isAdminOpen) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col animate-fade-in pb-20">
        <header className="bg-white border-b px-8 py-6 flex flex-wrap gap-4 justify-between items-center sticky top-0 z-[100] shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#e91e63] rounded-xl flex items-center justify-center text-white shadow-lg"><i className="fa-solid fa-gear"></i></div>
            <h2 className="text-lg font-black brand-font text-gray-800 tracking-tight">Panel Malcriado</h2>
          </div>
          <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl overflow-x-auto no-scrollbar max-w-full">
            <button onClick={() => setActiveAdminTab('products')} className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeAdminTab === 'products' ? 'bg-white text-[#e91e63] shadow-md' : 'text-gray-400'}`}>Platos</button>
            <button onClick={() => setActiveAdminTab('categories')} className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeAdminTab === 'categories' ? 'bg-white text-[#e91e63] shadow-md' : 'text-gray-400'}`}>Categorías</button>
            <button onClick={() => setActiveAdminTab('design')} className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeAdminTab === 'design' ? 'bg-white text-[#e91e63] shadow-md' : 'text-gray-400'}`}>Redes / Logos</button>
            <button onClick={() => setActiveAdminTab('slides')} className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeAdminTab === 'slides' ? 'bg-white text-[#e91e63] shadow-md' : 'text-gray-400'}`}>Carrusel</button>
          </div>
          <button onClick={() => setIsAdminOpen(false)} className="px-6 py-2.5 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-colors">Salir</button>
        </header>

        <main className="p-8 max-w-6xl mx-auto w-full">
           {/* CATEGORIAS TAB */}
           {activeAdminTab === 'categories' && (
             <div className="max-w-xl mx-auto space-y-8 animate-fade-in-up">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                   <h3 className="text-xl font-black mb-8 brand-font text-gray-800"><i className="fa-solid fa-layer-group mr-2 text-[#e91e63]"></i> Gestionar Categorías</h3>
                   <div className="flex gap-4 mb-8">
                      <input className="flex-1 bg-gray-50 p-4 rounded-2xl outline-none font-bold text-sm" placeholder="Nueva Categoría (Ej: Postres)" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                      <button onClick={handleAddCategory} className="bg-[#e91e63] text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Añadir</button>
                   </div>
                   <div className="space-y-3">
                      {categories.map(cat => (
                        <div key={cat.id} className="flex justify-between items-center p-5 bg-gray-50 rounded-2xl group">
                           <span className="font-bold text-gray-700">{cat.name}</span>
                           <button onClick={() => handleDeleteCategory(cat.id)} className="w-10 h-10 bg-white text-gray-300 hover:text-red-500 rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all"><i className="fa-solid fa-trash-can"></i></button>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {/* DESIGN TAB */}
           {activeAdminTab === 'design' && (
             <div className="max-w-xl mx-auto space-y-8 animate-fade-in-up">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                   <h3 className="text-xl font-black mb-8 brand-font text-gray-800"><i className="fa-solid fa-camera-retro mr-2 text-[#e91e63]"></i> Logos y Contacto</h3>
                   <div className="space-y-6">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                         <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Logo URL (Postimages)</label>
                         <input className="w-full bg-white p-3 rounded-xl outline-none font-bold text-sm" value={editingConfig!.images.logo} onChange={e => setEditingConfig({...editingConfig!, images: {...editingConfig!.images, logo: e.target.value, menuLogo: e.target.value}})} />
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                         <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">WhatsApp (Ej: 51936494711)</label>
                         <input className="w-full bg-white p-3 rounded-xl outline-none font-bold text-sm" value={editingConfig!.whatsappNumber} onChange={e => setEditingConfig({...editingConfig!, whatsappNumber: e.target.value})} />
                      </div>
                   </div>
                </div>

                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                   <h3 className="text-xl font-black mb-8 brand-font text-gray-800"><i className="fa-solid fa-share-nodes mr-2 text-[#e91e63]"></i> Redes Sociales</h3>
                   <div className="space-y-6">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                         <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Instagram URL</label>
                         <input className="w-full bg-white p-3 rounded-xl outline-none font-bold text-sm" value={editingConfig!.socialMedia.instagram} onChange={e => setEditingConfig({...editingConfig!, socialMedia: {...editingConfig!.socialMedia, instagram: e.target.value}})} />
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                         <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">TikTok URL</label>
                         <input className="w-full bg-white p-3 rounded-xl outline-none font-bold text-sm" value={editingConfig!.socialMedia.tiktok} onChange={e => setEditingConfig({...editingConfig!, socialMedia: {...editingConfig!.socialMedia, tiktok: e.target.value}})} />
                      </div>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                         <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Facebook URL</label>
                         <input className="w-full bg-white p-3 rounded-xl outline-none font-bold text-sm" value={editingConfig!.socialMedia.facebook} onChange={e => setEditingConfig({...editingConfig!, socialMedia: {...editingConfig!.socialMedia, facebook: e.target.value}})} />
                      </div>
                   </div>
                </div>
                <button onClick={saveAllConfig} className="w-full bg-[#e91e63] text-white py-6 rounded-3xl font-black shadow-2xl uppercase tracking-[0.2em] active:scale-95 transition-all">Guardar Todo</button>
             </div>
           )}

           {/* SLIDES TAB */}
           {activeAdminTab === 'slides' && (
             <div className="max-w-2xl mx-auto space-y-8 animate-fade-in-up">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100">
                   <h3 className="text-xl font-black mb-8 brand-font text-gray-800"><i className="fa-solid fa-images mr-2 text-[#e91e63]"></i> Carrusel de Inicio</h3>
                   <div className="flex gap-4 mb-10">
                      <input className="flex-1 bg-gray-50 p-4 rounded-2xl outline-none font-bold text-sm" placeholder="Pegar URL de Postimages..." value={newSlideUrl} onChange={e => setNewSlideUrl(e.target.value)} />
                      <button onClick={handleAddSlide} className="bg-[#e91e63] text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all">Añadir</button>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      {editingConfig!.images.slideBackgrounds.map((url, idx) => (
                        <div key={idx} className="relative group aspect-video rounded-2xl overflow-hidden border">
                           <img src={url} className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button onClick={() => handleRemoveSlide(idx)} className="w-10 h-10 bg-white text-red-500 rounded-full shadow-lg"><i className="fa-solid fa-trash-can"></i></button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
                <button onClick={saveAllConfig} className="w-full bg-[#e91e63] text-white py-6 rounded-3xl font-black shadow-2xl uppercase tracking-[0.2em]">Guardar Carrusel</button>
             </div>
           )}

           {/* PRODUCTS TAB */}
           {activeAdminTab === 'products' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
              <button onClick={() => setEditingProduct({ id: 'new-' + Date.now(), name: '', price: 0, category: categories[0]?.name || 'Sanguches', description: '', image: 'https://picsum.photos/400/300', variants: [] })} className="bg-dashed border-2 border-dashed border-gray-200 p-8 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-gray-400 hover:border-[#e91e63] hover:text-[#e91e63] transition-all group">
                <div className="w-12 h-12 rounded-full border-2 border-current flex items-center justify-center group-hover:scale-110 transition-transform"><i className="fa-solid fa-plus"></i></div>
                <span className="font-black text-[10px] uppercase tracking-widest">Nuevo Plato</span>
              </button>
              {safeConfig.menu.map(p => (
                <div key={p.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm flex items-center gap-5 border border-gray-100 group">
                  <img src={p.image} className="w-20 h-20 rounded-2xl object-cover bg-gray-100" />
                  <div className="flex-1 overflow-hidden">
                    <p className="font-black text-sm text-gray-800 truncate">{p.name}</p>
                    <p className="text-[#e91e63] font-black text-[9px] uppercase tracking-widest">{p.category}</p>
                    <p className="text-gray-400 font-black text-xs">
                      {p.variants && p.variants.length > 0 ? `Desde S/ ${Math.min(...p.variants.map(v => v.price)).toFixed(2)}` : `S/ ${p.price.toFixed(2)}`}
                    </p>
                  </div>
                  <button onClick={() => setEditingProduct(p)} className="w-10 h-10 bg-pink-50 text-[#e91e63] rounded-xl hover:bg-[#e91e63] hover:text-white transition-all"><i className="fa-solid fa-pen-to-square"></i></button>
                </div>
              ))}
            </div>
           )}
        </main>

        {editingProduct && (
          <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-6 backdrop-blur-md animate-fade-in">
            <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-10 shadow-2xl overflow-y-auto max-h-[90vh] animate-zoom-in relative">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black brand-font text-gray-800">Editor de Plato</h3>
                <button onClick={() => setEditingProduct(null)} className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"><i className="fa-solid fa-xmark"></i></button>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Nombre del Plato</label>
                      <input className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold" value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} placeholder="Nombre" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Categoría</label>
                      <select 
                        className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-bold text-gray-700 appearance-none cursor-pointer" 
                        value={editingProduct.category} 
                        onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                      >
                         {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                      </select>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Precio Base (S/)</label>
                      <input className="w-full bg-gray-50 p-4 rounded-2xl outline-none font-black text-[#e91e63]" type="number" step="0.5" value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})} placeholder="Precio" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Imagen (URL)</label>
                      <input className="w-full bg-gray-50 p-4 rounded-2xl font-bold outline-none" value={editingProduct.image} placeholder="URL de Imagen" onChange={e => setEditingProduct({...editingProduct, image: e.target.value})} />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Descripción</label>
                   <textarea className="w-full bg-gray-50 p-4 rounded-2xl h-24 outline-none font-medium text-sm" value={editingProduct.description} onChange={e => setEditingProduct({...editingProduct, description: e.target.value})} placeholder="Descripción..."></textarea>
                </div>

                {/* GESTIÓN DE VARIANTES EN EL ADMIN */}
                <div className="border-t pt-8 mt-4">
                   <h4 className="text-sm font-black uppercase tracking-widest text-gray-800 mb-6 flex items-center gap-2">
                     <i className="fa-solid fa-tags text-[#e91e63]"></i> Variantes del Producto
                   </h4>
                   <div className="bg-gray-50 p-6 rounded-3xl border border-dashed border-gray-200 mb-6">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                         <input className="bg-white p-3 rounded-xl outline-none text-xs font-bold" placeholder="Nombre (Ej: Bolsa 15 soles)" value={newVarName} onChange={e => setNewVarName(e.target.value)} />
                         <input className="bg-white p-3 rounded-xl outline-none text-xs font-black text-[#e91e63]" type="number" placeholder="Precio S/" value={newVarPrice} onChange={e => setNewVarPrice(parseFloat(e.target.value) || 0)} />
                      </div>
                      <button onClick={handleAddVariant} className="w-full bg-gray-800 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all">Añadir Variante</button>
                   </div>
                   
                   <div className="space-y-2">
                      {editingProduct.variants && editingProduct.variants.map(v => (
                        <div key={v.id} className="flex justify-between items-center p-4 bg-white border rounded-2xl group shadow-sm">
                           <div>
                              <span className="font-bold text-gray-700 text-xs">{v.name}</span>
                              <span className="ml-3 font-black text-[#e91e63] text-xs">S/ {v.price.toFixed(2)}</span>
                           </div>
                           <button onClick={() => handleRemoveVariant(v.id)} className="w-8 h-8 bg-pink-50 text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
              <button onClick={saveProduct} className="w-full bg-[#e91e63] text-white py-5 mt-10 rounded-2xl font-black shadow-lg uppercase text-xs tracking-widest active:scale-95 transition-all">Actualizar Plato</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white animate-fade-in relative selection:bg-pink-100 selection:text-[#e91e63]">
      {/* PASSWORD MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-zoom-in text-center">
            <h3 className="text-2xl font-black brand-font mb-8 text-gray-800 tracking-tight">Acceso Admin</h3>
            <form onSubmit={handlePasswordSubmit}>
              <input type="password" autoFocus className="w-full bg-gray-50 p-6 rounded-2xl text-center font-black text-2xl tracking-[0.5em] outline-none border-2 border-transparent focus:border-[#e91e63]" placeholder="••••" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} />
              <div className="flex gap-3 mt-8">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 py-4 font-black text-[10px] uppercase tracking-widest text-gray-400">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-[#e91e63] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest">Entrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LANDING SECTION */}
      {!showMenu && !showModalitySelector && (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-[#e91e63] relative overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center opacity-60 transition-all duration-[3000ms]" style={{ backgroundImage: `url("${safeConfig.images.slideBackgrounds[currentSlide % safeConfig.images.slideBackgrounds.length]}")` }}></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/90"></div>
          <div className="relative z-10 p-8 flex flex-col items-center animate-fade-in-up text-center">
            <img src={safeConfig.images.logo} className="w-52 mb-12 animate-float drop-shadow-2xl cursor-pointer" onClick={handleLogoClick} />
            <h1 className="text-white text-6xl md:text-9xl font-black brand-font mb-10 leading-none tracking-tighter">SABOR<br/><span className="text-[#fdd835]">MALCRIADO</span></h1>
            <button onClick={() => setShowModalitySelector(true)} className="btn-shine relative bg-[#e91e63] text-white px-16 py-7 rounded-full font-black text-xl shadow-2xl border-2 border-white/20 hover:scale-105 transition-all uppercase tracking-[0.2em]">Ver La Carta</button>
          </div>
        </div>
      )}

      {/* MODALITY SELECTOR */}
      {showModalitySelector && !showMenu && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-6 bg-[#e91e63] animate-fade-in text-center">
          <img src={safeConfig.images.logo} className="w-36 mb-12 cursor-pointer" onClick={handleLogoClick} />
          <h2 className="text-white text-5xl font-black brand-font mb-14 leading-tight">¿Cómo pides hoy,<br/><span className="text-[#fdd835]">sobrino?</span></h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-2xl px-4">
            <button onClick={() => { setOrderModality('delivery'); setShowMenu(true); }} className="bg-white p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center gap-6 transform hover:scale-[1.05] active:scale-95 transition-all group overflow-hidden">
              <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center group-hover:bg-[#e91e63] transition-all pulse-pink"><i className="fa-solid fa-motorcycle text-3xl text-[#e91e63] group-hover:text-white"></i></div>
              <h3 className="font-black text-2xl text-gray-800 brand-font">Delivery</h3>
            </button>
            <button onClick={() => { setOrderModality('pickup'); setShowMenu(true); }} className="bg-white p-12 rounded-[3.5rem] shadow-2xl flex flex-col items-center gap-6 transform hover:scale-[1.05] active:scale-95 transition-all group overflow-hidden">
              <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center group-hover:bg-[#e91e63] transition-all pulse-pink"><i className="fa-solid fa-shop text-3xl text-[#e91e63] group-hover:text-white"></i></div>
              <h3 className="font-black text-2xl text-gray-800 brand-font">Recojo</h3>
            </button>
          </div>
          <button onClick={() => setShowModalitySelector(false)} className="mt-16 text-white/50 font-black text-[10px] uppercase tracking-[0.4em]">← Volver</button>
        </div>
      )}

      {/* MAIN MENU */}
      {showMenu && (
        <>
          <header className={`glass-header sticky top-0 z-[100] px-6 transition-all duration-700 flex items-center justify-between ${scrolled ? 'py-3 shadow-xl' : 'py-7'}`}>
            <img src={safeConfig.images.menuLogo} className={`cursor-pointer transition-all duration-700 ${scrolled ? 'w-14' : 'w-20'}`} onClick={handleLogoClick} />
            <button onClick={() => setIsCartOpen(true)} className={`w-12 h-12 rounded-2xl flex items-center justify-center text-[#e91e63] relative transition-all shadow-md ${cartAnimate ? 'bg-[#fdd835] scale-110' : 'bg-white'}`}>
              <i className="fa-solid fa-basket-shopping"></i>
              {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-[#e91e63] text-white text-[9px] w-6 h-6 rounded-full flex items-center justify-center border-[3px] border-white font-black shadow-lg">{cart.reduce((a, b) => a + b.quantity, 0)}</span>}
            </button>
          </header>

          <section className="max-w-4xl mx-auto px-6 mt-12 mb-16">
            <div className="bg-gradient-to-br from-[#e91e63] to-[#880e4f] rounded-[3.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
               <div className="flex items-center gap-6 mb-10 relative z-10">
                  <img src={safeConfig.images.aiAvatar} className="w-16 h-16 bg-white/20 rounded-2xl object-cover" />
                  <h3 className="text-3xl font-black brand-font leading-none">¡Habla churre!<br/><span className="text-[#fdd835] italic">¿Qué antoja hoy?</span></h3>
               </div>
               <div className="relative z-10">
                  <input type="text" placeholder="Pide una recomendación..." className="w-full bg-white/10 border-2 border-white/20 rounded-full px-10 py-7 text-white text-lg outline-none pr-32 placeholder:text-white/30 focus:border-[#fdd835]" value={userInput} onChange={e => setUserInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAskAi()} />
                  <button onClick={handleAskAi} className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#fdd835] text-[#e91e63] w-14 h-14 rounded-full shadow-xl flex items-center justify-center">
                    <i className={`fa-solid ${isAskingAi ? 'fa-spinner fa-spin' : 'fa-wand-magic-sparkles'}`}></i>
                  </button>
               </div>
               {displayedAiText && <div className="mt-8 bg-black/20 p-8 rounded-[2.5rem] font-bold brand-font text-lg animate-fade-in-up">{displayedAiText}</div>}
            </div>
          </section>

          <div className="max-w-5xl mx-auto px-6 mb-12 flex gap-3 overflow-x-auto no-scrollbar pb-4 sticky top-[72px] md:top-[85px] z-40 bg-white/80 backdrop-blur-md pt-2">
            <button onClick={() => { setActiveCategory('Todos'); setRecommendedIds([]); }} className={`whitespace-nowrap px-8 py-3.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all ${activeCategory === 'Todos' && recommendedIds.length === 0 ? 'bg-[#e91e63] text-white shadow-xl shadow-pink-100' : 'bg-gray-50 text-gray-400'}`}>Todos</button>
            {categories.map(cat => (
              <button key={cat.id} onClick={() => { setActiveCategory(cat.name); setRecommendedIds([]); }} className={`whitespace-nowrap px-8 py-3.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all ${activeCategory === cat.name && recommendedIds.length === 0 ? 'bg-[#e91e63] text-white shadow-xl shadow-pink-100' : 'bg-gray-50 text-gray-400'}`}>{cat.name}</button>
            ))}
          </div>

          <main className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {(recommendedIds.length > 0 
              ? safeConfig.menu.filter(i => recommendedIds.includes(i.id))
              : activeCategory === 'Todos' ? safeConfig.menu : safeConfig.menu.filter(i => i.category === activeCategory)
            ).map(item => (
              <MenuItemCard 
                key={item.id} 
                item={item} 
                onAddToCart={(it, ev) => { 
                  if (it.variants && it.variants.length > 0) {
                    setSelectedItem(it);
                  } else {
                    addToCart(it);
                  }
                }} 
                onShowDetails={() => setSelectedItem(item)} 
              />
            ))}
          </main>

          <footer className="mt-24 py-12 border-t border-gray-50 flex flex-col items-center gap-10 bg-gray-50/10">
             <div className="flex flex-col items-center gap-4 text-center px-8 animate-fade-in-up">
                <div className="flex items-center gap-3 text-[#e91e63] font-black uppercase text-[10px] tracking-[0.2em]"><i className="fa-solid fa-location-dot"></i><span>Mercado 2 de surquillo puesto 651</span></div>
                <div className="flex items-center gap-3 text-gray-400 font-bold uppercase text-[9px] tracking-[0.2em]"><i className="fa-solid fa-clock"></i><span>Atención: 7am a 7pm</span></div>
             </div>
             <div className="flex gap-8">
                {safeConfig.socialMedia.instagram && <a href={safeConfig.socialMedia.instagram} target="_blank" className="social-icon w-12 h-12 rounded-2xl flex items-center justify-center text-[#e91e63] text-2xl transition-all"><i className="fa-brands fa-instagram"></i></a>}
                {safeConfig.socialMedia.tiktok && <a href={safeConfig.socialMedia.tiktok} target="_blank" className="social-icon w-12 h-12 rounded-2xl flex items-center justify-center text-[#e91e63] text-2xl transition-all"><i className="fa-brands fa-tiktok"></i></a>}
                {safeConfig.socialMedia.facebook && <a href={safeConfig.socialMedia.facebook} target="_blank" className="social-icon w-12 h-12 rounded-2xl flex items-center justify-center text-[#e91e63] text-2xl transition-all"><i className="fa-brands fa-facebook"></i></a>}
                <a href={`https://wa.me/${safeConfig.whatsappNumber.replace(/\D/g, '')}`} target="_blank" className="social-icon w-12 h-12 rounded-2xl flex items-center justify-center text-[#e91e63] text-2xl transition-all"><i className="fa-brands fa-whatsapp"></i></a>
             </div>
             <div className="flex flex-col items-center gap-1 opacity-30"><p className="text-[7px] font-black uppercase tracking-[0.8em] text-gray-800">Churre Malcriado • Piura</p><span className="w-14 h-[1px] bg-gray-300 mt-2"></span></div>
          </footer>
        </>
      )}

      {selectedItem && (
        <ProductDetailModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
          onAddToCart={addToCart} 
        />
      )}
      <Cart items={cart} onRemove={id => setCart(c => c.filter(x => x.id !== id))} onUpdateQuantity={(id, d) => setCart(c => c.map(x => x.id === id ? {...x, quantity: Math.max(0, x.quantity + d)} : x).filter(x => x.quantity > 0))} isOpen={isCartOpen} onToggle={() => setIsCartOpen(!isCartOpen)} initialModality={orderModality || 'pickup'} whatsappNumber={safeConfig.whatsappNumber} />
    </div>
  );
};

export default App;
