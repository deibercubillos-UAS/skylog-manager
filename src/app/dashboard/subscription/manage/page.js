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
    if (!profile) 
      alert("Error: No se detectó la sesión del usuario. Reintenta loguearte.");
      return;
    }
    openEpaycoCheckout(planName, price, profile.email, profile.id, isAnnual);
  };

  const handleCancel = async () => {
    if (!confirm("¿Seguro que deseas cancelar? Tus límites volverán a 1 drone / 1 piloto y perderás las funciones PRO.")) return;
    
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
      alert("Suscripción cancelada correctamente.");
      window.location.href = '/dashboard/subscription';
    }
    setActionLoading(null);
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Sincronizando Facturación...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20 font-display">
      
      {/* HEADER CON SWITCH DE CICLO */}
      <header className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6">
        <div className="text-left">
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Mi Membresía</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Gestiona tu potencia de operación y límites técnicos.</p>
        </div>

        <div className="flex bg-slate-200 p-1.5 rounded-2xl border border-slate-300 shadow-inner shrink-0">
          <button onClick={() => setIsAnnual(false)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${!isAnnual ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Mensual</button>
          <button onClick={() => setIsAnnual(true)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${isAnnual ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            Anual <span className="bg-orange-100 text-[#ec5b13] px-2 py-0.5 rounded-full font-black lowercase animate-pulse">ahorra 20%</span>
          </button>
        </div>
      </header>

      {/* GRID DE PLANES PROFESIONAL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PLAN ESCUADRILLA */}
        <UpgradeCard 
          title="Escuadrilla"
          price={isAnnual ? "39" : "49"}
          isActive={profile?.subscription_plan === 'escuadrilla'}
          features={[
            "Hasta 15 Drones",
            "Hasta 7 Pilotos Certificados",
            "Alertas de Mantenimiento",
            "Reportes para Auditoría",
            "Asignación de Misiones"
          ]}
          onAction={() => handleUpgrade('Escuadrilla', '49')}
        />

        {/* PLAN FLOTA */}
        <UpgradeCard 
          title="Flota"
          price={isAnnual ? "103" : "129"}
          isActive={profile?.subscription_plan === 'flota'}
          recommended={true}
          features={[
            "Drones Ilimitados",
            "Hasta 20 Pilotos Activos",
            "Gestión de Ciclos de Vida",
            "Estadísticas Avanzadas",
            "Exportación Masiva (Excel/CSV)"
          ]}
          onAction={() => handleUpgrade('Flota', '129')}
        />

        {/* PANEL DE STATUS Y CANCELACIÓN */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
          {profile?.subscription_plan === 'piloto' && (
            <div className="absolute inset-0 bg-slate-50/50 backdrop-blur-[1px] z-0"></div>
          )}
          
          <div className="relative z-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estatus del Plan</p>
            <h3 className="text-2xl font-black text-slate-900 uppercase">
              {profile?.subscription_plan === 'piloto' ? 'Plan Piloto Free' : 'Suscripción Activa'}
            </h3>
            <p className="text-xs text-slate-500 mt-4 font-medium leading-relaxed">
              {profile?.subscription_plan === 'piloto' 
                ? 'Estás usando la versión limitada. Mejora para desbloquear la gestión de equipos.' 
                : 'Tu cuenta tiene acceso total a las funciones profesionales de BitaFly.'}
            </p>
          </div>

          <div className="relative z-10 mt-10">
            {profile?.subscription_plan !== 'piloto' ? (
              <button 
                onClick={handleCancel}
                disabled={actionLoading === 'cancel'}
                className="w-full py-4 border-2 border-red-50 text-red-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm"
              >
                {actionLoading === 'cancel' ? 'Procesando...' : 'Cancelar Plan y volver a Piloto'}
              </button>
            ) : (
              <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase text-center border border-slate-200">
                Límite de Aeronaves: 1
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER DE AYUDA INDUSTRIAL */}
      <footer className="bg-[#1A202C] rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ec5b13]/10 blur-[80px] rounded-full -mr-32 -mt-32"></div>
        
        <div className="text-left relative z-10">
          <div className="flex items-center gap-3 mb-2 text-[#ec5b13]">
            <span className="material-symbols-outlined font-black">support_agent</span>
            <h4 className="text-lg font-black uppercase tracking-tight">¿Necesitas una solución Enterprise?</h4>
          </div>
          <p className="text-slate-400 text-sm font-medium max-w-xl">
            Para flotas de más de 20 pilotos, integraciones API personalizadas o White Label, contacta a nuestro equipo de ingeniería.
          </p>
        </div>

        <Link href="/#contacto" className="bg-white text-[#1A202C] px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#ec5b13] hover:text-white transition-all relative z-10 shadow-lg">
          Contactar Soporte
        </Link>
      </footer>
    </div>
  );
}

// COMPONENTE DE TARJETA DE PLAN ACTUALIZADO
function UpgradeCard({ title, price, isActive, features, onAction, recommended }) {
  return (
    <div className={`p-8 rounded-[2.5rem] border-2 bg-white flex flex-col justify-between transition-all duration-500 ${
      isActive 
      ? 'border-[#ec5b13] bg-orange-50/20 ring-8 ring-orange-500/5 shadow-inner scale-105' 
      : 'border-slate-100 hover:border-slate-300 hover:shadow-xl'
    }`}>
      <div className="text-left">
        <div className="flex justify-between items-start mb-6">
          <h3 className={`text-xl font-black uppercase ${isActive ? 'text-[#ec5b13]' : 'text-slate-900'}`}>{title}</h3>
          {recommended && !isActive && (
            <span className="bg-slate-900 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Popular</span>
          )}
          {isActive && (
            <span className="bg-[#ec5b13] text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Plan Actual</span>
          )}
        </div>
        
        <div className="mb-8 flex items-baseline gap-1">
          <span className="text-5xl font-black text-slate-900">${price}</span>
          <span className="text-slate-400 text-xs font-bold uppercase">/ mes</span>
        </div>

        <ul className="space-y-4 mb-10">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-600">
              <span className={`material-symbols-outlined text-lg ${isActive ? 'text-[#ec5b13]' : 'text-slate-400'}`}>
                check_circle
              </span> 
              {f}
            </li>
          ))}
        </ul>
      </div>

      {!isActive ? (
        <button 
          onClick={onAction}
          className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-[#ec5b13] transition-all shadow-xl active:scale-95"
        >
          Seleccionar {title}
        </button>
      ) : (
        <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase text-center border border-emerald-100">
          Activo y Verificado
        </div>
      )}
    </div>
  );
}