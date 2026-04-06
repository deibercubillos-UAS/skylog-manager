'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { BITAFLY_PLANS } from '@/lib/useEpayco'; // Importación arreglada
import Link from 'next/link';

function ManageContent() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [isReady, setIsReady] = useState(false);

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

    // --- CARGADOR DE SEGURIDAD MEJORADO ---
    const loadScripts = () => {
      if (window.ePayco && window.jQuery) {
        setIsReady(true);
        return;
      }

      const jq = document.createElement('script');
      jq.src = "https://code.jquery.com/jquery-3.7.1.min.js";
      document.head.appendChild(jq);

      jq.onload = () => {
        window.$ = window.jQuery;
        const ep = document.createElement('script');
        // Usamos la URL de tokenización de ePayco (la que pide la asesora)
        ep.src = "https://checkout.epayco.co/epayco.min.js"; 
        ep.onload = () => {
          if (window.ePayco) {
            window.ePayco.setPublicKey(process.env.NEXT_PUBLIC_EPAYCO_PUBLIC_KEY);
            setIsReady(true);
          }
        };
        document.head.appendChild(ep);
      };
    };
    loadScripts();
  }, []);

  const handleUpgrade = (planName) => {
    if (!profile?.id) return alert("Cargando sesión...");
    if (!isReady) return alert("La pasarela está conectando. Espera 2 segundos.");

    const key = `${planName.toLowerCase()}_${isAnnual ? 'anual' : 'mensual'}`;
    const epaycoId = BITAFLY_PLANS[key];

    // Redirigimos a la página de pago manual (la carpeta /pay que ya debería existir)
    window.location.href = `/dashboard/subscription/pay?planId=${epaycoId}&name=${planName}`;
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">SINCRONIZANDO...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 text-left animate-in fade-in pb-20 font-display">
      <header className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 text-left">
        <div>
          <h2 className="text-4xl font-black text-slate-900 uppercase">Mi Membresía</h2>
          <p className="text-slate-500 text-sm mt-2">Gestiona tu facturación recurrente BitaFly.</p>
        </div>

        <div className="flex bg-slate-200 p-1.5 rounded-2xl border border-slate-300">
          <button onClick={() => setIsAnnual(false)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${!isAnnual ? 'bg-white shadow-md text-slate-900' : 'text-slate-500'}`}>Mensual</button>
          <button onClick={() => setIsAnnual(true)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${isAnnual ? 'bg-white shadow-md text-slate-900' : 'text-slate-500'}`}>
            Anual <span className="bg-orange-100 text-[#ec5b13] px-2 py-0.5 rounded-full font-black animate-pulse">ahorra 20%</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <UpgradeCard title="Escuadrilla" price={isAnnual ? "39" : "49"} isActive={profile?.subscription_plan === 'escuadrilla'} features={["Hasta 15 Drones", "Reportes PDF"]} onAction={() => handleUpgrade('Escuadrilla')} />
        <UpgradeCard title="Flota" price={isAnnual ? "103" : "129"} isActive={profile?.subscription_plan === 'flota'} recommended features={["Drones Ilimitados", "XLS/CSV"]} onAction={() => handleUpgrade('Flota')} />
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plan Actual</p>
          <h3 className="text-2xl font-black uppercase">{profile?.subscription_plan || 'Piloto'}</h3>
          {!isReady && <p className="text-[9px] text-[#ec5b13] font-black animate-pulse mt-4 uppercase">Iniciando pasarela...</p>}
        </div>
      </div>
    </div>
  );
}

function UpgradeCard({ title, price, isActive, features, onAction, recommended }) {
  return (
    <div className={`p-8 rounded-[2.5rem] border-2 bg-white flex flex-col justify-between transition-all duration-500 ${isActive ? 'border-[#ec5b13] bg-orange-50/20 shadow-inner scale-105' : 'border-slate-100 shadow-sm'}`}>
      <div className="text-left">
        <h3 className={`text-xl font-black uppercase mb-6 ${isActive ? 'text-[#ec5b13]' : 'text-slate-900'}`}>{title}</h3>
        <div className="mb-8 flex items-baseline gap-1 font-black text-5xl text-slate-900">${price}<span className="text-slate-400 text-xs font-bold uppercase">/ mes</span></div>
        <ul className="space-y-4 mb-10">{features.map((f, i) => (<li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-600 leading-tight"><span className={`material-symbols-outlined text-lg ${isActive ? 'text-[#ec5b13]' : 'text-slate-400'}`}>check_circle</span> {f}</li>))}</ul>
      </div>
      {!isActive ? <button onClick={onAction} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-[#ec5b13] transition-all">Seleccionar {title}</button> : <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase text-center">Activo</div>}
    </div>
  );
}

export default function ManageSubscriptionPage() {
  return <Suspense fallback={<div>...</div>}><ManageContent /></Suspense>;
}