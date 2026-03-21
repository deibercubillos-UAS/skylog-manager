'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SubscriptionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadSubscription() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = '/login';
            return;
        }

        const res = await fetch(`/api/subscription?userId=${session.user.id}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });

        if (!res.ok) throw new Error(`Error ${res.status}: No se pudo obtener la data.`);

        const result = await res.json();
        setData(result);
      } catch (err) {
        console.error("Error en suscripción:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadSubscription();
  }, []);

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Consultando Estatus...</div>;

  if (error || !data) return (
    <div className="p-20 text-center text-red-500 font-bold uppercase tracking-widest">
      ⚠️ Error de conexión con el servicio de suscripción. <br/>
      <button onClick={() => window.location.reload()} className="mt-4 text-[#ec5b13] underline text-xs">Reintentar</button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-10 text-left animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Mi Suscripción</h2>
        <p className="text-slate-500 text-sm mt-1">Límites y control de recursos de tu cuenta BitaFly.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
        <div className="bg-[#1A202C] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between h-80">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#ec5b13]/20 blur-3xl rounded-full -mr-20 -mt-20"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ec5b13] mb-2">Estatus Actual</p>
            <h3 className="text-4xl font-black uppercase tracking-tight">{data.planName}</h3>
          </div>
          <Link href="/dashboard/subscription/manage" className="relative z-10 block w-full py-4 bg-white text-[#1A202C] rounded-2xl font-black text-xs uppercase tracking-widest text-center">
            Administrar Plan
          </Link>
        </div>

        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm space-y-10">
          <UsageMeter label="Aeronaves" current={data.usage.drones.current} limit={data.usage.drones.limit} icon="precision_manufacturing" />
          <UsageMeter label="Tripulación" current={data.usage.pilots.current} limit={data.usage.pilots.limit} icon="group" />
        </div>
      </div>
    </div>
  );
}

function UsageMeter({ label, current, limit, icon }) {
  const percent = Math.min((current / limit) * 100, 100);
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-3"><span className="material-symbols-outlined text-[#ec5b13]">{icon}</span><span className="text-xs font-black uppercase">{label}</span></div>
        <span className="text-sm font-black">{current} / {limit >= 999 ? '∞' : limit}</span>
      </div>
      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-1">
        <div className="h-full bg-[#ec5b13] rounded-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}