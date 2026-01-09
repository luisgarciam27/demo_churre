
import React, { useState, useEffect } from 'react';
import { CashSession, CashTransaction } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface POSDashboardProps {
  session: CashSession;
  onCloseShift: (closingBalance: number) => void;
  onRefresh: () => void;
}

export const POSDashboard: React.FC<POSDashboardProps> = ({ session, onCloseShift, onRefresh }) => {
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitAmount, setExitAmount] = useState('');
  const [exitReason, setExitReason] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    loadSessionDetails();
  }, [session.id]);

  const loadSessionDetails = async () => {
    const { data } = await supabase.from('orders').select('*').eq('session_id', session.id);
    if (data) setOrders(data);
  };

  const handleCashMovement = async (type: 'entry' | 'exit') => {
    const amt = parseFloat(exitAmount);
    if (!amt || !exitReason) return alert("Completa los datos, churre.");
    
    const { error } = await supabase.from('cash_transactions').insert({
      session_id: session.id,
      type,
      amount: amt,
      reason: exitReason
    });

    if (!error) {
      if (type === 'entry') await supabase.rpc('increment_session_entry', { session_id: session.id, amount: amt });
      else await supabase.rpc('increment_session_exit', { session_id: session.id, amount: amt });
      
      setExitAmount('');
      setExitReason('');
      setShowExitModal(false);
      onRefresh();
    }
  };

  const handleClose = async () => {
    if (!confirm("¿Seguro que deseas cerrar la caja? Esto finalizará tu turno.")) return;
    setIsClosing(true);
    const expectedCash = session.opening_balance + session.total_sales + session.total_entry - session.total_exit;
    onCloseShift(expectedCash);
    setIsClosing(false);
  };

  const salesByMethod = {
    Efectivo: orders.filter(o => o.payment_method === 'Efectivo').reduce((a, b) => a + b.total, 0),
    Yape: orders.filter(o => o.payment_method === 'Yape').reduce((a, b) => a + b.total, 0),
    Plin: orders.filter(o => o.payment_method === 'Plin').reduce((a, b) => a + b.total, 0),
    Tarjeta: orders.filter(o => o.payment_method === 'Tarjeta').reduce((a, b) => a + b.total, 0),
  };

  const currentCash = session.opening_balance + salesByMethod.Efectivo + session.total_entry - session.total_exit;

  return (
    <div className="p-10 max-w-6xl mx-auto h-full overflow-y-auto custom-scrollbar animate-fade-in">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {/* Card Principal: Efectivo en Caja */}
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-between group hover:border-pink-100 transition-all">
             <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Efectivo en Caja</p>
                <h4 className="text-5xl font-black text-slate-900 tracking-tighter brand-font">S/ {currentCash.toFixed(2)}</h4>
             </div>
             <div className="flex gap-2 mt-8">
                <button onClick={() => setShowExitModal(true)} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">Gasto / Retiro</button>
             </div>
          </div>

          {/* Card Ventas Totales */}
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col justify-between">
             <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Ventas del Turno</p>
                <h4 className="text-5xl font-black text-[#e91e63] tracking-tighter brand-font">S/ {session.total_sales.toFixed(2)}</h4>
                <p className="text-[10px] font-bold text-slate-400 mt-2">{orders.length} tickets emitidos</p>
             </div>
             <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-50">
                <div className="text-center">
                   <p className="text-[9px] font-black text-slate-300 uppercase">Apertura</p>
                   <p className="font-bold text-slate-600 text-xs">S/ {session.opening_balance.toFixed(2)}</p>
                </div>
                <div className="text-center">
                   <p className="text-[9px] font-black text-slate-300 uppercase">Salidas</p>
                   <p className="font-bold text-red-400 text-xs">- S/ {session.total_exit.toFixed(2)}</p>
                </div>
             </div>
          </div>

          {/* Botón Cierre */}
          <div className="bg-[#e91e63] p-10 rounded-[3rem] shadow-2xl shadow-pink-200 flex flex-col justify-center items-center text-center text-white cursor-pointer hover:scale-105 active:scale-95 transition-all" onClick={handleClose}>
             <i className="fa-solid fa-lock text-4xl mb-6 opacity-40"></i>
             <h4 className="text-xl font-black uppercase tracking-widest mb-2 leading-none">Cerrar Caja</h4>
             <p className="text-xs font-bold opacity-70">Finalizar turno y arquear</p>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Métodos de Pago */}
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
             <h3 className="text-lg font-black text-slate-800 brand-font mb-8 flex items-center gap-3">
                <i className="fa-solid fa-chart-pie text-[#e91e63]"></i>
                Desglose por Pago
             </h3>
             <div className="space-y-4">
                {Object.entries(salesByMethod).map(([method, amount]) => (
                  <div key={method} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100">
                     <span className="font-black text-[10px] uppercase text-slate-500 tracking-widest">{method}</span>
                     <span className="font-black text-slate-800">S/ {amount.toFixed(2)}</span>
                  </div>
                ))}
             </div>
          </div>

          {/* Log de Actividad */}
          <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-slate-100">
             <h3 className="text-lg font-black text-slate-800 brand-font mb-8 flex items-center gap-3">
                <i className="fa-solid fa-list-ul text-[#e91e63]"></i>
                Últimos Tickets
             </h3>
             <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {orders.slice(0, 10).map(o => (
                  <div key={o.id} className="flex justify-between items-center py-3 border-b border-slate-50 text-xs">
                     <div className="flex flex-col">
                        {/* Fixed invalid '2xl' value for hour property in toLocaleTimeString below */}
                        <span className="font-bold text-slate-700">#{o.id.toString().slice(-4)} - {new Date(o.created_at).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</span>
                        <span className="text-[9px] font-black text-slate-300 uppercase">{o.payment_method}</span>
                     </div>
                     <span className="font-black text-[#e91e63]">S/ {o.total.toFixed(2)}</span>
                  </div>
                ))}
             </div>
          </div>
       </div>

       {showExitModal && (
          <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
             <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 shadow-2xl animate-zoom-in">
                <h3 className="text-xl font-black text-slate-800 mb-8 text-center">Registrar Salida</h3>
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">Monto S/</label>
                      <input type="number" step="0.5" className="w-full bg-slate-50 p-4 rounded-2xl font-black text-xl text-red-500 outline-none" value={exitAmount} onChange={e => setExitAmount(e.target.value)} placeholder="0.00" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-4">Motivo</label>
                      <input type="text" className="w-full bg-slate-50 p-4 rounded-2xl font-bold text-sm outline-none" value={exitReason} onChange={e => setExitReason(e.target.value)} placeholder="Ej: Compra de chifles" />
                   </div>
                   <div className="flex gap-4">
                      <button onClick={() => setShowExitModal(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400">Cancelar</button>
                      <button onClick={() => handleCashMovement('exit')} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase">Retirar Dinero</button>
                   </div>
                </div>
             </div>
          </div>
       )}
    </div>
  );
};
