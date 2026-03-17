'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function InvitePilotPanel({ onClose, onSuccess }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('piloto');
  const [loading, setLoading] = useState(false);

  const handleInvite = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('invitations').insert([
      { 
        email: email.toLowerCase().trim(), 
        role: role, 
        organization_id: user.id 
      }
    ]);

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("¡Invitación enviada exitosamente!");
      onSuccess();
    }
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 p-8 flex flex-col text-left animate-in slide-in-from-right duration-300">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900">Invitar al Equipo</h3>
        <button onClick={onClose} className="material-symbols-outlined text-slate-400 hover:text-red-500">close</button>
      </div>

      <form onSubmit={handleInvite} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">mail</span>
            <input 
              required type="email" 
              className="w-full pl-12 pr-4 py-4 bg-slate-50 rounded-2xl border-none text-sm font-bold outline-none focus:ring-2 focus:ring-[#ec5b13]/20"
              placeholder="piloto@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asignar Rol</label>
          <select 
            className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold outline-none appearance-none"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="piloto">Piloto Estándar</option>
            <option value="jefe_pilotos">Jefe de Pilotos</option>
            <option value="gerente_sms">Gerente de SMS</option>
          </select>
        </div>

        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
          <p className="text-[10px] text-blue-600 font-bold uppercase leading-tight">
            El piloto recibirá un acceso vinculado a tu flota. Podrá registrar vuelos pero no modificar tu configuración general.
          </p>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 uppercase text-xs tracking-[0.2em] transition-all hover:scale-[1.02] active:scale-95"
        >
          {loading ? 'Procesando...' : 'Enviar Invitación'}
        </button>
      </form>
    </aside>
  );
}