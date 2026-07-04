'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';
import { riskIndex, resolveZone, ZONE_META } from '@/lib/safetyRiskDefaults';

const STATUSES = [
  { value: 'abierto',  label: 'Abierto',  icon: 'pending_actions', color: '#d97706', bg: 'bg-amber-50',   ring: 'border-amber-500' },
  { value: 'mitigado', label: 'Mitigado', icon: 'shield',          color: '#4f46e5', bg: 'bg-indigo-50',  ring: 'border-indigo-500' },
  { value: 'cerrado',  label: 'Cerrado',  icon: 'check_circle',    color: '#16a34a', bg: 'bg-emerald-50', ring: 'border-emerald-500' },
];

function RiskBadge({ probability, severity, tolerability, probCode, sevCode, label }) {
  if (!probCode || !sevCode) return null;
  const zone = resolveZone(tolerability, probCode, sevCode);
  const meta = zone ? ZONE_META[zone] : null;
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[10px] font-black text-slate-400 uppercase">{label}</span>
      <span className="px-2.5 py-1 rounded-lg text-xs font-black" style={{ background: meta?.bg || '#f1f5f9', color: meta?.color || '#64748b' }}>
        {riskIndex(probCode, sevCode)} {meta ? `· ${meta.label}` : ''}
      </span>
    </div>
  );
}

export default function AddHazardPanel({ hazard, probability, severity, tolerability, onClose, onSuccess }) {
  const isEdit = !!hazard;
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    description:               hazard?.description || '',
    initial_probability_code:  hazard?.initial_probability_code || '',
    initial_severity_code:     hazard?.initial_severity_code || '',
    mitigation:                hazard?.mitigation || '',
    residual_probability_code: hazard?.residual_probability_code || '',
    residual_severity_code:    hazard?.residual_severity_code || '',
    responsible:                hazard?.responsible || '',
    due_date:                   hazard?.due_date || '',
    status:                     hazard?.status || 'abierto',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description.trim()) { toast.warn('La descripción del peligro es obligatoria.'); return; }
    if (!form.initial_probability_code || !form.initial_severity_code) { toast.warn('Selecciona la probabilidad y gravedad inicial.'); return; }
    setLoading(true);
    try {
      const payload = {
        ...form,
        residual_probability_code: form.residual_probability_code || null,
        residual_severity_code:    form.residual_severity_code || null,
        due_date: form.due_date || null,
      };
      const res = await fetch(isEdit ? `/api/safety/hazards/${hazard.id}` : '/api/safety/hazards', {
        method:  isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar el peligro.');
      toast.success(isEdit ? 'Peligro actualizado.' : 'Peligro registrado.');
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
      const res = await fetch(`/api/safety/hazards/${hazard.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar el peligro.');
      toast.success('Peligro eliminado.');
      onSuccess();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-900";
  const labelCls = "text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5";
  const selectCls = inputCls + " appearance-none cursor-pointer";

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      inset-x-0 bottom-0 top-14 rounded-t-3xl
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[92vw] md:max-w-[640px] lg:max-w-[820px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Seguridad SMS</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-bold text-slate-400 truncate">Evaluación de Riesgos</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 shrink-0">{isEdit ? 'Editar peligro' : 'Nuevo peligro'}</span>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
        <div className="bg-[#1A202C] rounded-2xl px-5 py-4 md:px-6 md:py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Cumplimiento · SMS</p>
          <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mt-1">{isEdit ? 'Editar peligro' : 'Registrar peligro'}</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1">Evalúa la probabilidad y gravedad del riesgo, y describe cómo lo mitigas</p>
        </div>

        <form id="add-hazard-form" onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            <div className="space-y-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 border-b border-slate-100 pb-2">Peligro y riesgo inicial</p>
              <div className="space-y-1">
                <label className={labelCls}>Descripción del peligro <span className="text-orange-600">*</span></label>
                <textarea required rows={3} className={inputCls + ' resize-none'}
                  placeholder="Ej. Pérdida de enlace C2 en zona de sombra de radio"
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Probabilidad <span className="text-orange-600">*</span></label>
                  <select required className={selectCls} value={form.initial_probability_code}
                    onChange={e => setForm({ ...form, initial_probability_code: e.target.value })}>
                    <option value="">Seleccionar</option>
                    {probability.map(p => <option key={p.code} value={p.code}>{p.code} — {p.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Gravedad <span className="text-orange-600">*</span></label>
                  <select required className={selectCls} value={form.initial_severity_code}
                    onChange={e => setForm({ ...form, initial_severity_code: e.target.value })}>
                    <option value="">Seleccionar</option>
                    {severity.map(s => <option key={s.code} value={s.code}>{s.code} — {s.label}</option>)}
                  </select>
                </div>
              </div>
              <RiskBadge label="Riesgo inicial" probability={probability} severity={severity} tolerability={tolerability}
                probCode={form.initial_probability_code} sevCode={form.initial_severity_code} />
            </div>

            <div className="space-y-4">
              <p className="text-[11px] font-black uppercase tracking-wide text-orange-600 border-b border-slate-100 pb-2">Mitigación y riesgo residual</p>
              <div className="space-y-1">
                <label className={labelCls}>Barrera / mitigación aplicada</label>
                <textarea rows={3} className={inputCls + ' resize-none'}
                  placeholder="Ej. Se define ruta alterna con cobertura confirmada y se instala repetidor de señal"
                  value={form.mitigation} onChange={e => setForm({ ...form, mitigation: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className={labelCls}>Probabilidad residual</label>
                  <select className={selectCls} value={form.residual_probability_code}
                    onChange={e => setForm({ ...form, residual_probability_code: e.target.value })}>
                    <option value="">Sin evaluar</option>
                    {probability.map(p => <option key={p.code} value={p.code}>{p.code} — {p.label}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className={labelCls}>Gravedad residual</label>
                  <select className={selectCls} value={form.residual_severity_code}
                    onChange={e => setForm({ ...form, residual_severity_code: e.target.value })}>
                    <option value="">Sin evaluar</option>
                    {severity.map(s => <option key={s.code} value={s.code}>{s.code} — {s.label}</option>)}
                  </select>
                </div>
              </div>
              <RiskBadge label="Riesgo residual" probability={probability} severity={severity} tolerability={tolerability}
                probCode={form.residual_probability_code} sevCode={form.residual_severity_code} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
            <div className="space-y-1">
              <label className={labelCls}>Responsable</label>
              <input className={inputCls} placeholder="Ej. Gerente SMS"
                value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label className={labelCls}>Plazo de gestión</label>
              <input type="date" className={inputCls} value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Estado</label>
              <div className="flex gap-1.5">
                {STATUSES.map(s => (
                  <button key={s.value} type="button" onClick={() => setForm({ ...form, status: s.value })}
                    className={`flex-1 flex items-center justify-center gap-1 rounded-xl px-2 py-2.5 border-[1.5px] transition-all ${
                      form.status === s.value ? `${s.ring} ${s.bg}` : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`} title={s.label}>
                    <span className="material-symbols-outlined text-sm" style={{ color: form.status === s.value ? s.color : '#6b7280' }}>{s.icon}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[10px] font-semibold text-slate-400">
            <span className="text-orange-600">*</span> Descripción, probabilidad y gravedad iniciales son obligatorias
          </p>
        </form>
      </div>

      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
        {isEdit ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">¿Eliminar este peligro?</span>
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
          <button form="add-hazard-form" type="submit" disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
            <span className="material-symbols-outlined text-base">add_circle</span>
            {loading ? 'Sincronizando...' : isEdit ? 'Guardar cambios' : 'Registrar peligro'}
          </button>
        </div>
      </div>
    </aside>
  );
}
