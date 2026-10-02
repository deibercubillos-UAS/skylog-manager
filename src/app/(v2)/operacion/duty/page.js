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
import { Field, Button } from '@skylog/ui';
import { SectionHero, StatCard } from '../../_components/SectionHero';

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
      const res = await fetch('/api/duty/context');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
      setContext(data);
      if (data.organizations?.length) setOrganizationId((prev) => prev || data.organizations[0].id);
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
  const isManager = !!currentOrg?.isDutyManager;

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
    if (!isManager) {
      loadStatus();
      return;
    }
    if (organizationId) loadSummary(organizationId);
    if (pilotFilter) loadStatus(pilotFilter, organizationId);
    else setStatus(null);
  }, [context, isManager, organizationId, pilotFilter, loadStatus, loadSummary]);

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
    if (isManager) loadCertifications();
  }, [isManager, loadCertifications]);

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
    if (isManager) loadRoster();
  }, [isManager, loadRoster]);

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
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
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
  if (isManager && !pilotFilter && summary) {
    heroMetric = {
      value: <span className={alertCount > 0 ? 'text-red-300' : 'text-emerald-300'}>{alertCount}</span>,
      label: alertCount > 0 ? 'Pilotos con alerta' : 'Toda la tripulación cumple',
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

      {(context.organizations.length > 1 || isManager) && (
        <div className="bg-white rounded-2xl border border-navy-100 p-4 flex flex-wrap gap-4">
          {context.organizations.length > 1 && (
            <Field as="select" label="Organización" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} className="mb-0">
              {context.organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Field>
          )}
          {isManager && (
            <Field as="select" label="Piloto" value={pilotFilter} onChange={(e) => setPilotFilter(e.target.value)} className="mb-0">
              <option value="">Toda la empresa</option>
              {(summary || []).map((s) => (
                <option key={s.personId} value={s.personId}>
                  {s.fullName}
                </option>
              ))}
            </Field>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      {isManager && !pilotFilter ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard icon="groups" color="primary" label="Pilotos monitoreados" value={summary?.length ?? '—'} />
            <StatCard icon="verified" color="emerald" label="En cumplimiento" value={summary ? summary.filter((s) => !s.compliance?.blocksDispatch).length : '—'} />
            <StatCard icon="warning" color={alertCount > 0 ? 'red' : 'emerald'} label="Con alerta" value={alertCount} />
          </div>

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
                      <td colSpan={4} className="py-12 text-center opacity-40">
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
          {isManager && (
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
                color={checks.monthlyFlight?.compliant ? 'emerald' : 'red'}
                label={CHECK_LABELS.monthlyFlight}
                value={checks.monthlyFlight?.hours != null ? `${checks.monthlyFlight.hours.toFixed(1)}h / ${checks.monthlyFlight.limit}h` : '—'}
                sub={checks.monthlyFlight?.compliant ? 'Cumple' : 'Excede'}
              />
              <StatCard
                icon="today"
                color={checks.dailyFlight?.compliant ? 'emerald' : 'red'}
                label={CHECK_LABELS.dailyFlight}
                value={checks.dailyFlight?.hours != null ? `${checks.dailyFlight.hours.toFixed(1)}h / ${checks.dailyFlight.limit}h` : '—'}
                sub={checks.dailyFlight?.compliant ? 'Cumple' : 'Excede'}
              />
              <StatCard
                icon="hourglass_top"
                color={checks.continuousOperation?.compliant ? 'emerald' : 'red'}
                label={CHECK_LABELS.continuousOperation}
                value={checks.continuousOperation?.compliant ? 'Sin novedad' : 'Revisar'}
              />
              <StatCard
                icon="bedtime"
                color={checks.rest?.compliant ? 'emerald' : 'red'}
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

      {isManager && (
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

      {isManager && (
        <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow p-5">
          <p className="text-xs font-black uppercase text-navy-300 tracking-widest mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Certificación anual
          </p>
          <p className="text-xs text-navy-400 mb-4">§100.535(12) — las horas se calculan del sistema, no se capturan a mano.</p>
          <form onSubmit={certifyPilot} className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 items-end">
            <Field as="select" label="Persona a certificar" value={certForm.targetPersonId} onChange={(e) => setCertForm((f) => ({ ...f, targetPersonId: e.target.value }))} required>
              <option value="">Selecciona…</option>
              {(roster || summary || []).map((r) => (
                <option key={r.personId} value={r.personId}>
                  {r.fullName}
                </option>
              ))}
            </Field>
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
