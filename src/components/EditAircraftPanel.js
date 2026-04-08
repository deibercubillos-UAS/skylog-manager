'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function EditAircraftPanel({ aircraft, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...aircraft });

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('aircraft').update({
      brand: form.brand,
      model: form.model,
      serial_number: form.serial_number,
      ruas: form.ruas,
      status: form.status,
      total_hours: form.total_hours
    }).eq('id', aircraft.id);

    if (!error) onSuccess();
    else alert(err.message);
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[200] p-8 flex flex-col text-left animate-in slide-in-from-right">
      <h3 className="text-xl font-black uppercase mb-6 tracking-tighter">Editar Ficha Técnica</h3>
      <form onSubmit={handleUpdate} className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400">Marca / Modelo</label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <input required className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
            <input required className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400">Identificación</label>
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono text-sm mt-1" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400">Horas Totales</label>
          <input type="number" step="0.1" className="w-full p-3 bg-slate-50 rounded-xl border-none font-black text-orange-600 mt-1" value={form.total_hours} onChange={e => setForm({...form, total_hours: e.target.value})} />
        </div>
        <button disabled={loading} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase text-xs shadow-lg mt-6">
          {loading ? 'Guardando...' : 'Actualizar Aeronave'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
      </form>
    </aside>
  );
}