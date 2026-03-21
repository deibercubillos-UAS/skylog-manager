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
        console.error("Falla al cargar perfil:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleUpgrade = (planName) => {
    if (!profile?.id || !profile?.email) {
      alert("⚠️ Error: Datos de perfil no detectados. Recarga la página.");
      return;
    }
    // Abrimos ePayco (el precio se calcula internamente en useEpayco.js)
    openEpaycoCheckout(planName, "0", profile.email, profile.id, isAnnual);
  };

  const handleCancel = async () => {
    if (!confirm("¿Deseas volver al Plan Piloto? Tus límites se reducirán y perderás las funciones PRO.")) return;
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
        alert("✅ Suscripción cancelada. Volviendo al Plan Piloto.");
        window.location.href = '/dashboard/subscription';
      }
    } catch (e) {
      alert("Error al procesar cancelación.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Sincronizando BitaFly Hub...</div>;

  if (!profile) return <div className="p-20 text-center text-red-500 font-black uppercase">⚠️ Error de sesión. Por favor reingresa.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20 font-display">
      
      {/* HEADER CON SWITCH DE AHORRO */}
      <header className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 text-left">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Gestión de Membresía</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium italic">Configura tu potencia operativa y ciclos de facturación.</p>
        </div>

        <div className="flex bg-slate-200 p-1.5 rounded-2xl border border-slate-300 shadow-inner shrink-0">
          <button onClick={() => setIsAnnual(false)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${!isAnnual ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>Mensual</button>
          <button onClick={() => setIsAnnual(true)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${isAnnual ? 'bg-white shadow-md text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            Anual <span className="bg-orange-100 text-[#ec5b13] px-2 py-0.5 rounded-full font-black animate-pulse">ahorra 20%</span>
          </button>
        </div>
      </header>

      {/* GRID DE PLANES PROFESIONALES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* PLAN ESCUADRILLA */}
        <UpgradeCard 
          title="Escuadrilla" 
          price={isAnnual ? "39" : "49"} 
          isActive={profile.subscription_plan === 'escuadrilla'}
          features={[
            "Hasta 15 Drones Registrados",
            "Hasta 7 Pilotos en Equipo",
            "Alertas de Mantenimiento Preventivo",
            "Generador de Reportes PDF Oficiales",
            "Gestión de Misiones Dinámicas"
          ]}
          onAction={() => handleUpgrade('Escuadrilla')}
        />

        {/* PLAN FLOTA */}
        <UpgradeCard 
          title="Flota" 
          price={isAnnual ? "103" : "129"} 
          isActive={profile.subscription_plan === 'flota'}
          recommended={true}
          features={[
            "Drones Ilimitados (Registro Masivo)",
            "Hasta 20 Pilotos Certificados",
            "Gestión de Ciclos de Vida (Motores)",
            "Exportación Masiva (Excel / CSV)",
            "Dashboard de Rendimiento Avanzado"
          ]}
          onAction={() => handleUpgrade('Flota')}
        />

        {/* ESTATUS ACTUAL Y CANCELACIÓN */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="relative z-10 text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estatus del Plan</p>
            <h3 className="text-2xl font-black text-slate-900 uppercase">
              {profile.subscription_plan === 'piloto' ? 'Plan Piloto Free' : 'Suscripción Activa'}
            </h3>
            <p className="text-xs text-slate-500 mt-4 font-medium leading-relaxed">
              {profile.subscription_plan === 'piloto' 
                ? 'Estás usando la versión limitada. Mejora tu cuenta para desbloquear el trabajo colaborativo.' 
                : 'Tu cuenta corporativa está verificada. Tienes acceso a todas las herramientas de cumplimiento.'}
            </p>
          </div>

          <div className="relative z-10 mt-10">
            {profile.subscription_plan !== 'piloto' ? (
              <button 
                onClick={handleCancel} 
                disabled={actionLoading === 'cancel'} 
                className="w-full py-4 border-2 border-red-50 text-red-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm"
              >
                {actionLoading === 'cancel' ? 'Procesando...' : 'Cancelar Suscripción'}
              </button>
            ) : (
              <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[10px] uppercase text-center border border-slate-200">
                Aeronaves permitidas: 1
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER DE AYUDA Y SOPORTE ENTERPRISE */}
      <footer className="bg-[#1A202C] rounded-[2.5rem] p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ec5b13]/10 blur-[80px] rounded-full -mr-32 -mt-32"></div>
        
        <div className="text-left relative z-10">
          <div className="flex items-center gap-3 mb-2 text-[#ec5b13]">
            <span className="material-symbols-outlined font-black">support_agent</span>
            <h4 className="text-lg font-black uppercase tracking-tight">¿Necesitas una solución a medida?</h4>
          </div>
          <p className="text-slate-400 text-sm font-medium max-w-xl leading-relaxed">
            Para flotas de más de 20 pilotos, integraciones vía API con sistemas ERP o servicios de Marca Blanca (White Label), contacta a nuestro equipo de ventas corporativas.
          </p>
        </div>

        <Link href="/#contacto" className="bg-white text-[#1A202C] px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-[#ec5b13] hover:text-white transition-all relative z-10 shadow-lg active:scale-95">
          Contactar Ventas
        </Link>
      </footer>
    </div>
  );
}

// COMPONENTE INTERNO: TARJETA DE UPGRADE
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
            <span className="bg-slate-900 text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">Más Popular</span>
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
            <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-600 leading-tight">
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
          Suscribirme a {title}
        </button>
      ) : (
        <div className="w-full py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[10px] uppercase text-center border border-emerald-100">
           Suscripción Activa
        </div>
      )}
    </div>
  );
}