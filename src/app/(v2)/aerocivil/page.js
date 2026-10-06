'use client';

// Skylog V2.0 — F4a. Expediente Aerocivil listo para radicar: solicitud de autorización (RAC 100 §100.805(a)),
// checklist de preparación (póliza RCE, CDO-U, antelación, aeronaves registradas) y el análisis de riesgos oficial
// MAUT-5.0-12-055. Mismo lenguaje visual que el resto de V2 (SectionHero/SectionCard/StatCard + @skylog/ui).
// Ver docs/skylog-v2/43-aerocivil.md §6.3.

import { useEffect, useState, useCallback } from 'react';
import { HAZARD_CATALOG, MITIGATION_STRATEGIES, PROBABILITY_LEVELS, SEVERITY_LEVELS } from '@skylog/domain';
import { Field, Button } from '@skylog/ui';
import { SectionHero, SectionCard, StatCard } from '../_components/SectionHero';

const PROB_OPTIONS = Object.keys(PROBABILITY_LEVELS).sort((a, b) => b - a);
const SEV_OPTIONS = Object.keys(SEVERITY_LEVELS);

const STATUS_META = {
  borrador: { label: 'Borrador', cls: 'bg-navy-50 text-navy-500' },
  radicado: { label: 'Radicado', cls: 'bg-blue-50 text-blue-700' },
  en_revision: { label: 'En revisión', cls: 'bg-amber-50 text-amber-700' },
  autorizado: { label: 'Autorizado', cls: 'bg-emerald-50 text-emerald-700' },
  negado: { label: 'Negado', cls: 'bg-red-50 text-red-700' },
};

function emptyHazardState() {
  return HAZARD_CATALOG.reduce((acc, h) => {
    acc[h.number] = { number: h.number, answer: false };
    return acc;
  }, {});
}

const selectCls = 'px-2.5 py-1.5 rounded-lg border border-navy-200 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-300';

function LevelSelects({ prob, sev, onProb, onSev }) {
  return (
    <div className="flex gap-2 flex-wrap">
      <select className={selectCls} value={prob || ''} onChange={(e) => onProb(Number(e.target.value))}>
        <option value="">Probabilidad…</option>
        {PROB_OPTIONS.map((p) => (
          <option key={p} value={p}>{p} — {PROBABILITY_LEVELS[p].label}</option>
        ))}
      </select>
      <select className={selectCls} value={sev || ''} onChange={(e) => onSev(e.target.value)}>
        <option value="">Severidad…</option>
        {SEV_OPTIONS.map((s) => (
          <option key={s} value={s}>{s} — {SEVERITY_LEVELS[s].label}</option>
        ))}
      </select>
    </div>
  );
}

function HazardRow({ hazard, value, onChange, readOnly }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="border-b border-navy-50 py-3 last:border-b-0">
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" className="mt-1 accent-primary" checked={!!value.answer} disabled={readOnly} onChange={(e) => set({ answer: e.target.checked })} />
        <span className="text-sm text-navy">
          <span className="font-bold text-navy-400 mr-1">{hazard.number}.</span>
          {hazard.question}
        </span>
      </label>

      {value.answer && (
        <div className="mt-3 ml-7 pl-4 border-l-2 border-primary space-y-3">
          <LevelSelects prob={value.probabilityCode} sev={value.severityCode} onProb={(v) => set({ probabilityCode: v })} onSev={(v) => set({ severityCode: v })} />
          <select className={`${selectCls} block`} value={value.mitigationStrategy || ''} onChange={(e) => set({ mitigationStrategy: e.target.value })}>
            <option value="">Estrategia de mitigación (si aplica)…</option>
            {MITIGATION_STRATEGIES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <textarea
            className="w-full px-3 py-2 rounded-lg border border-navy-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary-300"
            rows={2}
            placeholder="Descripción de la mitigación / defensas implementadas"
            value={value.mitigationDescription || ''}
            onChange={(e) => set({ mitigationDescription: e.target.value })}
          />
          <div>
            <p className="text-[11px] font-semibold text-navy-300 mb-1">Riesgo residual tras mitigar</p>
            <LevelSelects prob={value.residualProbabilityCode} sev={value.residualSeverityCode} onProb={(v) => set({ residualProbabilityCode: v })} onSev={(v) => set({ residualSeverityCode: v })} />
          </div>
        </div>
      )}
    </div>
  );
}

const TONE = {
  ok: { icon: 'check_circle', cls: 'bg-emerald-50 text-emerald-800' },
  warn: { icon: 'error', cls: 'bg-amber-50 text-amber-800' },
  bad: { icon: 'cancel', cls: 'bg-red-50 text-red-800' },
  na: { icon: 'remove_circle', cls: 'bg-navy-50 text-navy-500' },
};

const RCE_STATUS = {
  ok: ['ok', 'Toda la flota operativa tiene póliza RCE vigente durante el periodo.'],
  partial: ['warn', 'Solo parte de la flota queda cubierta durante todo el periodo.'],
  none: ['bad', 'Ninguna aeronave tiene póliza RCE vigente durante todo el periodo.'],
  no_aircraft: ['na', 'No hay aeronaves operativas registradas para evaluar.'],
};
const RCE_REASONS = {
  sin_poliza_rce: 'No hay una póliza RCE registrada',
  aeronave_sin_cobertura: 'Ninguna póliza RCE cubre esta aeronave',
  vigencia_no_cubre_el_periodo: 'La vigencia no cubre todo el periodo',
};

// Checklist de preparación. Informativo: no bloquea firmar ni radicar, avisa lo que falta antes de presentar.
function buildChecklist({ rce, cdo, leadTime, registration }) {
  const items = [];
  const [rceTone, rceText] = RCE_STATUS[rce.status];
  const rceExtra = [
    ...rce.byAircraft.filter((x) => !x.covered).map((x) => `${x.label}: ${RCE_REASONS[x.reason] || x.reason}`),
    ...(rce.missingDocumentLabels.length ? [`Falta adjuntar el certificado de vigencia de: ${rce.missingDocumentLabels.join(', ')} — la solicitud lo exige.`] : []),
  ];
  items.push({
    key: 'rce',
    title: `Póliza RCE vigente${rce.total > 0 ? ` — ${rce.coveredCount} de ${rce.total} aeronaves cubiertas` : ''}`,
    tone: rceTone === 'ok' && rceExtra.length ? 'warn' : rceTone,
    text: rceText,
    extra: rceExtra,
    href: rceTone !== 'ok' || rceExtra.length ? '/polizas' : null,
    link: 'Ir a Pólizas →',
  });
  if (cdo) {
    const m = {
      ok: ['ok', `Vigente hasta ${cdo.expiresAt}, cubre todo el periodo.`],
      sin_cdo: ['bad', 'No hay un CDO-U registrado para la organización.'],
      sin_vigencia: ['warn', 'El CDO-U no tiene fecha de vencimiento registrada.'],
      vencido: ['bad', `Venció el ${cdo.expiresAt}.`],
      no_cubre_periodo: ['warn', `Vence el ${cdo.expiresAt}, antes de terminar el periodo.`],
    }[cdo.status];
    items.push({ key: 'cdo', title: 'CDO-U vigente', tone: m[0], text: m[1], href: '/organizacion', link: 'Ir a Organización →' });
  }
  if (leadTime) {
    const d = leadTime.businessDays;
    const m = {
      ok: ['ok', `Faltan ${d} días hábiles para iniciar: cumple los 15 del espacio aéreo controlado.`],
      solo_corredor_bvlos: ['warn', `Faltan ${d} días hábiles: cumple los 10 de corredores BVLOS, pero no los 15 del espacio aéreo controlado.`],
      insuficiente: ['bad', `Faltan solo ${d} días hábiles: no alcanza ni los 10 de corredores BVLOS ni los 15 del espacio aéreo controlado.`],
      pasada: ['na', 'El periodo ya inició: la antelación no aplica.'],
    }[leadTime.status];
    items.push({ key: 'lead', title: 'Antelación de la solicitud', tone: m[0], text: m[1] });
  }
  if (registration) {
    const m = {
      ok: ['ok', 'Todas las aeronaves tienen número de registro (RUAS).'],
      incompleta: ['warn', `Sin número de registro (RUAS): ${registration.missingLabels.join(', ')}.`],
      no_aircraft: ['na', 'No hay aeronaves registradas.'],
    }[registration.status];
    items.push({ key: 'reg', title: 'Aeronaves registradas', tone: m[0], text: m[1], href: '/flota', link: 'Ir a Flota →' });
  }
  return items;
}

function Checklist({ readiness }) {
  const items = buildChecklist(readiness);
  const pending = items.filter((i) => i.tone === 'warn' || i.tone === 'bad').length;
  return (
    <SectionCard
      icon="fact_check"
      tile="bg-blue-500 text-white"
      wash="from-blue-50 to-white"
      title="Checklist del expediente"
      description="Informativo: no bloquea firmar ni radicar"
      badge={<span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${pending ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{pending ? `${pending} por revisar` : 'Todo en orden'}</span>}
    >
      <div className="space-y-2">
        {items.map((it) => {
          const t = TONE[it.tone];
          return (
            <div key={it.key} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 ${t.cls}`}>
              <span className="material-symbols-outlined text-lg mt-0.5">{t.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{it.title}</p>
                <p className="text-xs opacity-90 mt-0.5">{it.text}</p>
                {(it.extra || []).map((x) => <p key={x} className="text-xs opacity-90 mt-0.5">{x}</p>)}
                {it.href && it.tone !== 'ok' && it.tone !== 'na' && (
                  <a href={it.href} className="inline-block text-xs font-semibold underline mt-1">{it.link}</a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
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
  const [readiness, setReadiness] = useState(null);
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

  // Checklist de preparación (hoy: póliza RCE) — solo gestores; la API también lo exige.
  const loadReadiness = useCallback(async () => {
    setReadiness(null);
    if (!selectedRequestId || !isManager) return;
    try {
      const res = await fetch('/api/aerocivil/readiness?authorizationId=' + selectedRequestId);
      const data = await res.json();
      if (res.ok) setReadiness(data);
    } catch {
      // silencioso — el checklist es informativo
    }
  }, [selectedRequestId, isManager]);

  useEffect(() => {
    loadReadiness();
  }, [loadReadiness]);

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

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="RAC 100 §100.805" title="Expediente Aerocivil" description="Solicitud de autorización y análisis de riesgos MAUT-5.0-12-055." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado — no se puede preparar un expediente hasta que exista.</p>
      </div>
    );
  }

  const selected = requests.find((r) => r.id === selectedRequestId);
  const signedCount = requests.filter((r) => r.risk_analyses?.[0]?.signed_at).length;
  const authorizedCount = requests.filter((r) => r.status === 'autorizado').length;

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="RAC 100 §100.805(a)"
        title="Expediente Aerocivil"
        description="Prepara la solicitud de autorización y el análisis de riesgos oficial MAUT-5.0-12-055 antes de radicar en la Plataforma UAS Colombia."
        cta={
          context.organizations?.length > 1 && (
            <select className="bg-white/10 text-white text-sm rounded-xl px-3 py-2 border border-white/20" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
              {context.organizations.map((o) => (
                <option key={o.id} value={o.id} className="text-navy">{o.name} ({o.role})</option>
              ))}
            </select>
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="description" color="primary" label="Solicitudes" value={requests.length} />
        <StatCard icon="draw" color="violet" label="Análisis firmados" value={signedCount} />
        <StatCard icon="verified" color="emerald" label="Autorizadas" value={authorizedCount} />
        <StatCard icon="edit_note" color="amber" label="Borradores" value={requests.filter((r) => r.status === 'borrador').length} />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {!isManager && (
        <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
          Preparar y firmar el expediente Aerocivil es una función de gestión (Jefe de Pilotos, Gerente SMS, admin) — esta cuenta solo puede consultar.
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          {isManager && (
            <SectionCard icon="add_task" tile="bg-primary text-white" wash="from-primary-50 to-white" title="Nueva solicitud de autorización" description="Una campaña: zona, periodo y vuelos planeados">
              <form onSubmit={createRequest} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                <Field className="sm:col-span-2" label="Zona de operación" value={reqForm.zone} onChange={(e) => setReqForm((f) => ({ ...f, zone: e.target.value }))} required />
                <Field type="date" label="Desde" value={reqForm.scopeStart} onChange={(e) => setReqForm((f) => ({ ...f, scopeStart: e.target.value }))} required />
                <Field type="date" label="Hasta" value={reqForm.scopeEnd} onChange={(e) => setReqForm((f) => ({ ...f, scopeEnd: e.target.value }))} required />
                <Field type="number" min="1" label="Total de vuelos planeados" value={reqForm.totalFlightsPlanned} onChange={(e) => setReqForm((f) => ({ ...f, totalFlightsPlanned: e.target.value }))} required />
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={busy}>{busy ? 'Creando…' : 'Crear solicitud'}</Button>
                </div>
              </form>
            </SectionCard>
          )}

          <SectionCard icon="list_alt" tile="bg-violet-500 text-white" wash="from-violet-50 to-white" title="Solicitudes" description="Elige una para ver su checklist y su análisis de riesgos">
            {requests.length === 0 ? (
              <p className="text-sm text-navy-400">Sin solicitudes todavía.</p>
            ) : (
              <div className="space-y-2">
                {requests.map((r) => {
                  const meta = STATUS_META[r.status] || STATUS_META.borrador;
                  const on = r.id === selectedRequestId;
                  return (
                    <button
                      type="button"
                      key={r.id}
                      onClick={() => setSelectedRequestId(r.id)}
                      className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${on ? 'border-primary bg-primary-50/60' : 'border-navy-100 bg-white hover:border-navy-200'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-navy">{r.zone}</p>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${meta.cls}`}>{meta.label}</span>
                      </div>
                      <p className="text-xs text-navy-400 mt-0.5">
                        {r.scope_start} a {r.scope_end} · {r.total_flights_planned} vuelos
                        {r.risk_analyses?.[0]?.signed_at && ' · análisis firmado'}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          {selectedRequestId && isManager && readiness && <Checklist readiness={readiness} />}
          {!selectedRequestId && (
            <div className="rounded-2xl border border-dashed border-navy-200 bg-navy-50/50 py-12 px-6 text-center">
              <span className="material-symbols-outlined text-3xl text-navy-300">touch_app</span>
              <p className="text-sm font-semibold text-navy mt-1">Elige una solicitud</p>
              <p className="text-xs text-navy-400">Aquí aparecerá su checklist de preparación.</p>
            </div>
          )}
        </div>
      </div>

      {selectedRequestId && (
        <SectionCard
          icon="shield"
          tile="bg-red-500 text-white"
          wash="from-red-50 to-white"
          title="Análisis de riesgos — MAUT-5.0-12-055"
          description={selected ? `${selected.zone} · ${selected.scope_start} a ${selected.scope_end}` : undefined}
          badge={analysis?.signed_at ? <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 shrink-0">Firmado</span> : null}
        >
          {message && <p className="text-sm text-navy bg-navy-50 rounded-lg px-3 py-2 mb-3">{message}</p>}
          {evaluation && !evaluation.canSign && (
            <div className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2 mb-3 space-y-0.5">
              {evaluation.errors.map((e, i) => (
                <p key={i}>Peligro #{e.number} ({e.zone}): {e.errors.join('; ')}</p>
              ))}
            </div>
          )}
          <div className={isManager ? '' : 'max-h-[400px] overflow-y-auto'}>
            {HAZARD_CATALOG.map((h) => (
              <HazardRow
                key={h.number}
                hazard={h}
                value={hazards[h.number]}
                readOnly={!isManager}
                onChange={(v) => {
                  if (!isManager) return;
                  setHazards((prev) => ({ ...prev, [h.number]: v }));
                }}
              />
            ))}
          </div>
          {isManager && (
            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={saveRiskAnalysis} disabled={busy}>Guardar</Button>
              <Button type="button" onClick={signRiskAnalysis} disabled={busy || !!analysis?.signed_at}>Firmar</Button>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
