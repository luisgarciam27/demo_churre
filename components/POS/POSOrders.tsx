
import React, { useState, useEffect } from 'react';
import { supabase } from '../../services/supabaseClient';

export const POSOrders: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'Pendiente' | 'Preparando' | 'Completado' | 'Todos'>('Pendiente');

  useEffect(() => {
    loadOrders();
    // Suscripción en tiempo real a nuevos pedidos
    const channel = supabase.channel('web-orders-sync')
      .on('postgres_changes', { event: '*', table: 'orders' }, () => loadOrders())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('order_origin', 'Web')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (data) setOrders(data);
    setLoading(false);
  };

  const updateStatus = async (id: number, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);
    
    if (!error) loadOrders();
  };

  const filteredOrders = filter === 'Todos' 
    ? orders 
    : orders.filter(o => o.status === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pendiente': return 'border-yellow-400 bg-yellow-50/30';
      case 'Preparando': return 'border-blue-400 bg-blue-50/30';
      case 'Completado': return 'border-slate-200 bg-white opacity-60';
      default: return 'border-slate-100 bg-white';
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      <div className="p-8 bg-white border-b border-slate-200 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 brand-font">Pedidos Web</h2>
          <p className="text-slate-400 text-sm font-medium">Gestiona las órdenes que llegan desde la carta online</p>
        </div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          {['Pendiente', 'Preparando', 'Completado', 'Todos'].map((f) => (
            <button 
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filter === f ? 'bg-white text-[#e91e63] shadow-sm' : 'text-slate-400'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-20"><div className="loader"></div></div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-30 text-center">
             <i className="fa-solid fa-bell-slash text-6xl mb-6 text-slate-300"></i>
             <p className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400">No hay pedidos {filter !== 'Todos' ? filter.toLowerCase() + 's' : ''}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredOrders.map(order => (
              <div 
                key={order.id} 
                className={`bg-white border-2 rounded-[2.5rem] p-8 shadow-sm transition-all animate-fade-in-up flex flex-col ${getStatusColor(order.status)}`}
              >
                <div className="flex justify-between items-start mb-6">
                   <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Ticket #{order.id.toString().slice(-4)}</span>
                      <h4 className="text-xl font-black text-slate-800">{order.customer_name}</h4>
                      <p className="text-[10px] font-bold text-slate-400">{new Date(order.created_at).toLocaleTimeString()}</p>
                   </div>
                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${order.modality === 'delivery' ? 'bg-pink-100 text-[#e91e63]' : 'bg-blue-100 text-blue-600'}`}>
                      <i className={`fa-solid ${order.modality === 'delivery' ? 'fa-motorcycle' : 'fa-shop'}`}></i>
                   </div>
                </div>

                <div className="flex-1 space-y-3 mb-8">
                   {order.items?.map((item: any, idx: number) => (
                     <div key={idx} className="flex justify-between items-center text-sm font-bold text-slate-600 bg-white/50 p-3 rounded-xl border border-white/80">
                        <span>{item.quantity}x {item.name} {item.variant ? `(${item.variant})` : ''}</span>
                        <span className="text-slate-400 text-xs">S/ {(item.price * item.quantity).toFixed(2)}</span>
                     </div>
                   ))}
                </div>

                <div className="border-t border-dashed border-slate-200 pt-6 space-y-4">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Pedido</span>
                      <span className="text-2xl font-black text-slate-800 tracking-tighter">S/ {order.total.toFixed(2)}</span>
                   </div>
                   
                   {order.modality === 'delivery' && (
                     <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black uppercase text-slate-400 mb-1">Dirección de Envío</p>
                        <p className="text-xs font-bold text-slate-600">{order.address}</p>
                     </div>
                   )}

                   <div className="grid grid-cols-2 gap-3 pt-2">
                      {order.status === 'Pendiente' && (
                        <button 
                          onClick={() => updateStatus(order.id, 'Preparando')}
                          className="col-span-2 py-4 bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:scale-[1.02] transition-all"
                        >
                          Empezar a Preparar
                        </button>
                      )}
                      {order.status === 'Preparando' && (
                        <button 
                          onClick={() => updateStatus(order.id, 'Completado')}
                          className="col-span-2 py-4 bg-green-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-green-100 hover:scale-[1.02] transition-all"
                        >
                          Pedido Listo / Entregado
                        </button>
                      )}
                      <a 
                        href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black text-[9px] uppercase hover:text-[#e91e63] hover:border-[#e91e63] transition-all"
                      >
                        <i className="fa-brands fa-whatsapp text-lg"></i> WhatsApp
                      </a>
                      <button 
                        onClick={() => updateStatus(order.id, 'Cancelado')}
                        className="py-3 bg-white border border-slate-200 text-slate-300 rounded-2xl font-black text-[9px] uppercase hover:text-red-500 hover:border-red-100 transition-all"
                      >
                        Anular
                      </button>
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
