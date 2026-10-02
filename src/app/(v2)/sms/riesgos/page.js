'use client';

// Skylog V2.0 — SMS, Evaluación de Riesgo, Fase 2 del Asistente de
// implantación ("Gestión del riesgo" — 40-sms.md §5.2). Construido sobre 4
// APIs ya existentes que hasta ahora no tenían ninguna pantalla:
// `/api/sms/risk-matrix`, `/api/sms/barriers`, `/api/sms/hazards`,
// `/api/sms/risk-assessments`. Orden real de uso: Barreras y Matriz se
// configuran primero (los Peligros las referencian), luego se registran y
// evalúan Peligros contra la matriz ya configurada — la zona
// inicial/residual SIEMPRE se calcula server-side (evaluateInternalHazard,
// packages/domain), nunca se confía en el valor que arme el cliente.
//
// Sin semilla OACI Doc 9859: packages/domain/internalRiskMatrix.js documenta
// por qué (regla V1 — no fabricar contenido normativo sin fuente verificada)
// — cada organización configura su matriz desde cero.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import { Field, Button } from '@skylog/ui';
import {
  DEFAULT_PROBABILITY_LEVELS,
  DEFAULT_SEVERITY_LEVELS,
  buildDefaultTolerability,
  ZONE_STYLES,
  ZONE_CYCLE,
} from '@/lib/v2/riskMatrixDefaults';

const ZONES = Object.entries(ZONE_STYLES).map(([value, s]) => ({ value, label: s.label, color: s.soft }));

function zoneMeta(zone) {
  return ZONES.find((z) => z.value === zone) || { label: zone || '—', color: 'bg-navy-100 text-navy-400' };
}

function LevelListEditor({ label, levels, onChange }) {
  const [code, setCode] = useState('');
  const [text, setText] = useState('');

  function add() {
    if (!code.trim() || !text.trim()) return;
    onChange([...levels, { code: code.trim(), label: text.trim() }]);
    setCode('');
    setText('');
  }

  return (
    <div>
      <p className="text-xs font-semibold text-navy-500 mb-1.5">{label}</p>
      <div className="space-y-1 mb-2">
        {levels.map((l, i) => (
          <div key={l.code} className="flex items-center justify-between text-xs bg-navy-50 rounded-lg px-2 py-1">
            <span>
              <span className="font-mono text-navy-400">{l.code}</span> — {l.label}
            </span>
            <button type="button" onClick={() => onChange(levels.filter((_, j) => j !== i))} className="text-red-500">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ))}
        {levels.length === 0 && <p className="text-xs text-navy-300">Sin niveles todavía.</p>}
      </div>
      <div className="flex gap-1.5">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código" className="w-16 text-xs border border-navy-200 rounded px-2 py-1" />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nombre del nivel" className="flex-1 text-xs border border-navy-200 rounded px-2 py-1" />
        <button type="button" onClick={add} className="text-xs text-primary-700 font-semibold px-2">
          Agregar
        </button>
      </div>
    </div>
  );
}

function RiskMatrixPanel({ organizationId, isManager }) {
  const [matrix, setMatrix] = useState(null);
  const [probabilityLevels, setProbabilityLevels] = useState([]);
  const [severityLevels, setSeverityLevels] = useState([]);
  const [tolerability, setTolerability] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [missing, setMissing] = useState(null);

  const load = useCallback(async () => {
    if (!organizationId) return;
    const res = await fetch(`/api/sms/risk-matrix?organizationId=${organizationId}`);
    const data = await res.json();
    if (res.ok && data.riskMatrix) {
      setMatrix(data.riskMatrix);
      setProbabilityLevels(data.riskMatrix.probability_levels || []);
      setSeverityLevels(data.riskMatrix.severity_levels || []);
      setTolerability(data.riskMatrix.tolerability || []);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  function cellZone(pCode, sCode) {
    return tolerability.find((c) => c.probabilityCode === pCode && c.severityCode === sCode)?.zone || '';
  }

  function setCellZone(pCode, sCode, zone) {
    const rest = tolerability.filter((c) => !(c.probabilityCode === pCode && c.severityCode === sCode));
    setTolerability(zone ? [...rest, { probabilityCode: pCode, severityCode: sCode, zone }] : rest);
  }

  function cycleCellZone(pCode, sCode) {
    const current = cellZone(pCode, sCode);
    const next = ZONE_CYCLE[(ZONE_CYCLE.indexOf(current) + 1) % ZONE_CYCLE.length];
    setCellZone(pCode, sCode, next);
  }

  // Plantilla de referencia (src/lib/v2/riskMatrixDefaults.js) — disponible
  // desde el inicio para que la organización no parta de cero: puebla el
  // formulario (probabilidad/severidad/celdas), pero NO guarda sola — el
  // usuario la revisa, la ajusta a sus propios criterios y recién entonces
  // pulsa "Guardar matriz". Nunca se presenta como norma oficial (ver
  // comentario de riskMatrixDefaults.js).
  function loadTemplate() {
    setProbabilityLevels(DEFAULT_PROBABILITY_LEVELS.map((l) => ({ ...l })));
    setSeverityLevels(DEFAULT_SEVERITY_LEVELS.map((l) => ({ ...l })));
    setTolerability(buildDefaultTolerability());
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    setMissing(null);
    try {
      const res = await fetch('/api/sms/risk-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, probabilityLevels, severityLevels, tolerability }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando la matriz');
      setMatrix(data.riskMatrix);
      if (!data.completeness?.complete) setMissing(data.completeness?.missing || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const hasLevels = probabilityLevels.length > 0 && severityLevels.length > 0;

  return (
    <div className="rounded-2xl border border-navy-100 bg-gradient-to-br from-red-50 to-white overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-navy-50">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm bg-red-500 text-white">
          <span className="material-symbols-outlined text-xl">grid_view</span>
        </span>
        <div>
          <p className="text-sm font-bold text-navy">Matriz de riesgo</p>
          <p className="text-xs text-navy-400">Configurable por tu organización — niveles de probabilidad/severidad y tolerabilidad de cada combinación</p>
        </div>
      </div>

      {!matrix && !hasLevels && (
        <div className="mx-4 mt-4 mb-4 rounded-xl border border-dashed border-primary-200 bg-primary-50/50 p-5 text-center">
          <span className="material-symbols-outlined text-3xl text-primary-500">grid_view</span>
          <p className="text-xs font-semibold text-navy mt-1.5">Aún no configuras tu matriz de evaluación de riesgo</p>
          <p className="text-[11px] text-navy-400 max-w-md mx-auto mt-1">
            Puedes partir de una plantilla de referencia (5 niveles de probabilidad × 5 de severidad) y personalizarla luego —
            no es un formato oficial, es solo un punto de partida para que lo ajustes a tu organización.
          </p>
          {isManager && (
            <button
              type="button"
              onClick={loadTemplate}
              className="inline-flex items-center gap-1.5 mt-3 bg-primary hover:bg-primary-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              Cargar plantilla de referencia
            </button>
          )}
        </div>
      )}

      {isManager && hasLevels && (
        <div className="px-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <LevelListEditor label="Niveles de probabilidad" levels={probabilityLevels} onChange={setProbabilityLevels} />
            <LevelListEditor label="Niveles de severidad" levels={severityLevels} onChange={setSeverityLevels} />
          </div>
        </div>
      )}

      {hasLevels && (
        <div className={`px-4 pb-4 ${isManager ? '' : 'pt-4'}`}>
          <div className="overflow-x-auto">
            <table className="border-collapse mx-auto">
              <thead>
                <tr>
                  <th className="p-1.5"></th>
                  {severityLevels.map((s) => (
                    <th key={s.code} className="p-1.5 text-center">
                      <p className="text-[10px] font-black text-navy-400">{s.code}</p>
                      <p className="text-[9px] font-semibold text-navy-300 max-w-[64px] truncate">{s.label}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {probabilityLevels.map((p) => (
                  <tr key={p.code}>
                    <td className="p-1.5 text-right pr-2">
                      <p className="text-[10px] font-black text-navy-400">{p.code}</p>
                      <p className="text-[9px] font-semibold text-navy-300 max-w-[80px] truncate">{p.label}</p>
                    </td>
                    {severityLevels.map((s) => {
                      const zone = cellZone(p.code, s.code);
                      const style = zone ? ZONE_STYLES[zone]?.solid : 'bg-navy-50 text-navy-300';
                      return (
                        <td key={s.code} className="p-1">
                          <button
                            type="button"
                            disabled={!isManager}
                            onClick={() => cycleCellZone(p.code, s.code)}
                            title={zone ? ZONE_STYLES[zone]?.label : 'Sin definir'}
                            className={`size-10 flex items-center justify-center rounded-lg text-[11px] font-black transition-all ${style} ${
                              isManager ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                            }`}
                          >
                            {p.code}
                            {s.code}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-5 pt-3 mt-3 border-t border-navy-50">
            {Object.entries(ZONE_STYLES).map(([key, z]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`size-2.5 rounded-full ${z.dot}`} />
                <span className="text-[10px] font-semibold text-navy-400">{z.label}</span>
              </div>
            ))}
          </div>
          {isManager && <p className="text-center text-[10px] text-navy-300 pt-2">Clic en una celda para cambiar su zona de tolerabilidad</p>}

          {isManager && (
            <div className="pt-3 flex items-center gap-3">
              {error && <p className="text-xs text-red-600">{error}</p>}
              {missing && missing.length > 0 && <p className="text-xs text-amber-600">Faltan {missing.length} combinación(es) por definir.</p>}
              <Button onClick={handleSave} disabled={busy} className="text-xs px-3 py-1.5 ml-auto">
                {busy ? 'Guardando…' : 'Guardar matriz'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BarriersPanel({ organizationId, isManager, barriers, onCreated }) {
  const [form, setForm] = useState({ description: '', category: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/barriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, description: form.description, category: form.category || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando la barrera');
      setForm({ description: '', category: '' });
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-navy-100 bg-gradient-to-br from-amber-50 to-white overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-navy-50">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm bg-amber-500 text-white">
          <span className="material-symbols-outlined text-xl">shield</span>
        </span>
        <div>
          <p className="text-sm font-bold text-navy">Barreras</p>
          <p className="text-xs text-navy-400">Controles/mitigaciones declarados por la organización — los peligros pueden asociarse a una</p>
        </div>
      </div>

      <div className="p-5 bg-white/60">
        {barriers.length === 0 ? (
          <p className="text-sm text-navy-300 mb-3">Sin barreras registradas todavía.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {barriers.map((b) => (
              <span key={b.id} className="flex items-center gap-1.5 text-xs font-medium bg-amber-50 text-amber-800 rounded-full px-3 py-1.5">
                <span className="material-symbols-outlined text-[14px] text-amber-500">shield</span>
                {b.description}
                {b.category && <span className="text-amber-500">· {b.category}</span>}
              </span>
            ))}
          </div>
        )}

        {isManager && (
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
            <Field
              label="Descripción"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Ej. Checklist pre-vuelo obligatorio"
              className="flex-1 min-w-[220px]"
              required
            />
            <Field label="Categoría (opcional)" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-48" />
            <Button type="submit" disabled={busy} className="mb-3 text-xs px-3 py-1.5">
              {busy ? 'Guardando…' : 'Agregar'}
            </Button>
          </form>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}

function HazardRow({ hazard, matrix, isManager, barriers, onEvaluated }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({ probabilityCode: '', severityCode: '', mitigation: '', residualProbabilityCode: '', residualSeverityCode: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const assessments = hazard.risk_assessments || [];
  const latest = assessments[assessments.length - 1];
  const barrier = barriers.find((b) => b.id === hazard.related_barrier_id);
  const probabilityLevels = matrix?.probability_levels || [];
  const severityLevels = matrix?.severity_levels || [];

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/risk-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hazardId: hazard.id,
          probabilityCode: form.probabilityCode,
          severityCode: form.severityCode,
          mitigation: form.mitigation || null,
          residualProbabilityCode: form.residualProbabilityCode || null,
          residualSeverityCode: form.residualSeverityCode || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error evaluando el peligro');
      setForm({ probabilityCode: '', severityCode: '', mitigation: '', residualProbabilityCode: '', residualSeverityCode: '' });
      setExpanded(false);
      onEvaluated();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="py-2.5 border-b border-navy-50 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 shadow-sm bg-violet-500 text-white mt-0.5">
            <span className="material-symbols-outlined text-[16px]">warning</span>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy">{hazard.description}</p>
            <p className="text-xs text-navy-400">
              {hazard.source || 'observación'}
              {hazard.mission_type ? ` · ${hazard.mission_type}` : ''}
              {barrier ? ` · Barrera: ${barrier.description}` : ''}
            </p>
          </div>
        </div>
        {latest ? (
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${zoneMeta(latest.initial_zone).color}`}>{zoneMeta(latest.initial_zone).label}</span>
            {latest.residual_zone && (
              <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${zoneMeta(latest.residual_zone).color}`}>Residual: {zoneMeta(latest.residual_zone).label}</span>
            )}
          </div>
        ) : (
          isManager && (
            <button type="button" onClick={() => setExpanded((v) => !v)} className="text-xs text-primary-700 hover:underline shrink-0">
              {expanded ? 'Cerrar' : 'Evaluar'}
            </button>
          )
        )}
      </div>

      {expanded && !latest && (
        <form onSubmit={handleSubmit} className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          {!matrix ? (
            <p className="text-xs text-amber-600 sm:col-span-2">Configura la matriz de riesgo antes de evaluar peligros.</p>
          ) : (
            <>
              <Field as="select" label="Probabilidad" value={form.probabilityCode} onChange={(e) => setForm((f) => ({ ...f, probabilityCode: e.target.value }))} required>
                <option value="">Selecciona…</option>
                {probabilityLevels.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.label}
                  </option>
                ))}
              </Field>
              <Field as="select" label="Severidad" value={form.severityCode} onChange={(e) => setForm((f) => ({ ...f, severityCode: e.target.value }))} required>
                <option value="">Selecciona…</option>
                {severityLevels.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} — {s.label}
                  </option>
                ))}
              </Field>
              <Field
                as="textarea"
                label="Mitigación (opcional)"
                value={form.mitigation}
                onChange={(e) => setForm((f) => ({ ...f, mitigation: e.target.value }))}
                rows={2}
                className="sm:col-span-2"
              />
              <Field as="select" label="Probabilidad residual (opcional)" value={form.residualProbabilityCode} onChange={(e) => setForm((f) => ({ ...f, residualProbabilityCode: e.target.value }))}>
                <option value="">—</option>
                {probabilityLevels.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.label}
                  </option>
                ))}
              </Field>
              <Field as="select" label="Severidad residual (opcional)" value={form.residualSeverityCode} onChange={(e) => setForm((f) => ({ ...f, residualSeverityCode: e.target.value }))}>
                <option value="">—</option>
                {severityLevels.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} — {s.label}
                  </option>
                ))}
              </Field>
              {error && <p className="text-xs text-red-600 sm:col-span-2">{error}</p>}
              <div className="sm:col-span-2 mb-3">
                <Button type="submit" disabled={busy} className="text-xs px-3 py-1.5">
                  {busy ? 'Guardando…' : 'Guardar evaluación'}
                </Button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
}

export default function RiesgosPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [matrix, setMatrix] = useState(null);
  const [barriers, setBarriers] = useState([]);
  const [hazards, setHazards] = useState([]);
  const [hazardForm, setHazardForm] = useState({ description: '', source: '', missionType: '', relatedBarrierId: '' });
  const [hazardBusy, setHazardBusy] = useState(false);
  const [hazardError, setHazardError] = useState(null);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadMatrix = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/sms/risk-matrix?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setMatrix(data.riskMatrix);
  }, []);

  const loadBarriers = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/sms/barriers?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setBarriers(data.barriers || []);
  }, []);

  const loadHazards = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/sms/hazards?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setHazards(data.hazards || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/duty/context');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
        setContext(data);
        const firstOrgId = data.organizations?.[0]?.id || '';
        setOrganizationId(firstOrgId);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    loadMatrix(organizationId);
    loadBarriers(organizationId);
    loadHazards(organizationId);
  }, [organizationId, loadMatrix, loadBarriers, loadHazards]);

  async function handleHazardSubmit(e) {
    e.preventDefault();
    setHazardBusy(true);
    setHazardError(null);
    try {
      const res = await fetch('/api/sms/hazards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          description: hazardForm.description,
          source: hazardForm.source || null,
          missionType: hazardForm.missionType || null,
          relatedBarrierId: hazardForm.relatedBarrierId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando el peligro');
      setHazardForm({ description: '', source: '', missionType: '', relatedBarrierId: '' });
      await loadHazards(organizationId);
    } catch (e) {
      setHazardError(e.message);
    } finally {
      setHazardBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="SMS · Fase 2" title="Evaluación de Riesgo" description="Matriz de riesgo, barreras y peligros." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const evaluated = hazards.filter((h) => h.risk_assessments?.length).length;

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="SMS · Fase 2"
        title="Evaluación de Riesgo"
        description="Identificación de peligros, matriz de tolerabilidad y evaluación residual — gestión del riesgo del SMS (MAUT-5.0-22-017)."
      />

      {context.organizations.length > 1 && (
        <Field as="select" label="Organización" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
          {context.organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Field>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon="shield" color="amber" label="Barreras" value={barriers.length} />
        <StatCard icon="warning" color="violet" label="Peligros registrados" value={hazards.length} />
        <StatCard icon="fact_check" color="emerald" label="Peligros evaluados" value={evaluated} />
      </div>

      <RiskMatrixPanel organizationId={organizationId} isManager={isManager} />
      <BarriersPanel organizationId={organizationId} isManager={isManager} barriers={barriers} onCreated={() => loadBarriers(organizationId)} />

      <div className="rounded-2xl border border-navy-100 bg-gradient-to-br from-violet-50 to-white overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-navy-50">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm bg-violet-500 text-white">
            <span className="material-symbols-outlined text-xl">warning</span>
          </span>
          <div>
            <p className="text-sm font-bold text-navy">Peligros</p>
            <p className="text-xs text-navy-400">Catálogo de peligros identificados por la organización — evalúalos contra la matriz de riesgo</p>
          </div>
        </div>

        <div className="p-5 bg-white/60">
          {hazards.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 text-center rounded-2xl border border-dashed border-navy-200 bg-navy-50/50 py-10 px-6 mb-3">
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white shadow-sm text-navy-300">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </span>
              <p className="text-sm font-semibold text-navy">Sin peligros registrados todavía</p>
              {isManager && <p className="text-xs text-navy-400">Registra el primero abajo y evalúalo contra la matriz de riesgo.</p>}
            </div>
          ) : (
            <div className="mb-3">
              {hazards.map((h) => (
                <HazardRow key={h.id} hazard={h} matrix={matrix} isManager={isManager} barriers={barriers} onEvaluated={() => loadHazards(organizationId)} />
              ))}
            </div>
          )}

          {isManager && (
            <form onSubmit={handleHazardSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 pt-3 border-t border-navy-50">
              <Field
                label="Descripción del peligro"
                value={hazardForm.description}
                onChange={(e) => setHazardForm((f) => ({ ...f, description: e.target.value }))}
                className="sm:col-span-2"
                required
              />
              <Field
                label="Origen (opcional)"
                value={hazardForm.source}
                onChange={(e) => setHazardForm((f) => ({ ...f, source: e.target.value }))}
                placeholder="Ej. observación, reporte SMS, auditoría"
              />
              <Field
                label="Tipo de misión (opcional)"
                value={hazardForm.missionType}
                onChange={(e) => setHazardForm((f) => ({ ...f, missionType: e.target.value }))}
              />
              <Field
                as="select"
                label="Barrera relacionada (opcional)"
                value={hazardForm.relatedBarrierId}
                onChange={(e) => setHazardForm((f) => ({ ...f, relatedBarrierId: e.target.value }))}
                className="sm:col-span-2"
              >
                <option value="">Sin relacionar</option>
                {barriers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.description}
                  </option>
                ))}
              </Field>
              {hazardError && <p className="text-xs text-red-600 sm:col-span-2">{hazardError}</p>}
              <div className="sm:col-span-2">
                <Button type="submit" disabled={hazardBusy} className="text-xs px-3 py-1.5">
                  {hazardBusy ? 'Guardando…' : 'Registrar peligro'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
