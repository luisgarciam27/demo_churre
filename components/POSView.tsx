
import React, { useState, useEffect } from 'react';
import { MenuItem, Category, ItemVariant } from '../types';
import { supabase } from '../services/supabaseClient';

interface POSViewProps {
  menu: MenuItem[];
  categories: Category[];
}

export const POSView: React.FC<POSViewProps> = ({ menu, categories }) => {
  const [activeTab, setActiveTab] = useState<'ventas' | 'web-orders'>('ventas');
  const [posCart, setPosCart] = useState<{item: MenuItem, variant?: ItemVariant, quantity: number}[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.name || 'Todos');
  const [webOrders, setWebOrders] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Yape' | 'Plin' | 'Tarjeta'>('Efectivo');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadWebOrders();
    const channel = supabase.channel('pos-sync')
      .on('postgres_changes', { event: '*', table: 'orders' }, () => loadWebOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadWebOrders = async () => {
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(20);
    if (data) setWebOrders(data);
  };

  const addToPOSCart = (item: MenuItem) => {
    setPosCart(prev => {
      const existing = prev.find(i => i.item.id === item.id);
      if (existing) return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { item, quantity: 1 }];
    });
  };

  const total = posCart.reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0);

  const handleCharge = async () => {
    if (posCart.length === 0 || isProcessing) return;
    setIsProcessing(true);
    
    try {
      const { error } = await supabase.from('orders').insert({
        customer_name: "Venta Directa",
        customer_phone: "N/A",
        items: posCart.map(i => ({ name: i.item.name, quantity: i.quantity, price: i.item.price })),
        total: total,
        modality: 'direct',
        address: 'Mostrador',
        status: 'Completado',
        payment_method: paymentMethod,
        order_origin: 'Local'
      });

      if (!error) {
        setPosCart([]);
        alert("¡Venta registrada con éxito!");
      }
    } catch (e) {
      alert("Error al registrar venta");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
  };

  return (
    <div className="h-[calc(100vh-80px)] flex bg-gray-900 overflow-hidden">
      {/* SIDEBAR DE PEDIDOS WEB */}
      <div className="w-80 border-r border-gray-800 flex flex-col bg-gray-950">
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-white font-black text-xs uppercase tracking-widest">Pedidos Web</h3>
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {webOrders.filter(o => o.order_origin === 'Web' && o.status !== 'Completado').map(order => (
            <div key={order.id} className={`p-4 rounded-2xl border ${order.status === 'Pendiente' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-gray-800 bg-gray-900/50'}`}>
              <div className="flex justify-between items-start mb-2">
                <p className="text-white font-black text-xs">#{order.id.toString().slice(-4)}</p>
                <span className="text-[8px] font-black uppercase px-2 py-1 rounded bg-gray-800 text-gray-400">{order.status}</span>
              </div>
              <p className="text-gray-300 font-bold text-[10px] truncate mb-3">{order.customer_name}</p>
              <div className="flex gap-2">
                <button onClick={() => updateStatus(order.id, 'Preparando')} className="flex-1 bg-blue-600 text-white text-[8px] font-black py-2 rounded-lg">PREPARAR</button>
                <button onClick={() => updateStatus(order.id, 'Completado')} className="flex-1 bg-green-600 text-white text-[8px] font-black py-2 rounded-lg">LISTO</button>
              </div>
            </div>
          ))}
          {webOrders.filter(o => o.order_origin === 'Web' && o.status !== 'Completado').length === 0 && (
            <div className="text-center py-10 opacity-20"><i className="fa-solid fa-cloud text-3xl mb-4 text-white"></i><p className="text-[10px] font-black text-white uppercase">Sin pedidos pendientes</p></div>
          )}
        </div>
      </div>

      {/* ÁREA DE PRODUCTOS (POS) */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 bg-gray-900 border-b border-gray-800 flex gap-2 overflow-x-auto no-scrollbar">
          <button onClick={() => setActiveCategory('Todos')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${activeCategory === 'Todos' ? 'bg-[#e91e63] text-white' : 'text-gray-500 hover:text-white'}`}>Todos</button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setActiveCategory(c.name)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${activeCategory === c.name ? 'bg-[#e91e63] text-white' : 'text-gray-500 hover:text-white'}`}>{c.name}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 custom-scrollbar">
          {(activeCategory === 'Todos' ? menu : menu.filter(m => m.category === activeCategory)).map(item => (
            <button 
              key={item.id} 
              onClick={() => addToPOSCart(item)}
              className="bg-gray-800 border border-gray-700 p-4 rounded-3xl flex flex-col items-center text-center gap-3 hover:bg-gray-700 transition-all active:scale-95"
            >
              <div className="w-16 h-16 rounded-2xl overflow-hidden mb-1"><img src={item.image} className="w-full h-full object-cover" /></div>
              <p className="text-white font-black text-xs leading-tight h-8 flex items-center">{item.name}</p>
              <p className="text-[#e91e63] font-black text-sm">S/ {item.price.toFixed(2)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* CARRITO DE VENTA DIRECTA */}
      <div className="w-96 border-l border-gray-800 bg-gray-950 flex flex-col">
        <div className="p-8 border-b border-gray-800">
          <h3 className="text-white font-black text-xl brand-font">Nueva Venta</h3>
          <p className="text-gray-500 text-[10px] uppercase font-bold mt-1">Venta Directa en Local</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {posCart.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center bg-gray-900/40 p-3 rounded-2xl border border-gray-800">
              <div className="flex flex-col">
                <span className="text-white text-xs font-bold">{item.item.name}</span>
                <span className="text-gray-500 text-[9px] font-black uppercase">S/ {item.item.price.toFixed(2)} x {item.quantity}</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setPosCart(prev => prev.map(i => i.item.id === item.item.id ? {...i, quantity: Math.max(0, i.quantity - 1)} : i).filter(i => i.quantity > 0))} className="w-6 h-6 rounded-lg bg-gray-800 text-gray-400"><i className="fa-solid fa-minus text-[8px]"></i></button>
                <span className="text-white font-black text-xs">{item.quantity}</span>
                <button onClick={() => addToPOSCart(item.item)} className="w-6 h-6 rounded-lg bg-[#e91e63] text-white"><i className="fa-solid fa-plus text-[8px]"></i></button>
              </div>
            </div>
          ))}
          {posCart.length === 0 && <p className="text-center py-20 text-gray-700 font-black text-[10px] uppercase italic">Selecciona productos...</p>}
        </div>

        <div className="p-8 bg-gray-900 border-t border-gray-800 space-y-6">
          <div className="grid grid-cols-2 gap-2">
            {['Efectivo', 'Yape', 'Plin', 'Tarjeta'].map(method => (
              <button 
                key={method} 
                onClick={() => setPaymentMethod(method as any)}
                className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all ${paymentMethod === method ? 'bg-white text-black' : 'bg-gray-800 text-gray-500'}`}
              >
                {method}
              </button>
            ))}
          </div>
          <div className="flex justify-between items-end">
            <span className="text-gray-500 font-black text-[10px] uppercase">Total Cobrar</span>
            <span className="text-4xl font-black text-white brand-font">S/ {total.toFixed(2)}</span>
          </div>
          <button 
            onClick={handleCharge}
            disabled={posCart.length === 0 || isProcessing}
            className="w-full py-6 bg-[#e91e63] text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-2xl shadow-pink-900/20 active:scale-95 transition-all disabled:opacity-20"
          >
            {isProcessing ? 'Procesando...' : 'REGISTRAR VENTA'}
          </button>
        </div>
      </div>
    </div>
  );
};
