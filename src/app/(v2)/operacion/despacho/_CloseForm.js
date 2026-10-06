'use client';

// Skylog V2.0 — Cierre de vuelo. Registra el vuelo REAL de un despacho abierto. Las horas las
// calcula el servidor a partir del despegue y el aterrizaje; aquí solo se piden y se muestran.
import { useState } from 'react';
import { Field, Button } from '@skylog/ui';
import { validateFlightClose } from '@skylog/domain';

// <input type="datetime-local"> no trae zona: se interpreta como hora de Colombia (UTC−5, sin horario de verano).
const toBogotaIso = (v) => (v ? new Date(`${v}:00-05:00`).toISOString() : '');
function toBogotaInput(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export default function CloseForm({ mission, dispatch, onCancel, onDone }) {
  const dispatchedAt = new Date(dispatch.dispatched_at);
  const [form, setForm] = useState({
    takeoffAt: toBogotaInput(dispatchedAt),
    landingAt: toBogotaInput(new Date()),
    visualCondition: mission.line_of_sight || 'VLOS',
    missionType: '',
    notes: '',
    safetyReport: false,
    safetyReportType: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  // Mismas reglas que el servidor, solo para avisar antes de enviar.
  const preview = validateFlightClose({
    dispatchedAt: dispatchedAt.toISOString(),
    takeoffAt: toBogotaIso(form.takeoffAt),
    landingAt: toBogotaIso(form.landingAt),
    now: new Date().toISOString(),
    safetyReport: form.safetyReport,
    safetyReportType: form.safetyReportType,
  });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/despacho/${dispatch.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, takeoffAt: toBogotaIso(form.takeoffAt), landingAt: toBogotaIso(form.landingAt) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cerrar el vuelo');
      setResult(data);
      onDone?.(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="bg-white rounded-2xl border border-emerald-200 p-5 space-y-3">
        <p className="text-sm font-semibold text-emerald-700">Vuelo registrado — {result.totalTime} h</p>
        <p className="text-xs text-navy-400">Quedó enlazado a la misión y las horas se sumaron a la aeronave.</p>
        {result.dutyWarnings?.length > 0 && (
          <ul className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 space-y-0.5">
            {result.dutyWarnings.map((w) => (
              <li key={w}>⚠ {w}</li>
            ))}
          </ul>
        )}
        {result.safetyReport && (
          <p className="text-sm text-navy">
            Marcaste un reporte de seguridad ({result.safetyReportType}). <a href="/sms/reportes" className="text-primary-700 font-semibold underline">Radícalo ahora en Reportes y casos →</a>
          </p>
        )}
        <p className="text-xs text-navy-300">Recuerda cerrar tu período de servicio en Tiempo de servicio cuando termines tu jornada.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-navy-100 p-4 space-y-1">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-navy">Cierre de vuelo — {mission.name}</p>
          <p className="text-xs text-navy-400">Despachado {dispatchedAt.toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>
        <button type="button" onClick={onCancel} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-navy-50 text-navy-600 hover:bg-navy-100">
          Volver
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 pt-2">
        <Field label="Despegue (hora de Colombia)" type="datetime-local" value={form.takeoffAt} onChange={(e) => set({ takeoffAt: e.target.value })} required />
        <Field label="Aterrizaje (hora de Colombia)" type="datetime-local" value={form.landingAt} onChange={(e) => set({ landingAt: e.target.value })} required />
        <Field as="select" label="Línea de vista" value={form.visualCondition} onChange={(e) => set({ visualCondition: e.target.value })}>
          {['VLOS', 'EVLOS', 'BVLOS'].map((v) => (
            <option key={v}>{v}</option>
          ))}
        </Field>
        <Field label="Tipo de misión (opcional)" value={form.missionType} onChange={(e) => set({ missionType: e.target.value })} placeholder="Ej. Inspección, mapeo" />
        <div className="sm:col-span-2">
          <Field as="textarea" rows={2} label="Novedades (opcional)" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
        </div>
      </div>

      <p className="text-xs text-navy-500">{preview.totalTime != null ? `Duración calculada: ${preview.totalTime} h` : 'Indica el despegue y el aterrizaje.'}</p>

      <div className="rounded-xl border border-navy-100 p-3 mt-2">
        <label className="flex items-center gap-2 text-sm text-navy">
          <input type="checkbox" checked={form.safetyReport} onChange={(e) => set({ safetyReport: e.target.checked, safetyReportType: e.target.checked ? form.safetyReportType : '' })} />
          Hubo un suceso que debe reportarse (seguridad operacional)
        </label>
        {form.safetyReport && (
          <div className="flex gap-2 mt-2">
            {[
              ['VOR', 'VOR — reporte voluntario'],
              ['MOR', 'MOR — reporte obligatorio'],
            ].map(([v, label]) => (
              <button key={v} type="button" onClick={() => set({ safetyReportType: v })} className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${form.safetyReportType === v ? 'bg-primary text-white border-primary' : 'bg-white text-navy-500 border-navy-200'}`}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {!preview.ok && form.takeoffAt && form.landingAt && (
        <ul className="text-xs text-red-600 space-y-0.5 pt-1">
          {preview.errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-red-600 pt-1">{error}</p>}
      <div className="pt-2">
        <Button type="submit" disabled={busy || !preview.ok}>
          {busy ? 'Registrando…' : 'Registrar vuelo'}
        </Button>
      </div>
    </form>
  );
}
