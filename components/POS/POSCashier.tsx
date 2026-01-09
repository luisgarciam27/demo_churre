
import React, { useState } from 'react';
import { MenuItem, Category, CashSession, CartItem, ItemVariant } from '../../types';
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
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [search, setSearch] = useState("");
  const [lastOrder, setLastOrder] = useState<any | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [itemForVariant, setItemForVariant] = useState<MenuItem | null>(null);

  const addToCart = (item: MenuItem, variant?: ItemVariant) => {
    if (item.variants && item.variants.length > 0 && !variant) {
      setItemForVariant(item);
      return;
    }

    setCart(prev => {
      const variantId = variant?.id;
      const existing = prev.find(i => i.id === item.id && i.selectedVariant?.id === variantId);
      
      if (existing) {
        return prev.map(i => 
          (i.id === item.id && i.selectedVariant?.id === variantId) 
            ? { ...i, quantity: i.quantity + 1 } 
            : i
        );
      }
      return [...prev, { ...item, quantity: 1, selectedVariant: variant }];
    });
    setItemForVariant(null);
  };

  const updateQty = (id: string, delta: number, variantId?: string) => {
    setCart(prev => prev.map(i => 
      (i.id === id && i.selectedVariant?.id === variantId) 
        ? { ...i, quantity: Math.max(1, i.quantity + delta) } 
        : i
    ));
  };

  const removeItem = (id: string, variantId?: string) => {
    setCart(prev => prev.filter(i => !(i.id === id && i.selectedVariant?.id === variantId)));
  };

  const total = cart.reduce((acc, curr) => {
    const price = curr.selectedVariant ? curr.selectedVariant.price : curr.price;
    return acc + (price * curr.quantity);
  }, 0);

  // Calcula el vuelto solo si hay monto recibido, si no, es 0
  const effectiveReceived = receivedAmount === '' ? total : parseFloat(receivedAmount);
  const changeAmount = paymentMethod === 'Efectivo' ? Math.max(0, effectiveReceived - total) : 0;

  const handleProcessOrder = async () => {
    if (cart.length === 0 || isProcessing) return;
    
    if (paymentMethod === 'Efectivo' && receivedAmount !== '') {
      if (parseFloat(receivedAmount) < total) {
        alert("El monto recibido es menor al total.");
        return;
      }
    }

    setIsProcessing(true);
    
    // Eliminamos 'notes' para evitar el error de esquema en Supabase
    const orderData = {
      customer_name: "Venta Directa",
      customer_phone: "POS",
      items: cart.map(i => ({ 
        name: i.name, 
        quantity: i.quantity, 
        price: i.selectedVariant ? i.selectedVariant.price : i.price,
        variant: i.selectedVariant?.name || null
      })),
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
        setLastOrder({
          ...data,
          received: effectiveReceived.toString(),
          change: changeAmount
        });
        setShowReceipt(true);
        setCart([]);
        setReceivedAmount('');
        onOrderComplete();
      } else {
        throw error;
      }
    } catch (e: any) {
      console.error("Error DB:", e);
      alert("Error: " + (e.message || "No se pudo registrar la venta"));
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
    <div className="h-full flex overflow-hidden bg-[#f1f5f9] relative">
      {/* AREA DE PRODUCTOS - COMPACTA */}
      <div className="flex-1 flex flex-col border-r border-slate-200">
        <div className="p-4 bg-white border-b border-slate-200 flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[150px]">
             <i className="fa-solid fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
             <input 
               type="text" 
               placeholder="Buscar..." 
               className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-pink-200 transition-all"
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setViewMode('grid')} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-white text-[#e91e63] shadow-sm' : 'text-slate-400'}`}><i className="fa-solid fa-th-large text-xs"></i></button>
            <button onClick={() => setViewMode('list')} className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-white text-[#e91e63] shadow-sm' : 'text-slate-400'}`}><i className="fa-solid fa-list text-xs"></i></button>
          </div>

          <div className="flex gap-1.5 overflow-x-auto no-scrollbar max-w-[40%]">
            <button onClick={() => setActiveCategory('Todos')} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === 'Todos' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400'}`}>Todos</button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setActiveCategory(c.name)} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === c.name ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400'}`}>{c.name}</button>
            ))}
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar ${viewMode === 'grid' ? 'grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 content-start' : 'space-y-2'}`}>
          {filteredMenu.map(item => (
            viewMode === 'grid' ? (
              <button 
                key={item.id} 
                onClick={() => addToCart(item)}
                className="group bg-white border border-slate-100 p-3 rounded-2xl flex flex-col items-center text-center gap-2 hover:shadow-lg hover:border-pink-100 transition-all active:scale-95 text-slate-700 relative overflow-hidden h-fit"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="min-h-[2.5rem] flex flex-col justify-center">
                   <p className="font-bold text-[10px] leading-tight line-clamp-2">{item.name}</p>
                   <p className="text-[#e91e63] font-black text-[11px] mt-0.5">S/ {item.price.toFixed(2)}</p>
                </div>
                {item.variants && item.variants.length > 0 && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-pink-400 rounded-full"></div>
                )}
              </button>
            ) : (
              <button 
                key={item.id} 
                onClick={() => addToCart(item)}
                className="w-full bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between hover:bg-pink-50/30 transition-all active:scale-[0.99] text-left group"
              >
                <div className="flex items-center gap-3">
                  <img src={item.image} className="w-10 h-10 rounded-lg object-cover" />
                  <div>
                    <p className="font-bold text-xs text-slate-800">{item.name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{item.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-black text-slate-900">S/ {item.price.toFixed(2)}</span>
                  <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-[#e91e63] group-hover:text-white transition-all">
                    <i className="fa-solid fa-plus text-[10px]"></i>
                  </div>
                </div>
              </button>
            )
          ))}
        </div>
      </div>

      {/* PANEL DE COBRO - AJUSTADO */}
      <div className="w-[380px] flex flex-col bg-white border-l border-slate-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-black text-slate-800 brand-font">Ticket de Venta</h3>
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mt-0.5">Cajero: {session.user_name}</p>
          </div>
          <button onClick={() => setCart([])} className="text-[9px] font-black uppercase text-red-400 hover:text-red-600 transition-colors">Limpiar</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar bg-slate-50/50">
          {cart.map((item, idx) => {
            const itemPrice = item.selectedVariant ? item.selectedVariant.price : item.price;
            return (
              <div key={`${item.id}-${item.selectedVariant?.id || idx}`} className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-sm flex items-center justify-between animate-fade-in-up">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="font-bold text-slate-800 text-[11px] truncate leading-none mb-1">{item.name}</p>
                  {item.selectedVariant && (
                    <p className="text-[8px] font-black text-[#e91e63] uppercase bg-pink-50 px-1.5 py-0.5 rounded w-fit mb-1">{item.selectedVariant.name}</p>
                  )}
                  <p className="text-[9px] font-bold text-slate-400">S/ {itemPrice.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                   <button onClick={() => updateQty(item.id, -1, item.selectedVariant?.id)} className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"><i className="fa-solid fa-minus text-[8px]"></i></button>
                   <span className="w-5 text-center font-black text-slate-700 text-xs">{item.quantity}</span>
                   <button onClick={() => updateQty(item.id, 1, item.selectedVariant?.id)} className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center"><i className="fa-solid fa-plus text-[8px]"></i></button>
                   <button onClick={() => removeItem(item.id, item.selectedVariant?.id)} className="ml-1 text-slate-300 hover:text-red-500"><i className="fa-solid fa-times text-xs"></i></button>
                </div>
              </div>
            );
          })}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center py-20">
               <i className="fa-solid fa-utensils text-4xl mb-4"></i>
               <p className="font-black text-[9px] uppercase tracking-widest">Carrito vacío</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-100 space-y-4">
          <div className="grid grid-cols-4 gap-1.5">
            {['Efectivo', 'Yape', 'Plin', 'Tarjeta'].map(m => (
              <button 
                key={m} 
                onClick={() => setPaymentMethod(m as any)}
                className={`py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${paymentMethod === m ? 'bg-[#e91e63] text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
              >
                {m}
              </button>
            ))}
          </div>

          {paymentMethod === 'Efectivo' && (
            <div className="space-y-3 animate-fade-in-up bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="flex justify-between items-center mb-1">
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">¿Con cuánto paga?</label>
                 <button onClick={() => setReceivedAmount('')} className="text-[8px] font-black text-[#e91e63] uppercase">Monto Exacto</button>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs font-black">S/</span>
                  <input 
                    type="number" 
                    placeholder={total.toFixed(2)}
                    className="w-full bg-white border border-slate-200 pl-8 pr-4 py-2.5 rounded-xl font-black text-slate-800 text-sm outline-none focus:ring-2 focus:ring-pink-200"
                    value={receivedAmount}
                    onChange={e => setReceivedAmount(e.target.value)}
                  />
                </div>
                {receivedAmount !== '' && (
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase leading-none">Vuelto</p>
                    <p className="text-sm font-black text-green-600 leading-none mt-1">S/ {changeAmount.toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between items-end py-1">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Total Cobrar</span>
            <span className="text-3xl font-black text-slate-900 tracking-tighter">S/ {total.toFixed(2)}</span>
          </div>

          <button 
            disabled={cart.length === 0 || isProcessing || (paymentMethod === 'Efectivo' && receivedAmount !== '' && parseFloat(receivedAmount) < total)}
            onClick={handleProcessOrder}
            className="w-full py-5 bg-[#e91e63] text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-pink-100 transition-all active:scale-95 disabled:opacity-30 flex items-center justify-center gap-3"
          >
            {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-print"></i><span>Cerrar Venta</span></>}
          </button>
        </div>
      </div>

      {/* MODAL VARIANTES */}
      {itemForVariant && (
        <div className="fixed inset-0 z-[1100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-zoom-in">
             <h3 className="text-xl font-black text-slate-800 mb-2 brand-font text-center">{itemForVariant.name}</h3>
             <p className="text-[10px] text-slate-400 font-bold mb-6 text-center uppercase tracking-widest">Elige una opción:</p>
             <div className="space-y-2 mb-8">
                {itemForVariant.variants?.map(v => (
                  <button key={v.id} onClick={() => addToCart(itemForVariant, v)} className="w-full flex justify-between items-center p-4 bg-slate-50 rounded-xl border-2 border-transparent hover:border-pink-200 transition-all group">
                    <span className="font-bold text-xs text-slate-700 group-hover:text-[#e91e63]">{v.name}</span>
                    <span className="font-black text-xs text-slate-900">S/ {v.price.toFixed(2)}</span>
                  </button>
                ))}
             </div>
             <button onClick={() => setItemForVariant(null)} className="w-full py-2 text-[10px] font-black uppercase text-slate-400">Cerrar</button>
          </div>
        </div>
      )}

      {/* MODAL TICKET - DISEÑO TÉRMICO */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-[350px] rounded-[2.5rem] p-6 shadow-2xl animate-zoom-in my-auto">
            <div id="printable-receipt" className="bg-white font-mono text-[10px] text-black p-4 leading-tight">
              <div className="text-center space-y-1 mb-4">
                 <h2 className="text-sm font-black uppercase">EL CHURRE MALCRIADO</h2>
                 <p>Av. Grau 1234 - Piura</p>
                 <p>RUC: 10745829631</p>
                 <div className="border-y border-dashed border-black py-2 my-2">
                    <p className="font-bold">TICKET VENTA #000{lastOrder.id}</p>
                    <p>{new Date(lastOrder.created_at).toLocaleString()}</p>
                 </div>
              </div>
              <div className="space-y-1 mb-4">
                <div className="flex justify-between border-b border-dashed border-black pb-1 mb-1 font-bold">
                   <span className="w-8">CANT</span>
                   <span className="flex-1 px-1">DETALLE</span>
                   <span className="w-12 text-right">TOTAL</span>
                </div>
                {lastOrder.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start">
                    <span className="w-8">{it.quantity}</span>
                    <div className="flex-1 px-1 overflow-hidden">
                       <p className="truncate uppercase">{it.name}</p>
                       {it.variant && <p className="text-[8px] italic">- {it.variant}</p>}
                    </div>
                    <span className="w-12 text-right">{(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-black pt-2 space-y-1">
                <div className="flex justify-between font-bold">
                   <span>TOTAL A PAGAR:</span>
                   <span>S/ {lastOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between opacity-70">
                   <span>MÉTODO:</span>
                   <span className="uppercase">{lastOrder.payment_method}</span>
                </div>
                {lastOrder.payment_method === 'Efectivo' && (
                  <>
                    <div className="flex justify-between">
                       <span>RECIBIDO:</span>
                       <span>S/ {parseFloat(lastOrder.received || '0').toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                       <span>VUELTO:</span>
                       <span>S/ {parseFloat(lastOrder.change || '0').toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-6 text-center text-[8px] uppercase font-bold space-y-1">
                <p>¡Gracias por tu compra, churre!</p>
                <p>Vuelve pronto sobrino.</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 no-print">
               <button onClick={handlePrint} className="py-4 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest"><i className="fa-solid fa-print mr-2"></i>Imprimir</button>
               <button onClick={() => { setShowReceipt(false); setLastOrder(null); }} className="py-4 bg-[#e91e63] text-white rounded-xl font-black text-[9px] uppercase tracking-widest">Listo</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-receipt, #printable-receipt * { visibility: visible; }
          #printable-receipt {
            position: absolute; left: 0; top: 0;
            width: 80mm; margin: 0; padding: 2mm;
            border: none !important; box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};
