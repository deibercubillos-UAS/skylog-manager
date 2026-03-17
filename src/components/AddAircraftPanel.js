'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddAircraftPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ model: '', serial_number: '', mtow: '', status: 'Operativo', total_hours: 0 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();

    // --- LÓGICA DE CONTROL DE PLAN ---
    // 1. Obtener el plan y el conteo actual
    const { data: profile } = await supabase.from('profiles').select('subscription_plan').eq('id', user.id).single();
    const { count } = await supabase.from('aircraft').select('*', { count: 'exact', head: true }).eq('owner_id', user.id);

    if (profile.subscription_plan === 'piloto' && count >= 1) {
      alert("⚠️ LÍMITE DE PLAN: El Plan Piloto solo permite 1 aeronave. Sube a Plan Escuadrilla para registrar hasta 15.");
      setLoading(false);
      return;
    }
    // ---------------------------------

    const { error } = await supabase.from('aircraft').insert([{ ...formData, owner_id: user.id, health: 0 }]);

    if (error) alert(error.message);
    else onSuccess();
    setLoading(false);
  };

  // ... (El resto del return del componente se mantiene igual)
  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 p-6 flex flex-col text-left">
       {/* (Código del formulario que ya tenías) */}
       <h3 className="text-lg font-black uppercase mb-6">Nueva Aeronave</h3>
       <form onSubmit={handleSubmit} className="space-y-4">
          <input required placeholder="Modelo" className="w-full p-3 bg-slate-50 rounded-xl border" onChange={e => setFormData({...formData, model: e.target.value})} />
          <input required placeholder="S/N" className="w-full p-3 bg-slate-50 rounded-xl border" onChange={e => setFormData({...formData, serial_number: e.target.value})} />
          <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] text-white font-black rounded-xl">
             {loading ? 'Validando Plan...' : 'Guardar Aeronave'}
          </button>
       </form>
    </aside>
  );
}