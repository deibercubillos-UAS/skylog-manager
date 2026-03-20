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

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          window.location.href = '/login';
          return;
        }
        const res = await fetch(`/api/user/profile?userId=${session.user.id}`);
        const data = await res.json();
        if (!data.error) setProfile(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpgrade = (planName, price) => {
    if (!profile?.email) return alert("Error de perfil");
    openEpaycoCheckout(planName, price, profile.email);
  };

  if (loading) return <div className="p-20 text-center font-black text-slate-300 uppercase animate-pulse">Cargando Gestión...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20 font-display">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Administrar Plan</h2>
          <p className="text-slate-500 text-sm mt-2">Mejora o modifica tu suscripción en BitaFly.</p>
        </div>
        <Link href="/dashboard/subscription" className="text-[10px] font-black text-slate-400 hover:text-[#ec5b13] uppercase tracking-widest border border-slate-200 px-4 py-2 rounded-xl transition-all">
          Volver
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
        <div className="p-8 rounded-[2.5rem] border-2 border-slate-100 bg-white shadow-sm flex flex-col justify-between">
            <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">Plan Escuadrilla</h3>
                <p className="text-4xl font-black mt-4">$49<span className="text-xs text-slate-400 uppercase ml-2">/ mes</span></p>
            </div>
            <button onClick={() => handleUpgrade('ESCUADRILLA', '49')} className="mt-8 w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#ec5b13] transition-all">
                Activar Escuadrilla
            </button>
        </div>

        <div className="p-8 rounded-[2.5rem] border-2 border-[#ec5b13] bg-white shadow-xl flex flex-col justify-between relative scale-105">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ec5b13] text-white text-[8px] font-black px-3 py-1 rounded-full uppercase">Recomendado</span>
            <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">Plan Flota</h3>
                <p className="text-4xl font-black mt-4">$129<span className="text-xs text-slate-400 uppercase ml-2">/ mes</span></p>
            </div>
            <button onClick={() => handleUpgrade('FLOTA', '129')} className="mt-8 w-full py-4 bg-[#ec5b13] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:shadow-lg transition-all">
                Activar Flota
            </button>
        </div>
      </div>
    </div>
  );
}