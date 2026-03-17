'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function SelectPlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(null);

  const handlePlanSelection = async (plan) => {
    setLoading(plan);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const { error } = await supabase
        .from('profiles')
        .update({ subscription_plan: plan })
        .eq('id', user.id);

      if (error) {
        alert("Error al asignar plan: " + error.message);
      } else {
        // Redirigir al dashboard final
        window.location.href = '/dashboard';
      }
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-[#f8f6f6] flex flex-col items-center justify-center p-6 text-left font-display">
      <div className="max-w-6xl w-full">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Bienvenido a SkyLog</h1>
          <p className="text-slate-500 mt-2">Para comenzar, selecciona el plan que mejor se adapte a tu operación actual.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* OPCIÓN 1: PILOTO */}
          <PlanOption 
            title="Plan Piloto"
            price="0"
            desc="Uso individual y personal."
            features={["1 Piloto", "1 Drone Registrado", "Bitácora Ilimitada", "Checklist Básico"]}
            loading={loading === 'piloto'}
            onClick={() => handlePlanSelection('piloto')}
          />

          {/* OPCIÓN 2: ESCUADRILLA */}
          <PlanOption 
            title="Plan Escuadrilla"
            price="49"
            desc="Equipos de trabajo (PIC + SMS)."
            features={["Hasta 7 Usuarios", "15 Drones", "Análisis SORA", "Alertas Técnicas"]}
            recommended={true}
            loading={loading === 'escuadrilla'}
            onClick={() => handlePlanSelection('escuadrilla')}
          />

          {/* OPCIÓN 3: FLOTA */}
          <PlanOption 
            title="Plan Flota"
            price="129"
            desc="Operaciones masivas corporativas."
            features={["Hasta 20 Pilotos", "Drones Ilimitados", "Gestión de Ciclos de Vida", "Reportes Masivos"]}
            loading={loading === 'flota'}
            onClick={() => handlePlanSelection('flota')}
          />
        </div>
      </div>
    </div>
  );
}

function PlanOption({ title, price, desc, features, onClick, loading, recommended }) {
  return (
    <div className={`bg-white p-8 rounded-[2.5rem] border-2 flex flex-col transition-all ${recommended ? 'border-[#ec5b13] shadow-2xl scale-105 z-10' : 'border-slate-100 shadow-sm hover:border-slate-200'}`}>
      {recommended && <span className="bg-[#ec5b13] text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full self-center mb-4">Más Popular</span>}
      <h3 className="text-xl font-black uppercase text-slate-900">{title}</h3>
      <div className="mt-4 mb-6">
        <span className="text-4xl font-black">${price}</span>
        {price !== '0' && <span className="text-slate-400 text-xs font-bold uppercase ml-1">/ mes</span>}
      </div>
      <p className="text-slate-500 text-sm mb-6 font-medium leading-tight h-10">{desc}</p>
      <ul className="space-y-3 mb-10 flex-1">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <span className="material-symbols-outlined text-[#ec5b13] text-base">check_circle</span> {f}
          </li>
        ))}
      </ul>
      <button 
        onClick={onClick}
        disabled={loading}
        className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${recommended ? 'bg-[#ec5b13] text-white shadow-lg' : 'bg-slate-900 text-white'}`}
      >
        {loading ? 'Configurando...' : 'Seleccionar Plan'}
      </button>
    </div>
  );
}