'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';

function CheckItem({ label, value, onChange }) {
  return (
    <div className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${value === true ? 'bg-emerald-50 border-emerald-500' : value === false ? 'bg-red-50 border-red-500' : 'bg-white border-slate-100'}`}>
      <span className={`text-xs font-bold flex-1 pr-4 ${value === true ? 'text-emerald-700' : value === false ? 'text-red-700' : 'text-slate-600'}`}>{label}</span>
      <div className="flex gap-2 shrink-0">
        <button type="button" onClick={() => onChange(true)} className={`size-9 rounded-full flex items-center justify-center transition-all ${value === true ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300'}`}>
          <span className="material-symbols-outlined text-lg">check</span>
        </button>
        <button type="button" onClick={() => onChange(false)} className={`size-9 rounded-full flex items-center justify-center transition-all ${value === false ? 'bg-red-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300'}`}>
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
    </div>
  );
}

export default function MinorMaintenancePanel({ aircraft, items, onClose, onSuccess }) {
  const [checks, setChecks] = useState({});
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const setCheck = (num, value) => setChecks(prev => ({ ...prev, [num]: value }));
  const doneCount = items.filter(i => checks[i.field_number] === true || checks[i.field_number] === false).length;
  const allAnswered = items.length > 0 && doneCount === items.length;

  const save = async () => {
    if (!allAnswered) { toast.warn('Responde todos los ítems del checklist antes de guardar.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/maintenance/minor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aircraft_id: aircraft.id, checklist: checks, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar el mantenimiento menor.');
      toast.success('Mantenimiento menor registrado.');
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
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[95vw] md:max-w-[720px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Mantenimiento Menor</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 truncate">{aircraft.model} · {aircraft.serial_number}</span>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between text-xs font-black text-slate-500 mb-1">
            <span>Progreso</span><span>{doneCount}/{items.length}</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} />
          </div>
        </div>

        {items.length === 0 ? (
          <p className="text-center text-xs font-bold text-slate-400 py-10">
            Aún no hay ítems configurados en este checklist — pide a un gerente que lo configure primero.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map(i => (
              <CheckItem key={i.field_number} label={i.label_text} value={checks[i.field_number]} onChange={v => setCheck(i.field_number, v)} />
            ))}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5">Observaciones (opcional)</label>
          <textarea rows={3} className={inputCls + ' w-full resize-none'} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-3">
        <button type="button" onClick={onClose}
          className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
          Cancelar
        </button>
        <button type="button" onClick={save} disabled={saving || !allAnswered}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
          <span className="material-symbols-outlined text-base">save</span>
          {saving ? 'Guardando...' : 'Registrar mantenimiento menor'}
        </button>
      </div>
    </aside>
  );
}
