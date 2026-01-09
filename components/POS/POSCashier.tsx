
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
        return prev.map(i => (i.id === item.id && i.selectedVariant?.id === variantId) ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, selectedVariant: variant }];
    });
    setItemForVariant(null);
  };

  const updateQty = (id: string, delta: number, variantId?: string) => {
    setCart(prev => prev.map(i => (i.id === id && i.selectedVariant?.id === variantId) ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
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
      setShowReceipt(true);
      setCart([]);
      setReceivedAmount('');
      onOrderComplete();
    } catch (e: any) {
      alert("Error: " + (e.message || "Error de red"));
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredMenu = (activeCategory === 'Todos' ? menu : menu.filter(m => m.category === activeCategory))
    .filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-full flex overflow-hidden bg-white relative font-sans">
      {/* SECCIÓN PRODUCTOS - ULTRA COMPACTA */}
      <div className="flex-1 flex flex-col bg-slate-50/50">
        <div className="p-2.5 bg-white border-b border-slate-200 flex gap-2 items-center">
          <div className="relative w-48">
             <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-[10px]"></i>
             <input type="text" placeholder="Buscar..." className="w-full bg-slate-50 border border-slate-200 pl-8 pr-3 py-1.5 rounded-lg text-[11px] font-bold outline-none focus:ring-2 focus:ring-pink-100" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 overflow-x-auto no-scrollbar flex-1">
            <button onClick={() => setActiveCategory('Todos')} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeCategory === 'Todos' ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400'}`}>Todos</button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setActiveCategory(c.name)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeCategory === c.name ? 'bg-slate-900 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-400'}`}>{c.name}</button>
            ))}
          </div>
          <div className="flex bg-slate-100 p-0.5 rounded-lg ml-2">
            <button onClick={() => setViewMode('grid')} className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-white text-pink-500 shadow-xs' : 'text-slate-400'}`}><i className="fa-solid fa-th-large text-[10px]"></i></button>
            <button onClick={() => setViewMode('list')} className={`w-7 h-7 rounded-md flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-white text-pink-500 shadow-xs' : 'text-slate-400'}`}><i className="fa-solid fa-list text-[10px]"></i></button>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto p-3 custom-scrollbar ${viewMode === 'grid' ? 'grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2.5 content-start' : 'space-y-1.5'}`}>
          {filteredMenu.map(item => (
            viewMode === 'grid' ? (
              <button key={item.id} onClick={() => addToCart(item)} className="group bg-white border border-slate-100 p-2.5 rounded-xl flex flex-col items-center text-center gap-1.5 hover:border-pink-200 hover:shadow-md transition-all active:scale-95 relative h-fit">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex flex-col justify-center min-h-[2rem]">
                   <p className="font-bold text-[9px] leading-tight line-clamp-2 text-slate-700 uppercase tracking-tighter">{item.name}</p>
                   <p className="text-[#e91e63] font-black text-[10px]">S/ {item.price.toFixed(2)}</p>
                </div>
                {item.variants && item.variants.length > 0 && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-pink-400 rounded-full"></div>}
              </button>
            ) : (
              <button key={item.id} onClick={() => addToCart(item)} className="w-full bg-white border border-slate-100 p-2 rounded-lg flex items-center justify-between hover:bg-pink-50/20 transition-all active:scale-[0.99] text-left group">
                <div className="flex items-center gap-3">
                  <img src={item.image} className="w-8 h-8 rounded-md object-cover" />
                  <div>
                    <p className="font-bold text-[10px] text-slate-800 uppercase tracking-tighter">{item.name}</p>
                    <p className="text-[8px] text-slate-400 font-bold uppercase">{item.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-slate-900">S/ {item.price.toFixed(2)}</span>
                  <div className="w-6 h-6 rounded-md bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-pink-500 group-hover:text-white transition-all"><i className="fa-solid fa-plus text-[8px]"></i></div>
                </div>
              </button>
            )
          ))}
        </div>
      </div>

      {/* PANEL DE TICKET (DERECHA) */}
      <div className="w-[320px] flex flex-col bg-white border-l border-slate-200">
        <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
          <h3 className="text-sm font-black text-slate-800 brand-font uppercase">Ticket Actual</h3>
          <button onClick={() => setCart([])} className="text-[8px] font-black uppercase text-red-400 hover:text-red-600">Limpiar</button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {cart.map((item, idx) => (
            <div key={`${item.id}-${item.selectedVariant?.id || idx}`} className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between animate-fade-in-up">
              <div className="flex-1 min-w-0 pr-2">
                <p className="font-bold text-slate-800 text-[10px] truncate leading-none mb-1 uppercase tracking-tighter">{item.name}</p>
                {item.selectedVariant && <p className="text-[7px] font-black text-[#e91e63] uppercase bg-pink-50 px-1 py-0.5 rounded w-fit mb-1">{item.selectedVariant.name}</p>}
                <p className="text-[9px] font-bold text-slate-400">S/ {(item.selectedVariant?.price || item.price).toFixed(2)}</p>
              </div>
              <div className="flex items-center gap-1.5">
                 <button onClick={() => updateQty(item.id, -1, item.selectedVariant?.id)} className="w-6 h-6 rounded-md bg-slate-50 text-slate-400 flex items-center justify-center"><i className="fa-solid fa-minus text-[8px]"></i></button>
                 <span className="w-4 text-center font-black text-slate-700 text-[10px]">{item.quantity}</span>
                 <button onClick={() => updateQty(item.id, 1, item.selectedVariant?.id)} className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center"><i className="fa-solid fa-plus text-[8px]"></i></button>
                 <button onClick={() => setCart(prev => prev.filter(i => !(i.id === item.id && i.selectedVariant?.id === item.selectedVariant?.id)))} className="ml-1 text-slate-200 hover:text-red-400"><i className="fa-solid fa-times text-[10px]"></i></button>
              </div>
            </div>
          ))}
          {cart.length === 0 && <div className="h-full flex flex-col items-center justify-center opacity-10 text-center py-20"><i className="fa-solid fa-receipt text-3xl"></i></div>}
        </div>

        <div className="p-4 bg-white border-t border-slate-100 space-y-4 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <div className="grid grid-cols-4 gap-1">
            {['Efectivo', 'Yape', 'Plin', 'Tarjeta'].map(m => (
              <button key={m} onClick={() => setPaymentMethod(m as any)} className={`py-2 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${paymentMethod === m ? 'bg-pink-500 text-white shadow-md' : 'bg-slate-50 text-slate-400'}`}>{m}</button>
            ))}
          </div>

          {paymentMethod === 'Efectivo' && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 animate-fade-in">
               <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Pago en Efectivo</label>
                  <button onClick={() => setReceivedAmount('')} className="text-[8px] font-black text-pink-500 uppercase">¿Exacto?</button>
               </div>
               <div className="flex items-center gap-2">
                 <div className="relative flex-1">
                   <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300 text-[10px] font-black">S/</span>
                   <input type="number" placeholder={total.toFixed(2)} className="w-full bg-white border border-slate-200 pl-6 pr-2 py-2 rounded-lg font-black text-slate-800 text-xs outline-none" value={receivedAmount} onChange={e => setReceivedAmount(e.target.value)} />
                 </div>
                 <div className="text-right">
                    <p className="text-[7px] font-black text-slate-400 uppercase leading-none">Vuelto</p>
                    <p className="text-[11px] font-black text-green-600 leading-none mt-1">S/ {changeAmount.toFixed(2)}</p>
                 </div>
               </div>
            </div>
          )}

          <div className="flex justify-between items-end pb-1 px-1">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider mb-0.5">Total Cobrar</span>
            <span className="text-2xl font-black text-slate-900 tracking-tighter">S/ {total.toFixed(2)}</span>
          </div>

          <button 
            disabled={cart.length === 0 || isProcessing || (paymentMethod === 'Efectivo' && receivedAmount !== '' && parseFloat(receivedAmount) < total)}
            onClick={handleProcessOrder}
            className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-20 flex items-center justify-center gap-2"
          >
            {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-check-circle"></i><span>{receivedAmount === '' && paymentMethod === 'Efectivo' ? 'PAGO EXACTO' : 'CERRAR VENTA'}</span></>}
          </button>
        </div>
      </div>

      {/* MODAL VARIANTES */}
      {itemForVariant && (
        <div className="fixed inset-0 z-[1500] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[280px] rounded-[2rem] p-6 shadow-2xl animate-zoom-in">
             <h3 className="text-sm font-black text-slate-800 mb-4 uppercase text-center">{itemForVariant.name}</h3>
             <div className="space-y-1.5 mb-6">
                {itemForVariant.variants?.map(v => (
                  <button key={v.id} onClick={() => addToCart(itemForVariant, v)} className="w-full flex justify-between items-center p-3.5 bg-slate-50 rounded-xl border border-transparent hover:border-pink-200 transition-all group">
                    <span className="font-bold text-[10px] text-slate-700 uppercase">{v.name}</span>
                    <span className="font-black text-[10px] text-slate-900">S/ {v.price.toFixed(2)}</span>
                  </button>
                ))}
             </div>
             <button onClick={() => setItemForVariant(null)} className="w-full py-2 text-[8px] font-black uppercase text-slate-400 tracking-widest">Cancelar</button>
          </div>
        </div>
      )}

      {/* RECIBO DE VENTA (TICKET TÉRMICO) */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 z-[3000] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-[340px] rounded-[2rem] p-6 shadow-[0_0_100px_rgba(0,0,0,0.5)] animate-zoom-in my-auto">
            <div id="printable-receipt" className="bg-white font-mono text-[9px] text-black p-4 leading-tight border border-slate-100">
              <div className="text-center space-y-1 mb-4">
                 <h2 className="text-[12px] font-black uppercase">EL CHURRE MALCRIADO</h2>
                 <p className="text-[8px]">AV. GRAU 1234 - PIURA</p>
                 <p className="text-[8px]">RUC: 10745829631</p>
                 <div className="border-y border-dashed border-black py-2 my-2">
                    <p className="font-bold uppercase">Ticket Venta #000{lastOrder.id}</p>
                    <p>{new Date(lastOrder.created_at).toLocaleString('es-PE')}</p>
                 </div>
              </div>
              <div className="space-y-1 mb-4">
                <div className="flex justify-between border-b border-dashed border-black pb-1 mb-1 font-bold">
                   <span className="w-6">CANT</span>
                   <span className="flex-1 px-1 text-center">DETALLE</span>
                   <span className="w-12 text-right">TOTAL</span>
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
              <div className="border-t border-dashed border-black pt-2 space-y-1 text-[10px]">
                <div className="flex justify-between font-black">
                   <span>TOTAL A PAGAR:</span>
                   <span>S/ {lastOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between opacity-70">
                   <span>MÉTODO:</span>
                   <span className="uppercase">{lastOrder.payment_method}</span>
                </div>
                {lastOrder.payment_method === 'Efectivo' && (
                  <>
                    <div className="flex justify-between opacity-70">
                       <span>RECIBIDO:</span>
                       <span>S/ {parseFloat(lastOrder.received || '0').toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-black/10 pt-1 mt-1">
                       <span>VUELTO:</span>
                       <span>S/ {parseFloat(lastOrder.change || '0').toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="mt-6 text-center text-[7px] uppercase font-bold space-y-1 opacity-60">
                <p>¡Gracias por tu compra, churre!</p>
                <p>Pide online en: elchurremalcriado.com</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 no-print">
               <button onClick={() => window.print()} className="py-4 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2"><i className="fa-solid fa-print"></i>Imprimir</button>
               <button onClick={() => { setShowReceipt(false); setLastOrder(null); }} className="py-4 bg-pink-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest">Siguiente Venta</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #printable-receipt, #printable-receipt * { visibility: visible; }
          #printable-receipt {
            position: fixed; left: 0; top: 0;
            width: 80mm; margin: 0; padding: 2mm;
            border: none !important; box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};
