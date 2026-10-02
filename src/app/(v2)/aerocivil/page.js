'use client';

// Skylog V2.0 — F4a. Expediente Aerocivil listo para radicar. Vista utilitaria
// mínima (PRODUCT.md: V2 no tiene superficie visual propia todavía) — hace
// funcional la solicitud de autorización + el análisis de riesgos oficial
// MAUT-5.0-12-055 ya construido en la capa de API (POST /api/aerocivil/requests,
// .../risk-analysis). Ver docs/skylog-v2/43-aerocivil.md §6.3.

import { useEffect, useState, useCallback } from 'react';
import { HAZARD_CATALOG, MITIGATION_STRATEGIES, PROBABILITY_LEVELS, SEVERITY_LEVELS } from '@skylog/domain';

const PROB_OPTIONS = Object.keys(PROBABILITY_LEVELS).sort((a, b) => b - a);
const SEV_OPTIONS = Object.keys(SEVERITY_LEVELS);

function emptyHazardState() {
  return HAZARD_CATALOG.reduce((acc, h) => {
    acc[h.number] = { number: h.number, answer: false };
    return acc;
  }, {});
}

function HazardRow({ hazard, value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const inputStyle = { padding: 6, fontSize: 12 };

  return (
    <div style={{ borderBottom: '1px solid #e2e4e9', padding: '10px 0' }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: '#1A202C' }}>
        {hazard.number}. {hazard.question}
      </p>
      <label style={{ fontSize: 12, marginRight: 12 }}>
        <input
          type="checkbox"
          checked={!!value.answer}
          onChange={(e) => set({ answer: e.target.checked })}
        />{' '}
        Sí
      </label>

      {value.answer && (
        <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: '2px solid #ec5b13' }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <select
              style={inputStyle}
              value={value.probabilityCode || ''}
              onChange={(e) => set({ probabilityCode: Number(e.target.value) })}
            >
              <option value="">Probabilidad…</option>
              {PROB_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p} — {PROBABILITY_LEVELS[p].label}
                </option>
              ))}
            </select>
            <select
              style={inputStyle}
              value={value.severityCode || ''}
              onChange={(e) => set({ severityCode: e.target.value })}
            >
              <option value="">Severidad…</option>
              {SEV_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s} — {SEVERITY_LEVELS[s].label}
                </option>
              ))}
            </select>
          </div>

          <select
            style={{ ...inputStyle, marginBottom: 6, display: 'block' }}
            value={value.mitigationStrategy || ''}
            onChange={(e) => set({ mitigationStrategy: e.target.value })}
          >
            <option value="">Estrategia de mitigación (si aplica)…</option>
            {MITIGATION_STRATEGIES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <textarea
            style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', marginBottom: 6 }}
            placeholder="Descripción de la mitigación / defensas implementadas"
            value={value.mitigationDescription || ''}
            onChange={(e) => set({ mitigationDescription: e.target.value })}
          />
          <p style={{ fontSize: 11, color: '#a3aab8', marginBottom: 4 }}>Riesgo residual tras mitigar:</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select
              style={inputStyle}
              value={value.residualProbabilityCode || ''}
              onChange={(e) => set({ residualProbabilityCode: Number(e.target.value) })}
            >
              <option value="">Probabilidad…</option>
              {PROB_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {p} — {PROBABILITY_LEVELS[p].label}
                </option>
              ))}
            </select>
            <select
              style={inputStyle}
              value={value.residualSeverityCode || ''}
              onChange={(e) => set({ residualSeverityCode: e.target.value })}
            >
              <option value="">Severidad…</option>
              {SEV_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s} — {SEVERITY_LEVELS[s].label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AerocivilPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [requests, setRequests] = useState([]);
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [reqForm, setReqForm] = useState({ zone: '', scopeStart: '', scopeEnd: '', totalFlightsPlanned: '' });
  const [hazards, setHazards] = useState(emptyHazardState());
  const [analysis, setAnalysis] = useState(null);
  const [evaluation, setEvaluation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

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
  const isManager = !!currentOrg?.isDutyManager;

  const loadRequests = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await fetch('/api/aerocivil/requests?organizationId=' + organizationId);
      const data = await res.json();
      if (res.ok) setRequests(data.authorizationRequests || []);
    } catch {
      // silencioso
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) loadRequests();
  }, [organizationId, loadRequests]);

  const loadRiskAnalysis = useCallback(async () => {
    if (!selectedRequestId) return;
    try {
      const res = await fetch('/api/aerocivil/risk-analysis?authorizationId=' + selectedRequestId);
      const data = await res.json();
      if (res.ok) {
        setAnalysis(data.riskAnalysis || null);
        if (data.riskAnalysis?.hazards?.length) {
          const byNumber = { ...emptyHazardState() };
          for (const h of data.riskAnalysis.hazards) byNumber[h.number] = h;
          setHazards(byNumber);
        } else {
          setHazards(emptyHazardState());
        }
      }
    } catch {
      // silencioso
    }
  }, [selectedRequestId]);

  useEffect(() => {
    loadRiskAnalysis();
  }, [loadRiskAnalysis]);

  async function createRequest(e) {
    e.preventDefault();
    if (!organizationId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/aerocivil/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          zone: reqForm.zone,
          scopeStart: reqForm.scopeStart,
          scopeEnd: reqForm.scopeEnd,
          totalFlightsPlanned: Number(reqForm.totalFlightsPlanned),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear la solicitud');
      setReqForm({ zone: '', scopeStart: '', scopeEnd: '', totalFlightsPlanned: '' });
      setSelectedRequestId(data.authorizationRequest.id);
      await loadRequests();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function saveRiskAnalysis() {
    if (!selectedRequestId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/aerocivil/risk-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizationId: selectedRequestId, hazards: Object.values(hazards) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar el análisis');
      setAnalysis(data.riskAnalysis);
      setEvaluation(data.evaluation);
      setMessage(data.evaluation.canSign ? 'Guardado — listo para firmar' : 'Guardado — hay peligros sin conformar');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function signRiskAnalysis() {
    if (!selectedRequestId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch('/api/aerocivil/risk-analysis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorizationId: selectedRequestId }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setEvaluation(data.evaluation);
        throw new Error(data.error);
      }
      if (!res.ok) throw new Error(data.error || 'Error al firmar');
      setAnalysis(data.riskAnalysis);
      setMessage('Análisis de riesgos firmado');
      await loadRequests();
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
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A202C' }}>Expediente Aerocivil</h1>
        <p style={{ marginTop: 12, color: '#702810' }}>
          Esta cuenta no tiene todavía un registro de Persona vinculado — no se puede preparar un
          expediente hasta que exista.
        </p>
      </div>
    );
  }

  const inputStyle = { display: 'block', marginTop: 4, marginBottom: 10, padding: 8, width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ padding: 24, maxWidth: 720, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A202C' }}>Expediente Aerocivil</h1>
      <p style={{ fontSize: 13, color: '#a3aab8', marginTop: 4 }}>
        RAC 100 §100.805(a) · análisis de riesgos MAUT-5.0-12-055 — BitaFly
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

      {!isManager && (
        <p style={{ fontSize: 13, color: '#702810' }}>
          Preparar y firmar el expediente Aerocivil es una función de gestión (Jefe de Pilotos,
          Gerente SMS, admin) — esta cuenta solo puede consultar.
        </p>
      )}

      {isManager && (
        <form onSubmit={createRequest} style={{ marginTop: 16, marginBottom: 24, padding: 12, border: '1px solid #e2e4e9', borderRadius: 8 }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Nueva solicitud de autorización</p>
          <input
            style={inputStyle}
            placeholder="Zona de operación"
            value={reqForm.zone}
            onChange={(e) => setReqForm((f) => ({ ...f, zone: e.target.value }))}
            required
          />
          <label style={{ fontSize: 12 }}>Desde</label>
          <input
            type="date"
            style={inputStyle}
            value={reqForm.scopeStart}
            onChange={(e) => setReqForm((f) => ({ ...f, scopeStart: e.target.value }))}
            required
          />
          <label style={{ fontSize: 12 }}>Hasta</label>
          <input
            type="date"
            style={inputStyle}
            value={reqForm.scopeEnd}
            onChange={(e) => setReqForm((f) => ({ ...f, scopeEnd: e.target.value }))}
            required
          />
          <label style={{ fontSize: 12 }}>Total de vuelos planeados</label>
          <input
            type="number"
            min="1"
            style={inputStyle}
            value={reqForm.totalFlightsPlanned}
            onChange={(e) => setReqForm((f) => ({ ...f, totalFlightsPlanned: e.target.value }))}
            required
          />
          <button type="submit" disabled={busy}>
            Crear solicitud
          </button>
        </form>
      )}

      <div style={{ marginBottom: 16 }}>
        <p style={{ fontWeight: 600, fontSize: 14 }}>Solicitudes</p>
        {requests.length === 0 && <p style={{ fontSize: 13, color: '#a3aab8' }}>Sin solicitudes todavía.</p>}
        {requests.map((r) => (
          <div
            key={r.id}
            onClick={() => setSelectedRequestId(r.id)}
            style={{
              padding: 8,
              marginBottom: 4,
              cursor: 'pointer',
              background: r.id === selectedRequestId ? '#fff4ec' : 'transparent',
              border: '1px solid #e2e4e9',
              borderRadius: 6,
              fontSize: 13,
            }}
          >
            {r.zone} — {r.scope_start} a {r.scope_end} — {r.total_flights_planned} vuelos —{' '}
            <strong>{r.status}</strong>
            {r.risk_analyses?.[0]?.signed_at && ' · análisis firmado'}
          </div>
        ))}
      </div>

      {selectedRequestId && (
        <div>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
            Análisis de riesgos — MAUT-5.0-12-055
            {analysis?.signed_at && ' (firmado)'}
          </p>
          {message && <p style={{ fontSize: 13, color: '#1A202C' }}>{message}</p>}
          {evaluation && !evaluation.canSign && (
            <div style={{ fontSize: 12, color: '#8a2f10', marginBottom: 8 }}>
              {evaluation.errors.map((e, i) => (
                <p key={i}>
                  Peligro #{e.number} ({e.zone}): {e.errors.join('; ')}
                </p>
              ))}
            </div>
          )}
          <div style={{ maxHeight: isManager ? 'none' : 400, overflowY: 'auto' }}>
            {HAZARD_CATALOG.map((h) => (
              <HazardRow
                key={h.number}
                hazard={h}
                value={hazards[h.number]}
                onChange={(v) => {
                  if (!isManager) return;
                  setHazards((prev) => ({ ...prev, [h.number]: v }));
                }}
              />
            ))}
          </div>
          {isManager && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button type="button" onClick={saveRiskAnalysis} disabled={busy}>
                Guardar
              </button>
              <button type="button" onClick={signRiskAnalysis} disabled={busy || analysis?.signed_at}>
                Firmar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
