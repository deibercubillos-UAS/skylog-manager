'use client';
import { supabase } from '@/lib/supabase';

export default function SecuritySettings() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h3 className="text-sm font-black uppercase tracking-widest text-[#ec5b13]">Seguridad de la Cuenta</h3>
      <div className="space-y-4">
        <button onClick={async () => {
          const { error } = await supabase.auth.resetPasswordForEmail(prompt("Ingresa tu correo"));
          if(!error) alert("Correo de recuperación enviado");
        }} className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 flex justify-between items-center hover:bg-slate-50 transition-all">
          Cambiar Contraseña
          <span className="material-symbols-outlined text-slate-400">chevron_right</span>
        </button>
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-between">
           <p className="text-xs font-black text-red-600 uppercase">Eliminar toda la data de vuelo</p>
           <button className="text-[10px] font-black text-white bg-red-500 px-3 py-1.5 rounded-lg uppercase shadow-sm">Borrar Datos</button>
        </div>
      </div>
    </div>
  );
}