'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';

const CATEGORIES = ['Prevuelo', 'Reportes', 'Seguridad Operacional', 'Mantenimiento'];
const ICONS = [
  'checklist', 'photo_camera', 'flight_land', 'signal_disconnected', 'report_problem',
  'fact_check', 'battery_charging_full', 'build', 'engineering', 'medical_services',
  'groups', 'radar', 'gavel', 'description', 'rule',
];

export default function AddProtocolPanel({ protocol, onClose, onSuccess }) {
  const isEdit = !!protocol;
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    name:        protocol?.name || '',
    category:    protocol?.category || 'Prevuelo',
    description: protocol?.description || '',
    icon:        protocol?.icon || 'checklist',
  });
  const [steps, setSteps] = useState(protocol?.steps?.length ? [...protocol.steps] : ['']);

  const updateStep = (idx, value) => setSteps(prev => prev.map((s, i) => (i === idx ? value : s)));
  const addStep = () => setSteps(prev => [...prev, '']);
  const removeStep = (idx) => setSteps(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.warn('El nombre del protocolo es obligatorio.'); return; }
    setLoading(true);
    try {
      const payload = { ...form, steps: steps.map(s => s.trim()).filter(Boolean) };
      const res = await fetch(isEdit ? `/api/protocols/${protocol.id}` : '/api/protocols', {
        method:  isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar el protocolo.');
      toast.success(isEdit ? 'Protocolo actualizado.' : 'Protocolo creado y disponible para consultar.');
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
      const res = await fetch(`/api/protocols/${protocol.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar el protocolo.');
      toast.success('Protocolo eliminado.');
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
          <span className="text-xs font-bold text-slate-400 truncate">Protocolos</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 shrink-0">{isEdit ? 'Editar protocolo' : 'Nuevo protocolo'}</span>
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
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Cumplimiento</p>
          <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mt-1">{isEdit ? 'Editar protocolo' : 'Nuevo protocolo'}</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1">Crea un checklist estandarizado para que la tripulación lo siga en cada misión</p>
        </div>

        <form id="add-protocol-form" onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div className="space-y-1">
              <label className={labelCls}>Nombre del protocolo <span className="text-orange-600">*</span></label>
              <input required className={inputCls} placeholder="Ej. Checklist pre-vuelo zonas urbanas"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className={labelCls}>Categoría <span className="text-orange-600">*</span></label>
                <div className={inputCls + " flex items-center gap-2"}>
                  <select required className="flex-1 min-w-0 bg-transparent outline-none appearance-none cursor-pointer"
                    value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <span className="material-symbols-outlined text-base text-slate-400 shrink-0">expand_more</span>
                </div>
              </div>
              <div className="space-y-1">
                <label className={labelCls}>Ícono</label>
                <div className={inputCls + " flex items-center gap-2"}>
                  <span className="material-symbols-outlined text-base text-slate-500 shrink-0">{form.icon}</span>
                  <select className="flex-1 min-w-0 bg-transparent outline-none appearance-none cursor-pointer"
                    value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}>
                    {ICONS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                  <span className="material-symbols-outlined text-base text-slate-400 shrink-0">expand_more</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className={labelCls}>Descripción breve</label>
            <input className={inputCls} placeholder="Ej. Verificación previa al despegue en operaciones sobre zonas pobladas"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Steps editor */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="text-[11px] font-black uppercase tracking-wide text-orange-600">Pasos del checklist</span>
              <span className="text-[10.5px] font-semibold text-slate-400">{steps.filter(s => s.trim()).length} pasos agregados</span>
            </div>
            <div className="p-3 space-y-2">
              {steps.map((s, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <span className="size-6 rounded-full bg-white border border-slate-200 text-slate-500 text-[10px] font-black flex items-center justify-center shrink-0">{idx + 1}</span>
                  <input className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-900"
                    placeholder={`Ej. Paso ${idx + 1} del checklist…`}
                    value={s} onChange={e => updateStep(idx, e.target.value)} />
                  <button type="button" onClick={() => removeStep(idx)}
                    className="size-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 transition-colors shrink-0">
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              ))}
              <button type="button" onClick={addStep}
                className="flex items-center gap-1.5 px-2 py-2 text-xs font-black text-orange-600 hover:text-orange-800 transition-colors">
                <span className="material-symbols-outlined text-base">add_circle</span>
                Agregar paso
              </button>
            </div>
          </div>

          <p className="text-[10px] font-semibold text-slate-400">
            <span className="text-orange-600">*</span> Nombre y categoría son obligatorios — agrega los pasos cuando quieras
          </p>
        </form>
      </div>

      {/* Footer fijo */}
      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
        {isEdit ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">¿Eliminar este protocolo?</span>
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
          <button form="add-protocol-form" type="submit" disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
            <span className="material-symbols-outlined text-base">add_circle</span>
            {loading ? 'Sincronizando...' : isEdit ? 'Guardar cambios' : 'Crear protocolo'}
          </button>
        </div>
      </div>
    </aside>
  );
}
