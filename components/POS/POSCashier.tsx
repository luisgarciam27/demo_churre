
import React, { useState } from 'react';
import { MenuItem, Category, CashSession, CartItem } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface POSCashierProps {
  menu: MenuItem[];
  categories: Category[];
  session: CashSession;
  onOrderComplete: () => void;
}

export const POSCashier: React.FC<POSCashierProps> = ({ menu, categories, session, onOrderComplete }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Yape' | 'Plin' | 'Tarjeta'>('Efectivo');
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState("");

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const total = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

  const handleProcessOrder = async () => {
    if (cart.length === 0 || isProcessing) return;
    setIsProcessing(true);
    
    try {
      // Nota: Si 'Completado' falla, prueba con 'Finalizado' o asegura que la DB tenga este ENUM.
      // Usaremos 'Completado' que es el valor esperado por POSOrders.
      const { error } = await supabase.from('orders').insert({
        customer_name: "Venta Directa",
        customer_phone: "POS",
        items: cart.map(i => ({ name: i.name, quantity: i.quantity, price: i.price })),
        total: total,
        modality: 'pickup',
        address: 'Mostrador',
        status: 'Completado', 
        payment_method: paymentMethod,
        order_origin: 'Local',
        session_id: session.id
      });

      if (!error) {
        await supabase.rpc('increment_session_sales', { session_id: session.id, amount: total });
        setCart([]);
        onOrderComplete();
        alert("¡Venta Realizada con éxito!");
      } else {
        throw error;
      }
    } catch (e: any) {
      console.error("Error de DB:", e);
      alert("Error al procesar la venta: " + (e.message || "Estado no permitido en DB"));
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredMenu = (activeCategory === 'Todos' ? menu : menu.filter(m => m.category === activeCategory))
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex overflow-hidden bg-white">
      <div className="flex-1 flex flex-col border-r border-slate-100">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex gap-4 items-center">
          <div className="relative flex-1">
             <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
             <input 
               type="text" 
               placeholder="Buscar plato..." 
               className="w-full bg-white border border-slate-200 pl-12 pr-6 py-4 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-pink-50 transition-all"
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-md">
            <button onClick={() => setActiveCategory('Todos')} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === 'Todos' ? 'bg-[#e91e63] text-white shadow-lg shadow-pink-100' : 'bg-white border border-slate-200 text-slate-400'}`}>Todos</button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setActiveCategory(c.name)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === c.name ? 'bg-[#e91e63] text-white shadow-lg shadow-pink-100' : 'bg-white border border-slate-200 text-slate-400'}`}>{c.name}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6 custom-scrollbar">
          {filteredMenu.map(item => (
            <button 
              key={item.id} 
              onClick={() => addToCart(item)}
              className="group bg-white border border-slate-100 p-5 rounded-[2.5rem] flex flex-col items-center text-center gap-3 hover:shadow-xl hover:shadow-slate-200/50 transition-all active:scale-95 text-slate-700"
            >
              <div className="w-20 h-20 rounded-3xl overflow-hidden mb-1 shadow-inner bg-slate-50">
                <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              </div>
              <p className="font-black text-[11px] leading-tight h-8 flex items-center">{item.name}</p>
              <p className="text-[#e91e63] font-black text-sm">S/ {item.price.toFixed(2)}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="w-[400px] flex flex-col bg-slate-50">
        <div className="p-8 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-800 brand-font">Detalle Venta</h3>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Ticket Actual</p>
          </div>
          <button onClick={() => setCart([])} className="text-[9px] font-black uppercase text-slate-300 hover:text-red-500 transition-colors">Limpiar</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
          {cart.map(item => (
            <div key={item.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between animate-fade-in-up">
              <div className="flex-1 min-w-0 pr-4">
                <p className="font-bold text-slate-700 text-sm truncate">{item.name}</p>
                <p className="text-[10px] font-black text-[#e91e63] uppercase">S/ {item.price.toFixed(2)} c/u</p>
              </div>
              <div className="flex items-center gap-3">
                 <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100"><i className="fa-solid fa-minus text-[10px]"></i></button>
                 <span className="w-6 text-center font-black text-slate-700 text-sm">{item.quantity}</span>
                 <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 rounded-xl bg-[#e91e63] text-white flex items-center justify-center shadow-lg shadow-pink-100"><i className="fa-solid fa-plus text-[10px]"></i></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-20">
               <i className="fa-solid fa-cart-shopping text-5xl mb-6 text-slate-300"></i>
               <p className="font-black text-[10px] uppercase tracking-widest text-slate-400">Esperando Pedido...</p>
            </div>
          )}
        </div>

        <div className="p-8 bg-white border-t border-slate-200 rounded-t-[3.5rem] shadow-[0_-20px_40px_rgba(0,0,0,0.02)] space-y-6">
          <div className="grid grid-cols-4 gap-2">
            {['Efectivo', 'Yape', 'Plin', 'Tarjeta'].map(m => (
              <button 
                key={m} 
                onClick={() => setPaymentMethod(m as any)}
                className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${paymentMethod === m ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex justify-between items-center px-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total a Pagar</span>
            <span className="text-4xl font-black text-slate-900 tracking-tighter">S/ {total.toFixed(2)}</span>
          </div>
          <button 
            disabled={cart.length === 0 || isProcessing}
            onClick={handleProcessOrder}
            className="w-full py-6 bg-[#e91e63] text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-pink-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-20 flex items-center justify-center gap-4"
          >
            {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-bolt"></i><span>Cobrar Ahora</span></>}
          </button>
        </div>
      </div>
    </div>
  );
};
