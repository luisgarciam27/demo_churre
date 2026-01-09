
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
  
  // State for variant selection modal
  const [itemForVariant, setItemForVariant] = useState<MenuItem | null>(null);

  const addToCart = (item: MenuItem, variant?: ItemVariant) => {
    // If item has variants and none is selected, open variant modal
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

  const changeAmount = paymentMethod === 'Efectivo' && receivedAmount 
    ? Math.max(0, parseFloat(receivedAmount) - total) 
    : 0;

  const handleProcessOrder = async () => {
    if (cart.length === 0 || isProcessing) return;
    
    if (paymentMethod === 'Efectivo') {
      const received = parseFloat(receivedAmount);
      if (isNaN(received) || received < total) {
        alert("El monto recibido es insuficiente o inválido.");
        return;
      }
    }

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
      session_id: session.id,
      notes: paymentMethod === 'Efectivo' ? `Efectivo: ${receivedAmount} | Vuelto: ${changeAmount.toFixed(2)}` : ''
    };

    try {
      const { data, error } = await supabase.from('orders').insert(orderData).select().single();

      if (!error) {
        await supabase.rpc('increment_session_sales', { session_id: session.id, amount: total });
        setLastOrder({
          ...data,
          received: receivedAmount,
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
      console.error("Error de DB:", e);
      alert("Error al procesar la venta: " + (e.message || "Error desconocido"));
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
      {/* AREA DE PRODUCTOS */}
      <div className="flex-1 flex flex-col border-r border-slate-100 bg-slate-50/30">
        <div className="p-6 bg-white border-b border-slate-100 flex gap-4 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
             <i className="fa-solid fa-magnifying-glass absolute left-5 top-1/2 -translate-y-1/2 text-slate-300"></i>
             <input 
               type="text" 
               placeholder="Buscar plato..." 
               className="w-full bg-slate-50 border border-slate-200 pl-12 pr-6 py-4 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-pink-50 transition-all shadow-sm"
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setViewMode('grid')} 
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${viewMode === 'grid' ? 'bg-[#e91e63] text-white shadow-lg shadow-pink-100' : 'bg-white border border-slate-200 text-slate-400'}`}
            >
              <i className="fa-solid fa-table-cells-large"></i>
            </button>
            <button 
              onClick={() => setViewMode('list')} 
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${viewMode === 'list' ? 'bg-[#e91e63] text-white shadow-lg shadow-pink-100' : 'bg-white border border-slate-200 text-slate-400'}`}
            >
              <i className="fa-solid fa-list"></i>
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-md">
            <button onClick={() => setActiveCategory('Todos')} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeCategory === 'Todos' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400'}`}>Todos</button>
            {categories.map(c => (
              <button key={c.id} onClick={() => setActiveCategory(c.name)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === c.name ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-400'}`}>{c.name}</button>
            ))}
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto p-8 custom-scrollbar ${viewMode === 'grid' ? 'grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6' : 'space-y-3'}`}>
          {filteredMenu.map(item => (
            viewMode === 'grid' ? (
              <button 
                key={item.id} 
                onClick={() => addToCart(item)}
                className="group bg-white border border-slate-100 p-6 rounded-[2.5rem] flex flex-col items-center text-center gap-3 hover:shadow-xl hover:shadow-slate-200/50 transition-all active:scale-95 text-slate-700 relative overflow-hidden"
              >
                <div className="w-20 h-20 rounded-3xl overflow-hidden mb-1 shadow-inner bg-slate-50">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                </div>
                <p className="font-black text-[11px] leading-tight h-8 flex items-center">{item.name}</p>
                <p className="text-[#e91e63] font-black text-sm">S/ {item.price.toFixed(2)}</p>
                {item.variants && item.variants.length > 0 && (
                  <span className="absolute top-4 right-4 text-[8px] bg-slate-100 text-slate-400 px-2 py-1 rounded-full font-black uppercase">Variantes</span>
                )}
              </button>
            ) : (
              <button 
                key={item.id} 
                onClick={() => addToCart(item)}
                className="w-full bg-white border border-slate-100 p-4 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-all active:scale-[0.99] text-left group"
              >
                <div className="flex items-center gap-4">
                  <img src={item.image} className="w-12 h-12 rounded-xl object-cover" />
                  <div>
                    <p className="font-black text-sm text-slate-800">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{item.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  {item.variants && item.variants.length > 0 && (
                    <span className="text-[9px] bg-pink-50 text-[#e91e63] px-3 py-1 rounded-full font-black uppercase tracking-widest">Opciones</span>
                  )}
                  <span className="text-lg font-black text-slate-900">S/ {item.price.toFixed(2)}</span>
                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-[#e91e63] group-hover:text-white transition-all">
                    <i className="fa-solid fa-plus"></i>
                  </div>
                </div>
              </button>
            )
          ))}
        </div>
      </div>

      {/* PANEL DE COBRO (CARRITO) */}
      <div className="w-[450px] flex flex-col bg-slate-50 border-l border-slate-200">
        <div className="p-8 border-b border-slate-200 bg-white flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-800 brand-font">Resumen de Venta</h3>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Sessión: {session.user_name}</p>
          </div>
          <button onClick={() => setCart([])} className="px-4 py-2 rounded-xl bg-red-50 text-red-500 text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all">Limpiar Todo</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
          {cart.map((item, idx) => {
            const itemPrice = item.selectedVariant ? item.selectedVariant.price : item.price;
            return (
              <div key={`${item.id}-${item.selectedVariant?.id || idx}`} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between animate-fade-in-up">
                <div className="flex-1 min-w-0 pr-4">
                  <p className="font-bold text-slate-700 text-sm truncate">{item.name}</p>
                  {item.selectedVariant && (
                    <p className="text-[10px] font-black text-[#e91e63] uppercase bg-pink-50 px-2 py-0.5 rounded-full w-fit mt-1">{item.selectedVariant.name}</p>
                  )}
                  <p className="text-[10px] font-black text-slate-400 uppercase mt-1">S/ {itemPrice.toFixed(2)} c/u</p>
                </div>
                <div className="flex items-center gap-3">
                   <button onClick={() => updateQty(item.id, -1, item.selectedVariant?.id)} className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100"><i className="fa-solid fa-minus text-[10px]"></i></button>
                   <span className="w-6 text-center font-black text-slate-700 text-sm">{item.quantity}</span>
                   <button onClick={() => updateQty(item.id, 1, item.selectedVariant?.id)} className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center"><i className="fa-solid fa-plus text-[10px]"></i></button>
                   <button onClick={() => removeItem(item.id, item.selectedVariant?.id)} className="w-8 h-8 rounded-xl bg-red-50 text-red-300 flex items-center justify-center ml-2"><i className="fa-solid fa-trash text-[10px]"></i></button>
                </div>
              </div>
            );
          })}
          {cart.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-30 text-center py-20">
               <i className="fa-solid fa-cart-shopping text-5xl mb-6 text-slate-300"></i>
               <p className="font-black text-[10px] uppercase tracking-widest text-slate-400">Carrito vacío, churre.</p>
            </div>
          )}
        </div>

        {/* PANEL DE PAGO */}
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

          {paymentMethod === 'Efectivo' && (
            <div className="space-y-4 animate-fade-in-up">
              <div className="flex gap-2">
                {[10, 20, 50, 100].map(val => (
                  <button 
                    key={val} 
                    onClick={() => setReceivedAmount(val.toString())}
                    className="flex-1 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black text-slate-400 hover:bg-slate-100 transition-all"
                  >
                    S/ {val}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Monto Recibido</label>
                  <input 
                    type="number" 
                    placeholder="0.00" 
                    className="w-full bg-transparent text-xl font-black text-slate-800 outline-none"
                    value={receivedAmount}
                    onChange={e => setReceivedAmount(e.target.value)}
                  />
                </div>
                <div className="text-right">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Vuelto</label>
                  <span className={`text-xl font-black ${changeAmount > 0 ? 'text-green-500' : 'text-slate-300'}`}>S/ {changeAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center px-2">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total a Pagar</span>
            <span className="text-4xl font-black text-slate-900 tracking-tighter">S/ {total.toFixed(2)}</span>
          </div>

          <button 
            disabled={cart.length === 0 || isProcessing || (paymentMethod === 'Efectivo' && (parseFloat(receivedAmount) < total || !receivedAmount))}
            onClick={handleProcessOrder}
            className="w-full py-6 bg-[#e91e63] text-white rounded-3xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-pink-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-20 flex items-center justify-center gap-4"
          >
            {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-bolt"></i><span>Cobrar e Imprimir</span></>}
          </button>
        </div>
      </div>

      {/* MODAL PARA SELECCIONAR VARIANTE */}
      {itemForVariant && (
        <div className="fixed inset-0 z-[1100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl animate-zoom-in">
             <h3 className="text-2xl font-black text-slate-800 mb-2 brand-font">{itemForVariant.name}</h3>
             <p className="text-xs text-slate-400 font-medium mb-8">Selecciona una opción o tamaño para este producto:</p>
             
             <div className="space-y-3 mb-10">
                {itemForVariant.variants?.map(v => (
                  <button 
                    key={v.id}
                    onClick={() => addToCart(itemForVariant, v)}
                    className="w-full flex justify-between items-center p-6 bg-slate-50 rounded-2xl border-2 border-transparent hover:border-pink-200 transition-all group"
                  >
                    <span className="font-bold text-slate-700 group-hover:text-[#e91e63]">{v.name}</span>
                    <span className="font-black text-slate-900">S/ {v.price.toFixed(2)}</span>
                  </button>
                ))}
             </div>

             <button 
               onClick={() => setItemForVariant(null)} 
               className="w-full py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest"
             >
               Cancelar
             </button>
          </div>
        </div>
      )}

      {/* MODAL DE RECIBO DE VENTA */}
      {showReceipt && lastOrder && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-[420px] rounded-[3rem] p-10 shadow-2xl animate-zoom-in my-auto">
            
            {/* Cabecera del Ticket */}
            <div id="printable-receipt" className="bg-white p-6 font-mono text-xs text-slate-800 border-2 border-dashed border-slate-100 rounded-3xl">
              <div className="text-center space-y-1 mb-8">
                 <h2 className="text-xl font-black tracking-tight uppercase">EL CHURRE MALCRIADO</h2>
                 <p className="text-[9px] font-bold">Av. Grau 1234 - Piura</p>
                 <p className="text-[9px] font-bold">RUC: 10745829631</p>
                 <div className="py-3 border-y border-slate-100 my-4">
                    <p className="text-[10px] font-black uppercase">Ticket de Venta #000{lastOrder.id}</p>
                 </div>
                 <div className="flex justify-between text-[8px] font-bold opacity-60">
                    <span>FECHA: {new Date(lastOrder.created_at).toLocaleDateString()}</span>
                    <span>HORA: {new Date(lastOrder.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                 </div>
              </div>

              {/* Cuerpo del Ticket */}
              <div className="space-y-3 mb-8">
                <div className="flex justify-between border-b border-slate-100 pb-2 mb-2 text-[9px] font-black">
                   <span className="w-8">CANT</span>
                   <span className="flex-1 px-2">PRODUCTO</span>
                   <span className="w-16 text-right">SUBT</span>
                </div>
                {lastOrder.items.map((it: any, idx: number) => (
                  <div key={idx} className="flex flex-col leading-tight py-1">
                    <div className="flex justify-between">
                      <span className="w-8 font-black">{it.quantity}</span>
                      <span className="flex-1 px-2 truncate uppercase font-bold">{it.name}</span>
                      <span className="w-16 text-right font-black">{(it.price * it.quantity).toFixed(2)}</span>
                    </div>
                    {it.variant && (
                      <span className="text-[8px] pl-10 opacity-60 italic">- {it.variant}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Totales y Pago */}
              <div className="border-t-2 border-slate-200 pt-6 space-y-3">
                <div className="flex justify-between font-black text-lg">
                   <span>TOTAL:</span>
                   <span>S/ {lastOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                   <span className="opacity-70">METODO:</span>
                   <span className="uppercase">{lastOrder.payment_method}</span>
                </div>
                {lastOrder.payment_method === 'Efectivo' && (
                  <>
                    <div className="flex justify-between text-[10px] font-bold border-t border-slate-50 pt-2">
                       <span className="opacity-70">RECIBIDO:</span>
                       <span>S/ {parseFloat(lastOrder.received || '0').toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-black">
                       <span className="opacity-70 uppercase">VUELTO:</span>
                       <span className="text-green-600">S/ {parseFloat(lastOrder.change || '0').toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-10 text-center space-y-3">
                <p className="text-[10px] font-black uppercase">¡Gracias por tu compra, churre!</p>
                <p className="text-[9px] font-bold opacity-40">¡El sabor más malcriado de Piura!</p>
                <div className="flex justify-center pt-6 opacity-20">
                   <i className="fa-solid fa-barcode text-5xl"></i>
                </div>
              </div>
            </div>

            {/* Acciones del Modal */}
            <div className="mt-10 grid grid-cols-2 gap-4 no-print">
               <button 
                 onClick={handlePrint}
                 className="py-5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-slate-200 transition-all hover:scale-105 active:scale-95"
               >
                 <i className="fa-solid fa-print"></i>
                 Imprimir
               </button>
               <button 
                 onClick={() => { setShowReceipt(false); setLastOrder(null); }}
                 className="py-5 bg-[#e91e63] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-pink-100 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
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
            width: 80mm;
            margin: 0;
            padding: 5mm;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};
