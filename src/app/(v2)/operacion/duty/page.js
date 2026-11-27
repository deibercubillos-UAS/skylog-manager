'use client';

// Skylog V2.0 — F5 §100.540, Tiempos de servicio. Convertida de formulario
// de captura a **panorama informativo** (decisión del usuario, 2026-09-13):
// ya no tiene botones Iniciar/Cerrar período ni el formulario "Registrar
// vuelo" — esa captura vive ahora en Bitácora (`/operacion/bitacora`, mismo
// endpoint `POST /api/flights`), que ya la construye con su propio flujo.
// Esta página solo muestra: el período abierto (si lo hay, de solo lectura),
// el cumplimiento real (§100.540) calculado por packages/domain, y para un
// gestor, la disponibilidad de la tripulación y la certificación anual
// (§100.535(12) — acción administrativa distinta de la captura personal de
// tiempo, se conserva).
import { useEffect, useState, useCallback } from 'react';
import BrandLoader from '@/components/BrandLoader';
import { Field, Button } from '@skylog/ui';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import IconSelectField from '../../_components/IconSelectField';
import { fetchDutyContext, pickOrganizationId } from '@/lib/v2/dutyContextClient';

const TYPE_LABELS = {
  servicio: 'Servicio',
  descanso: 'Descanso',
  disponibilidad: 'Disponibilidad',
  entrenamiento: 'Entrenamiento',
};

const CHECK_LABELS = {
  monthlyFlight: '§100.540(c)(1) — vuelo mensual',
  dailyFlight: '§100.540(d)(1) — vuelo diario',
  continuousOperation: '§100.540(e) — operación continua',
  rest: '§100.540(f) — descanso post-servicio',
};

// Estado de una barra según el cumplimiento que ya calculó el dominio: excede el
// límite (rojo), cerca del límite ≥80% (ámbar, el mismo `warning` de dutyCompliance)
// o con holgura (verde). No recalcula nada, solo traduce a color.
function hoursState(m) {
  if (m?.compliant === false) return { fill: 'bg-red-400', text: 'text-red-600' };
  if (m?.warning) return { fill: 'bg-amber-400', text: 'text-amber-600' };
  return { fill: 'bg-emerald-400', text: 'text-navy-700' };
}

// Gráfica sobria de horas de vuelo por piloto contra su límite de §100.540.
// Barras horizontales en HTML/CSS (sin dependencia de librería, igual que el
// resto de gráficas del proyecto, hechas a mano). Sirve para el límite mensual
// (uno solo para todos: la marca del límite solo aparece si alguien lo supera,
// para no duplicar el fin de la pista) y para el diario (cada piloto trae su
// propio límite según el tipo de visión — 6 h BVLOS / 8 h VLOS-EVLOS —, así que
// la marca se dibuja por barra). `rows`: [{ name, role, hours, limit, compliant, warning? }].
function HoursBarChart({ title, limitLabel, legend, rows, perBarLimit = false }) {
  if (!rows || rows.length === 0) return null;
  const maxLimit = Math.max(...rows.map((r) => r.limit || 0));
  const maxHours = Math.max(...rows.map((r) => r.hours));
  const exceeded = rows.some((r) => r.hours > r.limit);
  const scaleMax = (exceeded ? Math.max(maxLimit, maxHours) * 1.02 : maxLimit) || 1;

  return (
    <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="px-6 py-3.5 border-b border-navy-50 bg-navy-50/30 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">{title}</h3>
        <span className="text-[11px] font-semibold text-navy-400">{limitLabel}</span>
      </div>
      <div className="p-5 space-y-3.5">
        {rows.map((r) => {
          const st = hoursState(r);
          const pct = Math.max((r.hours / scaleMax) * 100, r.hours > 0 ? 1.5 : 0);
          const showMarker = perBarLimit || exceeded;
          const limitPct = Math.min((r.limit / scaleMax) * 100, 100);
          return (
            <div key={r.name}>
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-navy truncate">
                  {r.name} <span className="text-navy-300 font-medium">({r.role})</span>
                </span>
                <span className={`text-[11px] font-black tabular-nums shrink-0 ${st.text}`}>
                  {r.hours.toFixed(1)}h<span className="text-navy-300 font-semibold"> / {r.limit}h</span>
                </span>
              </div>
              <div className="relative h-2.5 rounded-full bg-navy-100">
                <div className={`absolute inset-y-0 left-0 rounded-full ${st.fill}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                {showMarker && <div className="absolute inset-y-[-2px] w-px bg-navy-400/70" style={{ left: `${limitPct}%` }} aria-hidden="true" />}
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[10px] font-semibold text-navy-400">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${l.dot}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const MONTHLY_LEGEND = [
  { dot: 'bg-emerald-400', label: 'Con holgura' },
  { dot: 'bg-amber-400', label: 'Cerca del límite (≥80%)' },
  { dot: 'bg-red-400', label: 'Excede el límite' },
];
const DAILY_LEGEND = [
  { dot: 'bg-emerald-400', label: 'Dentro del límite' },
  { dot: 'bg-red-400', label: 'Excede el límite' },
];

// Filas de una gráfica a partir del resumen de la empresa. `key` es el chequeo
// (monthlyFlight / dailyFlight); el diario solo incluye a quien ya voló hoy
// (horas > 0), para no llenar la gráfica de barras en cero.
function chartRows(summary, key) {
  return (summary || [])
    .map((s) => ({ name: s.fullName, role: s.role, ...(s.compliance?.checks?.[key] || {}) }))
    .filter((r) => r.hours != null && (key === 'dailyFlight' ? r.hours > 0 : true))
    .sort((a, b) => b.hours - a.hours);
}

export default function DutyOverviewPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [status, setStatus] = useState(null);
  const [summary, setSummary] = useState(null); // resumen de TODA la empresa — vista por defecto de un gestor
  const [pilotFilter, setPilotFilter] = useState(''); // '' = "toda la empresa" (solo aplica a gestores)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [certForm, setCertForm] = useState({ targetPersonId: '', year: new Date().getFullYear() });
  const [certBusy, setCertBusy] = useState(false);
  const [certifications, setCertifications] = useState([]);
  const [certMessage, setCertMessage] = useState(null);
  const [roster, setRoster] = useState(null);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDutyContext();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
      setContext(data);
      if (data.organizations?.length) setOrganizationId((prev) => prev || pickOrganizationId(data));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStatus = useCallback(async (personId, orgId) => {
    try {
      const qs = personId ? `?personId=${personId}&organizationId=${orgId}` : '';
      const res = await fetch(`/api/duty/current${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando estado');
      setStatus(data);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const canSee = (currentOrg?.permissions?.['H4'] || 'none') !== 'none';

  const loadSummary = useCallback(async (orgId) => {
    if (!orgId) return;
    try {
      const res = await fetch(`/api/duty/compliance-summary?organizationId=${orgId}`);
      const data = await res.json();
      if (res.ok) setSummary(data.summary || []);
    } catch {
      // panel secundario, no bloquea el resto de la vista
    }
  }, []);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  // Un piloto (no gestor) siempre ve solo lo suyo. Un gestor entra viendo el
  // resumen de la empresa (pilotFilter vacío) — pedido explícito del usuario
  // ("al ingresar muestre el general de la empresa") — y solo pide su propio
  // estado detallado si elige verse a sí mismo en el filtro.
  useEffect(() => {
    if (!context?.personId) return;
    if (!canSee) {
      loadStatus();
      return;
    }
    if (organizationId) loadSummary(organizationId);
    if (pilotFilter) loadStatus(pilotFilter, organizationId);
    else setStatus(null);
  }, [context, canSee, organizationId, pilotFilter, loadStatus, loadSummary]);

  const loadCertifications = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await fetch('/api/duty/certifications?organizationId=' + organizationId);
      const data = await res.json();
      if (res.ok) setCertifications(data.certifications || []);
    } catch {
      // panel secundario, no bloquea el resto de la vista
    }
  }, [organizationId]);

  useEffect(() => {
    if (canSee) loadCertifications();
  }, [canSee, loadCertifications]);

  const loadRoster = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await fetch('/api/duty/roster?organizationId=' + organizationId);
      const data = await res.json();
      if (res.ok) setRoster(data.roster || []);
    } catch {
      // panel secundario, no bloquea el resto de la vista
    }
  }, [organizationId]);

  useEffect(() => {
    if (canSee) loadRoster();
  }, [canSee, loadRoster]);

  async function certifyPilot(e) {
    e.preventDefault();
    if (!organizationId || !certForm.targetPersonId) return;
    setCertBusy(true);
    setCertMessage(null);
    try {
      const res = await fetch('/api/duty/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, targetPersonId: certForm.targetPersonId, year: Number(certForm.year) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al certificar');
      setCertMessage(`Certificado: ${Number(data.certification.total_hours).toFixed(1)}h en ${data.certification.year}`);
      setCertForm((f) => ({ ...f, targetPersonId: '' }));
      await loadCertifications();
    } catch (e) {
      setCertMessage(e.message);
    } finally {
      setCertBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <BrandLoader bare />
          <p className="text-xs font-black text-navy-300 uppercase tracking-widest animate-pulse">Cargando…</p>
        </div>
      </div>
    );
  }

  if (!context?.personId) {
    return (
      <div className="space-y-4">
        <SectionHero eyebrow="RAC 100 §100.540" title="Tiempos de servicio" description="Panorama de cumplimiento de tiempos de servicio." />
        <p className="text-sm text-navy-400">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const open = status?.openPeriod;
  const checks = status?.compliance?.checks;
  const blocksDispatch = status?.compliance?.blocksDispatch;
  const alertCount = summary ? summary.filter((s) => s.compliance?.blocksDispatch).length : 0;

  let heroMetric;
  if (canSee && !pilotFilter && summary) {
    heroMetric = {
      value: <span className={alertCount > 0 ? 'text-red-300' : 'text-emerald-300'}>{alertCount > 0 ? alertCount : summary.length}</span>,
      label: alertCount > 0 ? 'Pilotos con alerta' : 'Pilotos que cumplen',
    };
  } else if (checks) {
    heroMetric = {
      value: <span className={blocksDispatch ? 'text-red-300' : 'text-emerald-300'}>{blocksDispatch ? 'Bloqueado' : 'Habilitado'}</span>,
      label: blocksDispatch ? 'Despacho bloqueado' : 'Sin bloqueos de §100.540',
    };
  }

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="RAC 100 §100.540"
        title="Tiempos de servicio"
        description="Panorama de cumplimiento — la captura de vuelos vive en Bitácora."
        metric={heroMetric}
      />

      {canSee && (
        <div className="bg-white rounded-2xl border border-navy-100 p-4 flex flex-wrap gap-4">
          <IconSelectField icon="person" label="Piloto" value={pilotFilter} onChange={(e) => setPilotFilter(e.target.value)} className="mb-0">
            <option value="">Toda la empresa</option>
            {(summary || []).map((s) => (
              <option key={s.personId} value={s.personId}>
                {s.fullName}
              </option>
            ))}
          </IconSelectField>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      {canSee && !pilotFilter ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard icon="groups" label="Pilotos monitoreados" value={summary?.length ?? '—'} />
            <StatCard icon="verified" label="En cumplimiento" value={summary ? summary.filter((s) => !s.compliance?.blocksDispatch).length : '—'} />
            <StatCard icon="warning" alert={alertCount > 0} label="Con alerta" value={alertCount} />
          </div>

          <HoursBarChart
            title="Horas de vuelo del mes por piloto"
            limitLabel="Límite §100.540(c)(1): 90 h/mes"
            legend={MONTHLY_LEGEND}
            rows={chartRows(summary, 'monthlyFlight')}
          />

          <HoursBarChart
            title="Horas de vuelo de hoy por piloto"
            limitLabel="Límite §100.540(d)(1): 6 h BVLOS · 8 h VLOS/EVLOS"
            legend={DAILY_LEGEND}
            rows={chartRows(summary, 'dailyFlight')}
            perBarLimit
          />

          <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
            <div className="px-6 py-3.5 border-b border-navy-50 bg-navy-50/30">
              <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Cumplimiento por piloto</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-navy-50/50 text-xs font-black text-navy-300 uppercase tracking-widest">
                    <th className="px-6 py-2.5">Piloto</th>
                    <th className="px-6 py-2.5">Vuelo mensual</th>
                    <th className="px-6 py-2.5">Vuelo diario</th>
                    <th className="px-6 py-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {!summary || summary.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center opacity-40 max-md:[&>*]:sticky max-md:[&>*]:left-0 max-md:[&>*]:w-[calc(100vw-5rem)] max-md:[&>*]:whitespace-normal">
                        <span className="material-symbols-outlined text-5xl text-navy-300 mb-3 block">groups</span>
                        <p className="text-xs font-black uppercase tracking-widest text-navy-500">Sin tripulación en esta organización</p>
                      </td>
                    </tr>
                  ) : (
                    summary.map((s) => {
                      const c = s.compliance?.checks;
                      const alert = !!s.compliance?.blocksDispatch;
                      return (
                        <tr key={s.personId} className="hover:bg-navy-50/40 cursor-pointer transition-colors" onClick={() => setPilotFilter(s.personId)}>
                          <td className="px-6 py-2.5 text-xs font-bold text-navy whitespace-nowrap">
                            {s.fullName} <span className="text-navy-300 font-medium">({s.role})</span>
                          </td>
                          <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">
                            {c?.monthlyFlight?.hours != null ? `${c.monthlyFlight.hours.toFixed(1)}h / ${c.monthlyFlight.limit}h` : '—'}
                          </td>
                          <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">
                            {c?.dailyFlight?.hours != null ? `${c.dailyFlight.hours.toFixed(1)}h / ${c.dailyFlight.limit}h` : '—'}
                          </td>
                          <td className="px-6 py-2.5 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${
                                alert ? 'bg-red-50 text-red-600 border-red-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              }`}
                            >
                              {alert ? 'Con alerta' : 'Cumple'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {canSee && (
            <button
              type="button"
              onClick={() => setPilotFilter('')}
              className="flex items-center gap-1 text-xs font-bold text-navy-400 hover:text-navy-600"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              Volver al resumen de la empresa
            </button>
          )}

          {blocksDispatch && (
            <div className="flex items-center gap-2 text-sm font-bold text-white bg-red-600 rounded-2xl px-4 py-3 shadow-sm shadow-red-900/20">
              <span className="material-symbols-outlined">block</span>
              Despacho bloqueado — al menos un límite de §100.540 está excedido
            </div>
          )}

          {checks && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon="event_repeat"
                alert={checks.monthlyFlight?.compliant === false}
                label={CHECK_LABELS.monthlyFlight}
                value={checks.monthlyFlight?.hours != null ? `${checks.monthlyFlight.hours.toFixed(1)}h / ${checks.monthlyFlight.limit}h` : '—'}
                sub={checks.monthlyFlight?.compliant ? 'Cumple' : 'Excede'}
              />
              <StatCard
                icon="today"
                alert={checks.dailyFlight?.compliant === false}
                label={CHECK_LABELS.dailyFlight}
                value={checks.dailyFlight?.hours != null ? `${checks.dailyFlight.hours.toFixed(1)}h / ${checks.dailyFlight.limit}h` : '—'}
                sub={checks.dailyFlight?.compliant ? 'Cumple' : 'Excede'}
              />
              <StatCard
                icon="hourglass_top"
                alert={checks.continuousOperation?.compliant === false}
                label={CHECK_LABELS.continuousOperation}
                value={checks.continuousOperation?.compliant ? 'Sin novedad' : 'Revisar'}
              />
              <StatCard
                icon="bedtime"
                alert={checks.rest?.compliant === false}
                label={CHECK_LABELS.rest}
                value={checks.rest?.compliant ? 'Sin novedad' : 'Revisar'}
              />
            </div>
          )}

          <div
            className={`rounded-[2rem] border p-5 flex items-center gap-3 ${
              open ? 'bg-primary-50/50 border-primary-100' : 'bg-navy-50/40 border-navy-100'
            }`}
          >
            <span className={`material-symbols-outlined text-2xl ${open ? 'text-primary-600' : 'text-navy-300'}`}>
              {open ? 'timer' : 'timer_off'}
            </span>
            {open ? (
              <div>
                <p className="text-sm font-bold text-navy">Período abierto: {TYPE_LABELS[open.type] || open.type}</p>
                <p className="text-xs text-navy-400 mt-0.5">Desde {new Date(open.started_at).toLocaleString('es-CO')}</p>
              </div>
            ) : (
              <p className="text-sm text-navy-400">Sin período de servicio abierto en este momento.</p>
            )}
          </div>
        </>
      )}

      {canSee && (
        <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
          <div className="px-6 py-3.5 border-b border-navy-50 bg-navy-50/30">
            <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Disponibilidad de la tripulación</h3>
            <p className="text-xs text-navy-400 mt-0.5">Quién está disponible ahora, y hasta cuándo dura el descanso obligatorio de quien no lo está.</p>
          </div>
          <div className="p-5">
            {!roster || roster.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 opacity-40 text-center">
                <span className="material-symbols-outlined text-4xl text-navy-300 mb-2">groups</span>
                <p className="text-xs font-black uppercase tracking-widest text-navy-500">Sin tripulación en esta organización</p>
              </div>
            ) : (
              <div className="divide-y divide-navy-50">
                {roster.map((r) => (
                  <div key={r.personId} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="font-bold text-navy">
                      {r.fullName} <span className="text-navy-300 font-medium">({r.role})</span>
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${
                        r.status === 'disponible' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                      }`}
                    >
                      {r.status === 'disponible' ? 'Disponible' : TYPE_LABELS[r.status] || r.status}
                      {r.availableAt && ` hasta ${new Date(r.availableAt).toLocaleString('es-CO')}`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {canSee && (
        <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow p-5">
          <p className="text-xs font-black uppercase text-navy-300 tracking-widest mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Certificación anual
          </p>
          <p className="text-xs text-navy-400 mb-4">§100.535(12) — las horas se calculan del sistema, no se capturan a mano.</p>
          <form onSubmit={certifyPilot} className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 items-end">
            <IconSelectField icon="person" label="Persona a certificar" value={certForm.targetPersonId} onChange={(e) => setCertForm((f) => ({ ...f, targetPersonId: e.target.value }))} required>
              <option value="">Selecciona…</option>
              {(roster || summary || []).map((r) => (
                <option key={r.personId} value={r.personId}>
                  {r.fullName}
                </option>
              ))}
            </IconSelectField>
            <Field
              label="Año"
              type="number"
              value={certForm.year}
              onChange={(e) => setCertForm((f) => ({ ...f, year: e.target.value }))}
              required
            />
            <Button type="submit" disabled={certBusy} className="mb-3">
              {certBusy ? 'Certificando…' : 'Certificar'}
            </Button>
          </form>
          {certMessage && <p className="text-sm text-navy bg-navy-50 rounded-xl px-3 py-2">{certMessage}</p>}

          {certifications.length > 0 && (
            <div className="mt-4 pt-4 border-t border-navy-50">
              <p className="text-xs font-black uppercase text-navy-300 tracking-widest mb-2">Certificaciones existentes</p>
              <div className="space-y-1">
                {certifications.map((c) => {
                  const person = (roster || summary || []).find((r) => r.personId === c.person_id);
                  return (
                    <p key={c.id} className="text-sm text-navy-500">
                      <span className="font-bold text-navy">{c.year}:</span> {Number(c.total_hours).toFixed(1)}h —{' '}
                      {person?.fullName || `persona ${c.person_id.slice(0, 8)}…`}
                    </p>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
