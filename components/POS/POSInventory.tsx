
import React, { useState } from 'react';
import { MenuItem, Category } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface POSInventoryProps {
  menu: MenuItem[];
  categories: Category[];
}

export const POSInventory: React.FC<POSInventoryProps> = ({ menu, categories }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<MenuItem> | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.name || !editingItem?.price) return alert("Completa los datos básicos.");
    setLoading(true);

    try {
      const payload = {
        name: editingItem.name,
        description: editingItem.description || "",
        price: parseFloat(editingItem.price.toString()),
        category: editingItem.category || categories[0]?.name,
        image: editingItem.image || "https://picsum.photos/seed/food/400/300",
        is_popular: editingItem.isPopular || false,
        is_combo: editingItem.isCombo || false,
      };

      let error;
      if (editingItem.id) {
        const { error: err } = await supabase.from('menu_items').update(payload).eq('id', editingItem.id);
        error = err;
      } else {
        const { error: err } = await supabase.from('menu_items').insert(payload);
        error = err;
      }

      if (!error) {
        alert("¡Carta actualizada! Recarga para ver cambios.");
        setIsModalOpen(false);
        setEditingItem(null);
      } else throw error;
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("¿Seguro que quieres borrar este plato de la carta?")) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', id);
    if (!error) alert("Eliminado. Recarga la página.");
  };

  return (
    <div className="p-10 h-full overflow-y-auto custom-scrollbar bg-white">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-black text-slate-800 brand-font">Gestión de Carta</h2>
          <p className="text-slate-400 text-sm font-medium">Añade o edita los platos que ven tus clientes</p>
        </div>
        <button 
          onClick={() => { setEditingItem({}); setIsModalOpen(true); }}
          className="bg-[#e91e63] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-pink-100 flex items-center gap-3 hover:scale-105 active:scale-95 transition-all"
        >
          <i className="fa-solid fa-plus"></i> Nuevo Plato
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Plato</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest">Categoría</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Precio</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {menu.map(item => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <img src={item.image} className="w-10 h-10 rounded-xl object-cover bg-slate-100" />
                    <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                  </div>
                </td>
                <td className="px-8 py-5">
                  <span className="text-[10px] font-black uppercase text-[#e91e63] bg-pink-50 px-3 py-1 rounded-full">{item.category}</span>
                </td>
                <td className="px-8 py-5 text-right font-black text-slate-800 text-sm">S/ {item.price.toFixed(2)}</td>
                <td className="px-8 py-5">
                   <div className="flex items-center justify-center gap-2">
                      <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="w-9 h-9 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 hover:text-slate-600 transition-all"><i className="fa-solid fa-pen text-xs"></i></button>
                      <button onClick={() => deleteItem(item.id)} className="w-9 h-9 rounded-xl bg-red-50 text-red-300 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><i className="fa-solid fa-trash text-xs"></i></button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
           <form onSubmit={handleSave} className="bg-white w-full max-w-lg rounded-[3.5rem] p-10 shadow-2xl animate-zoom-in max-h-[90vh] overflow-y-auto custom-scrollbar">
              <h3 className="text-2xl font-black text-slate-800 mb-8 brand-font">{editingItem?.id ? 'Editar Plato' : 'Nuevo Plato'}</h3>
              
              <div className="space-y-6">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Nombre del Plato</label>
                    <input type="text" required className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none border border-transparent focus:border-pink-100" value={editingItem?.name || ''} onChange={e => setEditingItem({...editingItem!, name: e.target.value})} />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Precio S/</label>
                       <input type="number" step="0.1" required className="w-full bg-slate-50 p-4 rounded-2xl font-black text-slate-700 outline-none border border-transparent focus:border-pink-100" value={editingItem?.price || ''} onChange={e => setEditingItem({...editingItem!, price: parseFloat(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Categoría</label>
                       <select className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-slate-700 outline-none border border-transparent focus:border-pink-100" value={editingItem?.category || categories[0]?.name} onChange={e => setEditingItem({...editingItem!, category: e.target.value})}>
                          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Descripción</label>
                    <textarea className="w-full bg-slate-50 p-4 rounded-2xl font-medium text-slate-600 outline-none border border-transparent focus:border-pink-100 h-24 resize-none" value={editingItem?.description || ''} onChange={e => setEditingItem({...editingItem!, description: e.target.value})} />
                 </div>

                 <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">URL Imagen</label>
                    <input type="text" className="w-full bg-slate-50 p-4 rounded-2xl font-medium text-slate-500 text-xs outline-none border border-transparent focus:border-pink-100" value={editingItem?.image || ''} onChange={e => setEditingItem({...editingItem!, image: e.target.value})} placeholder="https://..." />
                 </div>

                 <div className="flex items-center gap-6 p-4 bg-slate-50 rounded-2xl">
                    <label className="flex items-center gap-2 cursor-pointer">
                       <input type="checkbox" className="w-4 h-4 rounded text-[#e91e63] focus:ring-[#e91e63]" checked={editingItem?.isPopular || false} onChange={e => setEditingItem({...editingItem!, isPopular: e.target.checked})} />
                       <span className="text-[10px] font-black uppercase text-slate-500">¿Popular?</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                       <input type="checkbox" className="w-4 h-4 rounded text-[#e91e63] focus:ring-[#e91e63]" checked={editingItem?.isCombo || false} onChange={e => setEditingItem({...editingItem!, isCombo: e.target.checked})} />
                       <span className="text-[10px] font-black uppercase text-slate-500">¿Combo?</span>
                    </label>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => { setIsModalOpen(false); setEditingItem(null); }} className="flex-1 py-5 text-[10px] font-black uppercase text-slate-400">Cerrar</button>
                    <button type="submit" disabled={loading} className="flex-1 py-5 bg-[#e91e63] text-white rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-pink-100">
                       {loading ? <i className="fa-solid fa-spinner fa-spin"></i> : 'Guardar Plato'}
                    </button>
                 </div>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
