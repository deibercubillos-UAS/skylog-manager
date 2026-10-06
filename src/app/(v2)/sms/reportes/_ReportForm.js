'use client';

// Skylog V2.0 — formulario de reporte de un suceso (VOR/MOR). Cualquier miembro puede diligenciarlo; el
// análisis lo hace el Gerente SMS. Guarda CUÁNDO ocurrió el suceso (de ahí sale el plazo del MOR), el lugar,
// la aeronave/vuelo y hasta 5 evidencias. Si se llega desde el cierre de un vuelo (?flightId=…), viene
// prellenado con ese vuelo.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Field, Button } from '@skylog/ui';
import { UAS_EVENT_OPTIONS, OTHER_EVENT_ID, REPORT_SEVERITY_LEVELS, validateReportInput } from '@skylog/domain';
import { SEVERITY_LABELS, aircraftLabel, formatBytes, toBogotaInput, toBogotaIso, fmtDateTime } from '../_components/tracking';

const MAX_FILES = 5;
const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp';

export default function ReportForm({ organizationId, initialFlightId, onCreated, onCancel }) {
  const [fleet, setFleet] = useState([]);
  const [flights, setFlights] = useState([]);
  const [form, setForm] = useState({
    eventId: '',
    eventCode: '',
    eventLabel: '',
    severity: 'incidente',
    occurredAt: toBogotaInput(new Date()),
    location: '',
    aircraftId: '',
    flightId: initialFlightId || '',
    description: '',
    confidential: false,
  });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    (async () => {
      const [a, f] = await Promise.all([fetch(`/api/flota/aircraft?organizationId=${organizationId}`), fetch(`/api/flights?organizationId=${organizationId}`)]);
      const [ad, fd] = await Promise.all([a.json().catch(() => ({})), f.json().catch(() => ({}))]);
      if (a.ok) setFleet(ad.aircraft || []);
      if (f.ok) setFlights(fd.flights || []);
    })();
  }, [organizationId]);

  // Elegir un vuelo trae su aeronave y su hora de despegue como hora del suceso (editable).
  const flightId = form.flightId;
  useEffect(() => {
    if (!flightId) return;
    const fl = flights.find((x) => x.id === flightId);
    if (!fl) return;
    setForm((f) => ({ ...f, aircraftId: fl.aircraft_id || f.aircraftId, occurredAt: fl.takeoff_at ? toBogotaInput(new Date(fl.takeoff_at)) : f.occurredAt }));
  }, [flightId, flights]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const preview = useMemo(
    () => validateReportInput({ description: form.description, occurredAt: toBogotaIso(form.occurredAt) || undefined, now: new Date().toISOString(), severity: form.severity, severities: REPORT_SEVERITY_LEVELS }),
    [form.description, form.occurredAt, form.severity]
  );
  const isRac114 = form.severity !== 'incidente';

  function addFiles(list) {
    const next = [...files];
    for (const file of Array.from(list || [])) {
      if (next.length >= MAX_FILES) break;
      if (file.size > MAX_BYTES) {
        setError(`"${file.name}" supera 4 MB y no se agregó.`);
        continue;
      }
      next.push(file);
    }
    setFiles(next);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function submit(e) {
    e.preventDefault();
    if (!preview.ok) return setError(preview.errors.join(' '));
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          severity: form.severity,
          description: form.description,
          eventId: form.eventId || undefined,
          eventCode: form.eventId === OTHER_EVENT_ID ? form.eventCode : undefined,
          eventLabel: form.eventId === OTHER_EVENT_ID ? form.eventLabel : undefined,
          occurredAt: toBogotaIso(form.occurredAt) || undefined,
          location: form.location || undefined,
          aircraftId: form.aircraftId || undefined,
          flightId: form.flightId || undefined,
          confidentialityLevel: form.confidential ? 'confidencial' : 'normal',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reportar');

      // Evidencias: una por una; si alguna falla, el reporte ya existe y se avisa cuál no subió.
      const uploadErrors = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        const up = await fetch(`/api/sms/reports/${data.report.id}/attachments`, { method: 'POST', body: fd });
        if (!up.ok) {
          const body = await up.json().catch(() => ({}));
          uploadErrors.push(`${file.name}: ${body.error || 'no se pudo subir'}`);
        }
      }
      onCreated({ report: data.report, warning: data.warning, uploadErrors });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-1">
      {initialFlightId && form.flightId === initialFlightId && (
        <p className="text-xs text-sky-700 bg-sky-50 rounded-lg px-3 py-2 mb-2">Reporte prellenado con el vuelo que acabas de cerrar. Revisa la hora y describe qué pasó.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
        <Field as="select" label="¿Qué ocurrió? (lista oficial de eventos UAS)" value={form.eventId} onChange={(e) => set({ eventId: e.target.value })}>
          <option value="">— Elige el evento —</option>
          {UAS_EVENT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.code} · {o.label}
            </option>
          ))}
          <option value={OTHER_EVENT_ID}>Otro suceso (describir)</option>
        </Field>
        <Field as="select" label="Severidad" value={form.severity} onChange={(e) => set({ severity: e.target.value })}>
          {Object.entries(SEVERITY_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Field>
      </div>

      {form.eventId === OTHER_EVENT_ID && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <Field label="Nombre del suceso" value={form.eventLabel} onChange={(e) => set({ eventLabel: e.target.value })} placeholder="Ej. Aterrizaje forzoso por batería" />
          <Field label="Código OACI (opcional)" value={form.eventCode} onChange={(e) => set({ eventCode: e.target.value })} placeholder="Ej. UA-LOC-I" />
        </div>
      )}

      {isRac114 && <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mb-2">Un accidente o incidente grave no se radica por MOR/VOR: el reporte queda como evidencia y se sigue el procedimiento RAC 114.</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
        <Field label="¿Cuándo ocurrió? (hora de Colombia)" type="datetime-local" value={form.occurredAt} onChange={(e) => set({ occurredAt: e.target.value })} />
        <Field label="Lugar (opcional)" value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="Ej. Predio El Roble, Madrid (Cund.)" />
      </div>
      <p className="text-[11px] text-navy-400 -mt-2 mb-2">La fecha del suceso fija el plazo del MOR (5 días hábiles desde la ocurrencia). Sin ella, se cuenta desde que registras el reporte.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
        <Field as="select" label="Vuelo relacionado (opcional)" value={form.flightId} onChange={(e) => set({ flightId: e.target.value })}>
          <option value="">— Ninguno —</option>
          {flights.map((fl) => (
            <option key={fl.id} value={fl.id}>
              {fmtDateTime(fl.takeoff_at)} · {aircraftLabel(fl.aircraft) || 'sin aeronave'}
            </option>
          ))}
        </Field>
        <Field as="select" label="Aeronave involucrada (opcional)" value={form.aircraftId} onChange={(e) => set({ aircraftId: e.target.value })}>
          <option value="">— Ninguna —</option>
          {fleet.map((a) => (
            <option key={a.id} value={a.id}>
              {a.model?.brand} {a.model?.model} · {a.serial_number}
            </option>
          ))}
        </Field>
      </div>

      <Field label="Descripción del suceso" as="textarea" className="min-h-[110px]" value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Qué pasó, en qué fase del vuelo, qué se hizo en el momento…" required />

      <div className="rounded-xl border border-navy-100 p-3 mb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs font-semibold text-navy-500">
            Evidencias (opcional) — {files.length}/{MAX_FILES} · PDF, PNG, JPEG o WEBP, hasta 4 MB
          </p>
          <button type="button" onClick={() => fileInput.current?.click()} disabled={files.length >= MAX_FILES} className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 disabled:opacity-40">
            Agregar archivo
          </button>
        </div>
        <input ref={fileInput} type="file" accept={ACCEPT} multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        {files.length > 0 && (
          <ul className="mt-2 space-y-1">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 text-xs text-navy-600 bg-navy-50/60 rounded-lg px-2.5 py-1.5">
                <span className="truncate">
                  {f.name} <span className="text-navy-300">· {formatBytes(f.size)}</span>
                </span>
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-red-500 font-semibold shrink-0">
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <label className="flex items-start gap-2 text-xs text-navy-500 mb-3">
        <input type="checkbox" className="mt-0.5" checked={form.confidential} onChange={(e) => set({ confidential: e.target.checked })} />
        Reportar de forma confidencial — solo el Gerente SMS verá mi identidad (RAC 219 §219.115-140)
      </label>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {!preview.ok && form.description && <p className="text-xs text-red-500 mb-2">{preview.errors.join(' ')}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !preview.ok}>
          {busy ? 'Enviando…' : 'Enviar reporte'}
        </Button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold border border-navy-200 text-navy-600 hover:bg-navy-50">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
