
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
        return prev.map(i => (i.id === item.id && i.selectedVariant?.id === variantId) ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, selectedVariant: variant }];
    });
    setItemForVariant(null);
  };

  // Added updateQty to handle quantity adjustments (increment/decrement) for items already in the cart
  const updateQty = (id: string, delta: number, variantId?: string) => {
    setCart(prev => prev.map(i => 
      (i.id === id && i.selectedVariant?.id === variantId) 
        ? { ...i, quantity: i.quantity + delta } 
        : i
    ).filter(i => i.quantity > 0));
  };

  const total = cart.reduce((acc, curr) => {
    const price = curr.selectedVariant ? curr.selectedVariant.price : curr.price;
    return acc + (price * curr.quantity);
  }, 0);

  const effectiveReceived = receivedAmount === '' ? total : parseFloat(receivedAmount);
  const changeAmount = paymentMethod === 'Efectivo' ? Math.max(0, effectiveReceived - total) : 0;

  const handleProcessOrder = async () => {
    if (cart.length === 0 || isProcessing) return;
    setIsProcessing(true);
    
    // NO incluimos 'notes' porque rompe el schema de la tabla
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
      if (error) throw error;

      await supabase.rpc('increment_session_sales', { session_id: session.id, amount: total });
      
      const orderToTicket = {
        ...data,
        received: effectiveReceived,
        change: changeAmount
      };
      
      setLastOrder(orderToTicket);
      setShowReceipt(true); // DISPARA EL MODAL DEL RECIBO
      setCart([]);
      setReceivedAmount('');
      onOrderComplete();
    } catch (e: any) {
      alert("Error en Venta: " + (e.message || "Problema de conexión"));
    } finally {
      setIsProcessing(false);
    }
  };

  const sendWhatsAppReceipt = () => {
    if (!lastOrder) return;
    const itemsText = lastOrder.items.map((it: any) => `• ${it.quantity}x ${it.name} ${it.variant ? `(${it.variant})` : ''}`).join('\n');
    const msg = encodeURIComponent(
      `*EL CHURRE MALCRIADO*\n` +
      `*Ticket #000${lastOrder.id}*\n\n` +
      `${itemsText}\n\n` +
      `*TOTAL: S/ ${lastOrder.total.toFixed(2)}*\n` +
      `Método: ${lastOrder.payment_method}\n\n` +
      `¡Gracias por tu compra, churre! 🔥`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const filteredMenu = (activeCategory === 'Todos' ? menu : menu.filter(m => m.category === activeCategory))
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex overflow-hidden bg-slate-100 relative select-none">
      {/* AREA DE PRODUCTOS (95% APROVECHADO) */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-2 bg-white border-b border-slate-200 flex gap-2 items-center">
          <div className="relative w-40">
             <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]"></i>
             <input type="text" placeholder="Buscar..." className="w-full bg-slate-50 border border-slate-200 pl-8 pr-2 py-1.5 rounded-lg text-[10px] font-bold outline-none focus:ring-2 focus:ring-pink-200" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 overflow-x-auto no-scrollbar flex-1">
            <button onClick={() => setActiveCategory('Todos')} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeCategory === 'Todos' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400'}`}>Todos</button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setActiveCategory(c.name)} className={`px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeCategory === c.name ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400'}`}>{c.name}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-1.5 content-start">
          {filteredMenu.map(item => (
            <button 
              key={item.id} 
              onClick={() => addToCart(item)} 
              className="group bg-white border border-slate-200/60 p-1.5 rounded-lg flex flex-col items-center text-center gap-1 hover:border-pink-300 hover:shadow-sm transition-all active:scale-90 relative h-fit"
            >
              <div className="w-10 h-10 rounded-md overflow-hidden bg-slate-50">
                <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
              </div>
              <p className="font-bold text-[8px] leading-none line-clamp-2 text-slate-800 uppercase tracking-tighter h-4 flex items-center">{item.name}</p>
              <p className="text-[#e91e63] font-black text-[9px]">S/ {item.price.toFixed(2)}</p>
              {item.variants && item.variants.length > 0 && <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-pink-400 rounded-full"></div>}
            </button>
          ))}
        </div>
      </div>

      {/* PANEL LATERAL DE COBRO (ESTILIZADO) */}
      <div className="w-[300px] flex flex-col bg-white border-l border-slate-200 shadow-2xl z-10">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Carrito</p>
          <button onClick={() => setCart([])} className="text-[8px] font-black text-red-400 uppercase">Limpiar</button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar bg-slate-50/20">
          {cart.map((item, idx) => (
            <div key={`${item.id}-${item.selectedVariant?.id || idx}`} className="bg-white p-2 rounded-lg border border-slate-100 shadow-sm flex items-center justify-between animate-fade-in-up">
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-bold text-slate-800 text-[9px] truncate uppercase tracking-tighter leading-none">{item.name}</p>
                {item.selectedVariant && <p className="text-[7px] font-black text-[#e91e63] uppercase mt-0.5">{item.selectedVariant.name}</p>}
                <p className="text-[8px] font-bold text-slate-400">S/ {(item.selectedVariant?.price || item.price).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1">
                 <button onClick={() => updateQty(item.id, -1, item.selectedVariant?.id)} className="w-5 h-5 rounded bg-slate-100 text-slate-500 flex items-center justify-center"><i className="fa-solid fa-minus text-[7px]"></i></button>
                 <span className="w-4 text-center font-black text-slate-700 text-[9px]">{item.quantity}</span>
                 <button onClick={() => addToCart(item, item.selectedVariant)} className="w-5 h-5 rounded bg-slate-900 text-white flex items-center justify-center"><i className="fa-solid fa-plus text-[7px]"></i></button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 border-t border-slate-100 space-y-3 bg-white">
          <div className="grid grid-cols-4 gap-1">
            {['Efectivo', 'Yape', 'Plin', 'Tarjeta'].map(m => (
              <button key={m} onClick={() => setPaymentMethod(m as any)} className={`py-2 rounded-lg text-[7px] font-black uppercase transition-all ${paymentMethod === m ? 'bg-pink-500 text-white shadow-md' : 'bg-slate-100 text-slate-400'}`}>{m}</button>
            ))}
          </div>

          {paymentMethod === 'Efectivo' && (
            <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 animate-fade-in">
               <div className="flex justify-between items-center mb-1">
                  <label className="text-[7px] font-black text-slate-400 uppercase">Recibido</label>
                  <button onClick={() => setReceivedAmount('')} className="text-[7px] font-black text-pink-500 uppercase">¿Exacto?</button>
               </div>
               <div className="flex items-center gap-2">
                 <input type="number" placeholder={total.toFixed(2)} className="w-full bg-white border border-slate-200 px-2 py-1.5 rounded-md font-black text-slate-800 text-xs outline-none" value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} />
                 <div className="text-right whitespace-nowrap">
                    <p className="text-[6px] font-black text-slate-400 uppercase">Vuelto</p>
                    <p className="text-[10px] font-black text-green-600">S/ {changeAmount.toFixed(2)}</p>
                 </div>
               </div>
            </div>
          )}

          <div className="flex justify-between items-center py-1">
            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Total</span>
            <span className="text-2xl font-black text-slate-900 tracking-tighter">S/ {total.toFixed(2)}</span>
          </div>

          <button 
            disabled={cart.length === 0 || isProcessing || (paymentMethod === 'Efectivo' && receivedAmount !== '' && parseFloat(receivedAmount) < total)}
            onClick={handleProcessOrder}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg active:scale-95 disabled:opacity-20 flex items-center justify-center gap-2"
          >
            {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-bolt"></i><span>{receivedAmount === '' && paymentMethod === 'Efectivo' ? 'PAGO EXACTO' : 'COBRAR'}</span></>}
          </button>
        </div>
      </div>

      {/* MODAL VARIANTES */}
      {itemForVariant && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[280px] rounded-[2rem] p-6 shadow-2xl animate-zoom-in">
             <h3 className="text-sm font-black text-slate-800 mb-4 uppercase text-center">{itemForVariant.name}</h3>
             <div className="space-y-1.5 mb-6">
                {itemForVariant.variants?.map(v => (
                  <button key={v.id} onClick={() => addToCart(itemForVariant, v)} className="w-full flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-transparent hover:border-pink-200 transition-all group text-left">
                    <span className="font-bold text-[10px] text-slate-700 uppercase">{v.name}</span>
                    <span className="font-black text-[10px] text-slate-900">S/ {v.price.toFixed(2)}</span>
                  </button>
                ))}
             </div>
             <button onClick={() => setItemForVariant(null)} className="w-full py-2 text-[8px] font-black uppercase text-slate-400 tracking-widest">Cancelar</button>
          </div>
        </div>
      )}

      {/* MODAL RECIBO (EL QUE NO SALÍA) */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 z-[5000] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-[320px] rounded-[2rem] p-6 shadow-2xl animate-zoom-in my-auto">
            <div id="thermal-receipt" className="bg-white font-mono text-[9px] text-black p-4 border border-slate-100 rounded-xl leading-tight">
              <div className="text-center space-y-0.5 mb-4">
                 <h2 className="text-[12px] font-black uppercase leading-none">EL CHURRE MALCRIADO</h2>
                 <p className="text-[7px]">Sabor Piurano de Corazón</p>
                 <div className="border-y border-dashed border-black py-1.5 my-2">
                    <p className="font-bold">ORDEN #000{lastOrder.id}</p>
                    <p className="text-[7px]">{new Date(lastOrder.created_at).toLocaleString()}</p>
                 </div>
              </div>
              
              <div className="mb-4">
                <div className="flex justify-between border-b border-dashed border-black pb-1 mb-1 font-bold">
                   <span className="w-6">CANT</span>
                   <span className="flex-1 px-1">DETALLE</span>
                   <span className="w-12 text-right">SUBT</span>
                </div>
                {lastOrder.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start py-0.5">
                    <span className="w-6">{it.quantity}</span>
                    <div className="flex-1 px-1 overflow-hidden">
                       <p className="truncate uppercase">{it.name}</p>
                       {it.variant && <p className="text-[7px] italic">- {it.variant}</p>}
                    </div>
                    <span className="w-12 text-right">{(it.price * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-black pt-2 space-y-1">
                <div className="flex justify-between font-black text-[11px]">
                   <span>TOTAL:</span>
                   <span>S/ {lastOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[7px] font-bold">
                   <span>MÉTODO:</span>
                   <span className="uppercase">{lastOrder.payment_method}</span>
                </div>
                {lastOrder.payment_method === 'Efectivo' && (
                  <div className="flex justify-between text-[7px] border-t border-black/10 pt-1 mt-1">
                     <span>VUELTO:</span>
                     <span>S/ {parseFloat(lastOrder.change || '0').toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="mt-6 text-center text-[7px] uppercase font-bold opacity-60">
                <p>¡Gracias, sobrino!</p>
                <p>elchurremalcriado.com</p>
              </div>
            </div>

            <div className="mt-6 space-y-2 no-print">
               <div className="grid grid-cols-2 gap-2">
                 <button onClick={() => window.print()} className="py-3 bg-slate-900 text-white rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-2">
                   <i className="fa-solid fa-print"></i>Imprimir
                 </button>
                 <button onClick={sendWhatsAppReceipt} className="py-3 bg-green-500 text-white rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-2">
                   <i className="fa-brands fa-whatsapp"></i>Enviar
                 </button>
               </div>
               <button 
                 onClick={() => { setShowReceipt(false); setLastOrder(null); }} 
                 className="w-full py-4 bg-pink-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-pink-200"
               >
                 Nueva Venta
               </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #thermal-receipt, #thermal-receipt * { visibility: visible; }
          #thermal-receipt {
            position: fixed; left: 0; top: 0; width: 58mm; margin: 0; padding: 0;
            border: none !important; box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};
