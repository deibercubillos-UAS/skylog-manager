'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';

export default function AddBatteryPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ brand: '', model: '', serial_number: '', cycles: 0, health_status: 100 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Rutar por /api/fleet/batteries para que el servidor verifique límites del plan
      const res = await fetch('/api/fleet/batteries', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar la batería.');
      toast.success('Batería añadida al inventario.');
      onSuccess();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed z-[150] bg-white flex flex-col text-left
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
        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Registrar Energía</h3>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <form id="add-battery-form" onSubmit={handleSubmit} className="space-y-4">
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" placeholder="Marca (Ej: DJI)" onChange={e => setForm({...form, brand: e.target.value})} />
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" placeholder="Modelo" onChange={e => setForm({...form, model: e.target.value})} />
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono text-sm uppercase" placeholder="S/N de la Célula" onChange={e => setForm({...form, serial_number: e.target.value})} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-400 uppercase ml-1">Ciclos Iniciales</label>
              <input type="number" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold mt-1" value={form.cycles} onChange={e => setForm({...form, cycles: e.target.value})} />
            </div>
            <div>
              <label className="text-xs font-black text-slate-400 uppercase ml-1">Estado Salud %</label>
              <input type="number" max="100" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold mt-1" value={form.health_status} onChange={e => setForm({...form, health_status: e.target.value})} />
            </div>
          </div>
        </form>
      </div>

      {/* Footer fijo — botón siempre visible */}
      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white">
        <button form="add-battery-form" type="submit" disabled={loading}
          className="w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase text-xs shadow-lg disabled:opacity-60 active:scale-95 transition-all">
          {loading ? 'GUARDANDO...' : 'REGISTRAR BATERÍA'}
        </button>
      </div>
    </aside>
  );
}
