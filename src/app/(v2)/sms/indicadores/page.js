'use client';

// Skylog V2.0 — SMS, Indicadores (SPI), Fase 3 del Asistente de implantación
// ("Aseguramiento" — 40-sms.md §5.2). Primer módulo real construido sobre las
// APIs ya existentes (`/api/sms/indicators*`), que hasta ahora no tenían
// ninguna pantalla en V2. Cálculo (tasas/líneas de alerta/meta/activación)
// siempre server-side (packages/domain/safetyIndicators.js) — esta página
// solo muestra lo que la API ya calculó, nunca recalcula nada por su cuenta.
//
// Restyle (2026-10-01, a pedido del usuario — "se ve plano, no continúa con
// el diseño que traíamos"): migrado del shell `PageHero`/`KPIStrip` de
// `@skylog/ui` (el único rezagado junto con Evaluación de Riesgo) al mismo
// lenguaje visual `SectionHero`/`StatCard` + tarjetas de icono-color ya
// establecido en Objetivos/Mejora Continua/Capacitación SMS/MSMS — sin
// cambios de lógica, solo de presentación.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import { Field, Button } from '@skylog/ui';
import AnnualSubmission from './_AnnualSubmission';
import { MONTH_LABELS, DEFENSE_TYPE_LABELS } from '@/lib/safetyIndicatorStats';

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth() + 1;

function IndicatorDetail({ indicator, organizationId, isManager }) {
  const [monthly, setMonthly] = useState([]);
  const [monthlyForm, setMonthlyForm] = useState({ year: CURRENT_YEAR, month: CURRENT_MONTH, events: '' });
  const [monthlyBusy, setMonthlyBusy] = useState(false);
  const [monthlyError, setMonthlyError] = useState(null);

  const [analysis, setAnalysis] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);
  const [analysisBusy, setAnalysisBusy] = useState(false);

  const [actionPlans, setActionPlans] = useState([]);
  const [planForm, setPlanForm] = useState({ defenseType: 'T', rootCause: '', triggerUnderControl: '', plan: '', officialDocument: '', executionDays: '' });
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState(null);

  const loadMonthly = useCallback(async () => {
    const res = await fetch(`/api/sms/indicators/monthly?indicatorId=${indicator.id}`);
    const data = await res.json();
    if (res.ok) setMonthly(data.monthly || []);
  }, [indicator.id]);

  const loadActionPlans = useCallback(async () => {
    const res = await fetch(`/api/sms/indicators/action-plans?indicatorId=${indicator.id}`);
    const data = await res.json();
    if (res.ok) setActionPlans(data.actionPlans || []);
  }, [indicator.id]);

  useEffect(() => {
    loadMonthly();
    loadActionPlans();
  }, [loadMonthly, loadActionPlans]);

  async function handleMonthlySubmit(e) {
    e.preventDefault();
    setMonthlyBusy(true);
    setMonthlyError(null);
    try {
      const res = await fetch('/api/sms/indicators/monthly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ indicatorId: indicator.id, year: Number(monthlyForm.year), month: Number(monthlyForm.month), events: Number(monthlyForm.events) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando el dato mensual');
      setMonthlyForm((f) => ({ ...f, events: '' }));
      await loadMonthly();
    } catch (e) {
      setMonthlyError(e.message);
    } finally {
      setMonthlyBusy(false);
    }
  }

  async function handleAnalysis() {
    setAnalysisBusy(true);
    setAnalysisError(null);
    setAnalysis(null);
    try {
      const res = await fetch(`/api/sms/indicators/analysis?indicatorId=${indicator.id}&year=${CURRENT_YEAR}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error calculando el análisis');
      setAnalysis(data);
    } catch (e) {
      setAnalysisError(e.message);
    } finally {
      setAnalysisBusy(false);
    }
  }

  async function handlePlanSubmit(e) {
    e.preventDefault();
    setPlanBusy(true);
    setPlanError(null);
    try {
      const res = await fetch('/api/sms/indicators/action-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          indicatorId: indicator.id,
          defenseType: planForm.defenseType,
          rootCause: planForm.rootCause,
          triggerUnderControl: planForm.triggerUnderControl,
          plan: planForm.plan,
          officialDocument: planForm.officialDocument || null,
          executionDays: planForm.executionDays ? Number(planForm.executionDays) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando el plan de acción');
      setPlanForm({ defenseType: 'T', rootCause: '', triggerUnderControl: '', plan: '', officialDocument: '', executionDays: '' });
      await loadActionPlans();
    } catch (e) {
      setPlanError(e.message);
    } finally {
      setPlanBusy(false);
    }
  }

  return (
    <div className="mt-3 pt-4 border-t border-navy-50 space-y-5">
      {/* Datos mensuales */}
      <div>
        <p className="text-xs font-bold text-navy-500 uppercase tracking-wide mb-2">Datos mensuales (eventos)</p>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {monthly.map((m) => (
            <span key={`${m.year}-${m.month}`} className="flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 rounded-full px-2.5 py-1">
              {MONTH_LABELS[m.month - 1]} {m.year}
              <span className="text-blue-400">·</span>
              {m.events} ev · {Number(m.rate).toFixed(2)}‰
            </span>
          ))}
          {monthly.length === 0 && <span className="text-xs text-navy-300">Sin datos capturados todavía.</span>}
        </div>
        {isManager && (
          <form onSubmit={handleMonthlySubmit} className="flex flex-wrap items-end gap-2 bg-navy-50/60 rounded-xl p-2.5">
            <Field label="Año" type="number" value={monthlyForm.year} onChange={(e) => setMonthlyForm((f) => ({ ...f, year: e.target.value }))} className="w-24" />
            <Field as="select" label="Mes" value={monthlyForm.month} onChange={(e) => setMonthlyForm((f) => ({ ...f, month: e.target.value }))} className="w-32">
              {MONTH_LABELS.map((l, i) => (
                <option key={l} value={i + 1}>
                  {l}
                </option>
              ))}
            </Field>
            <Field label="Eventos" type="number" min="0" value={monthlyForm.events} onChange={(e) => setMonthlyForm((f) => ({ ...f, events: e.target.value }))} className="w-24" required />
            <Button type="submit" disabled={monthlyBusy} className="mb-3 text-xs px-3 py-1.5">
              {monthlyBusy ? 'Guardando…' : 'Guardar'}
            </Button>
          </form>
        )}
        {monthlyError && <p className="text-xs text-red-600 mt-1">{monthlyError}</p>}
      </div>

      {/* Análisis (líneas de alerta / meta / activación) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-navy-500 uppercase tracking-wide">Análisis {CURRENT_YEAR}</p>
          <button
            type="button"
            onClick={handleAnalysis}
            disabled={analysisBusy}
            className="flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800"
          >
            <span className="material-symbols-outlined text-[15px]">insights</span>
            {analysisBusy ? 'Calculando…' : 'Calcular'}
          </button>
        </div>
        {analysisError && <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-2.5 py-1.5">{analysisError}</p>}
        {analysis && (
          <div className="space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Línea 1', value: analysis.alertLines.line1 },
                { label: 'Línea 2', value: analysis.alertLines.line2 },
                { label: 'Línea 3', value: analysis.alertLines.line3 },
                { label: 'Meta', value: analysis.target },
              ].map((s) => (
                <div key={s.label} className="bg-violet-50 border border-violet-100 rounded-xl px-2.5 py-2 text-center">
                  <p className="text-[10px] font-bold text-violet-400 uppercase tracking-wide">{s.label}</p>
                  <p className="text-sm font-black text-violet-700">{s.value != null ? Number(s.value).toFixed(3) : '—'}</p>
                </div>
              ))}
            </div>
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
                analysis.activation?.triggered ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{analysis.activation?.triggered ? 'warning' : 'check_circle'}</span>
              {analysis.activation?.triggered ? `Alerta activada — ${analysis.activation.condition}` : 'Sin alerta activada'}
            </div>
          </div>
        )}
      </div>

      {/* Planes de acción */}
      <div>
        <p className="text-xs font-bold text-navy-500 uppercase tracking-wide mb-2">Planes de acción</p>
        {actionPlans.length === 0 ? (
          <p className="text-xs text-navy-300 mb-2">Sin planes de acción registrados.</p>
        ) : (
          <div className="space-y-1.5 mb-2.5">
            {actionPlans.map((p) => (
              <div key={p.id} className="flex items-start gap-2.5 bg-amber-50/70 border border-amber-100 rounded-xl px-3 py-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-500 text-white shrink-0 shadow-sm">
                  <span className="material-symbols-outlined text-[15px]">build</span>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-navy">
                    {DEFENSE_TYPE_LABELS[p.defense_type] || p.defense_type} — <span className="font-medium text-navy-600">{p.plan}</span>
                  </p>
                  <p className="text-[11px] text-navy-400 mt-0.5">Causa raíz: {p.root_cause}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        {isManager && (
          <form onSubmit={handlePlanSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 bg-navy-50/60 rounded-xl p-2.5">
            <Field as="select" label="Tipo de defensa" value={planForm.defenseType} onChange={(e) => setPlanForm((f) => ({ ...f, defenseType: e.target.value }))}>
              {Object.entries(DEFENSE_TYPE_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Field>
            <Field
              label="Documento oficial (opcional)"
              value={planForm.officialDocument}
              onChange={(e) => setPlanForm((f) => ({ ...f, officialDocument: e.target.value }))}
            />
            <Field label="Causa raíz" value={planForm.rootCause} onChange={(e) => setPlanForm((f) => ({ ...f, rootCause: e.target.value }))} required />
            <Field
              label="Desencadenante bajo control"
              value={planForm.triggerUnderControl}
              onChange={(e) => setPlanForm((f) => ({ ...f, triggerUnderControl: e.target.value }))}
              required
            />
            <Field
              as="textarea"
              label="Plan"
              value={planForm.plan}
              onChange={(e) => setPlanForm((f) => ({ ...f, plan: e.target.value }))}
              rows={2}
              className="sm:col-span-2"
              required
            />
            <Field label="Días de ejecución (opcional)" type="number" value={planForm.executionDays} onChange={(e) => setPlanForm((f) => ({ ...f, executionDays: e.target.value }))} />
            <div className="flex items-end mb-3">
              <Button type="submit" disabled={planBusy} className="text-xs px-3 py-1.5">
                {planBusy ? 'Guardando…' : 'Registrar plan'}
              </Button>
            </div>
            {planError && <p className="text-xs text-red-600 sm:col-span-2">{planError}</p>}
          </form>
        )}
      </div>
    </div>
  );
}

export default function IndicadoresPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [indicators, setIndicators] = useState([]);
  const [seedBusy, setSeedBusy] = useState(false);
  const [newIndicator, setNewIndicator] = useState({ name: '', expectedImprovementPct: '' });
  const [newBusy, setNewBusy] = useState(false);
  const [newError, setNewError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const [cycles, setCycles] = useState([]);
  const [cycleForm, setCycleForm] = useState({ year: CURRENT_YEAR, month: CURRENT_MONTH, cycles: '' });
  const [cycleBusy, setCycleBusy] = useState(false);
  const [cycleError, setCycleError] = useState(null);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadIndicators = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/sms/indicators?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setIndicators(data.indicators || []);
  }, []);

  const loadCycles = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/sms/indicators/cycles?organizationId=${orgId}&year=${CURRENT_YEAR}`);
    const data = await res.json();
    if (res.ok) setCycles(data.monthlyCycles || []);
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
    loadIndicators(organizationId);
    loadCycles(organizationId);
  }, [organizationId, loadIndicators, loadCycles]);

  async function handleSeed() {
    setSeedBusy(true);
    try {
      const res = await fetch('/api/sms/indicators/seed-official', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
      const data = await res.json();
      if (res.ok) await loadIndicators(organizationId);
      else setError(data.error);
    } finally {
      setSeedBusy(false);
    }
  }

  async function handleNewIndicator(e) {
    e.preventDefault();
    setNewBusy(true);
    setNewError(null);
    try {
      const res = await fetch('/api/sms/indicators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          name: newIndicator.name,
          expectedImprovementPct: newIndicator.expectedImprovementPct ? Number(newIndicator.expectedImprovementPct) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando el indicador');
      setNewIndicator({ name: '', expectedImprovementPct: '' });
      await loadIndicators(organizationId);
    } catch (e) {
      setNewError(e.message);
    } finally {
      setNewBusy(false);
    }
  }

  async function handleCycleSubmit(e) {
    e.preventDefault();
    setCycleBusy(true);
    setCycleError(null);
    try {
      const res = await fetch('/api/sms/indicators/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, year: Number(cycleForm.year), month: Number(cycleForm.month), cycles: Number(cycleForm.cycles) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando los ciclos');
      setCycleForm((f) => ({ ...f, cycles: '' }));
      await loadCycles(organizationId);
    } catch (e) {
      setCycleError(e.message);
    } finally {
      setCycleBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="SMS" title="Indicadores (SPI)" description="Indicadores de Desempeño en Seguridad Operacional." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const officialCount = indicators.filter((i) => i.is_official).length;
  const ownCount = indicators.filter((i) => !i.is_official).length;

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="SMS · Fase 3"
        title="Indicadores (SPI)"
        description="Indicadores de Desempeño en Seguridad Operacional — líneas de alerta, meta y planes de acción sobre datos mensuales reales."
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
        <StatCard icon="verified" color="primary" label="Indicadores oficiales" value={officialCount} />
        <StatCard icon="add_chart" color="blue" label="Indicadores propios" value={ownCount} />
        <StatCard icon="event_available" color="violet" label="Meses con ciclos capturados" value={cycles.length} />
      </div>

      {organizationId && <AnnualSubmission organizationId={organizationId} isManager={isManager} />}

      {/* Ciclos de vuelo del mes — denominador único */}
      <div className="rounded-2xl border border-navy-100 bg-gradient-to-br from-sky-50 to-white overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-navy-50">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm bg-sky-500 text-white">
            <span className="material-symbols-outlined text-xl">sync_alt</span>
          </span>
          <div>
            <p className="text-sm font-bold text-navy">Ciclos de vuelo del mes</p>
            <p className="text-xs text-navy-400">Denominador único compartido por todos los indicadores de esta organización</p>
          </div>
        </div>
        <div className="p-5 bg-white/60">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {cycles.map((c) => (
              <span key={`${c.year}-${c.month}`} className="text-[11px] font-semibold bg-sky-50 text-sky-700 rounded-full px-2.5 py-1">
                {MONTH_LABELS[c.month - 1]} {c.year}: {c.cycles} ciclos
              </span>
            ))}
            {cycles.length === 0 && <span className="text-xs text-navy-300">Sin ciclos capturados en {CURRENT_YEAR}.</span>}
          </div>
          {isManager && (
            <form onSubmit={handleCycleSubmit} className="flex flex-wrap items-end gap-2">
              <Field label="Año" type="number" value={cycleForm.year} onChange={(e) => setCycleForm((f) => ({ ...f, year: e.target.value }))} className="w-24" />
              <Field as="select" label="Mes" value={cycleForm.month} onChange={(e) => setCycleForm((f) => ({ ...f, month: e.target.value }))} className="w-32">
                {MONTH_LABELS.map((l, i) => (
                  <option key={l} value={i + 1}>
                    {l}
                  </option>
                ))}
              </Field>
              <Field label="Ciclos" type="number" min="0" value={cycleForm.cycles} onChange={(e) => setCycleForm((f) => ({ ...f, cycles: e.target.value }))} className="w-24" required />
              <Button type="submit" disabled={cycleBusy} className="mb-3 text-xs px-3 py-1.5">
                {cycleBusy ? 'Guardando…' : 'Guardar'}
              </Button>
            </form>
          )}
          {cycleError && <p className="text-xs text-red-600">{cycleError}</p>}
        </div>
      </div>

      {/* Catálogo de indicadores */}
      <div className="rounded-2xl border border-navy-100 bg-gradient-to-br from-primary-50 to-white overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-navy-50">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm bg-primary text-white">
              <span className="material-symbols-outlined text-xl">monitoring</span>
            </span>
            <div>
              <p className="text-sm font-bold text-navy">Catálogo de indicadores</p>
              <p className="text-xs text-navy-400">Oficiales (MAUT-1.0-22-005) + propios de la organización</p>
            </div>
          </div>
          {isManager && officialCount === 0 && (
            <button
              type="button"
              onClick={handleSeed}
              disabled={seedBusy}
              className="flex items-center gap-1.5 shrink-0 bg-primary hover:bg-primary-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              {seedBusy ? 'Sembrando…' : 'Sembrar catálogo oficial (11)'}
            </button>
          )}
        </div>

        <div className="p-5 bg-white/60">
          {indicators.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 text-center rounded-2xl border border-dashed border-navy-200 bg-navy-50/50 py-10 px-6">
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white shadow-sm text-navy-300">
                <span className="material-symbols-outlined text-2xl">monitoring</span>
              </span>
              <p className="text-sm font-semibold text-navy">Sin indicadores todavía</p>
              {isManager && <p className="text-xs text-navy-400">Siembra el catálogo oficial o agrega un indicador propio abajo.</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {indicators.map((ind) => {
                const expanded = expandedId === ind.id;
                return (
                  <div key={ind.id} className="bg-white rounded-xl border border-navy-100 overflow-hidden">
                    <button type="button" onClick={() => setExpandedId(expanded ? null : ind.id)} className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 shadow-sm ${ind.is_official ? 'bg-primary text-white' : 'bg-blue-500 text-white'}`}>
                          <span className="material-symbols-outlined text-base">{ind.is_official ? 'verified' : 'add_chart'}</span>
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-navy truncate">{ind.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {ind.is_official ? (
                              <span className="text-[10px] font-mono font-semibold text-primary-600 bg-primary-50 rounded-full px-1.5 py-0.5">{ind.taxonomy_code}</span>
                            ) : (
                              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 rounded-full px-1.5 py-0.5">Propio</span>
                            )}
                            {ind.expected_improvement_pct != null && (
                              <span className="text-[10px] text-navy-400">Meta mejora: {(Number(ind.expected_improvement_pct) * 100).toFixed(0)}%</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-navy-300 text-lg shrink-0">{expanded ? 'expand_less' : 'expand_more'}</span>
                    </button>
                    {expanded && (
                      <div className="px-3.5 pb-3.5">
                        <IndicatorDetail indicator={ind} organizationId={organizationId} isManager={isManager} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {isManager && (
            <form onSubmit={handleNewIndicator} className="flex flex-wrap items-end gap-2 mt-4 pt-4 border-t border-navy-50">
              <Field
                label="Nuevo indicador propio"
                value={newIndicator.name}
                onChange={(e) => setNewIndicator((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ej. Excursión de pista en aterrizaje"
                className="flex-1 min-w-[220px]"
                required
              />
              <Field
                label="Mejora esperada % (opcional)"
                type="number"
                value={newIndicator.expectedImprovementPct}
                onChange={(e) => setNewIndicator((f) => ({ ...f, expectedImprovementPct: e.target.value }))}
                className="w-40"
              />
              <Button type="submit" disabled={newBusy} className="mb-3 text-xs px-3 py-1.5">
                {newBusy ? 'Creando…' : 'Agregar'}
              </Button>
            </form>
          )}
          {newError && <p className="text-xs text-red-600 mt-1">{newError}</p>}
        </div>
      </div>
    </div>
  );
}
