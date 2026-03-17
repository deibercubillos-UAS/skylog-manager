'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    plan: 'piloto',
    droneCount: 0,
    pilotCount: 0
  });

  // Definición de límites por plan (Para lógica visual)
  const limits = {
    piloto: { drones: 1, pilots: 1 },
    escuadrilla: { drones: 15, pilots: 7 },
    flota: { drones: 999, pilots: 20 }
  };

  useEffect(() => {
    async function loadSubscriptionData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 1. Obtener el plan del perfil
      const { data: profile } = await supabase.from('profiles').select('subscription_plan').eq('id', user.id).single();
      
      // 2. Contar Drones
      const { count: dCount } = await supabase.from('aircraft').select('*', { count: 'exact', head: true }).eq('owner_id', user.id);
      
      // 3. Contar Pilotos
      const { count: pCount } = await supabase.from('pilots').select('*', { count: 'exact', head: true }).eq('owner_id', user.id);

      setData({
        plan: profile?.subscription_plan || 'piloto',
        droneCount: dCount || 0,
        pilotCount: pCount || 0
      });
      setLoading(false);
    }
    loadSubscriptionData();
  }, []);

  if (loading) return <div className="p-10 animate-pulse font-black text-slate-400 text-left">CONSULTANDO ESTADO DE CUENTA...</div>;

  const currentLimits = limits[data.plan] || limits.piloto;

  return (
    <div className="max-w-5xl mx-auto space-y-10 text-left animate-in fade-in duration-500">
      <header>
        <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Mi Suscripción</h2>
        <p className="text-slate-500 text-sm mt-1">Gestiona tu plan operativo y límites de recursos.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CARD PLAN ACTUAL */}
        <div className="bg-[#1A202C] text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col justify-between h-80">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#ec5b13]/20 blur-3xl rounded-full -mr-10 -mt-10"></div>
          
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ec5b13] mb-2">Plan Activo</p>
            <h3 className="text-4xl font-black uppercase tracking-tighter">{data.plan}</h3>
            <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest">Renovación: N/A (Free)</p>
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="size-2 bg-emerald-500 rounded-full animate-ping"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Cuenta Verificada</span>
            </div>
            <button className="w-full py-3 bg-white text-[#1A202C] rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">
              Administrar Pagos
            </button>
          </div>
        </div>

        {/* CONSUMO DE RECURSOS */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-8">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Consumo de Recursos</h3>
          
          <div className="space-y-6">
            <UsageMeter 
              label="Aeronaves Registradas" 
              current={data.droneCount} 
              limit={currentLimits.drones} 
              icon="airplanemode_active"
            />
            <UsageMeter 
              label="Pilotos en Comando" 
              current={data.pilotCount} 
              limit={currentLimits.pilots} 
              icon="group"
            />
          </div>

          <div className="p-6 bg-orange-50 border border-orange-100 rounded-2xl flex items-center justify-between">
            <p className="text-xs font-bold text-orange-800 pr-4">
              ¿Tu flota está creciendo? El Plan Escuadrilla permite hasta 15 drones y gestión de equipo.
            </p>
            <Link href="/#precios" className="bg-[#ec5b13] text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest whitespace-nowrap shadow-lg">
              Subir de Plan
            </Link>
          </div>
        </div>

      </div>

      {/* COMPARATIVA DE MEJORA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BenefitMiniCard 
          title="Mantenimiento Avanzado" 
          desc="Desbloquea alertas predictivas y ciclos de vida de motores con Plan Escuadrilla." 
          icon="build" 
        />
        <BenefitMiniCard 
          title="Reportes Corporativos" 
          desc="Personaliza tus reportes con logo y firma digital en planes superiores." 
          icon="description" 
        />
      </div>
    </div>
  );
}

// COMPONENTES AUXILIARES
function UsageMeter({ label, current, limit, icon }) {
  const percent = Math.min((current / limit) * 100, 100);
  const isFull = current >= limit;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-400 text-lg">{icon}</span>
          <span className="text-[11px] font-black uppercase text-slate-600 tracking-tight">{label}</span>
        </div>
        <span className={`text-xs font-black ${isFull ? 'text-red-600' : 'text-slate-900'}`}>
          {current} / {limit === 999 ? '∞' : limit}
        </span>
      </div>
      <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${isFull ? 'bg-red-500' : 'bg-[#ec5b13]'}`} 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}

function BenefitMiniCard({ title, desc, icon }) {
  return (
    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex items-start gap-4">
      <div className="size-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#ec5b13] shrink-0">
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-black text-slate-900 uppercase tracking-tighter mb-1">{title}</p>
        <p className="text-xs text-slate-500 font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}