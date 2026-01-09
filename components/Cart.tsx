
import React, { useState, useEffect } from 'react';
import { CartItem } from '../types';
import { supabase } from '../services/supabaseClient';

interface CartProps {
  items: CartItem[];
  onRemove: (id: string) => void;
  onUpdateQuantity: (id: string, delta: number) => void;
  isOpen: boolean;
  onToggle: () => void;
  initialModality: 'delivery' | 'pickup';
  whatsappNumber: string;
}

type OrderType = 'delivery' | 'pickup';

export const Cart: React.FC<CartProps> = ({ items, onRemove, onUpdateQuantity, isOpen, onToggle, initialModality, whatsappNumber }) => {
  const [orderType, setOrderType] = useState<OrderType>(initialModality);
  const [address, setAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setOrderType(initialModality);
  }, [initialModality]);

  const total = items.reduce((sum, item) => {
    const price = item.selectedVariant ? item.selectedVariant.price : item.price;
    return sum + price * item.quantity;
  }, 0);
  
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleWhatsAppOrder = async () => {
    setIsSaving(true);
    
    try {
      const { error } = await supabase.from('orders').insert({
        customer_name: customerName,
        customer_phone: customerPhone,
        items: items.map(i => ({ 
          id: i.id, 
          name: i.name, 
          quantity: i.quantity, 
          price: i.selectedVariant ? i.selectedVariant.price : i.price,
          variant: i.selectedVariant?.name || null
        })),
        total: total,
        modality: orderType,
        address: orderType === 'delivery' ? address : 'Recojo en tienda',
        status: 'Pendiente'
      });
      
      if (error) console.error("Error Supabase:", error);
    } catch (e: any) {
      console.error("Error inesperado:", e);
    }

    const typeLabel = orderType === 'delivery' ? '🛵 DELIVERY' : '🏠 RECOJO';
    const addressInfo = orderType === 'delivery' ? `\n📍 *Dirección:* ${address}` : '';
    
    const message = encodeURIComponent(
      `¡Hola Churre! 🌶️\n` +
      `Pedido de: *${customerName}*\n` +
      `Para: *${typeLabel}*${addressInfo}\n\n` +
      items.map(item => `- ${item.quantity}x ${item.name} ${item.selectedVariant ? `(${item.selectedVariant.name})` : ''}`).join('\n') +
      `\n\n💰 *Total: S/ ${total.toFixed(2)}*`
    );

    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
    setIsSaving(false);
  };

  const isOrderValid = items.length > 0 && 
                       customerName.trim().length > 2 && 
                       customerPhone.trim().length > 6 &&
                       (orderType === 'pickup' || (orderType === 'delivery' && address.trim().length > 5));

  if (!isOpen) {
    if (totalItems === 0) return null;
    return (
      <button 
        onClick={onToggle} 
        className="fixed bottom-8 right-8 bg-[#e91e63] text-white p-5 rounded-full shadow-[0_20px_50px_rgba(233,30,99,0.4)] z-50 animate-bounce ring-4 ring-white transition-transform active:scale-90 flex items-center gap-3"
      >
        <i className="fa-solid fa-basket-shopping text-2xl"></i>
        <span className="font-black text-lg">{totalItems}</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onToggle}></div>
      
      <div className="relative bg-white w-full max-w-md sm:rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[90vh] animate-zoom-in">
        <div className="bg-[#e91e63] p-8 flex justify-between items-center">
          <h2 className="text-2xl font-black text-white brand-font tracking-tight">Tu Pedido</h2>
          <button onClick={onToggle} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 border border-white/20">
            <i className="fa-solid fa-xmark text-white"></i>
          </button>
        </div>

        <div className="px-10 py-6">
          <div className="bg-[#f3f4f6] p-1.5 rounded-full flex gap-1 shadow-inner mb-6">
            <button onClick={() => setOrderType('pickup')} className={`flex-1 py-3.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${orderType === 'pickup' ? 'bg-white text-[#e91e63] shadow-lg' : 'text-gray-400'}`}>Recojo</button>
            <button onClick={() => setOrderType('delivery')} className={`flex-1 py-3.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${orderType === 'delivery' ? 'bg-white text-[#e91e63] shadow-lg' : 'text-gray-400'}`}>Delivery</button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
               <input type="text" placeholder="Tu Nombre" className="w-full bg-gray-50 p-4 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-pink-100" value={customerName} onChange={e => setCustomerName(e.target.value)} />
               <input type="tel" placeholder="Teléfono" className="w-full bg-gray-50 p-4 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-pink-100" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
            </div>
            {orderType === 'delivery' && (
              <input type="text" placeholder="Dirección exacta..." className="w-full bg-gray-50 p-4 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-pink-100" value={address} onChange={e => setAddress(e.target.value)} />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-10 py-2 custom-scrollbar">
          {items.length === 0 ? (
            <div className="text-center py-10 opacity-20">
              <i className="fa-solid fa-basket-shopping text-4xl mb-2"></i>
              <p className="font-black text-[10px] uppercase">Vacío</p>
            </div>
          ) : (
            <div className="space-y-5">
              {items.map((item, idx) => {
                const itemPrice = item.selectedVariant ? item.selectedVariant.price : item.price;
                return (
                  <div key={`${item.id}-${item.selectedVariant?.id || 'base'}`} className="flex justify-between items-center animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-gray-800">{item.quantity}x</span>
                        <span className="font-bold text-gray-700 text-sm">{item.name}</span>
                      </div>
                      {item.selectedVariant && (
                        <span className="ml-8 text-[10px] text-[#e91e63] font-bold uppercase">{item.selectedVariant.name}</span>
                      )}
                    </div>
                    <span className="font-black text-[#e91e63]">S/ {(itemPrice * item.quantity).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-10 border-t border-gray-100 bg-gray-50/30">
          <div className="flex justify-between items-end mb-8">
            <div className="flex flex-col">
              <span className="text-gray-400 font-black uppercase text-[10px] tracking-widest mb-1">Total a Pagar</span>
              <span className="text-[#1a1c21] text-4xl font-black tracking-tighter">S/ {total.toFixed(2)}</span>
            </div>
          </div>
          
          <button 
            disabled={!isOrderValid || isSaving}
            onClick={handleWhatsAppOrder}
            className="w-full py-6 rounded-3xl bg-[#e91e63] text-white font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-4 transition-all transform active:scale-[0.96] disabled:bg-gray-200 disabled:text-gray-400"
          >
            {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-brands fa-whatsapp text-xl"></i><span>Confirmar Pedido</span></>}
          </button>
        </div>
      </div>
    </div>
  );
};
