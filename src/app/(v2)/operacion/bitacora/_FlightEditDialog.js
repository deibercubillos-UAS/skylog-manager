'use client';

// Editar o anular un vuelo registrado (matriz D6). El motivo es obligatorio; el servidor deja constancia de quién y cuándo.
import { useState } from 'react';
import { createPortal } from 'react-dom';

const inputCls = 'mt-1 w-full min-h-[44px] text-base border border-navy-200 rounded-xl px-3 bg-white';
const labelCls = 'block text-xs font-bold uppercase tracking-wide text-navy-400';

// El instante guardado → hora de Colombia (UTC-5, sin horario de verano) en el formato del campo datetime-local.
function toBogotaLocal(iso) {
  if (!iso) return '';
  const t = Date.parse(iso);
  return Number.isNaN(t) ? '' : new Date(t - 5 * 3600 * 1000).toISOString().slice(0, 16);
}

export default function FlightEditDialog({ flight, mode, fleet, onClose, onDone }) {
  const isVoid = mode === 'void';
  const [form, setForm] = useState({
    takeoffAt: toBogotaLocal(flight.takeoff_at),
    landingAt: toBogotaLocal(flight.landing_at),
    totalTime: String(Number(flight.total_time)),
    visualCondition: flight.visual_condition || '',
    flightRules: flight.flight_rules || '',
    missionType: flight.mission_type || '',
    aircraftId: flight.aircraft_id || '',
    location: flight.location || '',
    notes: flight.notes || '',
    reason: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/flights/${flight.id}`, {
        method: isVoid ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isVoid
            ? { reason: form.reason }
            : {
                takeoffAt: form.takeoffAt,
                landingAt: form.landingAt,
                totalTime: Number(form.totalTime),
                visualCondition: form.visualCondition || null,
                flightRules: form.flightRules || null,
                missionType: form.missionType || null,
                aircraftId: form.aircraftId || null,
                location: form.location || null,
                notes: form.notes || null,
                reason: form.reason,
              }
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo completar la acción');
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const title = isVoid ? 'Anular vuelo' : 'Editar vuelo';
  const dialog = (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center bg-navy/50 p-0 sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <form onSubmit={submit} className="bg-white w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl p-5 space-y-3 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-navy">{title}</h3>
            <p className="text-xs text-navy-400">
              {flight.pilot?.full_name || 'Vuelo'} · {new Date(Date.parse(flight.takeoff_at) - 5 * 3600 * 1000).toISOString().slice(0, 10)} · {Number(flight.total_time).toFixed(2)} h
            </p>
          </div>
          <button type="button" onClick={onClose} className="size-9 shrink-0 flex items-center justify-center rounded-lg text-navy-300 hover:text-navy" aria-label="Cerrar">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {isVoid ? (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            El vuelo dejará de contar en la bitácora, los reportes, las horas del piloto y de la aeronave. No se borra: queda registrado como anulado, con tu nombre y el motivo.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className={labelCls}>Despegue (hora Colombia)
              <input type="datetime-local" required value={form.takeoffAt} onChange={(e) => set({ takeoffAt: e.target.value })} className={inputCls} />
            </label>
            <label className={labelCls}>Aterrizaje (hora Colombia)
              <input type="datetime-local" required value={form.landingAt} onChange={(e) => set({ landingAt: e.target.value })} className={inputCls} />
            </label>
            <label className={labelCls}>Duración (horas)
              <input type="number" step="0.01" min="0.01" required value={form.totalTime} onChange={(e) => set({ totalTime: e.target.value })} className={inputCls} />
            </label>
            <label className={labelCls}>Condición visual
              <select value={form.visualCondition} onChange={(e) => set({ visualCondition: e.target.value })} className={inputCls}>
                <option value="">—</option>
                {['VLOS', 'EVLOS', 'BVLOS'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className={labelCls}>Aeronave
              <select value={form.aircraftId} onChange={(e) => set({ aircraftId: e.target.value })} className={inputCls}>
                <option value="">Sin asignar</option>
                {(fleet || []).map((a) => <option key={a.id} value={a.id}>{a.model?.brand} {a.model?.model} — {a.serial_number}</option>)}
              </select>
            </label>
            <label className={labelCls}>Tipo de misión
              <input value={form.missionType} onChange={(e) => set({ missionType: e.target.value })} className={inputCls} />
            </label>
            <label className={`${labelCls} sm:col-span-2`}>Lugar
              <input value={form.location} onChange={(e) => set({ location: e.target.value })} className={inputCls} />
            </label>
            <label className={`${labelCls} sm:col-span-2`}>Novedades
              <textarea rows={2} value={form.notes} onChange={(e) => set({ notes: e.target.value })} className={`${inputCls} py-2`} />
            </label>
          </div>
        )}

        <label className={labelCls}>Motivo (obligatorio)
          <textarea rows={2} required minLength={5} maxLength={500} value={form.reason} onChange={(e) => set({ reason: e.target.value })} placeholder={isVoid ? 'Ej.: vuelo cargado por error / duplicado' : 'Ej.: la hora estaba corrida'} className={`${inputCls} py-2`} />
        </label>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="min-h-[44px] px-4 rounded-xl border border-navy-200 text-sm font-bold text-navy-600">Cancelar</button>
          <button type="submit" disabled={busy || form.reason.trim().length < 5} className={`min-h-[44px] px-4 rounded-xl text-sm font-bold text-white disabled:opacity-50 ${isVoid ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'}`}>
            {busy ? 'Guardando…' : isVoid ? 'Anular vuelo' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
  return typeof document === 'undefined' ? null : createPortal(dialog, document.body);
}
