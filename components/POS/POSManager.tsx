
import React, { useState, useEffect } from 'react';
import { MenuItem, Category, AppConfig, CashSession } from '../../types';
import { supabase } from '../../services/supabaseClient';
import { POSShiftOpening } from './POSShiftOpening';
import { POSCashier } from './POSCashier';
import { POSDashboard } from './POSDashboard';
import { POSInventory } from './POSInventory';
import { POSOrders } from './POSOrders';

interface POSManagerProps {
  menu: MenuItem[];
  categories: Category[];
  config: AppConfig;
}

export const POSManager: React.FC<POSManagerProps> = ({ menu, categories, config }) => {
  const [session, setSession] = useState<CashSession | null>(null);
  const [view, setView] = useState<'cashier' | 'orders' | 'dashboard' | 'inventory'>('cashier');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkActiveSession();
  }, []);

  const checkActiveSession = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('cash_sessions')
        .select('*')
        .eq('status', 'open')
        .maybeSingle();
      
      if (data) setSession(data as CashSession);
      else setSession(null);
    } catch (e) {
      console.error("Session Check Error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenShift = async (amount: number, user: string) => {
    try {
      const { data, error } = await supabase
        .from('cash_sessions')
        .insert({
          opening_balance: amount,
          user_name: user,
          status: 'open'
        })
        .select()
        .single();

      if (data) setSession(data as CashSession);
      if (error) throw error;
    } catch (e: any) {
      alert("Error al abrir turno: " + e.message);
    }
  };

  const handleCloseShift = async (closingBalance: number) => {
    if (!session) return;
    try {
      const { error } = await supabase
        .from('cash_sessions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          closing_balance: closingBalance
        })
        .eq('id', session.id);
      
      if (!error) {
        setSession(null);
        alert("Turno cerrado correctamente.");
      } else throw error;
    } catch (e: any) {
      alert("Error al cerrar turno: " + e.message);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="loader"></div>
    </div>
  );

  if (!session) {
    return <POSShiftOpening onOpen={handleOpenShift} />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <img src={config.images.logo} className="h-10" alt="Logo" />
          <div className="h-6 w-[1px] bg-slate-200"></div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Cajero Activo</p>
            <p className="text-sm font-bold text-slate-700 leading-none">{session.user_name}</p>
          </div>
        </div>

        <nav className="flex bg-slate-100 p-1 rounded-2xl">
          <button 
            onClick={() => setView('cashier')}
            className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${view === 'cashier' ? 'bg-white text-[#e91e63] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Venta
          </button>
          <button 
            onClick={() => setView('orders')}
            className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${view === 'orders' ? 'bg-white text-[#e91e63] shadow-md' : 'text-slate-400 hover:text-slate-600'} relative`}
          >
            Pedidos Web
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full animate-pulse border-2 border-white"></span>
          </button>
          <button 
            onClick={() => setView('dashboard')}
            className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${view === 'dashboard' ? 'bg-white text-[#e91e63] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Caja
          </button>
          <button 
            onClick={() => setView('inventory')}
            className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${view === 'inventory' ? 'bg-white text-[#e91e63] shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Inventario
          </button>
        </nav>

        <div className="flex items-center gap-4">
           <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Caja Actual</p>
              <p className="text-lg font-black text-[#e91e63] leading-none">S/ {(session.opening_balance + session.total_sales + session.total_entry - session.total_exit).toFixed(2)}</p>
           </div>
           <button onClick={() => window.location.href = '/'} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-slate-100" title="Volver al Menú"><i className="fa-solid fa-arrow-right-from-bracket"></i></button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden bg-white">
        {view === 'cashier' ? (
          <POSCashier menu={menu} categories={categories} session={session} onOrderComplete={checkActiveSession} />
        ) : view === 'orders' ? (
          <POSOrders />
        ) : view === 'dashboard' ? (
          <POSDashboard session={session} onCloseShift={handleCloseShift} onRefresh={checkActiveSession} />
        ) : (
          <POSInventory menu={menu} categories={categories} />
        )}
      </main>
    </div>
  );
};
