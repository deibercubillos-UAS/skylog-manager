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
    try {
      const { error } = await supabase
        .from('batteries')
        .update({
          brand: form.brand,
          model: form.model,
          serial_number: form.serial_number,
          cycles: parseInt(form.cycles),
          health_status: parseInt(form.health_status),
          status: form.status
        })
        .eq('id', battery.id);

      if (error) throw error;
      onSuccess();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[200] p-8 flex flex-col text-left animate-in slide-in-from-right overflow-y-auto">
      <h3 className="text-xl font-black uppercase mb-6 tracking-tighter">Editar Batería</h3>
      <form onSubmit={handleUpdate} className="space-y-5">
        
        <div className="space-y-4">
            <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="Marca" />
            <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Modelo" />
            <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono text-sm uppercase" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} placeholder="Serial Number" />
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Ciclos Totales</label>
                  <input type="number" className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl font-black text-orange-600 mt-1" value={form.cycles} onChange={e => setForm({...form, cycles: e.target.value})} />
               </div>
               <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Vida Útil %</label>
                  <input type="number" max="100" className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl font-black text-slate-700 mt-1" value={form.health_status} onChange={e => setForm({...form, health_status: e.target.value})} />
               </div>
            </div>

            <select className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
               <option value="Operativo">Operativo</option>
               <option value="En Mantenimiento">En Mantenimiento</option>
               <option value="Fuera de Servicio">Fuera de Servicio</option>
            </select>
        </div>

        <button disabled={loading} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase text-xs shadow-lg mt-6">
          {loading ? 'Actualizando...' : 'GUARDAR CAMBIOS'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
      </form>
    </aside>
  );
}