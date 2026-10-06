'use client';

// BitaFly V2.0 — Dashboard principal (/inicio). Vuelve al lenguaje visual
// moderno propio de V2 (degradados, tarjetas de color, más redondeado) —
// pedido explícito del usuario: "continuemos con la mejora del dashboard...
// con el enfoque que llevábamos la V2.0, que era más amigable más moderna".
// Ya no reutiliza los componentes planos de v1 (@/components/PageHero/
// KPIStrip, por diseño minimalista) — vuelve a componentes propios de V2,
// con los mismos datos reales ya wireados (flights/missions/sms_cases).
//
// Diferencias honestas frente a v1 (no se fabrica lo que no existe en V2):
// - Sin anillo "Flota lista" en el hero — Flota no existe todavía en V2;
//   en su lugar, la próxima misión programada (real, de Programación).
// - El panel lateral usa "Casos SMS abiertos" (real) en vez del escáner de
//   alertas de flota de v1 (batería/mantenimiento/DJI, Flota no existe aún).
// - La tabla de actividad reciente usa las columnas reales que hoy tiene
//   `flights` en V2 (sin aeronave ni N° de misión, ver flights_minimal.sql).

import { useEffect, useState } from 'react';
import Link from 'next/link';

const MONTH_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const ROLE_LABELS = { admin: 'Gerente General', superadmin: 'Superadmin', jefe_pilotos: 'Jefe de Pilotos', gerente_sms: 'Gerente SMS', piloto: 'Piloto' };
const ROLE_ICONS = { admin: 'shield_person', jefe_pilotos: 'supervisor_account', gerente_sms: 'health_and_safety', piloto: 'flight_takeoff' };

function last6MonthsChart(flights) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: MONTH_LABELS[d.getMonth()], count: 0 };
  });
  for (const f of flights) {
    const d = new Date(f.takeoff_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find((x) => x.key === key);
    if (m) m.count += 1;
  }
  return months;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime24(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function greetingForHour(h) {
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

// Hero moderno — degradado navy + luces decorativas + saludo por hora +
// badge de rol + métrica destacada a la derecha (mismo lenguaje visual que
// el resto de V2 ya lleva en Operación/SMS/Capacitación).
function DashboardHero({ orgName, role, highlight }) {
  const [now] = useState(() => new Date());
  const today = now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-navy via-navy to-[#0f1420] text-white p-6 md:p-9 shadow-lg shadow-navy-900/20">
      <div className="absolute -right-16 -top-24 w-72 h-72 rounded-full bg-primary/30 blur-3xl -z-10" />
      <div className="absolute -left-20 -bottom-24 w-56 h-56 rounded-full bg-primary-400/10 blur-3xl -z-10" />
      <div className="absolute inset-0 -z-20 opacity-[0.04] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-primary-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
            {greetingForHour(now.getHours())}
          </p>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-1.5 text-white">{orgName}</h1>
          <div className="flex flex-wrap items-center gap-2.5 mt-3.5">
            <span className="inline-flex items-center gap-1.5 bg-primary/90 text-white text-xs font-bold uppercase tracking-wide px-3 py-1.5 rounded-full shadow-sm shadow-primary-900/40">
              <span className="material-symbols-outlined text-sm">{ROLE_ICONS[role] || 'person'}</span>
              {ROLE_LABELS[role] || role || '—'}
            </span>
            <span className="text-xs text-navy-300 capitalize">{today}</span>
          </div>
        </div>

        {highlight && (
          <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 px-5 py-3.5 shrink-0">
            <p className="text-[11px] font-bold uppercase tracking-wide text-navy-300">{highlight.label}</p>
            <p className="text-3xl font-black text-white mt-0.5 leading-none">{highlight.value}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, hint, children, accent = 'primary' }) {
  const dot = { primary: 'bg-primary', emerald: 'bg-emerald-500', navy: 'bg-navy-400' }[accent] || 'bg-primary';
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-bold text-navy uppercase tracking-wide flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dot}`} />
          {title}
        </h2>
        {hint && <span className="text-xs text-navy-300">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

// Tarjeta KPI con lavado de color de fondo + tile de ícono a color sólido —
// mismo patrón ya usado en Operación/SMS, en vez de la franja plana de v1.
function StatCard({ icon, color, label, value, sub }) {
  const palette = {
    primary: { wash: 'from-primary-50 to-white', tile: 'bg-primary text-white', ring: 'hover:ring-primary-200' },
    blue: { wash: 'from-blue-50 to-white', tile: 'bg-blue-500 text-white', ring: 'hover:ring-blue-200' },
    violet: { wash: 'from-violet-50 to-white', tile: 'bg-violet-500 text-white', ring: 'hover:ring-violet-200' },
    emerald: { wash: 'from-emerald-50 to-white', tile: 'bg-emerald-500 text-white', ring: 'hover:ring-emerald-200' },
    red: { wash: 'from-red-50 to-white', tile: 'bg-red-500 text-white', ring: 'hover:ring-red-200' },
  }[color] || { wash: 'from-navy-50 to-white', tile: 'bg-navy text-white', ring: 'hover:ring-navy-200' };
  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${palette.wash} border border-navy-100 rounded-2xl p-4 ring-1 ring-transparent ${palette.ring} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${palette.tile}`}>
          <span className="material-symbols-outlined text-xl">{icon}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-navy-400 font-medium truncate">{label}</p>
          <p className="text-2xl font-black text-navy leading-tight tracking-tight">{value}</p>
        </div>
      </div>
      {sub && <p className="text-[11px] text-navy-300 mt-2">{sub}</p>}
    </div>
  );
}

export default function V2Home() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [flights, setFlights] = useState([]);
  const [nextMission, setNextMission] = useState(null);
  const [openCases, setOpenCases] = useState([]);
  const [casesRestricted, setCasesRestricted] = useState(false); // el detalle de casos es solo del Gerente SMS

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

    fetch(`/api/flights?organizationId=${organizationId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setFlights(data?.flights || []))
      .catch(() => setFlights([]));

    const now = new Date();
    const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
    fetch(`/api/missions?organizationId=${organizationId}&from=${now.toISOString()}&to=${weekAhead.toISOString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const upcoming = (data?.missions || []).filter((m) => m.status !== 'cancelada');
        setNextMission(upcoming[0] || null);
      })
      .catch(() => setNextMission(null));

    fetch(`/api/sms/cases?organizationId=${organizationId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setCasesRestricted(!!data?.restricted);
        setOpenCases((data?.cases || []).filter((c) => c.status !== 'cerrado'));
      })
      .catch(() => setOpenCases([]));
  }, [organizationId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-32">
        <div className="text-center space-y-3">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-black text-navy-300 uppercase tracking-widest animate-pulse">Cargando panel…</p>
        </div>
      </div>
    );
  }

  if (error || !context?.personId) {
    return (
      <div className="max-w-lg py-10">
        <p className="text-sm text-primary-800 bg-primary-50 border border-primary-100 rounded-xl p-3">
          {error || 'Esta cuenta no tiene todavía un registro de Persona vinculado.'}
        </p>
      </div>
    );
  }

  const currentOrg = context.organizations.find((o) => o.id === organizationId);

  const chart = last6MonthsChart(flights);
  const counts = chart.map((m) => m.count);
  const maxVal = Math.max(...counts, 1);
  const lastTwo = counts.slice(-2);
  const flightTrend = lastTwo.length === 2 && lastTwo[0] > 0 ? Math.round(((lastTwo[1] - lastTwo[0]) / lastTwo[0]) * 100) : null;

  const totalHours = flights.reduce((sum, f) => sum + Number(f.total_time || 0), 0);
  const flightsThisMonth = chart[chart.length - 1]?.count || 0;
  const recentActivity = [...flights].slice(0, 8);

  let nextMissionLabel = null;
  if (nextMission) {
    const d = new Date(nextMission.scheduled_at);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    nextMissionLabel = `${isToday ? 'Hoy' : d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} · ${formatTime24(nextMission.scheduled_at)}`;
  }

  const chartLabel = `Actividad de vuelo — últimos 6 meses. ${chart.map((m) => `${m.label}: ${m.count} vuelo${m.count !== 1 ? 's' : ''}`).join(', ')}.`;

  return (
    <div className="space-y-6">
      <DashboardHero
        orgName={currentOrg?.name || 'Resumen de tu operación'}
        role={currentOrg?.role}
        highlight={{ label: 'Vuelos este mes', value: flightsThisMonth }}
      />

      {context.organizations.length > 1 && (
        <select
          className="block w-full sm:w-auto px-3 py-2 rounded-lg border border-navy-200 text-sm bg-white"
          value={organizationId}
          onChange={(e) => setOrganizationId(e.target.value)}
        >
          {context.organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.role})
            </option>
          ))}
        </select>
      )}

      <Section title="Cumplimiento" hint="Vuelos, misiones y SMS — en vivo">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon="schedule" color="primary" label="Horas de Vuelo" value={`${totalHours.toFixed(1)}h`} />
          <StatCard icon="flight_takeoff" color="blue" label="Vuelos del Mes" value={flightsThisMonth} sub={flightTrend !== null ? `${flightTrend >= 0 ? '+' : ''}${flightTrend}% vs. mes ant.` : null} />
          <StatCard icon="event_available" color="violet" label="Misiones (7 días)" value={nextMission ? 1 : 0} sub={nextMissionLabel || 'Sin misiones programadas'} />
          <StatCard icon="health_and_safety" color={casesRestricted ? 'navy' : openCases.length > 0 ? 'red' : 'emerald'} label="Casos SMS Abiertos" value={casesRestricted ? '—' : openCases.length} sub={casesRestricted ? 'Solo el Gerente SMS' : null} />
        </div>
      </Section>

      {/* Gráfico mensual + casos SMS */}
      <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow flex flex-col lg:flex-row">
        <figure className="lg:flex-[1.5] p-5 md:p-6 flex flex-col h-[220px] md:h-[240px]" aria-label={chartLabel}>
          <figcaption className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xs font-black uppercase text-navy-300 tracking-[0.15em]">Vuelos por Mes</h3>
              <span className="text-xs font-bold text-navy-300 mt-0.5 inline-block">Últimos 6 meses</span>
            </div>
            {flightTrend !== null && (
              <span
                className={`text-xs font-black flex items-center gap-1 px-2 py-1 rounded-lg ${
                  flightTrend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{flightTrend >= 0 ? 'trending_up' : 'trending_down'}</span>
                {flightTrend >= 0 ? '+' : ''}
                {flightTrend}%
              </span>
            )}
          </figcaption>

          <div className="flex-1 flex items-end justify-around gap-1 md:gap-2.5 px-1 border-b border-navy-50 pb-3" role="img" aria-hidden="true">
            {chart.map((m, i) => {
              const barHeight = Math.round((m.count / maxVal) * 100);
              const isCurrent = i === chart.length - 1;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative h-full justify-end" title={`${m.label}: ${m.count} vuelo${m.count !== 1 ? 's' : ''}`}>
                  {m.count > 0 && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
                      <span className="md:hidden text-[10px] font-black text-primary-600">{m.count}</span>
                      <span className="hidden md:block bg-navy text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">{m.count}</span>
                    </div>
                  )}
                  <div
                    className={`w-full max-w-[36px] rounded-t-lg transition-all duration-500 ease-out shadow-sm ${
                      m.count > 0 ? (isCurrent ? 'bg-gradient-to-t from-primary-600 to-primary-400 shadow-primary-900/20' : 'bg-gradient-to-t from-navy-200 to-navy-100') : 'bg-navy-50'
                    }`}
                    style={{ height: m.count > 0 ? `${barHeight}%` : '3px' }}
                  />
                  <span className={`text-xs font-black uppercase ${isCurrent ? 'text-navy' : 'text-navy-300'}`}>{m.label}</span>
                </div>
              );
            })}
          </div>
        </figure>

        <div className="hidden lg:block w-px bg-navy-50 my-6" />
        <div className="lg:hidden h-px bg-navy-50 mx-5" />

        <section aria-label="Casos SMS abiertos" className="lg:flex-1 p-5 md:p-6 flex flex-col h-[220px] md:h-[240px]">
          <h3 className="text-xs font-black uppercase text-navy-300 tracking-[0.15em] mb-4 flex items-center gap-2">
            Casos SMS Abiertos
            {openCases.length > 0 && <span className="text-[10px] font-black text-white bg-primary rounded-full px-2 py-0.5">{openCases.length}</span>}
          </h3>
          <div className="space-y-1.5 overflow-y-auto pr-1 flex-1">
            {openCases.length > 0 ? (
              openCases.slice(0, 6).map((c) => (
                <div key={c.id} className="flex items-start gap-2.5 py-1.5 border-b border-navy-50 last:border-b-0">
                  <span className="size-1.5 rounded-full mt-1.5 shrink-0 bg-amber-500" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-navy leading-tight truncate">{c.sms_reports?.description || 'Caso SMS'}</p>
                    <p className="text-xs text-navy-300 font-medium mt-0.5">{c.status}</p>
                  </div>
                </div>
              ))
            ) : casesRestricted ? (
              <div className="h-full flex flex-col items-center justify-center opacity-40 text-center">
                <span className="material-symbols-outlined text-3xl text-navy-300 mb-2">lock</span>
                <p className="text-xs text-navy-300 font-medium">El detalle de los casos lo ve el Gerente SMS</p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-40 text-center">
                <span className="material-symbols-outlined text-3xl text-emerald-500 mb-2">verified</span>
                <p className="text-xs font-black uppercase tracking-widest text-navy-700">Operación Segura</p>
                <p className="text-xs text-navy-300 font-medium mt-1">Sin casos abiertos</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Actividad reciente */}
      <section aria-label="Actividad reciente de vuelo" className="hidden md:block bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="px-6 py-3.5 border-b border-navy-50 flex justify-between items-center bg-navy-50/30">
          <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Actividad Reciente</h3>
          <Link href="/operacion/bitacora" className="text-xs font-black text-primary-600 uppercase hover:underline">
            Ver Historial
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-navy-50/50 text-xs font-black text-navy-300 uppercase tracking-widest">
                <th className="px-6 py-2.5">Fecha</th>
                <th className="px-6 py-2.5">Piloto</th>
                <th className="px-6 py-2.5">Condición</th>
                <th className="px-6 py-2.5">Duración</th>
                <th className="px-6 py-2.5 text-right">Estatus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {recentActivity.length > 0 ? (
                recentActivity.map((f) => (
                  <tr key={f.id} className="hover:bg-navy-50/40 transition-all">
                    <td className="px-6 py-2.5 text-xs font-bold text-navy-500">{formatDate(f.takeoff_at)}</td>
                    <td className="px-6 py-2.5 text-xs font-bold text-navy">{f.pilot?.full_name || '—'}</td>
                    <td className="px-6 py-2.5 text-xs font-bold text-navy-500">{f.visual_condition || '—'}</td>
                    <td className="px-6 py-2.5 text-xs font-black text-navy-700 tabular-nums">{Number(f.total_time).toFixed(1)}h</td>
                    <td className="px-6 py-2.5 text-right">
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase border border-emerald-100">Registrado</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center opacity-40">
                    <span className="material-symbols-outlined text-5xl text-navy-300 mb-3 block">flight_takeoff</span>
                    <p className="text-xs font-black uppercase tracking-widest text-navy-500">Sin actividad operativa</p>
                    <p className="text-xs text-navy-300 font-medium mt-1">Los vuelos registrados aparecerán aquí</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Actividad reciente — mobile */}
      <section aria-label="Actividad reciente de vuelo" className="md:hidden bg-white rounded-[2rem] border border-navy-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-navy-50 flex justify-between items-center bg-navy-50/30">
          <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Actividad Reciente</h3>
          <Link href="/operacion/bitacora" className="text-xs font-black text-primary-600 uppercase hover:underline">
            Ver todo
          </Link>
        </div>
        {recentActivity.length > 0 ? (
          <ul className="divide-y divide-navy-50">
            {recentActivity.map((f) => (
              <li key={f.id} className="px-5 py-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black text-navy truncate">{f.pilot?.full_name || '—'}</p>
                  <p className="text-xs text-navy-300 font-medium mt-0.5">{formatDate(f.takeoff_at)}</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase border border-emerald-100 shrink-0">
                  {Number(f.total_time).toFixed(1)}h
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center opacity-40">
            <span className="material-symbols-outlined text-5xl text-navy-300 mb-3">flight_takeoff</span>
            <p className="text-xs font-black uppercase tracking-widest text-navy-500">Sin actividad operativa</p>
          </div>
        )}
      </section>
    </div>
  );
}
