'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { canAddResource } from '@/lib/planLimits'; // Importamos la lógica

export default function AddAircraftPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ model: '', serial_number: '', mtow: 0 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Obtener plan y conteo actual
    const { data: profile } = await supabase.from('profiles').select('subscription_plan').eq('id', user.id).single();
    const { count } = await supabase.from('aircraft').select('*', { count: 'exact', head: true }).eq('owner_id', user.id);

    // 2. Validar con el Helper
    if (!canAddResource(profile.subscription_plan, count, 'drone')) {
      alert(`⚠️ LÍMITE ALCANZADO: Tu plan ${profile.subscription_plan.toUpperCase()} solo permite ${count} aeronave(s). Mejora tu cuenta para continuar.`);
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('aircraft').insert([{ ...formData, owner_id: user.id, status: 'Operativo' }]);
    if (!error) onSuccess();
    else alert(error.message);
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 p-8 flex flex-col text-left">
      <h3 className="text-xl font-black uppercase mb-6 tracking-tighter">Registrar Aeronave</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="text-[10px] font-black text-slate-400 uppercase">Marca y Modelo</label>
        <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-bold" placeholder="Ej: DJI Mavic 3" onChange={e => setFormData({...formData, model: e.target.value})} />
        <label className="text-[10px] font-black text-slate-400 uppercase">Número de Serie</label>
        <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-mono" placeholder="S/N" onChange={e => setFormData({...formData, serial_number: e.target.value})} />
        <button type="submit" disabled={loading} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg shadow-orange-500/20 uppercase text-xs tracking-widest mt-4">
          {loading ? 'Validando...' : 'Finalizar Registro'}
        </button>
      </form>
    </aside>
  );
}