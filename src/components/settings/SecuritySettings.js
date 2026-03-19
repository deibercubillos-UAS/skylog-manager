'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SecuritySettings() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  // 1. Obtener el correo del usuario actual para mostrarlo
  useEffect(() => {
    async function getUserEmail() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setEmail(user.email);
    }
    getUserEmail();
  }, []);

  // 2. Función para solicitar el cambio vía API (reutilizamos la lógica segura)
  const handlePasswordRequest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email })
      });

      if (response.ok) {
        setSent(true);
        // Volvemos al estado inicial después de 5 segundos
        setTimeout(() => setSent(false), 5000);
      } else {
        alert("No se pudo procesar la solicitud. Reintenta más tarde.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 text-left">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-[#ec5b13]">Seguridad de Acceso</h3>
        <p className="text-[11px] text-slate-400 font-medium mt-1">Protege tus credenciales y el acceso a la bitácora.</p>
      </div>

      <div className="space-y-6">
        {/* Bloque de Cambio de Contraseña */}
        <div className="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="size-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-[#ec5b13] shadow-sm shrink-0">
              <span className="material-symbols-outlined">lock_reset</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-black text-slate-900 uppercase">Actualizar Contraseña</p>
              <p className="text-[10px] text-slate-500 font-medium leading-tight max-w-xs mt-1">
                Por seguridad, te enviaremos un enlace de confirmación a <span className="font-bold text-slate-700">{email}</span> para autorizar el cambio.
              </p>
            </div>
          </div>

          <button 
            onClick={handlePasswordRequest}
            disabled={loading || sent}
            className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 ${
              sent 
              ? 'bg-emerald-500 text-white shadow-emerald-500/20' 
              : 'bg-[#1A202C] text-white hover:bg-slate-800 shadow-slate-900/20'
            }`}
          >
            {loading ? (
              <> <div className="animate-spin size-3 border-b-2 border-white rounded-full"></div> PROCESANDO... </>
            ) : sent ? (
              <> <span className="material-symbols-outlined text-sm">check_circle</span> CORREO ENVIADO </>
            ) : (
              "Solicitar Cambio"
            )}
          </button>
        </div>

        {/* Bloque de Sesiones */}
        <div className="p-6 border border-slate-100 rounded-[1.5rem] flex items-center justify-between">
           <div className="text-left">
             <p className="text-xs font-black text-slate-700 uppercase">Sesión Actual</p>
             <p className="text-[10px] text-slate-400">Activa en este navegador</p>
           </div>
           <span className="px-3 py-1 bg-emerald-100 text-emerald-600 text-[9px] font-black rounded-full uppercase">En Línea</span>
        </div>

        {/* Zona Roja */}
        <div className="pt-6 border-t border-slate-100">
          <div className="bg-red-50 border border-red-100 rounded-[1.5rem] p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-left">
              <p className="text-xs font-black text-red-700 uppercase">Eliminar Cuenta Permanentemente</p>
              <p className="text-[10px] text-red-500 font-medium">Esta acción borrará toda tu bitácora, drones y pilotos de forma irreversible.</p>
            </div>
            <button className="bg-white text-red-600 border border-red-200 px-6 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">
              Borrar Todo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}