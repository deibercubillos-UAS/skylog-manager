'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function EditBatteryPanel({ battery, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...battery });

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('batteries').update({
      brand: form.brand,
      model: form.model,
      serial_number: form.serial_number,
      cycles: form.cycles,
      health_status: form.health_status,
      status: form.status
    }).eq('id', battery.id);

    if (!error) onSuccess();
    else alert(error.message);
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[200] p-8 flex flex-col text-left animate-in slide-in-from-right">
      <h3 className="text-xl font-black uppercase mb-6 tracking-tighter">Editar Batería</h3>
      <form onSubmit={handleUpdate} className="space-y-4">
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="Marca" />
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Modelo" />
        <div className="grid grid-cols-2 gap-4">
           <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ciclos Actuales</label>
              <input type="number" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold mt-1" value={form.cycles} onChange={e => setForm({...form, cycles: e.target.value})} />
           </div>
           <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Salud %</label>
              <input type="number" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold mt-1" value={form.health_status} onChange={e => setForm({...form, health_status: e.target.value})} />
           </div>
        </div>
        <button disabled={loading} className="w-full py-4 bg-orange-600 text-white font-black rounded-xl uppercase text-xs mt-6">{loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}</button>
        <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
      </form>
    </aside>
  );
}