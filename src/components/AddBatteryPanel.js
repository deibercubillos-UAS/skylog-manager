'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddBatteryPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ brand: '', model: '', serial_number: '', cycles: 0, health_status: 100 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

      const { error } = await supabase.from('batteries').insert([{ 
        ...form, 
        owner_id: user.id,
        organization_id: prof.organization_id, // LLAVE OBLIGATORIA PARA RLS
        status: 'Operativo'
      }]);

      if (error) throw error;
      alert("✅ Batería añadida al inventario.");
      onSuccess();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[150] p-8 flex flex-col text-left animate-in slide-in-from-right">
      <h3 className="text-xl font-black uppercase mb-6 tracking-tighter">Registrar Energía</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" placeholder="Marca (Ej: DJI)" onChange={e => setForm({...form, brand: e.target.value})} />
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" placeholder="Modelo" onChange={e => setForm({...form, model: e.target.value})} />
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono text-sm uppercase" placeholder="S/N de la Célula" onChange={e => setForm({...form, serial_number: e.target.value})} />
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Ciclos Iniciales</label>
            <input type="number" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" value={form.cycles} onChange={e => setForm({...form, cycles: e.target.value})} />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Estado Salud %</label>
            <input type="number" max="100" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" value={form.health_status} onChange={e => setForm({...form, health_status: e.target.value})} />
          </div>
        </div>

        <button disabled={loading} className="w-full py-4 bg-[#1A202C] text-white font-black rounded-xl uppercase text-xs shadow-lg mt-6">
          {loading ? 'GUARDANDO...' : 'REGISTRAR BATERÍA'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
      </form>
    </aside>
  );
}