'use client';

// Skylog V2.0 — reporte público de un suceso, SIN cuenta (/reportar/<token>). Pensado para terceros, socios y
// contratistas de una organización (RAC 219: deben poder notificar). Vive FUERA del grupo (v2): no hereda el
// shell autenticado. Todo se valida de nuevo en el servidor (api/public/sms-report/[token]).
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Field, Button } from '@skylog/ui';
import { UAS_EVENT_OPTIONS, OTHER_EVENT_ID } from '@skylog/domain';
import { toBogotaInput, toBogotaIso, formatBytes } from '../../(v2)/sms/_components/tracking';

const MAX_FILES = 3;
const MAX_TOTAL = 4 * 1024 * 1024;
const SEVERITIES = [
  ['incidente', 'Incidente', 'Algo salió mal pero nadie resultó gravemente herido y no hubo daños mayores.'],
  ['incidente_grave', 'Incidente grave', 'Estuvo cerca de ser un accidente.'],
  ['accidente', 'Accidente', 'Hubo lesiones graves, muertes o daños mayores.'],
];

export default function ReportarPage() {
  const { token } = useParams();
  const [org, setOrg] = useState(null);
  const [unavailable, setUnavailable] = useState(null);
  const [form, setForm] = useState({ eventId: '', eventCode: '', eventLabel: '', severity: 'incidente', occurredAt: toBogotaInput(new Date()), location: '', description: '', contact: '', confidential: false, website: '' });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);
  const fileInput = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/public/sms-report/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Enlace no disponible');
        setOrg(data.organization);
      } catch (e) {
        setUnavailable(e.message);
      }
    })();
  }, [token]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const totalBytes = files.reduce((s, f) => s + f.size, 0);

  function addFiles(list) {
    const next = [...files];
    for (const f of Array.from(list || [])) {
      if (next.length >= MAX_FILES) break;
      next.push(f);
    }
    if (next.reduce((s, f) => s + f.size, 0) > MAX_TOTAL) setError('Los archivos suman más de 4 MB: quita alguno o usa uno más liviano.');
    else setError(null);
    setFiles(next);
    if (fileInput.current) fileInput.current.value = '';
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('website', form.website);
      fd.append(
        'data',
        JSON.stringify({
          severity: form.severity,
          description: form.description,
          eventId: form.eventId || undefined,
          eventCode: form.eventCode,
          eventLabel: form.eventLabel,
          occurredAt: toBogotaIso(form.occurredAt) || undefined,
          location: form.location,
          contact: form.contact,
          confidential: form.confidential,
        })
      );
      files.forEach((f) => fd.append('files', f));
      const res = await fetch(`/api/public/sms-report/${token}`, { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el reporte.');
      setDone(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const shell = (children) => (
    <main className="min-h-screen bg-navy-50/60 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-4">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Reporte de seguridad operacional</p>
          <h1 className="text-2xl font-black text-navy mt-1">{org ? org.name : 'BitaFly'}</h1>
        </div>
        {children}
        <p className="text-center text-[11px] text-navy-300">Con tecnología de BitaFly · Tu reporte llega directamente al Gerente de Seguridad Operacional (SMS) de la organización.</p>
      </div>
    </main>
  );

  if (unavailable) {
    return shell(
      <div className="bg-white rounded-2xl border border-navy-100 p-6 text-center">
        <p className="text-sm font-semibold text-navy">Este enlace de reporte no está disponible</p>
        <p className="text-xs text-navy-400 mt-1">Puede haber sido desactivado o estar mal copiado. Pídele el enlace actual a la organización.</p>
      </div>
    );
  }

  if (done) {
    return shell(
      <div className="bg-white rounded-2xl border border-emerald-200 p-6 space-y-2">
        <p className="text-lg font-bold text-emerald-700">Reporte recibido. ¡Gracias!</p>
        <p className="text-sm text-navy-600">
          Tu número de referencia es <strong className="font-mono">{done.reference}</strong>. Guárdalo por si necesitas preguntar por el estado.
        </p>
        {done.route === 'rac114' && <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">Por su gravedad, este suceso se sigue por un procedimiento distinto al de un reporte voluntario (RAC 114). El responsable de seguridad se pondrá en contacto.</p>}
        {done.failedFiles?.length > 0 && <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">No se pudieron adjuntar: {done.failedFiles.join(', ')}. El reporte sí quedó registrado.</p>}
        <p className="text-xs text-navy-400">Un reporte de seguridad no busca culpables: busca que lo que pasó no se repita.</p>
      </div>
    );
  }

  if (!org) return shell(<div className="h-48 rounded-2xl bg-white animate-pulse" />);

  return shell(
    <form onSubmit={submit} className="bg-white rounded-2xl border border-navy-100 p-5 space-y-1">
      {/* Campo trampa: invisible para personas, los bots lo llenan. */}
      <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>
          No llenes este campo
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => set({ website: e.target.value })} />
        </label>
      </div>

      <Field as="select" label="¿Qué ocurrió?" value={form.eventId} onChange={(e) => set({ eventId: e.target.value })}>
        <option value="">— Elige el tipo de suceso —</option>
        {UAS_EVENT_OPTIONS.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
        <option value={OTHER_EVENT_ID}>Otro suceso (lo describo abajo)</option>
      </Field>
      {form.eventId === OTHER_EVENT_ID && <Field label="¿Cómo lo llamarías?" value={form.eventLabel} onChange={(e) => set({ eventLabel: e.target.value })} />}

      <div>
        <p className="text-xs font-medium text-navy-400 mb-1">¿Qué tan grave fue?</p>
        <div className="space-y-1.5 mb-3">
          {SEVERITIES.map(([value, label, help]) => (
            <label key={value} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm cursor-pointer ${form.severity === value ? 'border-primary bg-primary-50/50' : 'border-navy-100'}`}>
              <input type="radio" name="severity" className="mt-1" checked={form.severity === value} onChange={() => set({ severity: value })} />
              <span>
                <span className="font-semibold text-navy">{label}</span>
                <span className="block text-xs text-navy-400">{help}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
        <Field label="¿Cuándo ocurrió? (hora de Colombia)" type="datetime-local" value={form.occurredAt} onChange={(e) => set({ occurredAt: e.target.value })} />
        <Field label="¿Dónde? (opcional)" value={form.location} onChange={(e) => set({ location: e.target.value })} />
      </div>

      <Field as="textarea" label="Cuenta qué pasó" className="min-h-[120px]" value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Qué pasó, cuándo en la operación y qué se hizo en el momento." required />

      <div className="rounded-xl border border-navy-100 p-3 mb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <p className="text-xs font-semibold text-navy-500">
            Fotos o documentos (opcional) — {files.length}/{MAX_FILES} · {formatBytes(totalBytes)} de 4 MB
          </p>
          <button type="button" onClick={() => fileInput.current?.click()} disabled={files.length >= MAX_FILES} className="text-xs font-semibold px-4 min-h-[44px] rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 disabled:opacity-40">
            Agregar
          </button>
        </div>
        <input ref={fileInput} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
        {files.map((f, i) => (
          <div key={`${f.name}-${i}`} className="flex items-center justify-between text-xs text-navy-600 mt-1.5">
            <span className="truncate">{f.name}</span>
            <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-red-500 font-semibold ml-2 shrink-0 min-h-[44px] px-3">Quitar</button>
          </div>
        ))}
      </div>

      <Field label="Tu contacto (opcional)" value={form.contact} onChange={(e) => set({ contact: e.target.value })} placeholder="Teléfono o correo, por si hay que pedirte más información" />
      <label className="flex items-start gap-3 text-xs text-navy-500 mb-3 py-2">
        <input type="checkbox" className="mt-0.5 w-5 h-5 shrink-0 accent-primary" checked={form.confidential} onChange={(e) => set({ confidential: e.target.checked })} />
        Mantener mi contacto confidencial: solo lo verá el Gerente SMS.
      </label>

      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <Button type="submit" disabled={busy || totalBytes > MAX_TOTAL} className="w-full">
        {busy ? 'Enviando…' : 'Enviar reporte'}
      </Button>
    </form>
  );
}
