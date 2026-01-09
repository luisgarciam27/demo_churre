
import React, { useState } from 'react';

interface POSShiftOpeningProps {
  onOpen: (amount: number, user: string) => void;
}

export const POSShiftOpening: React.FC<POSShiftOpeningProps> = ({ onOpen }) => {
  const [amount, setAmount] = useState<string>('50');
  const [userName, setUserName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return alert("Ingresa tu nombre, churre.");
    onOpen(parseFloat(amount) || 0, userName);
  };

  return (
    <div className="h-screen bg-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full animate-zoom-in">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-pink-50 text-[#e91e63] rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-pink-100 ring-4 ring-white">
            <i className="fa-solid fa-cash-register text-3xl"></i>
          </div>
          <h2 className="text-3xl font-black text-slate-800 brand-font">Apertura de Turno</h2>
          <p className="text-slate-400 text-sm font-medium mt-2">Bienvenido al sistema de caja del Churre</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-50 border border-slate-100 p-10 rounded-[3rem] shadow-sm">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Nombre del Cajero</label>
              <input 
                autoFocus
                type="text" 
                placeholder="Ej: Luis Miguel" 
                className="w-full bg-white border border-slate-200 p-5 rounded-2xl font-bold text-slate-700 outline-none focus:ring-4 focus:ring-pink-50 transition-all"
                value={userName}
                onChange={e => setUserName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-4">Monto Inicial en Caja (S/)</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black">S/</span>
                <input 
                  type="number" 
                  step="0.10"
                  className="w-full bg-white border border-slate-200 p-5 pl-12 rounded-2xl font-black text-2xl text-[#e91e63] outline-none focus:ring-4 focus:ring-pink-50 transition-all"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-[#e91e63] text-white py-6 rounded-3xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-pink-200 hover:scale-[1.02] active:scale-95 transition-all mt-4"
            >
              Iniciar Operaciones
            </button>
          </div>
        </form>
        
        <p className="text-center mt-10 text-slate-300 font-black text-[9px] uppercase tracking-[0.3em]">Sistema POS v2.5 Profesional</p>
      </div>
    </div>
  );
};
