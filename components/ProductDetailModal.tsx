
import React, { useState, useEffect } from 'react';
import { MenuItem, ItemVariant } from '../types';

interface ProductDetailModalProps {
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (item: MenuItem, selectedVariant?: ItemVariant) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ item, onClose, onAddToCart }) => {
  const [selectedVariant, setSelectedVariant] = useState<ItemVariant | undefined>(undefined);

  useEffect(() => {
    if (item && item.variants && item.variants.length > 0) {
      setSelectedVariant(item.variants[0]);
    } else {
      setSelectedVariant(undefined);
    }
  }, [item]);

  if (!item) return null;

  const currentPrice = selectedVariant ? selectedVariant.price : item.price;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md"></div>
      
      <div 
        className="relative bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(233,30,99,0.3)] animate-zoom-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-10 w-12 h-12 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-all active:scale-90"
        >
          <i className="fa-solid fa-xmark text-xl"></i>
        </button>

        <div className="flex flex-col md:flex-row h-full">
          <div className="w-full md:w-1/2 h-64 md:h-auto relative">
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent md:hidden"></div>
            {item.isCombo && (
              <div className="absolute bottom-6 left-6">
                <span className="bg-[#e91e63] text-white text-[10px] font-black px-6 py-2 rounded-full uppercase tracking-[0.2em] shadow-2xl border border-white/20">Combo Ahorro</span>
              </div>
            )}
          </div>

          <div className="w-full md:w-1/2 p-8 md:p-10 flex flex-col justify-center">
            <div className="mb-2">
              <span className="text-[#e91e63] text-[10px] font-black uppercase tracking-[0.3em] bg-pink-50 px-3 py-1 rounded-full">
                {item.isCombo ? 'Promoción Especial' : item.category}
              </span>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-black text-gray-800 brand-font mb-4 leading-none">
              {item.name}
            </h2>

            <p className="text-gray-500 text-sm md:text-base leading-relaxed mb-6">
              {item.description}
            </p>

            {/* LISTA DEL COMBO */}
            {item.isCombo && item.comboItems && item.comboItems.length > 0 && (
              <div className="mb-8 bg-gray-50 p-6 rounded-[2rem] border border-dashed border-gray-200">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-4 block">Este combo incluye:</label>
                <ul className="space-y-2">
                  {item.comboItems.map((ci, i) => (
                    <li key={i} className="flex items-center gap-3 text-xs font-bold text-gray-700">
                      <i className="fa-solid fa-circle-check text-[#e91e63]"></i>
                      {ci}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* SELECTOR DE VARIANTES */}
            {item.variants && item.variants.length > 0 && (
              <div className="mb-8">
                <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-3 block">Elige una opción:</label>
                <div className="grid grid-cols-1 gap-2">
                  {item.variants.map((v) => (
                    <button 
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`flex justify-between items-center p-4 rounded-2xl border-2 transition-all ${selectedVariant?.id === v.id ? 'border-[#e91e63] bg-pink-50' : 'border-gray-100 hover:border-pink-100'}`}
                    >
                      <span className={`font-bold text-xs ${selectedVariant?.id === v.id ? 'text-[#e91e63]' : 'text-gray-600'}`}>{v.name}</span>
                      <span className="font-black text-[#e91e63] text-xs">S/ {v.price.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto flex items-center justify-between gap-6 pt-6 border-t border-gray-50">
              <div className="flex flex-col">
                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Precio Final</span>
                <span className="text-3xl font-black text-[#e91e63]">S/ {currentPrice.toFixed(2)}</span>
              </div>

              <button 
                onClick={() => {
                  onAddToCart(item, selectedVariant);
                  onClose();
                }}
                className="bg-[#e91e63] hover:bg-[#c2185b] text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-pink-200 transition-all transform active:scale-90 flex items-center gap-3"
              >
                <i className="fa-solid fa-cart-plus"></i>
                Añadir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
