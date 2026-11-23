'use client';

// Skylog V2.0 — formulario de reporte de un suceso (VOR/MOR). Cualquier miembro puede diligenciarlo; el
// análisis lo hace el Gerente SMS. Guarda CUÁNDO ocurrió el suceso (de ahí sale el plazo del MOR), el lugar,
// la aeronave/vuelo y hasta 5 evidencias. Si se llega desde el cierre de un vuelo (?flightId=…), viene
// prellenado con ese vuelo.
//
// DINÁMICO (40b): los campos estándar y las preguntas propias se renderizan según la definición del tipo
// (mor si quien reporta es el Gerente SMS, vor en otro caso; en edición, el tipo del reporte). Los campos
// ocultos no se muestran; los obligatorios llevan asterisco; las preguntas propias se guardan en custom_fields.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Field, Button } from '@skylog/ui';
import { UAS_EVENT_OPTIONS, OTHER_EVENT_ID, REPORT_SEVERITY_LEVELS, validateReportFormSubmission } from '@skylog/domain';
import { SEVERITY_LABELS, aircraftLabel, formatBytes, toBogotaInput, toBogotaIso, fmtDateTime } from '../_components/tracking';

const MAX_FILES = 5;
const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT = 'application/pdf,image/png,image/jpeg,image/webp';

// Etiquetas de respaldo mientras carga la definición (y por si un estándar no tuviera fila).
const FALLBACK_LABEL = {
  event: 'Tipo de suceso',
  severity: 'Severidad',
  occurred_at: '¿Cuándo ocurrió? (hora de Colombia)',
  location: 'Lugar',
  aircraft: 'Aeronave involucrada',
  flight: 'Vuelo relacionado',
  description: 'Descripción del suceso',
  confidential: 'Confidencial',
};

// Reconstruye el evento (id de la lista oficial, o "otro" con texto libre) desde lo guardado en el reporte.
function eventFromReport(report) {
  if (!report?.event_code && !report?.event_label) return { eventId: '', eventCode: '', eventLabel: '' };
  const opt = UAS_EVENT_OPTIONS.find((o) => o.code === report.event_code && o.label === report.event_label);
  if (opt) return { eventId: opt.id, eventCode: '', eventLabel: '' };
  return { eventId: OTHER_EVENT_ID, eventCode: report.event_code || '', eventLabel: report.event_label || '' };
}

export default function ReportForm({ organizationId, initialFlightId, initialReport, reportType, onCreated, onSaved, onCancel }) {
  const isEdit = Boolean(initialReport);
  const type = isEdit ? (initialReport.route === 'mor' ? 'mor' : 'vor') : reportType || 'vor';

  const [def, setDef] = useState(null); // definición del formulario (null = cargando)
  const [fleet, setFleet] = useState([]);
  const [flights, setFlights] = useState([]);
  const [customValues, setCustomValues] = useState(() => (initialReport?.custom_fields && typeof initialReport.custom_fields === 'object' ? { ...initialReport.custom_fields } : {}));
  const [form, setForm] = useState(() =>
    initialReport
      ? {
          ...eventFromReport(initialReport),
          severity: initialReport.severity || 'incidente',
          occurredAt: initialReport.occurred_at ? toBogotaInput(new Date(initialReport.occurred_at)) : '',
          location: initialReport.location || '',
          aircraftId: initialReport.aircraft_id || '',
          flightId: initialReport.flight_id || '',
          description: initialReport.description || '',
          confidential: initialReport.confidentiality_level === 'confidencial',
        }
      : {
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
        }
  );
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    (async () => {
      const [a, f, d] = await Promise.all([
        fetch(`/api/flota/aircraft?organizationId=${organizationId}`),
        fetch(`/api/flights?organizationId=${organizationId}`),
        fetch(`/api/sms/report-forms?organizationId=${organizationId}&type=${type}`),
      ]);
      const [ad, fd, dd] = await Promise.all([a.json().catch(() => ({})), f.json().catch(() => ({})), d.json().catch(() => ({}))]);
      if (a.ok) setFleet(ad.aircraft || []);
      if (f.ok) setFlights(fd.flights || []);
      setDef(d.ok ? dd.fields || [] : []);
    })();
  }, [organizationId, type]);

  // Elegir un vuelo trae su aeronave y su hora de despegue como hora del suceso (editable). En modo edición no
  // se autollena con el vuelo ya guardado (preservar la corrección); solo cuando el usuario cambia el vuelo.
  const skipFlightAutofill = useRef(isEdit);
  const flightId = form.flightId;
  useEffect(() => {
    if (!flightId) return;
    const fl = flights.find((x) => x.id === flightId);
    if (!fl) return;
    if (skipFlightAutofill.current) {
      skipFlightAutofill.current = false;
      return;
    }
    setForm((f) => ({ ...f, aircraftId: fl.aircraft_id || f.aircraftId, occurredAt: fl.takeoff_at ? toBogotaInput(new Date(fl.takeoff_at)) : f.occurredAt }));
  }, [flightId, flights]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const setCustom = (id, value) => setCustomValues((c) => ({ ...c, [id]: value }));

  const stdByKey = useMemo(() => {
    const m = {};
    for (const fld of def || []) if (fld.kind === 'standard') m[fld.field_key] = fld;
    return m;
  }, [def]);
  const customDefs = useMemo(() => (def || []).filter((fld) => fld.kind === 'custom' && fld.visible), [def]);

  // Mientras la definición carga (def === null) se muestra todo (visible por defecto); ya cargada se respeta.
  const vis = (k) => (def === null ? true : stdByKey[k]?.visible ?? true);
  const req = (k) => (def === null ? false : stdByKey[k]?.required ?? false);
  const lbl = (k) => `${stdByKey[k]?.label || FALLBACK_LABEL[k]}${req(k) ? ' *' : ''}`;

  const preview = useMemo(
    () =>
      validateReportFormSubmission({
        fieldDefs: def || [],
        standardValues: {
          event: form.eventId,
          severity: form.severity,
          occurred_at: toBogotaIso(form.occurredAt) || '',
          location: form.location,
          aircraft: form.aircraftId,
          flight: form.flightId,
          description: form.description,
          confidential: form.confidential,
        },
        customValues,
        now: new Date().toISOString(),
        severities: REPORT_SEVERITY_LEVELS,
      }),
    [def, form, customValues]
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
      const payload = {
        severity: form.severity,
        description: form.description,
        eventId: vis('event') ? form.eventId || undefined : undefined,
        eventCode: vis('event') && form.eventId === OTHER_EVENT_ID ? form.eventCode : undefined,
        eventLabel: vis('event') && form.eventId === OTHER_EVENT_ID ? form.eventLabel : undefined,
        occurredAt: vis('occurred_at') ? toBogotaIso(form.occurredAt) || undefined : undefined,
        location: vis('location') ? form.location || undefined : undefined,
        aircraftId: vis('aircraft') ? form.aircraftId || undefined : undefined,
        flightId: vis('flight') ? form.flightId || undefined : undefined,
        confidentialityLevel: vis('confidential') && form.confidential ? 'confidencial' : 'normal',
        customFields: customValues,
      };

      // Edición: corrige el reporte existente (PATCH). No toca evidencias (se gestionan aparte).
      if (isEdit) {
        const res = await fetch('/api/sms/reports', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reportId: initialReport.id, ...payload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al guardar la corrección');
        onSaved({ report: data.report, warning: data.warning });
        return;
      }

      const res = await fetch('/api/sms/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...payload }),
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

  function renderCustom(fld) {
    const v = customValues[fld.id] ?? '';
    const label = `${fld.label}${fld.required ? ' *' : ''}`;
    if (fld.input_type === 'boolean') {
      return (
        <label key={fld.id} className="flex items-start gap-2 text-xs text-navy-600 mb-1">
          <input type="checkbox" className="mt-0.5" checked={v === true} onChange={(e) => setCustom(fld.id, e.target.checked)} />
          {label}
        </label>
      );
    }
    if (fld.input_type === 'select') {
      return (
        <Field key={fld.id} as="select" label={label} value={v} onChange={(e) => setCustom(fld.id, e.target.value)}>
          <option value="">— Elige —</option>
          {(fld.options || []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </Field>
      );
    }
    const typeAttr = fld.input_type === 'number' ? 'number' : fld.input_type === 'date' ? 'date' : 'text';
    return (
      <Field
        key={fld.id}
        label={label}
        as={fld.input_type === 'textarea' ? 'textarea' : undefined}
        type={fld.input_type === 'textarea' ? undefined : typeAttr}
        value={v}
        onChange={(e) => setCustom(fld.id, e.target.value)}
      />
    );
  }

  return (
    <form onSubmit={submit} className="space-y-1">
      {initialFlightId && form.flightId === initialFlightId && (
        <p className="text-xs text-sky-700 bg-sky-50 rounded-lg px-3 py-2 mb-2">Reporte prellenado con el vuelo que acabas de cerrar. Revisa la hora y describe qué pasó.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
        {vis('event') && (
          <Field as="select" label={lbl('event')} value={form.eventId} onChange={(e) => set({ eventId: e.target.value })}>
            <option value="">— Elige el evento —</option>
            {UAS_EVENT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} · {o.label}
              </option>
            ))}
            <option value={OTHER_EVENT_ID}>Otro suceso (describir)</option>
          </Field>
        )}
        <Field as="select" label={lbl('severity')} value={form.severity} onChange={(e) => set({ severity: e.target.value })}>
          {Object.entries(SEVERITY_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Field>
      </div>

      {vis('event') && form.eventId === OTHER_EVENT_ID && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <Field label="Nombre del suceso" value={form.eventLabel} onChange={(e) => set({ eventLabel: e.target.value })} placeholder="Ej. Aterrizaje forzoso por batería" />
          <Field label="Código OACI (opcional)" value={form.eventCode} onChange={(e) => set({ eventCode: e.target.value })} placeholder="Ej. UA-LOC-I" />
        </div>
      )}

      {isRac114 && <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 mb-2">Un accidente o incidente grave no se radica por MOR/VOR: el reporte queda como evidencia y se sigue el procedimiento RAC 114.</p>}

      {(vis('occurred_at') || vis('location')) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          {vis('occurred_at') && <Field label={lbl('occurred_at')} type="datetime-local" value={form.occurredAt} onChange={(e) => set({ occurredAt: e.target.value })} />}
          {vis('location') && <Field label={lbl('location')} value={form.location} onChange={(e) => set({ location: e.target.value })} placeholder="Ej. Predio El Roble, Madrid (Cund.)" />}
        </div>
      )}
      {vis('occurred_at') && <p className="text-[11px] text-navy-400 -mt-2 mb-2">La fecha del suceso fija el plazo del MOR (5 días hábiles desde la ocurrencia). Sin ella, se cuenta desde que registras el reporte.</p>}

      {(vis('flight') || vis('aircraft')) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          {vis('flight') && (
            <Field as="select" label={lbl('flight')} value={form.flightId} onChange={(e) => set({ flightId: e.target.value })}>
              <option value="">— Ninguno —</option>
              {flights.map((fl) => (
                <option key={fl.id} value={fl.id}>
                  {fmtDateTime(fl.takeoff_at)} · {aircraftLabel(fl.aircraft) || 'sin aeronave'}
                </option>
              ))}
            </Field>
          )}
          {vis('aircraft') && (
            <Field as="select" label={lbl('aircraft')} value={form.aircraftId} onChange={(e) => set({ aircraftId: e.target.value })}>
              <option value="">— Ninguna —</option>
              {fleet.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.model?.brand} {a.model?.model} · {a.serial_number}
                </option>
              ))}
            </Field>
          )}
        </div>
      )}

      <Field label={lbl('description')} as="textarea" className="min-h-[110px]" value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Qué pasó, en qué fase del vuelo, qué se hizo en el momento…" required />

      {customDefs.length > 0 && (
        <div className="rounded-xl border border-navy-100 p-3 my-3 space-y-1">
          <p className="text-xs font-bold text-navy-500 uppercase tracking-wide mb-1">Información adicional</p>
          {customDefs.map(renderCustom)}
        </div>
      )}

      {!isEdit && (
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
      )}

      {vis('confidential') && (
        <label className="flex items-start gap-2 text-xs text-navy-500 mb-3">
          <input type="checkbox" className="mt-0.5" checked={form.confidential} onChange={(e) => set({ confidential: e.target.checked })} />
          Reportar de forma confidencial — solo el Gerente SMS verá mi identidad (RAC 219 §219.115-140)
        </label>
      )}

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      {!preview.ok && form.description && <p className="text-xs text-red-500 mb-2">{preview.errors.join(' ')}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !preview.ok}>
          {busy ? 'Guardando…' : isEdit ? 'Guardar correcciones' : 'Enviar reporte'}
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
