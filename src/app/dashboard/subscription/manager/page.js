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

  // 1. Carga Segura de Datos
  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        window.location.href = '/login';
        return;
      }

      const res = await fetch(`/api/user/profile?userId=${session.user.id}`);
      const data = await res.json();
      
      if (!data.error) {
        setProfile(data);
      }
    } catch (err) {
      console.error("Error en Manage Subscription:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpgrade = (planName, price) => {
    if (!profile?.email) return alert("Error: No se detectó el correo del usuario.");
    openEpaycoCheckout(planName, price, profile.email);
  };

  const handleCancel = async () => {
    if (!confirm("¿Seguro que deseas cancelar? Tus límites de drones y pilotos volverán al Plan Piloto (1/1).")) return;
    
    setActionLoading('cancel');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ userId: profile?.id })
      });

      if (res.ok) {
        alert("✅ Has vuelto al Plan Piloto.");
        window.location.href = '/dashboard/subscription';
      }
    } catch (err) {
      alert("Error al procesar la cancelación.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return (
    <div className="p-20 text-center animate-pulse">
      <div className="size-12 bg-slate-200 rounded-full mx-auto mb-4"></div>
      <p className="font-black text-slate-300 uppercase tracking-widest text-xs">Cargando Facturación BitaFly...</p>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20 font-display">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Administrar Plan</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Actualiza o modifica tu suscripción operativa.</p>
        </div>
        <Link href="/dashboard/subscription" className="text-[10px] font-black text-slate-400 hover:text-[#ec5b13] uppercase tracking-widest border border-slate-200 px-4 py-2 rounded-xl transition-all">
          Volver
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* PLAN ESCUADRILLA */}
        <PlanActionCard 
          title="Escuadrilla"
          price="49"
          isActive={profile?.subscription_plan === 'escuadrilla'}
          onAction={() => handleUpgrade('ESCUADRILLA', '49')}
          btnText="Activar Escuadrilla"
        />

        {/* PLAN FLOTA */}
        <PlanActionCard 
          title="Flota"
          price="129"
          isActive={profile?.subscription_plan === 'flota'}
          onAction={() => handleUpgrade('FLOTA', '129')}
          btnText="Activar Flota"
          recommended
        />

        {/* OPCIÓN CANCELAR */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-lg font-black text-slate-400 uppercase mb-4 tracking-tighter">Plan Piloto</h3>
            <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Vuelve al modo gratuito. Podrás mantener tus registros pero los límites de flota se restringirán.
            </p>
          </div>
          
          {profile?.subscription_plan !== 'piloto' ? (
            <button 
              onClick={handleCancel}
              disabled={actionLoading === 'cancel'}
              className="mt-8 w-full py-4 border-2 border-red-50 border-dashed text-red-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-all"
            >
              {actionLoading === 'cancel' ? 'Procesando...' : 'Cancelar Plan Pro'}
            </button>
          ) : (
            <div className="mt-8 p-4 bg-slate-50 rounded-2xl text-center text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-100">
              Actualmente en uso
            </div>
          )}
        </div>
      </div>

      {/* FOOTER DE CONTACTO */}
      <div className="p-8 bg-[#1A202C] rounded-[2.5rem] text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 size-32 bg-[#ec5b13]/10 blur-3xl rounded-full"></div>
         <div className="text-left relative z-10">
            <p className="text-[10px] font-black uppercase text-[#ec5b13] tracking-widest mb-1">¿Necesitas soporte de facturación?</p>
            <p className="text-sm font-bold text-slate-300">Nuestro equipo está disponible 24/7 para resolver dudas de pagos.</p>
         </div>
         <Link href="/#contacto" className="bg-white text-[#1A202C] px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all relative z-10">Enviar Ticket</Link>
      </div>
    </div>
  );
}

// Componente Interno para Cards
function PlanActionCard({ title, price, isActive, onAction, btnText, recommended }) {
  return (
    <div className={`p-8 rounded-[2.5rem] border-2 flex flex-col transition-all bg-white ${isActive ? 'border-[#ec5b13] ring-8 ring-[#ec5b13]/5' : 'border-slate-100 hover:border-slate-200'}`}>
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">{title}</h3>
        {recommended && <span className="bg-[#ec5b13] text-white text-[8px] font-black px-3 py-1 rounded-full uppercase">Top</span>}
      </div>
      <div className="mb-10 text-left">
        <span className="text-4xl font-black text-slate-900">${price}</span>
        <span className="text-[10px] font-black text-slate-400 uppercase ml-2">/ mes</span>
      </div>
      
      {isActive ? (
        <div className="bg-[#ec5b13] text-white p-4 rounded-2xl text-center flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20">
           <span className="material-symbols-outlined text-sm font-black">check_circle</span>
           <span className="text-[10px] font-black uppercase tracking-widest">Suscripción Activa</span>
        </div>
      ) : (
        <button onClick={onAction} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#ec5b13] hover:shadow-xl transition-all">
          {btnText}
        </button>
      )}
    </div>
  );
}