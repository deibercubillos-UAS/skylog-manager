'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { openEpaycoCheckout } from '@/lib/useEpayco';
import Link from 'next/link';

export default function ManageSubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [isAnnual, setIsAnnual] = useState(false);

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

  const handleUpgrade = (planName) => {
    if (!profile) return alert("Cargando perfil...");
    // ABRIR PASARELA DIRECTAMENTE
    openEpaycoCheckout(planName, profile.email, profile.id, isAnnual);
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Sincronizando BitaFly...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20 font-display text-left">
      <header className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Mi Membresía</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Configura tu plan de operación recurrente.</p>
        </div>

        <div className="flex bg-slate-200 p-1.5 rounded-2xl border border-slate-300">
          <button onClick={() => setIsAnnual(false)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${!isAnnual ? 'bg-white shadow-md text-slate-900' : 'text-slate-500'}`}>Mensual</button>
          <button onClick={() => setIsAnnual(true)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${isAnnual ? 'bg-white shadow-md text-slate-900' : 'text-slate-500'}`}>
            Anual <span className="bg-orange-100 text-[#ec5b13] px-2 py-0.5 rounded-full font-black animate-pulse">ahorra 20%</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl">
        <UpgradeCard title="Escuadrilla" price={isAnnual ? "39" : "49"} isActive={profile?.subscription_plan === 'escuadrilla'} onAction={() => handleUpgrade('Escuadrilla')} />
        <UpgradeCard title="Flota" price={isAnnual ? "103" : "129"} isActive={profile?.subscription_plan === 'flota'} onAction={() => handleUpgrade('Flota')} recommended />
      </div>
    </div>
  );
}

function UpgradeCard({ title, price, isActive, onAction, recommended }) {
  return (
    <div className={`p-8 rounded-[2.5rem] border-2 bg-white flex flex-col justify-between transition-all duration-500 ${isActive ? 'border-[#ec5b13] bg-orange-50/20 shadow-inner' : 'border-slate-100 hover:border-slate-300'}`}>
      <div className="text-left">
        <div className="flex justify-between items-start mb-6">
          <h3 className={`text-xl font-black uppercase ${isActive ? 'text-[#ec5b13]' : 'text-slate-900'}`}>{title}</h3>
          {recommended && !isActive && <span className="bg-slate-900 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase">Enterprise</span>}
        </div>
        <div className="mb-8 flex items-baseline gap-1 font-black text-5xl text-slate-900">
           ${price}<span className="text-slate-400 text-xs font-bold uppercase">/ mes</span>
        </div>
      </div>
      {!isActive ? (
        <button onClick={onAction} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-[#ec5b13] transition-all shadow-xl">Suscribirme Ahora</button>
      ) : (
        <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase text-center">Plan Actual Activo</div>
      )}
    </div>
  );
}