'use client';

// Skylog V2.0 — F3. Reportes de seguridad operacional (MOR/VOR): bandeja + formulario. Reescrita el
// 2026-10-06 (decisión 165): el reporte guarda cuándo/dónde/con qué ocurrió el suceso y sus evidencias, la
// bandeja muestra el plazo del MOR en días hábiles, y el seguimiento del caso vive en su propia pantalla
// (/sms/casos/[id], solo Gerente SMS) en vez de una tarjeta embebida. La lógica de plazos/cierre está en
// packages/domain/src/smsTracking.js.
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SectionHero, SectionCard, StatCard } from '../../_components/SectionHero';
import { Button } from '@skylog/ui';
import ReportForm from './_ReportForm';
import PublicLink from './_PublicLink';
import {
  SEVERITY_LABELS,
  ROUTE_META,
  CASE_STATUS_META,
  AUTO_SOURCE_LABELS,
  DeadlineChip,
  fmtDateTime,
  aircraftLabel,
  formatBytes,
} from '../_components/tracking';

function ReportCard({ report, isAnalyst, onAnalyze, onFile, onOpenCase, busy }) {
  const router = useRouter();
  const [showFiles, setShowFiles] = useState(false);
  const [files, setFiles] = useState(null);
  const [irisRef, setIrisRef] = useState('');
  const [filing, setFiling] = useState(false);
  const kase = report.sms_cases?.[0];
  const routeMeta = ROUTE_META[report.route] || ROUTE_META.rac114;

  async function toggleFiles() {
    const next = !showFiles;
    setShowFiles(next);
    if (next && files === null) {
      const res = await fetch(`/api/sms/reports/${report.id}/attachments`);
      const data = await res.json().catch(() => ({}));
      setFiles(res.ok ? data.attachments || [] : []);
    }
  }

  return (
    <div className="rounded-xl border border-navy-100 bg-white p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${routeMeta.soft}`}>{routeMeta.label}</span>
          <span className="text-xs font-semibold text-navy-500">{SEVERITY_LABELS[report.severity]}</span>
          {report.confidentiality_level === 'confidencial' && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">Confidencial{report.identity_redacted ? ' · identidad protegida' : ''}</span>}
          {kase && <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CASE_STATUS_META[kase.status]?.soft || 'bg-navy-100 text-navy-600'}`}>Caso: {CASE_STATUS_META[kase.status]?.label || kase.status}</span>}
        </div>
        <p className="text-[11px] text-navy-300 shrink-0">Registrado {fmtDateTime(report.created_at)}</p>
      </div>

      {report.event_label && <p className="text-sm font-semibold text-navy mt-2">{report.event_code ? `${report.event_code} · ` : ''}{report.event_label}</p>}
      <div className="mt-1.5"><DeadlineChip deadline={report.deadline} /></div>

      <p className="text-sm text-navy-700 mt-2 whitespace-pre-line">{report.description}</p>
      <p className="text-[11px] text-navy-400 mt-1.5">
        {report.occurred_at ? `Ocurrió ${fmtDateTime(report.occurred_at)}` : 'Sin fecha del suceso'}
        {report.location && ` · ${report.location}`}
        {report.aircraft && ` · ${aircraftLabel(report.aircraft)}`}
      </p>
      {AUTO_SOURCE_LABELS[report.source] && <p className="text-[11px] text-navy-400 mt-1 italic">{AUTO_SOURCE_LABELS[report.source]}</p>}
      <p className="text-[11px] text-navy-300 mt-1">
        {report.analyzed_at && 'Analizado'}
        {report.analyzed_at && report.filed_at && ' · '}
        {report.filed_at && `Radicado${report.iris_reference ? ` (IRIS ${report.iris_reference})` : ''}`}
      </p>

      {report.attachments_count > 0 && (
        <div className="mt-2">
          <button type="button" onClick={toggleFiles} className="text-xs font-semibold text-primary-700 hover:underline">
            {showFiles ? 'Ocultar' : 'Ver'} {report.attachments_count} evidencia(s)
          </button>
          {showFiles && files && (
            <ul className="mt-1 space-y-0.5">
              {files.map((f) => (
                <li key={f.id} className="text-xs">
                  <a href={`/api/sms/reports/${report.id}/attachments/${f.id}`} target="_blank" rel="noreferrer" className="text-navy-600 hover:underline">
                    📎 {f.file_name} <span className="text-navy-300">· {formatBytes(f.size_bytes)}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isAnalyst && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2 flex-wrap">
            {report.route === 'mor' && !report.analyzed_at && (
              <Button variant="ghost" className="text-xs px-3 py-1.5" disabled={busy} onClick={() => onAnalyze(report.id)}>
                Analizar (filtraje MOR)
              </Button>
            )}
            {report.route !== 'rac114' && !report.filed_at && (report.route !== 'mor' || report.analyzed_at) && (
              <Button variant="ghost" className="text-xs px-3 py-1.5" disabled={busy} onClick={() => setFiling((v) => !v)}>
                {filing ? 'Cancelar radicación' : 'Radicar'}
              </Button>
            )}
            {report.route !== 'rac114' && !kase && (
              <Button variant="primary" className="text-xs px-3 py-1.5" disabled={busy} onClick={() => onOpenCase(report.id, (id) => router.push(`/sms/casos/${id}`))}>
                Abrir caso
              </Button>
            )}
            {kase && (
              <Button variant="primary" className="text-xs px-3 py-1.5" onClick={() => router.push(`/sms/casos/${kase.id}`)}>
                Ver caso
              </Button>
            )}
          </div>
          {filing && (
            <div className="flex gap-2 flex-wrap items-center">
              <input value={irisRef} onChange={(e) => setIrisRef(e.target.value)} placeholder="Referencia de IRIS (opcional)" className="flex-1 min-w-[200px] min-h-[44px] md:min-h-0 text-base md:text-xs border border-navy-200 rounded-lg px-3 py-2" />
              <Button className="text-xs px-3 py-2" disabled={busy} onClick={async () => { await onFile(report.id, irisRef); setFiling(false); setIrisRef(''); }}>
                Confirmar radicación
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SmsReportesPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [reports, setReports] = useState([]);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [initialFlightId, setInitialFlightId] = useState(null);

  // Llegada desde el cierre de un vuelo: /sms/reportes?flightId=…  abre el formulario prellenado.
  useEffect(() => {
    const flightId = new URLSearchParams(window.location.search).get('flightId');
    if (flightId) {
      setInitialFlightId(flightId);
      setShowForm(true);
    }
  }, []);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/duty/context');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
      setContext(data);
      if (data.organizations?.length && !organizationId) setOrganizationId(data.organizations[0].id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isAnalyst = currentOrg?.role === 'gerente_sms';

  const loadReports = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await fetch('/api/sms/reports?organizationId=' + organizationId);
      const data = await res.json();
      if (res.ok) setReports(data.reports || []);
    } catch {
      // silencioso
    }
  }, [organizationId]);

  const loadCases = useCallback(async () => {
    if (!organizationId || !isAnalyst) return;
    try {
      const res = await fetch('/api/sms/cases?organizationId=' + organizationId);
      const data = await res.json();
      if (res.ok) setCases(data.cases || []);
    } catch {
      // silencioso
    }
  }, [organizationId, isAnalyst]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);
  useEffect(() => {
    loadCases();
  }, [loadCases]);

  async function call(url, body) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      return data;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  const analyzeReport = async (reportId) => {
    if (await call('/api/sms/reports/analyze', { reportId })) await loadReports();
  };
  const fileReport = async (reportId, irisReference) => {
    if (await call('/api/sms/reports/file', { reportId, irisReference })) await loadReports();
  };
  const openCase = async (reportId, go) => {
    const data = await call('/api/sms/cases', { reportId });
    if (data?.case) go(data.case.id);
  };

  function handleCreated({ warning, uploadErrors }) {
    setShowForm(false);
    setInitialFlightId(null);
    if (window.location.search) window.history.replaceState({}, '', window.location.pathname);
    const parts = ['Reporte enviado.'];
    if (warning) parts.push(warning);
    if (uploadErrors?.length) parts.push(`No se pudieron subir: ${uploadErrors.join('; ')}`);
    setNotice(parts.join(' '));
    loadReports();
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="h-32 rounded-3xl bg-navy-50 animate-pulse" />
      </div>
    );
  }

  if (!context?.personId) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <SectionHero eyebrow="SMS" title="Reportes y Casos" description="Reportes MOR/VOR y seguimiento de casos." />
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Esta cuenta no tiene todavía un registro de Persona vinculado — no se puede reportar hasta que exista.</div>
      </div>
    );
  }

  const openCases = cases.filter((c) => c.status !== 'cerrado').length;
  const pendingAnalysis = reports.filter((r) => r.route === 'mor' && !r.analyzed_at).length;
  const pendingFiling = reports.filter((r) => r.route !== 'rac114' && !r.filed_at).length;
  const urgent = reports.filter((r) => r.deadline?.applicable && ['vencido', 'vence_hoy', 'por_vencer'].includes(r.deadline.status));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <SectionHero
        eyebrow="SMS"
        title="Reportes y Casos"
        description="Reportes MOR/VOR (MAUT-1.0-22-004) y seguimiento de casos con acciones correctivas."
        cta={
          <div className="flex items-center gap-2 flex-wrap">
            {context.organizations?.length > 1 && (
              <select value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} className="rounded-xl bg-white/10 border border-white/20 text-white min-h-[44px] md:min-h-0 text-base md:text-xs px-3 py-2 backdrop-blur-sm">
                {context.organizations.map((o) => (
                  <option key={o.id} value={o.id} className="text-navy">
                    {o.name} ({o.role})
                  </option>
                ))}
              </select>
            )}
            <Button onClick={() => setShowForm((v) => !v)}>
              <span className="material-symbols-outlined text-base align-middle mr-1">{showForm ? 'close' : 'add'}</span>
              {showForm ? 'Cerrar' : 'Nuevo reporte'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="description" color="blue" label="Reportes" value={reports.length} />
        <StatCard icon="fact_check" color="amber" label="Pend. análisis" value={pendingAnalysis} />
        <StatCard icon="upload_file" color="violet" label="Pend. radicar" value={pendingFiling} />
        {isAnalyst ? <StatCard icon="folder_open" color="red" label="Casos abiertos" value={openCases} /> : <StatCard icon="schedule" color="red" label="Plazos críticos" value={urgent.length} />}
      </div>

      {error && <p className="text-sm text-red-700 font-medium">{error}</p>}
      {notice && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{notice}</p>}

      {urgent.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-bold text-red-700 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-lg">alarm</span>
            {urgent.length} MOR con plazo de radicación en IRIS próximo o vencido
          </p>
          <ul className="mt-2 space-y-1">
            {urgent.map((r) => (
              <li key={r.id} className="text-xs text-navy-600 flex items-center gap-2 flex-wrap">
                <span className="font-semibold">{r.event_label || r.description.slice(0, 50)}</span>
                <DeadlineChip deadline={r.deadline} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {showForm && (
        <SectionCard icon="edit_note" tile="bg-blue-500 text-white" wash="from-blue-50 to-white" title="Diligenciar un reporte" description="Cualquier persona de la organización puede reportar — el análisis lo hace el Gerente SMS designado.">
          <ReportForm organizationId={organizationId} initialFlightId={initialFlightId} onCreated={handleCreated} onCancel={() => setShowForm(false)} />
        </SectionCard>
      )}

      {['gerente_sms', 'admin', 'superadmin'].includes(currentOrg?.role) && <PublicLink organizationId={organizationId} />}

      <SectionCard icon="inbox" tile="bg-violet-500 text-white" wash="from-violet-50 to-white" title={isAnalyst ? 'Bandeja de reportes' : 'Mis reportes'} description={`${reports.length} reporte(s)`}>
        {reports.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-navy-200 p-6 text-center text-sm text-navy-400">Sin reportes todavía.</div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <ReportCard key={r.id} report={r} isAnalyst={isAnalyst} onAnalyze={analyzeReport} onFile={fileReport} onOpenCase={openCase} busy={busy} />
            ))}
          </div>
        )}
      </SectionCard>

      {isAnalyst && (
        <SectionCard icon="gavel" tile="bg-red-500 text-white" wash="from-red-50 to-white" title="Casos" description={`${cases.length} caso(s) — el detalle solo lo ve el Gerente SMS`}>
          {cases.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-navy-200 p-6 text-center text-sm text-navy-400">Sin casos abiertos.</div>
          ) : (
            <div className="space-y-2">
              {cases.map((c) => {
                const meta = CASE_STATUS_META[c.status] || CASE_STATUS_META.abierto;
                const actions = c.sms_case_actions || [];
                const pending = actions.filter((a) => !a.done_at).length;
                return (
                  <a key={c.id} href={`/sms/casos/${c.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-navy-100 bg-white px-4 py-3 hover:border-primary-200 hover:bg-primary-50/30 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy truncate">{c.sms_reports?.description}</p>
                      <p className="text-[11px] text-navy-400 mt-0.5">{actions.length ? `${actions.length - pending}/${actions.length} acciones completadas` : 'Sin acciones correctivas'}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${meta.soft}`}>{meta.label}</span>
                  </a>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
