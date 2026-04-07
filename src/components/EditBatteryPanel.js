'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function EditBatteryPanel({ battery, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    brand: battery?.brand || '',
    model: battery?.model || '',
    serial_number: battery?.serial_number || '',
    cycles: battery?.cycles || 0,
    health_status: battery?.health_status || 100,
    status: battery?.status || 'Operativo'
  });

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase
      .from('batteries')
      .update(form)
      .eq('id', battery.id);

    if (!error) onSuccess();
    else alert(error.message);
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[200] p-8 flex flex-col text-left animate-in slide-in-from-right">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-black uppercase tracking-tighter">Editar Batería</h3>
        <button onClick={onClose} className="material-symbols-outlined text-slate-300">close</button>
      </div>
      <form onSubmit={handleUpdate} className="space-y-4">
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="Marca" />
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Modelo" />
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono text-sm uppercase" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} placeholder="S/N" />
        
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase">Ciclos Actuales</label>
                <input type="number" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" value={form.cycles} onChange={e => setForm({...form, cycles: e.target.value})} />
            </div>
            <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase">Estado Salud %</label>
                <input type="number" max="100" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" value={form.health_status} onChange={e => setForm({...form, health_status: e.target.value})} />
            </div>
        </div>

        <select className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            <option value="Operativo">Operativo</option>
            <option value="En Carga">En Carga</option>
            <option value="Mantenimiento">Mantenimiento</option>
            <option value="Baja">Fuera de Servicio</option>
        </select>

        <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-lg uppercase text-[10px] tracking-widest mt-6 hover:bg-[#ec5b13] transition-all">
          {loading ? 'Guardando...' : 'Actualizar Activo'}
        </button>
      </form>
    </aside>
  );
}
