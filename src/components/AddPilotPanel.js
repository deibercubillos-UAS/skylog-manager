'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddPilotPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', license_number: '', medical_expiry: '', 
    pilot_role: 'Piloto' // Rol por defecto
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // 1. Validar límites según el Plan
    const { data: profile } = await supabase.from('profiles').select('subscription_plan').eq('id', user.id).single();
    const { count } = await supabase.from('pilots').select('*', { count: 'exact', head: true }).eq('owner_id', user.id);

    const plan = profile.subscription_plan;
    const maxPilots = plan === 'piloto' ? 1 : (plan === 'escuadrilla' ? 7 : 999);

    if (count >= maxPilots) {
      alert(`⚠️ LÍMITE DE PLAN: Tu plan ${plan} permite máximo ${maxPilots} pilotos.`);
      setLoading(false); return;
    }

    const { error } = await supabase.from('pilots').insert([{ ...formData, owner_id: user.id }]);

    if (error) alert(error.message);
    else onSuccess();
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 p-8 flex flex-col text-left animate-in slide-in-from-right">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-black uppercase tracking-tighter">Registrar Tripulante</h3>
        <button onClick={onClose} className="material-symbols-outlined text-slate-400 hover:text-red-500">close</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Nombre Completo</label>
          <input required className="w-full bg-slate-50 border-slate-200 rounded-xl p-3 text-sm font-bold" onChange={e => setFormData({...formData, name: e.target.value})} />
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Rol en la Escuadrilla</label>
          <select className="w-full bg-slate-50 border-slate-200 rounded-xl p-3 text-sm font-bold appearance-none" 
            onChange={e => setFormData({...formData, pilot_role: e.target.value})}>
            <option value="Piloto">Piloto Estándar</option>
            <option value="Jefe de Pilotos">Jefe de Pilotos (PIC)</option>
            <option value="Gerente SMS">Gerente de Seguridad SMS</option>
            <option value="Observador">Observador Visual (VO)</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Vencimiento Médico</label>
          <input type="date" required className="w-full bg-slate-50 border-slate-200 rounded-xl p-3 text-sm font-bold" onChange={e => setFormData({...formData, medical_expiry: e.target.value})} />
        </div>

        <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 uppercase tracking-widest text-xs">
          {loading ? 'Validando...' : 'Confirmar Tripulante'}
        </button>
      </form>
    </aside>
  );
}