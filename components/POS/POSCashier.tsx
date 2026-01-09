
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
  const [lastOrder, setLastOrder] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const total = cart.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0);

  const handleProcessOrder = async () => {
    if (cart.length === 0 || isProcessing) return;
    setIsProcessing(true);
    
    const orderData = {
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
    };

    try {
      const { data, error } = await supabase.from('orders').insert(orderData).select().single();

      if (!error) {
        await supabase.rpc('increment_session_sales', { session_id: session.id, amount: total });
        setLastOrder(data);
        setShowReceipt(true);
        setCart([]);
        onOrderComplete();
      } else {
        throw error;
      }
    } catch (e: any) {
      console.error("Error de DB:", e);
      alert("Error al procesar la venta: " + (e.message || "Estado no permitido"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredMenu = (activeCategory === 'Todos' ? menu : menu.filter(m => m.category === activeCategory))
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex overflow-hidden bg-white relative">
      <div className="flex-1 flex flex-col border-r border-slate-100">
        <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex gap-4 items-center">
          <div className="relative flex-1">
             <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
             <input 
               type="text" 
               placeholder="Buscar plato..." 
               className="w-full bg-white border border-slate-200 pl-12 pr-6 py-4 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-pink-50 transition-all shadow-sm"
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
              className="group bg-white border border-slate-100 p-6 rounded-[2.5rem] flex flex-col items-center text-center gap-3 hover:shadow-xl hover:shadow-slate-200/50 transition-all active:scale-95 text-slate-700"
            >
              <div className="w-20 h-20 rounded-3xl overflow-hidden mb-1 shadow-inner bg-slate-50">
                <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
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
            <h3 className="text-xl font-black text-slate-800 brand-font">Nueva Venta</h3>
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
               <p className="font-black text-[10px] uppercase tracking-widest text-slate-400">Selecciona Productos...</p>
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

      {/* MODAL DE RECIBO DE VENTA */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 z-[1000] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-[400px] rounded-[3rem] p-8 shadow-2xl animate-zoom-in my-auto">
            
            {/* Cabecera del Ticket */}
            <div id="printable-receipt" className="bg-white p-4 font-mono text-xs text-slate-800 border-2 border-dashed border-slate-100 rounded-2xl">
              <div className="text-center space-y-1 mb-6">
                 <h2 className="text-lg font-black tracking-tight uppercase">El Churre Malcriado</h2>
                 <p className="text-[9px] font-bold">Av. Grau 1234 - Piura</p>
                 <p className="text-[9px] font-bold">RUC: 10745829631</p>
                 <div className="py-2 border-y border-slate-100 my-2">
                    <p className="text-[10px] font-black">RECIBO DE VENTA</p>
                    <p className="text-[10px] font-black uppercase">Ticket #000{lastOrder.id}</p>
                 </div>
                 <div className="flex justify-between text-[8px] font-bold opacity-60">
                    <span>FECHA: {new Date(lastOrder.created_at).toLocaleDateString()}</span>
                    <span>HORA: {new Date(lastOrder.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                 </div>
              </div>

              {/* Cuerpo del Ticket */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between border-b border-slate-100 pb-1 mb-1 text-[9px] font-black">
                   <span className="w-8">CANT</span>
                   <span className="flex-1 px-2">DESCRIPCIÓN</span>
                   <span className="w-16 text-right">TOTAL</span>
                </div>
                {lastOrder.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between leading-tight py-0.5">
                    <span className="w-8 font-black">{it.quantity}</span>
                    <span className="flex-1 px-2 truncate uppercase">{it.name}</span>
                    <span className="w-16 text-right font-black">{(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totales */}
              <div className="border-t-2 border-slate-200 pt-4 space-y-2">
                <div className="flex justify-between font-black text-sm">
                   <span>TOTAL A PAGAR:</span>
                   <span>S/ {lastOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[9px] font-bold opacity-70">
                   <span>MÉTODO DE PAGO:</span>
                   <span className="uppercase">{lastOrder.payment_method}</span>
                </div>
              </div>

              <div className="mt-8 text-center space-y-2">
                <p className="text-[9px] font-black uppercase">¡Muchas gracias, churre!</p>
                <p className="text-[8px] font-bold opacity-40">Vuelve pronto por tu malcriado favorito</p>
                <div className="flex justify-center pt-4 opacity-10">
                   <i className="fa-solid fa-qrcode text-4xl"></i>
                </div>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="mt-8 grid grid-cols-2 gap-4">
               <button 
                 onClick={handlePrint}
                 className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-200 transition-all"
               >
                 <i className="fa-solid fa-print"></i>
                 Imprimir
               </button>
               <button 
                 onClick={() => setShowReceipt(false)}
                 className="py-4 bg-[#e91e63] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-pink-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
               >
                 <i className="fa-solid fa-plus"></i>
                 Nueva Venta
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos para Impresión */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-receipt, #printable-receipt * { visibility: visible; }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm; /* Ancho estándar de ticket */
            margin: 0;
            padding: 10mm;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};
