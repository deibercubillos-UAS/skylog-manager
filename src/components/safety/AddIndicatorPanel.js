'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';
import { DENOMINATOR_UNITS } from '@/lib/safetyIndicatorStats';

export default function AddIndicatorPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', denominator_unit: 'horas_vuelo', expected_improvement_pct: 10, description: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.warn('El nombre del indicador es obligatorio.'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/safety/indicators', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, expected_improvement_pct: Number(form.expected_improvement_pct) / 100 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear el indicador.');
      toast.success('Indicador creado.');
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
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[92vw] md:max-w-[560px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Seguridad SMS</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 shrink-0">Nuevo indicador SPI</span>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
        <div className="bg-[#1A202C] rounded-2xl px-5 py-4 md:px-6 md:py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Cumplimiento · SMS</p>
          <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mt-1">Nuevo indicador SPI</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1">Indicador de desempeño en materia de seguridad operacional</p>
        </div>

        <form id="add-indicator-form" onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-5">
          <div className="space-y-1">
            <label className={labelCls}>Nombre del indicador <span className="text-orange-600">*</span></label>
            <input required className={inputCls} placeholder="Ej. Aterrizaje fuerte (Hard Landing)"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Denominador de la tasa <span className="text-orange-600">*</span></label>
            <div className="space-y-1.5">
              {DENOMINATOR_UNITS.map(u => (
                <button key={u.value} type="button" onClick={() => setForm({ ...form, denominator_unit: u.value })}
                  className={`w-full text-left rounded-xl px-3.5 py-2.5 border-[1.5px] transition-all ${
                    form.denominator_unit === u.value ? 'border-orange-600 bg-orange-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}>
                  <p className={`text-xs font-bold ${form.denominator_unit === u.value ? 'text-orange-600' : 'text-slate-700'}`}>{u.label}</p>
                  <p className="text-[10.5px] text-slate-400">{u.hint}</p>
                </button>
              ))}
            </div>
            <p className="text-[10px] font-semibold text-slate-400 pt-1">
              El mismo denominador debe usarse para todos los indicadores de un mismo tipo de operación (exigido por la circular).
            </p>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Mejora esperada (%)</label>
            <input type="number" min="0" max="100" step="1" className={inputCls}
              value={form.expected_improvement_pct} onChange={e => setForm({ ...form, expected_improvement_pct: e.target.value })} />
            <p className="text-[10px] font-semibold text-slate-400">La meta sugerida = tasa promedio del año anterior × (1 − mejora esperada).</p>
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Descripción (opcional)</label>
            <textarea rows={2} className={inputCls + ' resize-none'} placeholder="¿Qué mide y por qué se hace seguimiento a este indicador?"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
        </form>
      </div>

      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-3">
        <button type="button" onClick={onClose}
          className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
          Cancelar
        </button>
        <button form="add-indicator-form" type="submit" disabled={loading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
          <span className="material-symbols-outlined text-base">add_circle</span>
          {loading ? 'Creando...' : 'Crear indicador'}
        </button>
      </div>
    </aside>
  );
}
