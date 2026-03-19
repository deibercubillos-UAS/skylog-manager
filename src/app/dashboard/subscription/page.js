'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SubscriptionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSubscription = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/subscription?userId=${session.user.id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const result = await res.json();
      if (!result.error) setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadSubscription(); }, []);

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Consultando Estatus de Cuenta...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-10 text-left animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none text-left">Mi Suscripción</h2>
        <p className="text-slate-500 text-sm mt-2 font-medium">Control de recursos y límites operativos de BitaFly.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CARD PLAN ACTUAL (BACKEND DRIVEN) */}
        <div className="bg-[#1A202C] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between h-80">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#ec5b13]/20 blur-3xl rounded-full -mr-20 -mt-20"></div>
          
          <div className="relative z-10 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ec5b13] mb-2">Estatus Actual</p>
            <h3 className="text-4xl font-black uppercase tracking-tight">{data?.planName}</h3>
          </div>

          <div className="relative z-10">
            <Link href="/#precios" className="block w-full py-4 bg-white text-[#1A202C] rounded-2xl font-black text-xs uppercase tracking-widest text-center hover:bg-slate-100 transition-all">
              Cambiar de Plan
            </Link>
          </div>
        </div>

        {/* MEDIDORES DE CONSUMO REALES */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm space-y-10">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Consumo de Recursos en Tiempo Real</h3>
          
          <div className="space-y-8">
            <ResourceMeter 
              label="Aeronaves en Sistema" 
              current={data?.usage.drones.current} 
              limit={data?.usage.drones.limit} 
              icon="precision_manufacturing"
            />
            <ResourceMeter 
              label="Tripulación Activa" 
              current={data?.usage.pilots.current} 
              limit={data?.usage.pilots.limit} 
              icon="group"
            />
          </div>
        </div>
      </div>
      
      {/* SECCIÓN DE CAPACIDADES DESBLOQUEADAS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <FeatureStatus label="Reportes de Auditoría" active={data?.features.reports !== 'basic'} />
        <FeatureStatus label="Alertas de Mantenimiento" active={data?.features.maintenance} />
        <FeatureStatus label="Análisis SORA Sail I-IV" active={data?.features.sora} />
      </div>
    </div>
  );
}

function ResourceMeter({ label, current, limit, icon }) {
  const percent = Math.min((current / limit) * 100, 100);
  const isFull = current >= limit;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end px-1">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[#ec5b13]">{icon}</span>
          <span className="text-xs font-black uppercase text-slate-700 tracking-tight">{label}</span>
        </div>
        <span className={`text-sm font-black ${isFull ? 'text-red-500' : 'text-slate-900'}`}>
          {current} / {limit >= 999 ? '∞' : limit}
        </span>
      </div>
      <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden p-1">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${isFull ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-[#ec5b13]'}`} 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}

function FeatureStatus({ label, active }) {
  return (
    <div className={`p-4 rounded-2xl border flex items-center gap-3 ${active ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
      <span className="material-symbols-outlined text-lg">{active ? 'verified' : 'lock'}</span>
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
  );
}