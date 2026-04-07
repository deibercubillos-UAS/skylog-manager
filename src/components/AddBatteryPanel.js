'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddBatteryPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ brand: '', model: '', serial_number: '', cycles: 0, health_status: 100 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('batteries').insert([{ ...form, owner_id: user.id }]);
    if (!error) onSuccess();
    else alert(error.message);
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[150] p-8 flex flex-col text-left animate-in slide-in-from-right">
      <h3 className="text-xl font-black uppercase mb-6 tracking-tighter">Registrar Batería</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" placeholder="Marca (Ej: DJI)" onChange={e => setForm({...form, brand: e.target.value})} />
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" placeholder="Modelo" onChange={e => setForm({...form, model: e.target.value})} />
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono text-sm" placeholder="S/N de Batería" onChange={e => setForm({...form, serial_number: e.target.value})} />
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase">Ciclos Iniciales</label>
                <input type="number" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" value={form.cycles} onChange={e => setForm({...form, cycles: e.target.value})} />
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase">Salud %</label>
                <input type="number" max="100" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" value={form.health_status} onChange={e => setForm({...form, health_status: e.target.value})} />
            </div>
        </div>
        <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg uppercase text-[10px] tracking-widest mt-6">
          {loading ? 'Registrando...' : 'Finalizar Registro'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-3 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
      </form>
    </aside>
  );
}