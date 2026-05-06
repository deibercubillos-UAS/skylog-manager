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
      const { error } = await supabase.from('batteries').update({
        brand: form.brand,
        model: form.model,
        serial_number: form.serial_number,
        cycles: parseInt(form.cycles),
        health_status: parseInt(form.health_status),
        status: form.status
      }).eq('id', battery.id);

      if (error) throw error;
      onSuccess();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed z-[200] bg-white flex flex-col text-left
      bottom-0 left-0 right-0 rounded-t-3xl max-h-[92vh]
      md:bottom-auto md:inset-y-0 md:left-auto md:right-0 md:rounded-none md:w-96
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom duration-300">

      {/* Drag handle — mobile */}
      <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 bg-slate-200 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Editar Batería</h3>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <form id="edit-battery-form" onSubmit={handleUpdate} className="space-y-4">
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="Marca" />
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Modelo" />
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono text-sm uppercase" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} placeholder="Serial Number" />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase ml-1">Ciclos Totales</label>
              <input type="number" className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl font-black text-orange-600 mt-1" value={form.cycles} onChange={e => setForm({...form, cycles: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase ml-1">Vida Útil %</label>
              <input type="number" max="100" className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl font-black text-slate-700 mt-1" value={form.health_status} onChange={e => setForm({...form, health_status: e.target.value})} />
            </div>
          </div>

          <select className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            <option value="Operativo">Operativo</option>
            <option value="En Mantenimiento">En Mantenimiento</option>
            <option value="Fuera de Servicio">Fuera de Servicio</option>
          </select>
        </form>
      </div>

      {/* Footer fijo — botón siempre visible */}
      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white">
        <button form="edit-battery-form" type="submit" disabled={loading}
          className="w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase text-xs shadow-lg disabled:opacity-60 active:scale-95 transition-all">
          {loading ? 'Actualizando...' : 'GUARDAR CAMBIOS'}
        </button>
      </div>
    </aside>
  );
}
