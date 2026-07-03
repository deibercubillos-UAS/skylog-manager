'use client';
import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';

const CATEGORIES = [
  { label: 'Técnica',        icon: 'settings_input_component' },
  { label: 'Procedimental',  icon: 'checklist' },
  { label: 'Humana',         icon: 'group' },
  { label: 'Organizacional', icon: 'account_tree' },
];

const STATUSES = [
  { label: 'Activa',       icon: 'check_circle', color: '#16a34a', bg: 'bg-emerald-50', ring: 'border-emerald-500' },
  { label: 'En revisión',  icon: 'schedule',      color: '#d97706', bg: 'bg-amber-50',   ring: 'border-amber-500' },
  { label: 'Retirada',     icon: 'cancel',        color: '#dc2626', bg: 'bg-red-50',     ring: 'border-red-500' },
];

export default function AddBarrierPanel({ barrier, onClose, onSuccess }) {
  const isEdit = !!barrier;
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [soraOptions, setSoraOptions] = useState([]);
  const [form, setForm] = useState({
    name:               barrier?.name || '',
    category:           barrier?.category || 'Técnica',
    description:        barrier?.description || '',
    hazard:             barrier?.hazard || '',
    sora_assessment_id: barrier?.sora_assessment_id || '',
    responsible:        barrier?.responsible || '',
    status:             barrier?.status || 'Activa',
  });

  useEffect(() => {
    fetch('/api/sora/assessments').then(r => r.json()).then(d => setSoraOptions(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.warn('El nombre de la barrera es obligatorio.'); return; }
    if (!form.description.trim()) { toast.warn('La descripción de la mitigación es obligatoria.'); return; }
    setLoading(true);
    try {
      const payload = { ...form, sora_assessment_id: form.sora_assessment_id || null };
      const res = await fetch(isEdit ? `/api/safety/barriers/${barrier.id}` : '/api/safety/barriers', {
        method:  isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar la barrera.');
      toast.success(isEdit ? 'Barrera actualizada.' : 'Barrera registrada y agregada al panel de Barreras de Seguridad.');
      onSuccess();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/safety/barriers/${barrier.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar la barrera.');
      toast.success('Barrera eliminada.');
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
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[92vw] md:max-w-[640px] lg:max-w-[820px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Seguridad SMS</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-bold text-slate-400 truncate">Barreras de Seguridad</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 shrink-0">{isEdit ? 'Editar barrera' : 'Nueva barrera'}</span>
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
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Cumplimiento · SMS</p>
          <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mt-1">{isEdit ? 'Editar barrera' : 'Nueva barrera de seguridad'}</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1">Registra una mitigación o control asociado a un riesgo identificado</p>
        </div>

        <form id="add-barrier-form" onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {/* Column 1 — Identificación */}
            <div className="space-y-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 border-b border-slate-100 pb-2">Identificación</p>
              <div className="space-y-1">
                <label className={labelCls}>Nombre de la barrera <span className="text-orange-600">*</span></label>
                <input required className={inputCls} placeholder="Ej. Doble verificación PIC/Observador"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Categoría <span className="text-orange-600">*</span></label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c.label} type="button" onClick={() => setForm({ ...form, category: c.label })}
                      className={`flex items-center gap-2 rounded-xl px-3 py-2.5 border-[1.5px] transition-all ${
                        form.category === c.label ? 'border-orange-600 bg-orange-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}>
                      <span className={`material-symbols-outlined text-base ${form.category === c.label ? 'text-orange-600' : 'text-slate-500'}`}>{c.icon}</span>
                      <span className={`text-xs font-bold ${form.category === c.label ? 'text-orange-600' : 'text-slate-600'}`}>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Descripción de la mitigación <span className="text-orange-600">*</span></label>
                <textarea required rows={4} className={inputCls + ' resize-none'}
                  placeholder="Ej. Se asigna un observador visual independiente en operaciones BVLOS y sobre zonas urbanas, con comunicación directa al PIC."
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>

            {/* Column 2 — Riesgo y estado */}
            <div className="space-y-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 border-b border-slate-100 pb-2">Riesgo asociado y estado</p>
              <div className="space-y-1">
                <label className={labelCls}>Riesgo / peligro que mitiga</label>
                <input className={inputCls} placeholder="Ej. Colisión con obstáculo en zona urbana"
                  value={form.hazard} onChange={e => setForm({ ...form, hazard: e.target.value })} />
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Evaluación SORA relacionada</label>
                <div className={inputCls + " flex items-center gap-2"}>
                  <select className="flex-1 min-w-0 bg-transparent outline-none appearance-none cursor-pointer"
                    value={form.sora_assessment_id} onChange={e => setForm({ ...form, sora_assessment_id: e.target.value })}>
                    <option value="">Opcional — vincular a una evaluación existente</option>
                    {soraOptions.map(s => <option key={s.id} value={s.id}>{s.operation_name}</option>)}
                  </select>
                  <span className="material-symbols-outlined text-base text-slate-400 shrink-0">expand_more</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Responsable de la implementación</label>
                <input className={inputCls} placeholder="Ej. Camilo Duarte — Jefe de mantenimiento"
                  value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className={labelCls}>Estado de la barrera</label>
                <div className="flex gap-2">
                  {STATUSES.map(s => (
                    <button key={s.label} type="button" onClick={() => setForm({ ...form, status: s.label })}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 border-[1.5px] transition-all ${
                        form.status === s.label ? `${s.ring} ${s.bg}` : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      }`}>
                      <span className="material-symbols-outlined text-sm" style={{ color: form.status === s.label ? s.color : '#6b7280' }}>{s.icon}</span>
                      <span className="text-[11px] font-bold" style={{ color: form.status === s.label ? s.color : '#4b5565' }}>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2.5">
                <span className="material-symbols-outlined text-orange-600 text-base shrink-0">info</span>
                <p className="text-[10.5px] font-semibold text-orange-800 leading-relaxed">Las barreras &quot;En revisión&quot; no aparecerán como control activo hasta ser aprobadas.</p>
              </div>
            </div>
          </div>

          <p className="text-[10px] font-semibold text-slate-400">
            <span className="text-orange-600">*</span> Nombre, categoría y descripción son obligatorios
          </p>
        </form>
      </div>

      {/* Footer fijo */}
      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
        {isEdit ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">¿Eliminar esta barrera?</span>
              <button type="button" onClick={handleDelete} disabled={loading}
                className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase transition-all disabled:opacity-50">
                Sí, eliminar
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-500 font-black text-xs uppercase transition-all">
                Cancelar
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 font-black text-xs uppercase tracking-wide transition-all">
              <span className="material-symbols-outlined text-base">delete</span>
              Eliminar
            </button>
          )
        ) : <span />}
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
            Cancelar
          </button>
          <button form="add-barrier-form" type="submit" disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
            <span className="material-symbols-outlined text-base">add_circle</span>
            {loading ? 'Sincronizando...' : isEdit ? 'Guardar cambios' : 'Registrar barrera'}
          </button>
        </div>
      </div>
    </aside>
  );
}
