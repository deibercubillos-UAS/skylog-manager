'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';

export default function AddBatteryPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ brand: '', model: '', serial_number: '', cycles: 0, health_status: 100, last_maintenance: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Rutar por /api/fleet/batteries para que el servidor verifique límites del plan
      const res = await fetch('/api/fleet/batteries', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, last_maintenance: form.last_maintenance || null }),
      });
      const text = await res.text();
      let data = {};
      try { data = text ? JSON.parse(text) : {}; } catch { /* body no era JSON */ }
      if (!res.ok) throw new Error(data.error || `Error ${res.status}: ${res.statusText || 'Error al registrar la batería.'}`);
      toast.success('Batería añadida al inventario.');
      onSuccess();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-900";
  const labelCls = "text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5";

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      inset-x-0 bottom-0 top-14 rounded-t-3xl
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[92vw] md:max-w-[640px] lg:max-w-[720px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Baterías</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 shrink-0">Nueva batería</span>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
        {/* Hero */}
        <div className="bg-[#1A202C] rounded-2xl px-5 py-4 md:px-6 md:py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Flota &amp; Equipo</p>
          <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mt-1">Registrar batería</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1">Se agrega al inventario compartido — podrá usarse en cualquier aeronave compatible</p>
        </div>

        <form id="add-battery-form" onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            {/* Columna izquierda: identidad */}
            <div className="space-y-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 pb-2 border-b border-slate-100">Identidad</p>
              <div className="space-y-1">
                <label className={labelCls}>Modelo <span className="text-orange-600">*</span></label>
                <input required className={inputCls} placeholder="Ej. TB65 (Matrice 350)" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Fabricante</label>
                <input className={inputCls} placeholder="DJI" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>N.º de serie (fabricante) <span className="text-orange-600">*</span></label>
                <input required className={inputCls + ' font-mono uppercase'} placeholder="Ej. DJI-TB65-20231142" value={form.serial_number} onChange={e => setForm({ ...form, serial_number: e.target.value })} />
              </div>
            </div>

            {/* Columna derecha: mantenimiento */}
            <div className="space-y-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 pb-2 border-b border-slate-100">Mantenimiento</p>
              <div className="space-y-1">
                <label className={labelCls}>Última fecha de mantenimiento</label>
                <input type="date" className={inputCls} value={form.last_maintenance} onChange={e => setForm({ ...form, last_maintenance: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Ciclos de carga acumulados</label>
                  <input type="number" className={inputCls} placeholder="0" value={form.cycles} onChange={e => setForm({ ...form, cycles: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Estado de salud %</label>
                  <input type="number" max="100" className={inputCls} value={form.health_status} onChange={e => setForm({ ...form, health_status: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3.5 py-2.5">
                <span className="material-symbols-outlined text-sm text-orange-500 shrink-0">info</span>
                <span className="text-[10px] font-semibold text-orange-800 leading-snug">La aeronave asociada no se asigna aquí — se infiere automáticamente del último vuelo cargado en la Bitácora.</span>
              </div>
            </div>
          </div>

          <p className="text-[10px] font-semibold text-slate-400">
            <span className="text-orange-600">*</span> Modelo y N.º de serie son los únicos campos obligatorios — el resto puedes completarlo después
          </p>
        </form>
      </div>

      {/* Footer fijo — botón siempre visible */}
      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
        <button type="button" onClick={onClose}
          className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
          Cancelar
        </button>
        <button form="add-battery-form" type="submit" disabled={loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
          <span className="material-symbols-outlined text-base">add_circle</span>
          {loading ? 'Guardando...' : 'Registrar batería'}
        </button>
      </div>
    </aside>
  );
}
