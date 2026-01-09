
import React, { useState, useEffect } from 'react';
import { CartItem } from '../types';
import { supabase } from '../services/supabaseClient';

interface CartProps {
  items: CartItem[];
  onRemove: (id: string, variantId?: string) => void;
  onUpdateQuantity: (id: string, delta: number, variantId?: string) => void;
  onClearCart: () => void;
  isOpen: boolean;
  onToggle: () => void;
  initialModality: 'delivery' | 'pickup';
  whatsappNumber: string;
  paymentQr?: string;
  paymentName?: string;
}

type OrderType = 'delivery' | 'pickup';

export const Cart: React.FC<CartProps> = ({ 
  items, onRemove, onUpdateQuantity, onClearCart, isOpen, onToggle, 
  initialModality, whatsappNumber, paymentQr, paymentName 
}) => {
  const [orderType, setOrderType] = useState<OrderType>(initialModality);
  const [address, setAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrderType(initialModality);
    if (!isOpen) setStep(1);
  }, [initialModality, isOpen]);

  const total = items.reduce((sum, item) => {
    const price = item.selectedVariant ? item.selectedVariant.price : item.price;
    return sum + price * item.quantity;
  }, 0);
  
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const handleCopyNumber = () => {
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    navigator.clipboard.writeText(cleanNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsAppOrder = async () => {
    setIsSaving(true);
    
    try {
      await supabase.from('orders').insert({
        customer_name: customerName,
        customer_phone: customerPhone,
        items: items.map(i => ({ 
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
    } catch (e) {
      console.error("Error Supabase:", e);
    }

    const typeLabel = orderType === 'delivery' ? '🛵 DELIVERY' : '🏠 RECOJO EN TIENDA';
    const addressSection = orderType === 'delivery' ? `📍 *DIRECCIÓN:* ${address}` : '';
    const itemsDetail = items.map(item => `   • ${item.quantity}x *${item.name}* ${item.selectedVariant ? `(${item.selectedVariant.name})` : ''}`).join('\n');
    
    const message = encodeURIComponent(
      `¡Hola Churre! 🌶️ Soy *${customerName}*\n` +
      `Aquí te envío mi pedido para hoy:\n\n` +
      `--------------------------------\n` +
      `📌 *MODALIDAD:* ${typeLabel}\n` +
      (addressSection ? `${addressSection}\n` : '') +
      `--------------------------------\n\n` +
      `📝 *MI PEDIDO:*\n${itemsDetail}\n\n` +
      `💰 *TOTAL A PAGAR: S/ ${total.toFixed(2)}*\n\n` +
      `--------------------------------\n` +
      `⚠️ *En breve realizaré el pago y enviaré la constancia por aquí.* ¡Gracias! 🙌`
    );

    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
    setIsSaving(false);
  };

  const isFormValid = customerName.trim().length > 2 && 
                      customerPhone.trim().length > 6 &&
                      (orderType === 'pickup' || (orderType === 'delivery' && address.trim().length > 5));

  if (!isOpen) {
    if (totalItems === 0) return null;
    return (
      <button 
        onClick={onToggle} 
        className="fixed bottom-8 right-8 bg-[#e91e63] text-white p-5 rounded-full shadow-[0_20px_50px_rgba(233,30,99,0.4)] z-50 animate-bounce ring-4 ring-white flex items-center gap-3"
      >
        <i className="fa-solid fa-basket-shopping text-2xl"></i>
        <span className="font-black text-lg">{totalItems}</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onToggle}></div>
      
      <div className="relative bg-white w-full max-w-md sm:rounded-[3rem] shadow-[0_50px_100px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col h-full sm:h-auto sm:max-h-[95vh] animate-zoom-in">
        
        {/* HEADER */}
        <div className="bg-[#e91e63] p-8 flex justify-between items-center text-white">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">
              {step === 1 ? 'Resumen de Compra' : 'Confirmación y Pago'}
            </span>
            <h2 className="text-2xl font-black brand-font">{step === 1 ? 'Tu Pedido' : 'Último Paso'}</h2>
          </div>
          <button onClick={onToggle} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* STEP 1: RESUMEN Y DATOS */}
        {step === 1 && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-10 py-6">
              <div className="bg-[#f3f4f6] p-1.5 rounded-full flex gap-1 mb-6">
                <button onClick={() => setOrderType('pickup')} className={`flex-1 py-3.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${orderType === 'pickup' ? 'bg-white text-[#e91e63] shadow-lg' : 'text-gray-400'}`}>Recojo</button>
                <button onClick={() => setOrderType('delivery')} className={`flex-1 py-3.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${orderType === 'delivery' ? 'bg-white text-[#e91e63] shadow-lg' : 'text-gray-400'}`}>Delivery</button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-2">¿Tu Nombre?</label>
                    <input type="text" placeholder="Luis Miguel" className="w-full bg-gray-50 p-4 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-pink-100" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Tu WhatsApp</label>
                    <input type="tel" placeholder="999..." className="w-full bg-gray-50 p-4 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-pink-100" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                  </div>
                </div>
                {orderType === 'delivery' && (
                  <div className="space-y-1 animate-fade-in-up">
                    <label className="text-[9px] font-black uppercase text-gray-400 ml-2">Dirección de Entrega</label>
                    <input type="text" placeholder="Calle/Avenida y número exacto" className="w-full bg-gray-50 p-4 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-pink-100" value={address} onChange={e => setAddress(e.target.value)} />
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-10 py-2 custom-scrollbar border-t border-gray-50">
              <div className="flex justify-between items-center py-4 mb-2">
                <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Productos</h4>
                <button 
                  onClick={() => { if(confirm('¿Vaciar todo el carrito?')) onClearCart(); }}
                  className="text-[9px] font-black uppercase text-red-400 hover:text-red-600 transition-colors"
                >
                  Vaciar Carrito
                </button>
              </div>
              
              <div className="space-y-5 pb-6">
                {items.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-10 font-medium">Tu carrito está vacío, sobrino.</p>
                ) : (
                  items.map((item, idx) => {
                    const price = item.selectedVariant ? item.selectedVariant.price : item.price;
                    return (
                      <div key={`${item.id}-${item.selectedVariant?.id || 'base'}`} className="flex justify-between items-start animate-fade-in-up">
                        <div className="flex flex-col flex-1">
                          <span className="font-bold text-gray-700 text-sm">{item.name}</span>
                          {item.selectedVariant && (
                            <span className="text-[9px] font-black uppercase text-[#e91e63] mb-1">
                              {item.selectedVariant.name}
                            </span>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <div className="flex items-center bg-gray-50 rounded-full border px-2 py-1">
                              <button 
                                onClick={() => onUpdateQuantity(item.id, -1, item.selectedVariant?.id)}
                                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-[#e91e63]"
                              >
                                <i className="fa-solid fa-minus text-[10px]"></i>
                              </button>
                              <span className="w-8 text-center font-black text-xs text-gray-800">{item.quantity}</span>
                              <button 
                                onClick={() => onUpdateQuantity(item.id, 1, item.selectedVariant?.id)}
                                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-[#e91e63]"
                              >
                                <i className="fa-solid fa-plus text-[10px]"></i>
                              </button>
                            </div>
                            <button 
                              onClick={() => onRemove(item.id, item.selectedVariant?.id)}
                              className="text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <i className="fa-solid fa-trash-can text-[10px]"></i>
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="font-black text-gray-800 text-sm">S/ {(price * item.quantity).toFixed(2)}</span>
                          <span className="text-[9px] text-gray-300 font-bold">S/ {price.toFixed(2)} c/u</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="p-10 bg-gray-50/50">
              <div className="flex justify-between items-end mb-6">
                <span className="text-gray-400 font-black uppercase text-[10px] tracking-widest">Total</span>
                <span className="text-3xl font-black text-[#e91e63] tracking-tighter">S/ {total.toFixed(2)}</span>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  disabled={!isFormValid || items.length === 0}
                  onClick={() => setStep(2)}
                  className="w-full py-6 rounded-[2rem] bg-gray-900 text-white font-black uppercase tracking-widest shadow-xl transition-all active:scale-[0.97] disabled:bg-gray-200"
                >
                  Continuar a Confirmar
                </button>
                <button 
                  onClick={onToggle}
                  className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Seguir Comprando
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: GUÍA DE PAGO Y ENVÍO */}
        {step === 2 && (
          <div className="flex flex-col flex-1 animate-fade-in-up">
            <div className="p-10 flex-1 overflow-y-auto custom-scrollbar">
              <div className="text-center mb-10">
                <div className="inline-flex w-12 h-12 items-center justify-center bg-pink-50 text-[#e91e63] rounded-full mb-4">
                  <i className="fa-solid fa-circle-check text-xl"></i>
                </div>
                <h4 className="text-xl font-black text-gray-800 mb-2">¡Casi listo, {customerName.split(' ')[0]}!</h4>
                <p className="text-xs text-gray-400 font-medium px-4">Sigue estos pasos para finalizar tu pedido rápidamente:</p>
              </div>

              {/* OPCIONES DE PAGO */}
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-[2rem] p-8 border border-gray-100">
                  <p className="text-[9px] font-black text-[#e91e63] uppercase tracking-[0.2em] mb-4 text-center">Puedes pagar por Yape o Plin</p>
                  
                  {paymentQr && (
                    <div className="flex justify-center mb-6">
                      <div className="bg-white p-3 rounded-2xl shadow-sm">
                        <img src={paymentQr} className="w-40 h-40 object-contain" alt="QR" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-black text-gray-400 uppercase mb-1">Titular</span>
                      <span className="font-black text-gray-800">{paymentName}</span>
                    </div>

                    <button 
                      onClick={handleCopyNumber}
                      className="w-full bg-white border-2 border-dashed border-pink-100 py-4 rounded-2xl flex items-center justify-center gap-3 group active:scale-95 transition-all"
                    >
                      <span className="font-black text-gray-800">{whatsappNumber.replace(/\D/g, '').slice(-9)}</span>
                      <div className="h-4 w-[1px] bg-gray-200"></div>
                      <span className={`text-[10px] font-black ${copied ? 'text-green-500' : 'text-[#e91e63]'}`}>
                        {copied ? '¡COPIADO!' : 'COPIAR NÚMERO'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="bg-[#fdd835]/10 border-2 border-dashed border-[#fdd835]/30 p-6 rounded-[2rem] text-center">
                  <p className="text-[10px] font-bold text-gray-600 leading-relaxed uppercase tracking-widest">
                    <i className="fa-solid fa-info-circle mr-2 text-[#e91e63]"></i>
                    Confirmas tu pedido enviando el mensaje y luego adjuntas tu captura de pago.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-10 border-t bg-gray-50/50">
              <button 
                onClick={handleWhatsAppOrder}
                disabled={isSaving}
                className="w-full py-6 rounded-[2rem] bg-[#e91e63] text-white font-black uppercase tracking-widest shadow-[0_15px_30px_rgba(233,30,99,0.3)] flex items-center justify-center gap-4 transition-all transform active:scale-[0.96]"
              >
                {isSaving ? <i className="fa-solid fa-spinner fa-spin"></i> : <><i className="fa-brands fa-whatsapp text-xl"></i><span>Confirmar y enviar</span></>}
              </button>
              <button onClick={() => setStep(1)} className="w-full mt-4 text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors">← Revisar mi pedido</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
