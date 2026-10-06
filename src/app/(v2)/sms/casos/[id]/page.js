'use client';

// Skylog V2.0 — Seguimiento de un caso VOR/MOR (decisión 165). Solo el Gerente SMS ve esta pantalla: la RLS de
// sms_cases/acciones/eventos ya lo impone y la API repite el chequeo. Recorre el ciclo completo del suceso:
// resumen y evidencias → radicación en IRIS (con el plazo de 5 días hábiles del MOR) → análisis (resumen de la
// investigación, factores, peligro asociado) → acciones correctivas → línea de tiempo → cierre con sus reglas.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SectionHero, SectionCard } from '../../../_components/SectionHero';
import { Button } from '@skylog/ui';
import { canCloseCase } from '@skylog/domain';
import { SEVERITY_LABELS, ROUTE_META, CASE_STATUS_META, DeadlineChip, fmtDateTime, aircraftLabel, formatBytes } from '../../_components/tracking';

export default function CasoPage() {
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const [analysis, setAnalysis] = useState({ investigationSummary: '', contributingFactors: '', hazardId: '' });
  const [newAction, setNewAction] = useState({ description: '', responsibleId: '', dueDate: '' });
  const [irisRef, setIrisRef] = useState('');
  const [pendingConfirm, setPendingConfirm] = useState(null); // { pendingActions }
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sms/cases/${id}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'No se pudo cargar el caso');
      setData(body);
      setAnalysis({ investigationSummary: body.case.investigation_summary || '', contributingFactors: body.case.contributing_factors || '', hazardId: body.case.hazard_id || '' });
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const closed = data?.case.status === 'cerrado';
  const dirty = data && (analysis.investigationSummary !== (data.case.investigation_summary || '') || analysis.contributingFactors !== (data.case.contributing_factors || '') || analysis.hazardId !== (data.case.hazard_id || ''));
  const closing = useMemo(() => (data ? canCloseCase({ report: data.report, investigationSummary: dirty ? '' : data.case.investigation_summary, actions: data.actions }) : null), [data, dirty]);

  async function request(method, url, body, okMessage) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const out = await res.json();
      if (!res.ok) {
        const err = new Error(out.error || 'Error');
        err.payload = out;
        throw err;
      }
      if (okMessage) setNotice(okMessage);
      await load();
      return out;
    } catch (e) {
      if (e.payload?.needsConfirmation) setPendingConfirm({ pendingActions: e.payload.pendingActions });
      else setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  const saveAnalysis = () => request('PATCH', `/api/sms/cases/${id}`, analysis, 'Análisis guardado.');
  const analyzeReport = () => request('POST', '/api/sms/reports/analyze', { reportId: data.report.id }, 'Análisis inicial registrado.');
  const fileReport = () => request('POST', '/api/sms/reports/file', { reportId: data.report.id, irisReference: irisRef }, 'Reporte radicado.');
  const addAction = async () => {
    if (await request('POST', '/api/sms/cases/actions', { caseId: id, description: newAction.description, responsibleId: newAction.responsibleId || null, dueDate: newAction.dueDate || null })) setNewAction({ description: '', responsibleId: '', dueDate: '' });
  };
  const markDone = (actionId) => request('PATCH', '/api/sms/cases/actions', { actionId });
  const startAnalysis = () => request('PATCH', '/api/sms/cases', { caseId: id, status: 'en_analisis' }, 'El caso pasó a "en análisis".');
  const closeCase = async (confirm = false) => {
    setPendingConfirm(null);
    if (await request('PATCH', '/api/sms/cases', { caseId: id, status: 'cerrado', confirmPendingActions: confirm }, 'Caso cerrado.')) router.refresh();
  };

  async function uploadEvidence(file) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/sms/reports/${data.report.id}/attachments`, { method: 'POST', body: fd });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'No se pudo subir la evidencia');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) return <div className="p-6 max-w-5xl mx-auto"><div className="h-32 rounded-3xl bg-navy-50 animate-pulse" /></div>;
  if (!data) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-4">
        <SectionHero eyebrow="SMS" title="Seguimiento del caso" description="Detalle de un reporte VOR/MOR." />
        <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">{error}</p>
        <a href="/sms/reportes" className="text-sm font-semibold text-primary-700 hover:underline">← Volver a Reportes y Casos</a>
      </div>
    );
  }

  const { report, deadline, attachments, actions, timeline, hazards, members } = data;
  const routeMeta = ROUTE_META[report.route] || ROUTE_META.rac114;
  const statusMeta = CASE_STATUS_META[data.case.status] || CASE_STATUS_META.abierto;
  const pending = actions.filter((a) => !a.done_at).length;
  const needsAnalysis = report.route === 'mor' && !report.analyzed_at;
  const canFile = !report.filed_at && (report.route !== 'mor' || report.analyzed_at);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <SectionHero
        eyebrow="SMS · Seguimiento de caso"
        title={report.event_label || 'Suceso reportado'}
        description={`${report.event_code ? report.event_code + ' · ' : ''}${SEVERITY_LABELS[report.severity]} · ${report.occurred_at ? 'ocurrió ' + fmtDateTime(report.occurred_at) : 'sin fecha del suceso'}`}
        cta={
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${routeMeta.soft}`}>{routeMeta.label}</span>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusMeta.soft}`}>{statusMeta.label}</span>
          </div>
        }
      />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <a href="/sms/reportes" className="text-sm font-semibold text-primary-700 hover:underline">← Reportes y Casos</a>
        <DeadlineChip deadline={deadline} />
      </div>

      {error && <p className="text-sm text-red-700 bg-red-50 rounded-lg px-3 py-2 font-medium">{error}</p>}
      {notice && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{notice}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <SectionCard icon="description" tile="bg-blue-500 text-white" wash="from-blue-50 to-white" title="El suceso" description="Lo que reportó quien lo vivió">
            <p className="text-sm text-navy whitespace-pre-line">{report.description}</p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mt-4 text-xs">
              <div><dt className="text-navy-300">Reportó</dt><dd className="text-navy-600 font-medium">{report.reporter?.full_name || report.reporter_contact || 'Anónimo (enlace público)'}{report.confidentiality_level === 'confidencial' && <span className="ml-1.5 text-violet-700">· confidencial</span>}</dd></div>
              <div><dt className="text-navy-300">Registrado</dt><dd className="text-navy-600 font-medium">{fmtDateTime(report.created_at)}</dd></div>
              <div><dt className="text-navy-300">Lugar</dt><dd className="text-navy-600 font-medium">{report.location || '—'}</dd></div>
              <div><dt className="text-navy-300">Aeronave</dt><dd className="text-navy-600 font-medium">{aircraftLabel(report.aircraft) || '—'}</dd></div>
              {report.flight && <div><dt className="text-navy-300">Vuelo</dt><dd className="text-navy-600 font-medium">{fmtDateTime(report.flight.takeoff_at)}</dd></div>}
              {report.reporter_contact && report.reporter && <div><dt className="text-navy-300">Contacto</dt><dd className="text-navy-600 font-medium">{report.reporter_contact}</dd></div>}
            </dl>

            <div className="mt-4 border-t border-navy-50 pt-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs font-semibold text-navy-500">Evidencias ({attachments.length})</p>
                {!closed && (
                  <label className="text-xs font-semibold px-3 py-1.5 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 cursor-pointer">
                    {uploading ? 'Subiendo…' : 'Agregar evidencia'}
                    <input type="file" className="hidden" accept="application/pdf,image/png,image/jpeg,image/webp" disabled={uploading} onChange={(e) => { uploadEvidence(e.target.files?.[0]); e.target.value = ''; }} />
                  </label>
                )}
              </div>
              {attachments.length === 0 ? (
                <p className="text-xs text-navy-300 mt-1">Sin evidencias adjuntas.</p>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {attachments.map((f) => (
                    <li key={f.id} className="text-xs">
                      <a href={`/api/sms/reports/${report.id}/attachments/${f.id}`} target="_blank" rel="noreferrer" className="text-navy-600 hover:underline">
                        📎 {f.file_name} <span className="text-navy-300">· {formatBytes(f.size_bytes)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SectionCard>

          <SectionCard icon="upload_file" tile="bg-violet-500 text-white" wash="from-violet-50 to-white" title="Radicación en IRIS" description={report.route === 'mor' ? 'MOR: plazo de 5 días hábiles desde la ocurrencia (Directiva 02-24)' : report.route === 'vor' ? 'VOR: sin plazo fijado' : 'RAC 114: otro procedimiento'}>
            {report.route === 'rac114' ? (
              <p className="text-sm text-navy-500">Un accidente o incidente grave no se radica por MOR/VOR: sigue el procedimiento RAC 114.</p>
            ) : report.filed_at ? (
              <p className="text-sm text-emerald-700">Radicado el {fmtDateTime(report.filed_at)}{report.iris_reference ? ` · referencia IRIS ${report.iris_reference}` : ''}.</p>
            ) : needsAnalysis ? (
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-navy-500">Un MOR exige tu análisis inicial (filtraje) antes de poder radicarse.</p>
                <Button variant="ghost" className="text-xs px-3 py-1.5" disabled={busy} onClick={analyzeReport}>Registrar análisis inicial</Button>
              </div>
            ) : canFile ? (
              <div className="flex gap-2 flex-wrap items-center">
                <input value={irisRef} onChange={(e) => setIrisRef(e.target.value)} placeholder="Referencia de IRIS (opcional)" className="flex-1 min-w-[200px] min-h-[44px] md:min-h-0 text-base md:text-sm border border-navy-200 rounded-xl px-3 py-2" />
                <Button disabled={busy} onClick={fileReport}>Marcar como radicado</Button>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard icon="manage_search" tile="bg-amber-500 text-white" wash="from-amber-50 to-white" title="Análisis de la investigación" description="Qué pasó, por qué y qué peligro revela">
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-navy-500">
                Resumen de la investigación
                <textarea value={analysis.investigationSummary} onChange={(e) => setAnalysis((a) => ({ ...a, investigationSummary: e.target.value }))} disabled={closed} rows={4} className="mt-1 w-full text-base md:text-sm border border-navy-200 rounded-xl px-3 py-2.5 disabled:bg-navy-50" placeholder="Qué se investigó, qué se encontró y qué se concluyó." />
              </label>
              <label className="block text-xs font-semibold text-navy-500">
                Factores contribuyentes
                <textarea value={analysis.contributingFactors} onChange={(e) => setAnalysis((a) => ({ ...a, contributingFactors: e.target.value }))} disabled={closed} rows={3} className="mt-1 w-full text-base md:text-sm border border-navy-200 rounded-xl px-3 py-2.5 disabled:bg-navy-50" placeholder="Humanos, técnicos, organizacionales, ambientales…" />
              </label>
              <label className="block text-xs font-semibold text-navy-500">
                Peligro asociado (catálogo de Evaluación de Riesgo)
                <select value={analysis.hazardId} onChange={(e) => setAnalysis((a) => ({ ...a, hazardId: e.target.value }))} disabled={closed} className="mt-1 w-full min-h-[44px] md:min-h-0 text-base md:text-sm border border-navy-200 rounded-xl px-3 py-2.5 bg-white disabled:bg-navy-50">
                  <option value="">— Ninguno / aún no identificado —</option>
                  {hazards.map((h) => (
                    <option key={h.id} value={h.id}>{h.description}</option>
                  ))}
                </select>
              </label>
              {!closed && (
                <Button disabled={busy || !dirty} onClick={saveAnalysis}>{dirty ? 'Guardar análisis' : 'Análisis guardado'}</Button>
              )}
            </div>
          </SectionCard>

          <SectionCard icon="task_alt" tile="bg-emerald-500 text-white" wash="from-emerald-50 to-white" title="Acciones correctivas" description={actions.length ? `${actions.length - pending}/${actions.length} completadas` : 'Aún no hay acciones'}>
            <ul className="space-y-2">
              {actions.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 text-sm">
                  <span className={`material-symbols-outlined text-xl shrink-0 ${a.done_at ? 'text-emerald-500' : 'text-navy-300'}`}>{a.done_at ? 'check_circle' : 'radio_button_unchecked'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={a.done_at ? 'text-navy-400 line-through' : 'text-navy-700'}>{a.description}</p>
                    <p className="text-[11px] text-navy-300 mt-0.5">
                      {a.responsible?.full_name ? `Responsable: ${a.responsible.full_name}` : 'Sin responsable'}
                      {a.due_date && !a.done_at && <span className="text-amber-600"> · vence {a.due_date}</span>}
                      {a.done_at && ` · completada ${fmtDateTime(a.done_at)}`}
                    </p>
                  </div>
                  {!a.done_at && !closed && (
                    <button type="button" disabled={busy} onClick={() => markDone(a.id)} className="text-xs font-semibold text-primary-700 hover:underline shrink-0">Marcar hecha</button>
                  )}
                </li>
              ))}
            </ul>
            {!closed && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-start">
                <input value={newAction.description} onChange={(e) => setNewAction((n) => ({ ...n, description: e.target.value }))} placeholder="Nueva acción correctiva" className="min-h-[44px] md:min-h-0 text-base md:text-sm border border-navy-200 rounded-xl px-3 py-2" />
                <select value={newAction.responsibleId} onChange={(e) => setNewAction((n) => ({ ...n, responsibleId: e.target.value }))} className="min-h-[44px] md:min-h-0 text-base md:text-sm border border-navy-200 rounded-xl px-2 py-2 bg-white">
                  <option value="">Responsable…</option>
                  {members.map((m) => (
                    <option key={m.personId} value={m.personId}>{m.fullName}</option>
                  ))}
                </select>
                <input type="date" value={newAction.dueDate} onChange={(e) => setNewAction((n) => ({ ...n, dueDate: e.target.value }))} className="min-h-[44px] md:min-h-0 text-base md:text-sm border border-navy-200 rounded-xl px-2 py-2" />
                <Button className="text-xs px-4 py-2" disabled={busy || !newAction.description.trim()} onClick={addAction}>Agregar</Button>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard icon="flag" tile="bg-red-500 text-white" wash="from-red-50 to-white" title="Estado del caso" description={statusMeta.label}>
            {closed ? (
              <p className="text-sm text-emerald-700">Cerrado el {fmtDateTime(data.case.closed_at)}.</p>
            ) : (
              <div className="space-y-3">
                {data.case.status === 'abierto' && (
                  <Button variant="ghost" className="text-xs px-3 py-1.5 w-full" disabled={busy} onClick={startAnalysis}>Pasar a “en análisis”</Button>
                )}
                <ul className="text-xs space-y-1">
                  <li className={closing?.errors.some((e) => e.includes('resumen')) ? 'text-red-600' : 'text-emerald-600'}>
                    {closing?.errors.some((e) => e.includes('resumen')) ? '✗' : '✓'} Resumen de la investigación guardado
                  </li>
                  {report.route === 'mor' && (
                    <li className={report.filed_at ? 'text-emerald-600' : 'text-red-600'}>{report.filed_at ? '✓' : '✗'} MOR radicado en IRIS</li>
                  )}
                  <li className={pending === 0 ? 'text-emerald-600' : 'text-amber-600'}>{pending === 0 ? '✓' : '!'} {pending === 0 ? 'Sin acciones pendientes' : `${pending} acción(es) pendiente(s) (no bloquea, se confirma)`}</li>
                </ul>
                {pendingConfirm && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                    <p className="font-semibold">Quedan {pendingConfirm.pendingActions} acción(es) correctiva(s) sin completar.</p>
                    <p className="mt-0.5">Si cierras el caso igualmente, queda registrado en la línea de tiempo.</p>
                    <div className="flex gap-2 mt-2">
                      <Button className="text-xs px-3 py-1.5" disabled={busy} onClick={() => closeCase(true)}>Cerrar igualmente</Button>
                      <button type="button" className="text-xs font-semibold text-navy-500" onClick={() => setPendingConfirm(null)}>Cancelar</button>
                    </div>
                  </div>
                )}
                <Button variant="secondary" className="w-full text-sm" disabled={busy || dirty || !closing?.ok} onClick={() => closeCase(false)}>Cerrar caso</Button>
                {dirty && <p className="text-[11px] text-amber-700">Guarda el análisis antes de cerrar.</p>}
              </div>
            )}
          </SectionCard>

          <SectionCard icon="timeline" tile="bg-navy text-white" wash="from-navy-50 to-white" title="Línea de tiempo" description={`${timeline.length} evento(s)`}>
            <ol className="relative border-l border-navy-100 ml-2 space-y-4">
              {timeline.map((t) => (
                <li key={t.id} className="ml-4">
                  <span className="absolute -left-[11px] flex items-center justify-center w-5 h-5 rounded-full bg-white border border-navy-200">
                    <span className="material-symbols-outlined text-[13px] text-navy-500">{t.icon}</span>
                  </span>
                  <p className="text-xs font-semibold text-navy">{t.label}</p>
                  {t.detail && <p className="text-xs text-navy-500">{t.detail}</p>}
                  <p className="text-[11px] text-navy-300">{fmtDateTime(t.at)}{t.actor && ` · ${t.actor}`}</p>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
