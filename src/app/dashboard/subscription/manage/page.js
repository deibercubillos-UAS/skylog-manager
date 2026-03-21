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
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const res = await fetch(`/api/user/profile?userId=${user.id}`);
          const data = await res.json();
          if (!data.error) setProfile(data);
        }
      } catch (err) {
        console.error("Error de carga:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpgrade = (planName) => {
    // PROTECCIÓN CRÍTICA: No permite avanzar si el perfil no existe
    if (!profile || !profile.id || !profile.email) {
      alert("⚠️ Error: Los datos de tu perfil no han cargado correctamente. Recarga la página.");
      return;
    }
    openEpaycoCheckout(planName, "0", profile.email, profile.id, isAnnual);
  };

  const handleCancel = async () => {
    if (!confirm("¿Deseas volver al Plan Piloto? Tus límites se reducirán.")) return;
    setActionLoading('cancel');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ userId: profile?.id })
      });
      window.location.href = '/dashboard/subscription';
    } catch (e) {
      alert("Error al procesar cancelación.");
    } finally {
      setActionLoading(null);
    }
  };

  // --- RENDERIZADO SEGURO ---
  if (loading) {
    return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Sincronizando con ePayco...</div>;
  }

  // Si después de cargar no hay perfil, mostramos un error amigable en lugar de un crash
  if (!profile) {
    return <div className="p-20 text-center text-red-500 font-bold uppercase tracking-widest">⚠️ No se pudo establecer la sesión. Reingresa al sistema.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20 font-display">
      <header className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 text-left">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Mi Membresía</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium italic">Gestión de facturación y límites técnicos.</p>
        </div>

        <div className="flex bg-slate-200 p-1.5 rounded-2xl border border-slate-300 shadow-inner">
          <button onClick={() => setIsAnnual(false)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${!isAnnual ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Mensual</button>
          <button onClick={() => setIsAnnual(true)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${isAnnual ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            Anual <span className="bg-orange-100 text-[#ec5b13] px-2 py-0.5 rounded-full font-black animate-pulse">Ahorra 20%</span>
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <UpgradeCard title="Escuadrilla" price={isAnnual ? "39" : "49"} isActive={profile.subscription_plan === 'escuadrilla'} features={["Hasta 15 Drones", "Hasta 7 Pilotos", "Alertas Mantenimiento", "Reportes PDF"]} onAction={() => handleUpgrade('Escuadrilla')} />
        <UpgradeCard title="Flota" price={isAnnual ? "103" : "129"} isActive={profile.subscription_plan === 'flota'} recommended={true} features={["Drones Ilimitados", "Hasta 20 Pilotos", "Ciclos de Vida AV", "Exportación XLS/CSV"]} onAction={() => handleUpgrade('Flota')} />
        
        {/* PANEL STATUS */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estatus Actual</p>
            <h3 className="text-2xl font-black text-slate-900 uppercase">{profile.subscription_plan === 'piloto' ? 'Plan Piloto Free' : 'Suscripción Activa'}</h3>
          </div>
          {profile.subscription_plan !== 'piloto' && (
            <button onClick={handleCancel} disabled={actionLoading === 'cancel'} className="mt-8 w-full py-4 border-2 border-red-50 text-red-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm">
              {actionLoading === 'cancel' ? 'Procesando...' : 'Cancelar Suscripción'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function UpgradeCard({ title, price, isActive, features, onAction, recommended }) {
  return (
    <div className={`p-8 rounded-[2.5rem] border-2 bg-white flex flex-col justify-between transition-all duration-500 ${isActive ? 'border-[#ec5b13] bg-orange-50/20' : 'border-slate-100 hover:border-slate-300'}`}>
      <div className="text-left">
        <div className="flex justify-between items-start mb-6">
          <h3 className={`text-xl font-black uppercase ${isActive ? 'text-[#ec5b13]' : 'text-slate-900'}`}>{title}</h3>
          {recommended && !isActive && <span className="bg-slate-900 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase">Popular</span>}
        </div>
        <div className="mb-8 flex items-baseline gap-1">
          <span className="text-5xl font-black text-slate-900">${price}</span>
          <span className="text-slate-400 text-xs font-bold uppercase">/ mes</span>
        </div>
        <ul className="space-y-4 mb-10">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-600">
              <span className={`material-symbols-outlined text-lg ${isActive ? 'text-[#ec5b13]' : 'text-slate-400'}`}>check_circle</span> {f}
            </li>
          ))}
        </ul>
      </div>
      {!isActive ? (
        <button onClick={onAction} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase hover:bg-[#ec5b13] transition-all shadow-xl">Suscribirme</button>
      ) : (
        <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase text-center border border-emerald-100">Plan Activo</div>
      )}
    </div>
  );
}