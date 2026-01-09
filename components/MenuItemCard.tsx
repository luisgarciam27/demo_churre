
import { MenuItem } from '../types';
import React, { useState } from 'react';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem, event: React.MouseEvent) => void;
  onShowDetails: () => void;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onAddToCart, onShowDetails }) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsClicked(true);
    onAddToCart(item, e);
    setTimeout(() => setIsClicked(false), 600);
  };

  return (
    <div 
      onClick={onShowDetails}
      className={`group bg-white rounded-[3.5rem] shadow-[0_15px_40px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col transition-all duration-700 hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)] hover:-translate-y-4 transform active:scale-[0.97] border border-gray-50 cursor-pointer relative ${isClicked ? 'animate-pulse-flash' : ''}`}
    >
      <div className="relative h-64 w-full overflow-hidden">
        <img 
          src={item.image} 
          alt={item.name} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
            <span className="bg-white/20 backdrop-blur-xl text-white text-[11px] font-black uppercase px-8 py-3 rounded-2xl border border-white/30 tracking-[0.2em] w-full text-center">Ver detalles</span>
        </div>
        
        <div className="absolute top-6 left-6 flex flex-col gap-2">
          {item.isCombo ? (
            <span className="bg-[#e91e63] text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl flex items-center gap-2 border border-white/20">
              <i className="fa-solid fa-star text-yellow-300"></i> PROMOCIÓN
            </span>
          ) : item.isPopular && (
            <span className="bg-[#fdd835] text-[#e91e63] text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-xl">
              ¡Favorito!
            </span>
          )}
          {item.tags?.slice(0, 2).map(tag => (
            <span key={tag} className="bg-black/40 backdrop-blur-md text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] border border-white/10 w-fit">
              #{tag}
            </span>
          ))}
        </div>
      </div>
      
      <div className="p-8 flex-1 flex flex-col justify-between">
        <div className="mb-6">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-2xl font-black text-gray-800 brand-font leading-[1.1] tracking-tight">{item.name}</h3>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl font-black text-[#e91e63] tracking-tighter">S/ {item.price.toFixed(2)}</span>
            <span className="w-1 h-1 rounded-full bg-gray-200"></span>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{item.isCombo ? 'Ahorro' : 'Al Paso'}</span>
          </div>
          <p className="text-gray-400 text-sm leading-relaxed line-clamp-2 font-medium">{item.description}</p>
        </div>
        
        <button 
          onClick={handleQuickAdd}
          className={`btn-shine relative w-full overflow-hidden py-5 rounded-[1.8rem] font-black text-xs uppercase tracking-[0.25em] transition-all duration-500 flex items-center justify-center gap-4 shadow-xl ${isClicked ? 'bg-green-500 text-white shadow-green-100' : 'bg-[#e91e63] hover:bg-[#c2185b] text-white shadow-pink-50'}`}
        >
          <i className={`fa-solid ${isClicked ? 'fa-check scale-150' : 'fa-plus'} transition-all`}></i>
          {isClicked ? '¡Listo, Sobrino!' : 'Poner al Carro'}
        </button>
      </div>
    </div>
  );
};
