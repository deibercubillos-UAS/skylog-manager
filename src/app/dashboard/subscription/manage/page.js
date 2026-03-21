'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { openEpaycoCheckout } from '@/lib/useEpayco';
import Link from 'next/link';

export default function ManageSubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [isAnnual, setIsAnnual] = useState(false); // Estado para el ahorro del 20%

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const res = await fetch(`/api/user/profile?userId=${user.id}`);
        const data = await res.json();
        setProfile(data);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleUpgrade = (planName, price) => {
    if (!profile) return alert("Cargando perfil...");
    // LLAMADA AL MOTOR DE PAGOS
    openEpaycoCheckout(planName, price, profile.email, profile.id, isAnnual);
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Sincronizando BitaFly...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Gestión de Plan</h2>
          <p className="text-slate-500 text-sm mt-1">Escala tu flota y desbloquea funciones PRO.</p>
        </div>

        {/* SWITCH MENSUAL / ANUAL */}
        <div className="flex bg-slate-200 p-1 rounded-2xl border border-slate-300">
          <button onClick={() => setIsAnnual(false)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${!isAnnual ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>Mensual</button>
          <button onClick={() => setIsAnnual(true)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${isAnnual ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
            Anual <span className="bg-orange-100 text-[#ec5b13] px-2 py-0.5 rounded-full lowercase">ahorra 20%</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        <PlanCard 
          title="Escuadrilla" 
          price={isAnnual ? "39" : "49"} 
          isActive={profile?.subscription_plan === 'escuadrilla'}
          onSelect={() => handleUpgrade('Escuadrilla', '49')}
        />
        <PlanCard 
          title="Flota" 
          price={isAnnual ? "103" : "129"} 
          isActive={profile?.subscription_plan === 'flota'}
          onSelect={() => handleUpgrade('Flota', '129')}
          recommended
        />
      </div>
    </div>
  );
}

function PlanCard({ title, price, isActive, onSelect, recommended }) {
  return (
    <div className={`p-8 rounded-[2.5rem] border-2 bg-white flex flex-col justify-between transition-all ${isActive ? 'border-[#ec5b13] bg-orange-50/20' : 'border-slate-100'}`}>
      <div>
        <div className="flex justify-between mb-4">
          <h3 className="text-xl font-black uppercase text-slate-900">{title}</h3>
          {recommended && <span className="bg-slate-900 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Enterprise Ready</span>}
        </div>
        <div className="mb-8 flex items-baseline gap-1">
          <span className="text-5xl font-black text-slate-900">${price}</span>
          <span className="text-slate-400 text-xs font-bold uppercase">/ mes</span>
        </div>
      </div>
      
      {isActive ? (
        <div className="w-full py-4 bg-[#ec5b13] text-white rounded-2xl font-black text-[10px] uppercase text-center shadow-lg">Tu Plan Actual</div>
      ) : (
        <button onClick={onSelect} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#ec5b13] transition-all active:scale-95 shadow-xl">
          Seleccionar {title}
        </button>
      )}
    </div>
  );
}