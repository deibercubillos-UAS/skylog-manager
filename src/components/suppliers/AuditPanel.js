'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';

const RESPONSE_OPTIONS = [
  { value: 'cumple',    label: 'Cumple',    tone: 'emerald' },
  { value: 'no_cumple', label: 'No cumple', tone: 'red' },
  { value: 'no_aplica',  label: 'No aplica', tone: 'slate' },
];

const TONE_CLS = {
  emerald: { active: 'bg-emerald-500 text-white shadow', idle: 'bg-white text-slate-400 border border-slate-200' },
  red:     { active: 'bg-red-500 text-white shadow',     idle: 'bg-white text-slate-400 border border-slate-200' },
  slate:   { active: 'bg-slate-500 text-white shadow',    idle: 'bg-white text-slate-400 border border-slate-200' },
};

export default function AuditPanel({ supplier, audit, criteria, onClose, onSuccess }) {
  const isEdit = !!audit;
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [auditDate, setAuditDate] = useState(audit?.audit_date || new Date().toISOString().slice(0, 10));
  const [auditorName, setAuditorName] = useState(audit?.auditor_name || '');
  const [overallNotes, setOverallNotes] = useState(audit?.overall_notes || '');
  const [responses, setResponses] = useState(() => ({ ...(audit?.responses || {}) }));

  const setResponse = (criterionId, patch) => {
    setResponses(prev => ({ ...prev, [criterionId]: { ...(prev[criterionId] || {}), ...patch } }));
  };

  const answered = criteria.filter(c => responses[c.id]?.value).length;
  const progressPct = criteria.length ? Math.round((answered / criteria.length) * 100) : 0;
  const applicable = criteria.filter(c => responses[c.id]?.value && responses[c.id]?.value !== 'no_aplica');
  const compliant = applicable.filter(c => responses[c.id]?.value === 'cumple');
  const scorePct = applicable.length ? Math.round((compliant.length / applicable.length) * 100) : null;

  const grouped = criteria.reduce((acc, c) => {
    const key = c.category || 'General';
    (acc[key] ||= []).push(c);
    return acc;
  }, {});

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        supplier_id: supplier.id,
        audit_date: auditDate,
        auditor_name: auditorName,
        overall_notes: overallNotes,
        responses,
      };
      const res = await fetch(isEdit ? `/api/suppliers/audits/${audit.id}` : '/api/suppliers/audits', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar la auditoría.');
      toast.success(isEdit ? 'Auditoría actualizada.' : 'Auditoría registrada.');
      onSuccess();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteAudit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/suppliers/audits/${audit.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar la auditoría.');
      toast.success('Auditoría eliminada.');
      onSuccess();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900";

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      inset-x-0 bottom-0 top-14 rounded-t-3xl
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[95vw] md:max-w-[900px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Proveedores · {supplier.name}</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 truncate">{isEdit ? 'Editar auditoría' : 'Nueva auditoría'}</span>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5">Fecha de auditoría</label>
            <input type="date" className={inputCls + ' w-full'} value={auditDate} onChange={e => setAuditDate(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5">Auditor</label>
            <input className={inputCls + ' w-full'} placeholder="Nombre de quien realiza la auditoría"
              value={auditorName} onChange={e => setAuditorName(e.target.value)} />
          </div>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs font-black text-slate-500 mb-1">
              <span>Progreso</span><span>{answered}/{criteria.length}</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
          {scorePct !== null && (
            <div className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase shrink-0 ${scorePct >= 80 ? 'bg-emerald-50 text-emerald-700' : scorePct >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>
              Cumplimiento {scorePct}%
            </div>
          )}
        </div>

        {criteria.length === 0 ? (
          <p className="text-center text-xs font-bold text-slate-400 py-10">
            Aún no hay criterios configurados en el checklist — configúralos primero desde &quot;Checklist de auditoría&quot;.
          </p>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">{cat}</p>
              {items.map(c => {
                const r = responses[c.id] || {};
                return (
                  <div key={c.id} className="rounded-xl border border-slate-100 px-3 py-2.5 space-y-2">
                    <p className="text-xs font-semibold text-slate-700 leading-snug">{c.criterion}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {RESPONSE_OPTIONS.map(opt => (
                        <button key={opt.value} type="button"
                          onClick={() => setResponse(c.id, { value: opt.value })}
                          className={`px-3 py-1.5 rounded-full text-[10.5px] font-black uppercase transition-all ${r.value === opt.value ? TONE_CLS[opt.tone].active : TONE_CLS[opt.tone].idle}`}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <input className={inputCls + ' w-full'} placeholder="Observaciones (opcional)"
                      value={r.notes || ''} onChange={e => setResponse(c.id, { notes: e.target.value })} />
                  </div>
                );
              })}
            </div>
          ))
        )}

        <div className="space-y-1">
          <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5">Observaciones generales</label>
          <textarea rows={3} className={inputCls + ' w-full resize-none'}
            value={overallNotes} onChange={e => setOverallNotes(e.target.value)} />
        </div>
      </div>

      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
        {isEdit ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">¿Eliminar esta auditoría?</span>
              <button type="button" onClick={deleteAudit} disabled={saving}
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
          <button type="button" onClick={save} disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
            <span className="material-symbols-outlined text-base">save</span>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar auditoría'}
          </button>
        </div>
      </div>
    </aside>
  );
}
