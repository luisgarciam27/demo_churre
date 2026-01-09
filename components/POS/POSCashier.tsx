
import React, { useState, useMemo } from 'react';
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
  const [itemForVariant, setItemForVariant] = useState<MenuItem | null>(null);
  
  // Estado del Recibo
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

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
    setCart(prev => prev.map(i => 
      (i.id === id && i.selectedVariant?.id === variantId) 
        ? { ...i, quantity: i.quantity + delta } 
        : i
    ).filter(i => i.quantity > 0));
  };

  const total = useMemo(() => cart.reduce((acc, curr) => {
    const price = curr.selectedVariant ? curr.selectedVariant.price : curr.price;
    return acc + (price * curr.quantity);
  }, 0), [cart]);

  const effectiveReceived = receivedAmount === '' ? total : parseFloat(receivedAmount);
  const changeAmount = paymentMethod === 'Efectivo' ? Math.max(0, effectiveReceived - total) : 0;

  const handleProcessOrder = async () => {
    if (cart.length === 0 || isProcessing) return;
    setIsProcessing(true);
    
    const orderData = {
      customer_name: "Venta Local",
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

      // Intentar actualizar la sesión pero no bloquear si falla el rpc
      try {
        await supabase.rpc('increment_session_sales', { session_id: session.id, amount: total });
      } catch (rpcErr) {
        console.warn("RPC increment_session_sales falló, continuando...");
      }
      
      const finalReceipt = {
        ...data,
        received: effectiveReceived,
        change: changeAmount,
        cashier: session.user_name
      };
      
      // ORDEN CRÍTICO: Guardar datos -> Mostrar Modal -> Limpiar Carrito
      setReceiptData(finalReceipt);
      setShowReceiptModal(true);
      setCart([]);
      setReceivedAmount('');
      onOrderComplete();
    } catch (e: any) {
      alert("⚠️ Error al generar venta: " + (e.message || "Error desconocido"));
    } finally {
      setIsProcessing(false);
    }
  };

  const shareWhatsApp = () => {
    if (!receiptData) return;
    const items = receiptData.items.map((i: any) => `• ${i.quantity}x ${i.name} ${i.variant ? `(${i.variant})` : ''}`).join('\n');
    const text = encodeURIComponent(
      `🔥 *EL CHURRE MALCRIADO*\n` +
      `*TICKET DE VENTA #000${receiptData.id}*\n\n` +
      `${items}\n\n` +
      `*TOTAL: S/ ${receiptData.total.toFixed(2)}*\n` +
      `Pago: ${receiptData.payment_method}\n` +
      `Vuelto: S/ ${receiptData.change.toFixed(2)}\n\n` +
      `¡Vuelve pronto sobrino! 🌶️`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const filteredMenu = menu.filter(m => 
    (activeCategory === 'Todos' || m.category === activeCategory) &&
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex overflow-hidden bg-[#f8fafc] relative font-sans select-none">
      
      {/* 1. SECCIÓN DE PRODUCTOS (MAXIMIZADA) */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 shadow-inner">
        {/* Cabecera Slim (5% aprox) */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4">
          <div className="relative w-64">
            <i className="fa-solid fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
            <input 
              type="text" 
              placeholder="¿Qué busca el churre?..." 
              className="w-full bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-pink-100 transition-all"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1 py-1">
            <button 
              onClick={() => setActiveCategory('Todos')} 
              className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === 'Todos' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
            >
              Todos
            </button>
            {categories.map(c => (
              <button 
                key={c.id} 
                onClick={() => setActiveCategory(c.name)} 
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeCategory === c.name ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:bg-slate-50'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Productos Premium */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#f8fafc]">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 content-start">
            {filteredMenu.map(item => (
              <button 
                key={item.id} 
                onClick={() => addToCart(item)}
                className="group relative bg-white border border-slate-100 p-2 rounded-[1.5rem] flex flex-col items-center gap-2 hover:border-pink-300 hover:shadow-[0_10px_30px_rgba(233,30,99,0.08)] transition-all duration-300 active:scale-90"
              >
                <div className="w-full aspect-square rounded-2xl overflow-hidden bg-slate-50 relative">
                   <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                   <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <div className="text-center px-1 pb-1">
                  <p className="text-[9px] font-black text-slate-800 uppercase leading-none mb-1 truncate w-full">{item.name}</p>
                  <p className="text-[11px] font-black text-[#e91e63] tracking-tighter">S/ {item.price.toFixed(2)}</p>
                </div>
                {item.variants && item.variants.length > 0 && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full border-2 border-white"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. PANEL DE TICKET (DERECHA) */}
      <div className="w-[340px] flex flex-col bg-white shadow-2xl z-10">
        <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Resumen de Venta</h3>
          <button onClick={() => setCart([])} className="w-8 h-8 rounded-full bg-red-50 text-red-400 hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-trash-can text-[10px]"></i></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar bg-white">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10 py-20">
               <i className="fa-solid fa-receipt text-6xl mb-4"></i>
               <p className="font-black text-xs uppercase">Carrito Vacío</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={`${item.id}-${item.selectedVariant?.id || idx}`} className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100 flex items-center justify-between group animate-fade-in-up">
                <div className="flex-1 min-w-0 pr-3">
                  <p className="font-black text-slate-800 text-[10px] uppercase truncate leading-none mb-1">{item.name}</p>
                  {item.selectedVariant && <p className="text-[7px] font-black text-[#e91e63] uppercase bg-pink-50 px-1.5 py-0.5 rounded-md w-fit">{item.selectedVariant.name}</p>}
                  <p className="text-[9px] font-bold text-slate-400 mt-1">S/ {(item.selectedVariant?.price || item.price).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => updateQty(item.id, -1, item.selectedVariant?.id)} className="w-7 h-7 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white transition-all"><i className="fa-solid fa-minus text-[8px]"></i></button>
                  <span className="w-5 text-center font-black text-slate-800 text-[11px]">{item.quantity}</span>
                  <button onClick={() => updateQty(item.id, 1, item.selectedVariant?.id)} className="w-7 h-7 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white transition-all"><i className="fa-solid fa-plus text-[8px]"></i></button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Panel de Control de Pago */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 space-y-4 shadow-[0_-20px_40px_rgba(0,0,0,0.03)]">
          <div className="grid grid-cols-4 gap-1.5">
            {['Efectivo', 'Yape', 'Plin', 'Tarjeta'].map(m => (
              <button 
                key={m} 
                onClick={() => setPaymentMethod(m as any)} 
                className={`py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${paymentMethod === m ? 'bg-pink-500 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-100'}`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200">
             <div className="flex justify-between items-center mb-2">
                <span className="text-[8px] font-black uppercase text-slate-400">Recibido (S/)</span>
                <button onClick={() => setReceivedAmount('')} className="text-[8px] font-black text-pink-500 bg-pink-50 px-2 py-1 rounded-lg uppercase">¿Monto Exacto?</button>
             </div>
             <div className="flex items-center gap-4">
                <input 
                  type="number" 
                  placeholder={total.toFixed(2)}
                  className="w-full bg-slate-50 border-none px-4 py-2.5 rounded-2xl font-black text-slate-800 text-lg outline-none"
                  value={receivedAmount}
                  onChange={e => setReceivedAmount(e.target.value)}
                />
                <div className="text-right">
                  <p className="text-[7px] font-black text-slate-300 uppercase">Vuelto</p>
                  <p className="text-sm font-black text-green-600">S/ {changeAmount.toFixed(2)}</p>
                </div>
             </div>
          </div>

          <div className="flex justify-between items-center px-1">
             <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Total Cobrar</span>
             <span className="text-3xl font-black text-slate-900 tracking-tighter brand-font">S/ {total.toFixed(2)}</span>
          </div>

          <button 
            disabled={cart.length === 0 || isProcessing || (paymentMethod === 'Efectivo' && receivedAmount !== '' && parseFloat(receivedAmount) < total)}
            onClick={handleProcessOrder}
            className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${cart.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-900 text-white hover:bg-black'}`}
          >
            {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-solid fa-cash-register"></i><span>{receivedAmount === '' && paymentMethod === 'Efectivo' ? 'COBRO EXACTO' : 'FINALIZAR VENTA'}</span></>}
          </button>
        </div>
      </div>

      {/* MODAL VARIANTES */}
      {itemForVariant && (
        <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-[300px] rounded-[3rem] p-8 shadow-2xl animate-zoom-in">
             <h3 className="text-sm font-black text-slate-800 mb-6 uppercase text-center tracking-widest">{itemForVariant.name}</h3>
             <div className="space-y-2 mb-8">
                {itemForVariant.variants?.map(v => (
                  <button key={v.id} onClick={() => addToCart(itemForVariant, v)} className="w-full flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-pink-200 transition-all group">
                    <span className="font-bold text-[10px] text-slate-700 uppercase">{v.name}</span>
                    <span className="font-black text-[10px] text-slate-900">S/ {v.price.toFixed(2)}</span>
                  </button>
                ))}
             </div>
             <button onClick={() => setItemForVariant(null)} className="w-full py-2 text-[8px] font-black uppercase text-slate-300 tracking-[0.3em]">Cerrar</button>
          </div>
        </div>
      )}

      {/* MODAL RECIBO DEFINITIVO (Z-INDEX 9999) */}
      {showReceiptModal && receiptData && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative bg-white w-full max-w-[350px] rounded-[3rem] p-8 shadow-[0_0_100px_rgba(233,30,99,0.3)] animate-zoom-in my-auto">
            
            {/* TICKET VISUAL REALISTA */}
            <div id="thermal-receipt" className="bg-white font-mono text-[9px] text-black p-6 border border-slate-100 rounded-xl leading-snug shadow-sm">
               <div className="text-center mb-5 space-y-1">
                  <h2 className="text-[13px] font-black uppercase tracking-tight">EL CHURRE MALCRIADO</h2>
                  <p className="text-[8px] font-bold">Av. Grau 456 - Piura, Perú</p>
                  <p className="text-[8px]">RUC: 10234567891</p>
                  <div className="border-y border-dashed border-black/30 py-2 my-2">
                     <p className="font-black">ORDEN #000{receiptData.id}</p>
                     <p className="text-[7px]">{new Date(receiptData.created_at).toLocaleString('es-PE')}</p>
                  </div>
               </div>

               <div className="mb-5">
                  <div className="flex justify-between border-b border-dashed border-black/20 pb-1 mb-2 font-bold uppercase text-[8px]">
                     <span className="w-8">Cant</span>
                     <span className="flex-1 text-center">Descripción</span>
                     <span className="w-14 text-right">Total</span>
                  </div>
                  <div className="space-y-1.5">
                    {receiptData.items.map((it: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start">
                        <span className="w-8 font-bold">{it.quantity}</span>
                        <div className="flex-1 px-1 overflow-hidden">
                           <p className="truncate uppercase font-medium">{it.name}</p>
                           {it.variant && <p className="text-[7px] italic text-slate-500">({it.variant})</p>}
                        </div>
                        <span className="w-14 text-right font-black">S/ {(it.price * it.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="border-t border-dashed border-black/30 pt-3 space-y-1">
                  <div className="flex justify-between font-black text-[11px]">
                     <span>TOTAL PAGADO:</span>
                     <span>S/ {receiptData.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[7px] font-bold opacity-60">
                     <span>MÉTODO:</span>
                     <span className="uppercase">{receiptData.payment_method}</span>
                  </div>
                  {receiptData.payment_method === 'Efectivo' && (
                    <>
                      <div className="flex justify-between text-[7px] opacity-60">
                         <span>RECIBIDO:</span>
                         <span>S/ {parseFloat(receiptData.received || '0').toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-black text-[9px] border-t border-black/10 pt-1 mt-1">
                         <span>VUELTO:</span>
                         <span>S/ {parseFloat(receiptData.change || '0').toFixed(2)}</span>
                      </div>
                    </>
                  )}
               </div>

               <div className="mt-8 text-center text-[7px] uppercase font-bold space-y-1 opacity-50">
                  <p>¡Gracias por tu compra, churre!</p>
                  <p>Cajero: {receiptData.cashier}</p>
                  <p>WWW.ELCHURRE.PE</p>
               </div>
            </div>

            {/* BOTONES DE ACCIÓN (NO SE IMPRIMEN) */}
            <div className="mt-8 space-y-3 no-print">
               <div className="grid grid-cols-2 gap-3">
                 <button 
                  onClick={() => window.print()}
                  className="py-4 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"
                 >
                   <i className="fa-solid fa-print"></i>Imprimir
                 </button>
                 <button 
                  onClick={shareWhatsApp}
                  className="py-4 bg-green-500 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-600 transition-all"
                 >
                   <i className="fa-brands fa-whatsapp"></i>Compartir
                 </button>
               </div>
               <button 
                onClick={() => { setShowReceiptModal(false); setReceiptData(null); }}
                className="w-full py-5 bg-pink-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl shadow-pink-200 transition-all active:scale-95"
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
            position: fixed; left: 0; top: 0; width: 100%;
            border: none !important; box-shadow: none !important;
          }
          .no-print { display: none !important; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
};
