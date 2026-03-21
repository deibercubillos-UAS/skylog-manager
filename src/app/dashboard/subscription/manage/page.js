'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { openEpaycoCheckout } from '@/lib/useEpayco';
import Link from 'next/link';

export default function ManageSubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const res = await fetch(`/api/user/profile?userId=${user.id}`);
      const data = await res.json();
      setProfile(data);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleUpgrade = (planName, price) => {
    openEpaycoCheckout(planName, price, profile.email, profile.id, isAnnual);
  };

  const handleCancel = async () => {
    if (!confirm("¿Seguro que deseas cancelar? Perderás acceso a las funciones PRO y tus límites volverán a 1 drone / 1 piloto.")) return;
    
    setActionLoading('cancel');
    const { data: { session } } = await supabase.auth.getSession();
    
    const res = await fetch('/api/subscription/cancel', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ userId: profile.id })
    });

    if (res.ok) {
      alert("Suscripción cancelada con éxito.");
      window.location.href = '/dashboard/subscription';
    }
    setActionLoading(null);
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase">Cargando Facturación...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Cambiar de Plan</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Gestiona tu nivel de operación en BitaFly.</p>
        </div>
        <Link href="/dashboard/subscription" className="text-xs font-bold text-slate-400 hover:text-navy uppercase tracking-widest">Volver</Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* PLAN ESCUADRILLA */}
        <PlanActionCard 
          title="Escuadrilla"
          price="49"
          isActive={profile?.subscription_plan === 'escuadrilla'}
          onAction={() => handleUpgrade('ESCUADRILLA', '49')}
          btnText="Mejorar a Escuadrilla"
        />

        {/* PLAN FLOTA */}
        <PlanActionCard 
          title="Flota"
          price="129"
          isActive={profile?.subscription_plan === 'flota'}
          onAction={() => handleUpgrade('FLOTA', '129')}
          btnText="Mejorar a Flota"
          recommended
        />

        {/* OPCIÓN CANCELAR / VOLVER A PILOTO */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-lg font-black text-slate-400 uppercase mb-4">Plan Piloto</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-medium">
              Vuelve a la versión básica gratuita. Tu historial de vuelos se mantendrá, pero tus límites de registro se reducirán.
            </p>
          </div>
          {profile?.subscription_plan !== 'piloto' ? (
            <button 
              onClick={handleCancel}
              disabled={actionLoading === 'cancel'}
              className="mt-8 w-full py-4 border-2 border-red-100 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all"
            >
              {actionLoading === 'cancel' ? 'Cancelando...' : 'Cancelar Plan Actual'}
            </button>
          ) : (
            <div className="mt-8 p-4 bg-slate-50 rounded-2xl text-center text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-100">
              Plan actual activo
            </div>
          )}
        </div>

      </div>

      <footer className="p-8 bg-[#1A202C] rounded-[2rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
         <div className="text-left">
            <p className="text-[10px] font-black uppercase text-[#ec5b13] tracking-widest mb-1">¿Necesitas algo a medida?</p>
            <p className="text-sm font-bold text-slate-300">Contáctanos para una implementación Enterprise con usuarios ilimitados.</p>
         </div>
         <Link href="/#contacto" className="bg-[#ec5b13] px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest">Hablar con Ventas</Link>
      </footer>
    </div>
  );
}

function PlanActionCard({ title, price, isActive, onAction, btnText, recommended }) {
  return (
    <div className={`p-8 rounded-[2.5rem] border-2 flex flex-col transition-all bg-white ${isActive ? 'border-[#ec5b13] bg-orange-50/30' : 'border-slate-100'}`}>
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-xl font-black text-slate-900 uppercase">{title}</h3>
        {recommended && <span className="bg-[#ec5b13] text-white text-[8px] font-black px-2 py-1 rounded-lg">POPULAR</span>}
      </div>
      <div className="mb-8">
        <span className="text-4xl font-black text-slate-900">${price}</span>
        <span className="text-[10px] font-black text-slate-400 uppercase ml-2">/ mes</span>
      </div>
      
      {isActive ? (
        <div className="bg-[#ec5b13] text-white p-4 rounded-2xl text-center flex items-center justify-center gap-2">
           <span className="material-symbols-outlined text-sm">verified</span>
           <span className="text-[10px] font-black uppercase tracking-widest">Plan Actual</span>
        </div>
      ) : (
        <button onClick={onAction} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#ec5b13] transition-all shadow-lg">
          {btnText}
        </button>
      )}
    </div>
  );
}