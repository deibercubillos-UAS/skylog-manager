'use client';

// Skylog V2.0 — F3. Reportes de seguridad operacional (MOR/VOR) + casos.
// Vista utilitaria mínima (PRODUCT.md: sin superficie visual propia todavía) —
// hace funcional la capa de API ya construida (POST /api/sms/reports·cases,
// reports/analyze, reports/file, cases/actions). Ver docs/skylog-v2/40-sms.md §5.7.

import { useEffect, useState, useCallback } from 'react';

const SEVERITY_LABELS = {
  incidente: 'Incidente',
  incidente_grave: 'Incidente grave',
  accidente: 'Accidente',
};

const ROUTE_LABELS = {
  mor: 'MOR',
  vor: 'VOR',
  rac114: 'RAC 114 (no MOR/VOR)',
};

function ReportRow({ report, isSmsManager, onAnalyze, onFile, onOpenCase, busy }) {
  const openCase = report.sms_cases?.[0];
  return (
    <div style={{ border: '1px solid #e2e4e9', borderRadius: 6, padding: 10, marginBottom: 8, fontSize: 13 }}>
      <p>
        <strong>{ROUTE_LABELS[report.route]}</strong> · {SEVERITY_LABELS[report.severity]}
        {report.source === 'auto_duty_exception' && ' · borrador automático (excepción de servicio)'}
      </p>
      <p style={{ color: '#4a5568' }}>{report.description}</p>
      <p style={{ fontSize: 11, color: '#a3aab8' }}>
        {new Date(report.created_at).toLocaleString()}
        {report.analyzed_at && ' · analizado'}
        {report.filed_at && ' · radicado'}
        {openCase && ` · caso: ${openCase.status}`}
      </p>
      {isSmsManager && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
          {report.route === 'mor' && !report.analyzed_at && (
            <button type="button" disabled={busy} onClick={() => onAnalyze(report.id)}>
              Analizar (filtraje MOR)
            </button>
          )}
          {report.route !== 'rac114' && !report.filed_at && (
            <button type="button" disabled={busy} onClick={() => onFile(report.id)}>
              Radicar
            </button>
          )}
          {report.route !== 'rac114' && !openCase && (
            <button type="button" disabled={busy} onClick={() => onOpenCase(report.id)}>
              Abrir caso
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CaseRow({ item, onAddAction, onMarkDone, onChangeStatus, busy }) {
  const [actionText, setActionText] = useState('');
  return (
    <div style={{ border: '1px solid #e2e4e9', borderRadius: 6, padding: 10, marginBottom: 8, fontSize: 13 }}>
      <p>
        <strong>Caso — {item.status}</strong>
      </p>
      <p style={{ color: '#4a5568' }}>{item.sms_reports?.description}</p>
      <div style={{ marginTop: 6 }}>
        {(item.sms_case_actions || []).map((a) => (
          <p key={a.id} style={{ fontSize: 12 }}>
            {a.done_at ? '✔' : '○'} {a.description}
            {!a.done_at && (
              <button type="button" disabled={busy} onClick={() => onMarkDone(a.id)} style={{ marginLeft: 6 }}>
                Marcar hecha
              </button>
            )}
          </p>
        ))}
      </div>
      {item.status !== 'cerrado' && (
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            placeholder="Nueva acción correctiva"
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
            style={{ padding: 6, fontSize: 12, flex: 1 }}
          />
          <button
            type="button"
            disabled={busy || !actionText}
            onClick={() => {
              onAddAction(item.id, actionText);
              setActionText('');
            }}
          >
            Agregar
          </button>
          {item.status === 'abierto' && (
            <button type="button" disabled={busy} onClick={() => onChangeStatus(item.id, 'en_analisis')}>
              En análisis
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => onChangeStatus(item.id, 'cerrado')}>
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}

export default function SmsPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [reports, setReports] = useState([]);
  const [cases, setCases] = useState([]);
  const [form, setForm] = useState({ severity: 'incidente', description: '', eventCode: '' });
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
        body: JSON.stringify({ organizationId, severity: form.severity, description: form.description, eventCode: form.eventCode || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al reportar');
      if (data.warning) setWarning(data.warning);
      setForm({ severity: 'incidente', description: '', eventCode: '' });
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

  async function addAction(caseId, description) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/cases/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseId, description }),
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

  if (loading) return <div style={{ padding: 24 }}>Cargando…</div>;

  if (!context?.personId) {
    return (
      <div style={{ padding: 24, maxWidth: 480 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A202C' }}>Seguridad operacional (SMS)</h1>
        <p style={{ marginTop: 12, color: '#702810' }}>
          Esta cuenta no tiene todavía un registro de Persona vinculado — no se puede reportar
          hasta que exista.
        </p>
      </div>
    );
  }

  const inputStyle = { display: 'block', marginTop: 4, marginBottom: 10, padding: 8, width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ padding: 24, maxWidth: 640, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A202C' }}>Seguridad operacional (SMS)</h1>
      <p style={{ fontSize: 13, color: '#a3aab8', marginTop: 4 }}>
        Directiva MAUT-1.0-22-004 (MOR/VOR) — Skylog V2.0
      </p>

      {context.organizations?.length > 1 && (
        <select style={inputStyle} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
          {context.organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.role})
            </option>
          ))}
        </select>
      )}

      {error && <p style={{ color: '#8a2f10', fontSize: 13 }}>{error}</p>}
      {warning && <p style={{ color: '#8a2f10', fontSize: 13, fontWeight: 600 }}>{warning}</p>}

      <form onSubmit={submitReport} style={{ marginTop: 12, marginBottom: 20, padding: 12, border: '1px solid #e2e4e9', borderRadius: 8 }}>
        <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Diligenciar un reporte</p>
        <p style={{ fontSize: 11, color: '#a3aab8', marginBottom: 6 }}>
          Cualquier persona de la organización puede reportar — el análisis lo hace el Gerente
          SMS designado.
        </p>
        <select style={inputStyle} value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}>
          {Object.entries(SEVERITY_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <input
          style={inputStyle}
          placeholder="Código de evento (opcional, ej. UA-SCF-NP)"
          value={form.eventCode}
          onChange={(e) => setForm((f) => ({ ...f, eventCode: e.target.value }))}
        />
        <textarea
          style={{ ...inputStyle, minHeight: 70 }}
          placeholder="Descripción del suceso"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          required
        />
        <button type="submit" disabled={busy}>
          Reportar
        </button>
      </form>

      <p style={{ fontWeight: 600, fontSize: 14 }}>{isSmsManager ? 'Bandeja de reportes' : 'Mis reportes'}</p>
      {reports.length === 0 && <p style={{ fontSize: 13, color: '#a3aab8' }}>Sin reportes todavía.</p>}
      {reports.map((r) => (
        <ReportRow
          key={r.id}
          report={r}
          isSmsManager={isSmsManager}
          onAnalyze={analyzeReport}
          onFile={fileReport}
          onOpenCase={openCase}
          busy={busy}
        />
      ))}

      {isSmsManager && (
        <>
          <p style={{ fontWeight: 600, fontSize: 14, marginTop: 20 }}>Casos</p>
          {cases.length === 0 && <p style={{ fontSize: 13, color: '#a3aab8' }}>Sin casos abiertos.</p>}
          {cases.map((c) => (
            <CaseRow
              key={c.id}
              item={c}
              onAddAction={addAction}
              onMarkDone={markActionDone}
              onChangeStatus={changeCaseStatus}
              busy={busy}
            />
          ))}
        </>
      )}
    </div>
  );
}
