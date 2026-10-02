'use client';

// Skylog V2.0 — F3. Reportes de seguridad operacional (MOR/VOR) + casos.
// Restyle 2026-10-01 a pedido del usuario ("mejora de reportes y casos") —
// misma lógica/estado/endpoints de siempre (POST /api/sms/reports·cases,
// reports/analyze, reports/file, cases/actions), solo presentación: pasa del
// shell utilitario plano (ver docs/skylog-v2/40-sms.md §5.7) al lenguaje
// visual SectionHero/SectionCard/StatCard ya usado en riesgos/indicadores.
import { useEffect, useState, useCallback } from 'react';
import { SectionHero, SectionCard, StatCard } from '../../_components/SectionHero';
import { Field, Button } from '@skylog/ui';

const SEVERITY_LABELS = {
  incidente: 'Incidente',
  incidente_grave: 'Incidente grave',
  accidente: 'Accidente',
};

const ROUTE_META = {
  mor: { label: 'MOR', tile: 'bg-red-500 text-white', soft: 'bg-red-100 text-red-700' },
  vor: { label: 'VOR', tile: 'bg-amber-500 text-white', soft: 'bg-amber-100 text-amber-700' },
  rac114: { label: 'RAC 114', tile: 'bg-navy text-white', soft: 'bg-navy-100 text-navy-600' },
};

const CASE_STATUS_META = {
  abierto: { label: 'Abierto', soft: 'bg-red-100 text-red-700' },
  en_analisis: { label: 'En análisis', soft: 'bg-amber-100 text-amber-700' },
  cerrado: { label: 'Cerrado', soft: 'bg-emerald-100 text-emerald-700' },
};

const AUTO_SOURCE_LABELS = {
  auto_duty_exception: 'Borrador automático · excepción de tiempo de servicio',
  auto_unexpected_event: 'Borrador automático · evento inesperado en vuelo',
  auto_training_exam_failed: 'Borrador automático · examen de capacitación reprobado',
};

function ReportCard({ report, isSmsManager, onAnalyze, onFile, onOpenCase, busy }) {
  const openCase = report.sms_cases?.[0];
  const routeMeta = ROUTE_META[report.route] || ROUTE_META.rac114;
  return (
    <div className="rounded-xl border border-navy-100 bg-white p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${routeMeta.soft}`}>{routeMeta.label}</span>
          <span className="text-xs font-semibold text-navy-500">{SEVERITY_LABELS[report.severity]}</span>
          {report.confidentiality_level === 'confidencial' && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
              Confidencial{report.identity_redacted ? ' · identidad protegida' : ''}
            </span>
          )}
          {openCase && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CASE_STATUS_META[openCase.status]?.soft || 'bg-navy-100 text-navy-600'}`}>
              Caso: {CASE_STATUS_META[openCase.status]?.label || openCase.status}
            </span>
          )}
        </div>
        <p className="text-[11px] text-navy-300 shrink-0">{new Date(report.created_at).toLocaleDateString()}</p>
      </div>

      <p className="text-sm text-navy-700 mt-2">{report.description}</p>
      {AUTO_SOURCE_LABELS[report.source] && (
        <p className="text-[11px] text-navy-400 mt-1 italic">{AUTO_SOURCE_LABELS[report.source]}</p>
      )}
      <p className="text-[11px] text-navy-300 mt-1">
        {report.analyzed_at && 'Analizado'}
        {report.analyzed_at && report.filed_at && ' · '}
        {report.filed_at && 'Radicado'}
      </p>

      {isSmsManager && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {report.route === 'mor' && !report.analyzed_at && (
            <Button variant="ghost" className="text-xs px-3 py-1.5" disabled={busy} onClick={() => onAnalyze(report.id)}>
              Analizar (filtraje MOR)
            </Button>
          )}
          {report.route !== 'rac114' && !report.filed_at && (
            <Button variant="ghost" className="text-xs px-3 py-1.5" disabled={busy} onClick={() => onFile(report.id)}>
              Radicar
            </Button>
          )}
          {report.route !== 'rac114' && !openCase && (
            <Button variant="primary" className="text-xs px-3 py-1.5" disabled={busy} onClick={() => onOpenCase(report.id)}>
              Abrir caso
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function CaseCard({ item, onAddAction, onMarkDone, onChangeStatus, busy }) {
  const [actionText, setActionText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const statusMeta = CASE_STATUS_META[item.status] || CASE_STATUS_META.abierto;
  const actions = item.sms_case_actions || [];
  const pending = actions.filter((a) => !a.done_at).length;

  return (
    <div className="rounded-xl border border-navy-100 bg-white p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusMeta.soft}`}>{statusMeta.label}</span>
        {actions.length > 0 && (
          <span className="text-[11px] text-navy-300">
            {actions.length - pending}/{actions.length} acciones completadas
          </span>
        )}
      </div>
      <p className="text-sm text-navy-700 mt-2">{item.sms_reports?.description}</p>

      <div className="mt-3 space-y-1.5">
        {actions.map((a) => (
          <div key={a.id} className="flex items-center gap-2 text-xs">
            <span className={`material-symbols-outlined text-base shrink-0 ${a.done_at ? 'text-emerald-500' : 'text-navy-300'}`}>
              {a.done_at ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            <span className={a.done_at ? 'text-navy-400 line-through' : 'text-navy-700'}>{a.description}</span>
            {a.due_date && !a.done_at && <span className="text-[10px] text-amber-600 ml-1">vence {a.due_date}</span>}
            {!a.done_at && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onMarkDone(a.id)}
                className="ml-auto text-[11px] font-semibold text-primary hover:text-primary-600"
              >
                Marcar hecha
              </button>
            )}
          </div>
        ))}
        {actions.length === 0 && <p className="text-xs text-navy-300">Sin acciones correctivas registradas.</p>}
      </div>

      {item.status !== 'cerrado' && (
        <div className="flex gap-2 mt-3 flex-wrap items-start">
          <input
            placeholder="Nueva acción correctiva"
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
            className="flex-1 min-w-[160px] px-3 py-2 rounded-lg border border-navy-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="px-2 py-2 rounded-lg border border-navy-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
          <Button
            variant="ghost"
            className="text-xs px-3 py-2"
            disabled={busy || !actionText}
            onClick={() => {
              onAddAction(item.id, actionText, dueDate || null);
              setActionText('');
              setDueDate('');
            }}
          >
            Agregar
          </Button>
          {item.status === 'abierto' && (
            <Button variant="ghost" className="text-xs px-3 py-2" disabled={busy} onClick={() => onChangeStatus(item.id, 'en_analisis')}>
              En análisis
            </Button>
          )}
          <Button variant="secondary" className="text-xs px-3 py-2" disabled={busy} onClick={() => onChangeStatus(item.id, 'cerrado')}>
            Cerrar caso
          </Button>
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
  const [form, setForm] = useState({ severity: 'incidente', description: '', eventCode: '', confidential: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);

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
  const isSmsManager = currentOrg?.role === 'gerente_sms';

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
    if (!organizationId || !isSmsManager) return;
    try {
      const res = await fetch('/api/sms/cases?organizationId=' + organizationId);
      const data = await res.json();
      if (res.ok) setCases(data.cases || []);
    } catch {
      // silencioso
    }
  }, [organizationId, isSmsManager]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  async function submitReport(e) {
    e.preventDefault();
    if (!organizationId || !form.description) return;
    setBusy(true);
    setError(null);
    setWarning(null);
    try {
      const res = await fetch('/api/sms/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          severity: form.severity,
          description: form.description,
          eventCode: form.eventCode || null,
          confidentialityLevel: form.confidential ? 'confidencial' : 'normal',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reportar');
      if (data.warning) setWarning(data.warning);
      setForm({ severity: 'incidente', description: '', eventCode: '', confidential: false });
      await loadReports();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function analyzeReport(reportId) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/reports/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al analizar');
      await loadReports();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function fileReport(reportId) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/reports/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al radicar');
      await loadReports();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function openCase(reportId) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al abrir el caso');
      await Promise.all([loadReports(), loadCases()]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function addAction(caseId, description, dueDate) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/cases/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, description, dueDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al agregar la acción');
      await loadCases();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function markActionDone(actionId) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/cases/actions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al marcar la acción');
      await loadCases();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function changeCaseStatus(caseId, status) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/cases', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cambiar el estado');
      await loadCases();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
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
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          Esta cuenta no tiene todavía un registro de Persona vinculado — no se puede reportar hasta que exista.
        </div>
      </div>
    );
  }

  const openCases = cases.filter((c) => c.status !== 'cerrado').length;
  const pendingAnalysis = reports.filter((r) => r.route === 'mor' && !r.analyzed_at).length;
  const pendingFiling = reports.filter((r) => r.route !== 'rac114' && !r.filed_at).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <SectionHero
        eyebrow="SMS"
        title="Reportes y Casos"
        description="Reportes MOR/VOR (MAUT-1.0-22-004) y seguimiento de casos con acciones correctivas."
        cta={
          context.organizations?.length > 1 && (
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className="rounded-xl bg-white/10 border border-white/20 text-white text-xs px-3 py-2 backdrop-blur-sm"
            >
              {context.organizations.map((o) => (
                <option key={o.id} value={o.id} className="text-navy">
                  {o.name} ({o.role})
                </option>
              ))}
            </select>
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="description" color="blue" label="Reportes" value={reports.length} />
        <StatCard icon="fact_check" color="amber" label="Pend. análisis" value={pendingAnalysis} />
        <StatCard icon="upload_file" color="violet" label="Pend. radicar" value={pendingFiling} />
        {isSmsManager && <StatCard icon="folder_open" color="red" label="Casos abiertos" value={openCases} />}
      </div>

      {error && <p className="text-sm text-red-700 font-medium">{error}</p>}
      {warning && <p className="text-sm text-amber-700 font-semibold">{warning}</p>}

      <SectionCard icon="edit_note" tile="bg-blue-500 text-white" wash="from-blue-50 to-white" title="Diligenciar un reporte" description="Cualquier persona de la organización puede reportar — el análisis lo hace el Gerente SMS designado.">
        <form onSubmit={submitReport} className="space-y-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Severidad" as="select" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
              {Object.entries(SEVERITY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </Field>
            <Field
              label="Código de evento (opcional)"
              placeholder="ej. UA-SCF-NP"
              value={form.eventCode}
              onChange={(e) => setForm((f) => ({ ...f, eventCode: e.target.value }))}
            />
          </div>
          <Field
            label="Descripción del suceso"
            as="textarea"
            className="min-h-[80px]"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            required
          />
          <label className="flex items-center gap-2 text-xs text-navy-500 mb-3">
            <input type="checkbox" checked={form.confidential} onChange={(e) => setForm((f) => ({ ...f, confidential: e.target.checked }))} />
            Reportar de forma confidencial — solo el Gerente SMS verá mi identidad (RAC 219 §219.115-140)
          </label>
          <Button type="submit" disabled={busy}>
            Reportar
          </Button>
        </form>
      </SectionCard>

      <SectionCard
        icon="inbox"
        tile="bg-violet-500 text-white"
        wash="from-violet-50 to-white"
        title={isSmsManager ? 'Bandeja de reportes' : 'Mis reportes'}
        description={`${reports.length} reporte(s)`}
      >
        {reports.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-navy-200 p-6 text-center text-sm text-navy-400">
            Sin reportes todavía.
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <ReportCard key={r.id} report={r} isSmsManager={isSmsManager} onAnalyze={analyzeReport} onFile={fileReport} onOpenCase={openCase} busy={busy} />
            ))}
          </div>
        )}
      </SectionCard>

      {isSmsManager && (
        <SectionCard icon="gavel" tile="bg-red-500 text-white" wash="from-red-50 to-white" title="Casos" description={`${cases.length} caso(s)`}>
          {cases.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-navy-200 p-6 text-center text-sm text-navy-400">
              Sin casos abiertos.
            </div>
          ) : (
            <div className="space-y-3">
              {cases.map((c) => (
                <CaseCard key={c.id} item={c} onAddAction={addAction} onMarkDone={markActionDone} onChangeStatus={changeCaseStatus} busy={busy} />
              ))}
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
