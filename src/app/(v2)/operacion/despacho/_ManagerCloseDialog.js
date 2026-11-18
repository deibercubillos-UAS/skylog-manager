'use client';

// Cerrar el despacho de otro piloto (matriz F5): el piloto se retiró, perdió la membresía o nunca lo cerró. Dos opciones, siempre con motivo.
import { useState } from 'react';
import { createPortal } from 'react-dom';

const inputCls = 'mt-1 w-full min-h-[44px] text-base border border-navy-200 rounded-xl px-3 bg-white';
const labelCls = 'block text-xs font-bold uppercase tracking-wide text-navy-400';

function toBogotaInput(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export default function ManagerCloseDialog({ dispatch, onClose, onDone }) {
  const [mode, setMode] = useState('sin_vuelo');
  const [form, setForm] = useState({ takeoffAt: toBogotaInput(new Date(dispatch.dispatched_at)), landingAt: toBogotaInput(new Date(Math.min(Date.now(), Date.parse(dispatch.dispatched_at) + 3600e3))), missionType: '', notes: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/despacho/${dispatch.id}/close-manager`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, reason: form.reason, ...(mode === 'con_vuelo' ? { takeoffAt: form.takeoffAt, landingAt: form.landingAt, missionType: form.missionType || null, notes: form.notes || null } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo cerrar el despacho');
      onDone(mode === 'sin_vuelo' ? 'Despacho cerrado sin vuelo; la misión quedó cancelada.' : `Despacho cerrado: se registró el vuelo de ${data.totalTime} h a nombre del piloto.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const dialog = (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center bg-navy/50 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Cerrar despacho">
      <form onSubmit={submit} className="bg-white w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-3 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-navy">Cerrar despacho de otro piloto</h3>
            <p className="text-xs text-navy-400">{dispatch.mission?.name || 'Misión'} · {dispatch.pilot?.full_name || '—'}</p>
          </div>
          <button type="button" onClick={onClose} className="size-9 shrink-0 flex items-center justify-center rounded-lg text-navy-300 hover:text-navy" aria-label="Cerrar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <fieldset className="space-y-2">
          <label className="flex items-start gap-2 rounded-xl border border-navy-100 p-3 cursor-pointer has-[:checked]:border-primary-400 has-[:checked]:bg-primary-50/40">
            <input type="radio" name="mode" checked={mode === 'sin_vuelo'} onChange={() => setMode('sin_vuelo')} className="mt-1" />
            <span className="text-sm"><b className="text-navy">El vuelo no se realizó.</b> El despacho se cierra sin vuelo y la misión queda cancelada.</span>
          </label>
          <label className="flex items-start gap-2 rounded-xl border border-navy-100 p-3 cursor-pointer has-[:checked]:border-primary-400 has-[:checked]:bg-primary-50/40">
            <input type="radio" name="mode" checked={mode === 'con_vuelo'} onChange={() => setMode('con_vuelo')} className="mt-1" />
            <span className="text-sm"><b className="text-navy">El vuelo sí se realizó.</b> Se registra a nombre del piloto con las horas que indiques (sumarán a su bitácora y a la aeronave).</span>
          </label>
        </fieldset>

        {mode === 'con_vuelo' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className={labelCls}>Despegue (hora Colombia)
              <input type="datetime-local" required value={form.takeoffAt} onChange={(e) => set({ takeoffAt: e.target.value })} className={inputCls} />
            </label>
            <label className={labelCls}>Aterrizaje (hora Colombia)
              <input type="datetime-local" required value={form.landingAt} onChange={(e) => set({ landingAt: e.target.value })} className={inputCls} />
            </label>
            <label className={`${labelCls} sm:col-span-2`}>Tipo de misión (opcional)
              <input value={form.missionType} onChange={(e) => set({ missionType: e.target.value })} className={inputCls} />
            </label>
            <label className={`${labelCls} sm:col-span-2`}>Novedades (opcional)
              <textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} className={`${inputCls} py-2`} />
            </label>
          </div>
        )}

        <label className={labelCls}>Motivo (obligatorio)
          <textarea rows={2} required minLength={5} maxLength={500} value={form.reason} onChange={(e) => set({ reason: e.target.value })} placeholder="Ej.: el piloto se retiró de la organización" className={`${inputCls} py-2`} />
        </label>
        <p className="text-xs text-navy-400">Quedará registrado quién lo cerró, cuándo y por qué. La constancia del despacho no se modifica.</p>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="min-h-[44px] px-4 rounded-xl border border-navy-200 text-sm font-bold text-navy-600">Cancelar</button>
          <button type="submit" disabled={busy || form.reason.trim().length < 5} className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50">
            {busy ? 'Cerrando…' : 'Cerrar despacho'}
          </button>
        </div>
      </form>
    </div>
  );
  return typeof document === 'undefined' ? null : createPortal(dialog, document.body);
}
