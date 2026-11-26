'use client';

// Dashboard del JEFE DE PILOTOS (plan 78-dashboards-por-rol.md, F1). Enfoque:
// operación de flota y tripulación. Usa los widgets sobrios compartidos (widgets.js).
// Componente presentacional: recibe el bloque `jefePilotos` de /api/inicio/resumen.
//
// Nota de datos: en el esquema, missions.pic_person_id es NOT NULL, así que NO existe
// "misión sin PIC" — no se inventa esa alerta. dispatches.status ∈ despachado/cerrado
// (no hay estado "por autorizar"): la señal real es "despachos sin cerrar". Las demás
// señales son reales: aeronaves en mantenimiento, pilotos excediendo servicio y
// certificaciones de la tripulación por vencer.

import { Hero, SectionTitle, StatCard, AlertList, QuickActions, Panel, hoursSince, fmtTime, isToday, whenLabel, daysUntil } from './widgets';

const QUICK = [
  { icon: 'event_available', label: 'Programar misión', href: '/operacion/programacion' },
  { icon: 'fact_check', label: 'Despacho', href: '/operacion/despacho' },
  { icon: 'timer', label: 'Tiempos de servicio', href: '/operacion/duty' },
  { icon: 'flightsmode', label: 'Ver flota', href: '/flota/equipo' },
];

const CREW_STATUS = {
  servicio: { dot: 'bg-emerald-500', label: 'En servicio' },
  descanso: { dot: 'bg-navy-300', label: 'En descanso' },
  disponible: { dot: 'bg-amber-500', label: 'Disponible' },
};

export default function JefePilotosDashboard({ fullName, orgName, data }) {
  const d = data || {};
  const flightsThisMonth = Number(d.flightsThisMonth || 0);
  const trend = d.flightsTrendPct ?? null;
  const missionsThisWeek = Number(d.missionsThisWeek || 0);
  const fleet = d.fleet || null;
  const pilotsOnDuty = Number(d.pilotsOnDuty || 0);
  const pilotsTotal = Number(d.pilotsTotal || 0);
  const weekMissions = d.weekMissions || [];
  const crewDuty = d.crewDuty || [];
  const dispatchesOpen = Number(d.dispatchesOpen || 0);
  const pilotsOverLimit = d.pilotsOverLimit || [];
  const crewCertsExpiring = d.crewCertsExpiring || [];

  const alerts = [];
  if (dispatchesOpen > 0) {
    alerts.push({ sev: 'amber', icon: 'fact_check', text: `${dispatchesOpen} despacho${dispatchesOpen !== 1 ? 's' : ''} sin cerrar.`, cta: 'Ver despachos', href: '/operacion/despacho' });
  }
  for (const p of pilotsOverLimit) {
    alerts.push({ sev: 'red', icon: 'timer', text: `${p.name} lleva ${Number(p.serviceH).toFixed(1)} h de servicio — revisa su descanso.`, cta: 'Ver tiempos', href: '/operacion/duty' });
  }
  if (fleet && fleet.aircraftMaintenance > 0) {
    alerts.push({ sev: 'amber', icon: 'build', text: `${fleet.aircraftMaintenance} aeronave${fleet.aircraftMaintenance !== 1 ? 's' : ''} en mantenimiento.`, cta: 'Ver flota', href: '/flota/equipo' });
  }
  for (const c of crewCertsExpiring) {
    const days = c.valid_until ? daysUntil(c.valid_until) : null;
    if (days == null) continue;
    alerts.push({ sev: days < 0 ? 'red' : 'amber', icon: 'workspace_premium', text: days < 0 ? `${c.name}: habilitación "${c.addition}" vencida.` : `${c.name}: habilitación "${c.addition}" vence en ${days} día${days !== 1 ? 's' : ''}.`, cta: 'Ver tripulación', href: '/flota/tripulacion' });
  }

  const kpis = [
    { icon: 'flight_takeoff', label: 'Vuelos del mes', value: flightsThisMonth, sub: trend != null ? `${trend >= 0 ? '+' : ''}${trend}% vs. mes anterior` : 'de toda la operación', tone: trend != null && trend < 0 ? 'warn' : undefined },
    { icon: 'event_available', label: 'Misiones (semana)', value: missionsThisWeek, sub: missionsThisWeek === 0 ? 'Sin programar' : 'Programadas' },
    fleet
      ? { icon: 'flightsmode', label: 'Flota', value: `${fleet.aircraftOperational ?? 0} operativa${(fleet.aircraftOperational ?? 0) !== 1 ? 's' : ''}`, sub: fleet.aircraftMaintenance > 0 ? `${fleet.aircraftMaintenance} en mantenimiento` : `${fleet.batteries ?? 0} baterías`, tone: fleet.aircraftMaintenance > 0 ? 'warn' : undefined }
      : { icon: 'flightsmode', label: 'Flota', value: '—', sub: 'Sin aeronaves' },
    { icon: 'groups', label: 'Pilotos en servicio', value: `${pilotsOnDuty}/${pilotsTotal}`, sub: pilotsOnDuty > 0 ? 'Operando ahora' : 'Ninguno activo', tone: pilotsOnDuty > 0 ? 'ok' : undefined },
  ];

  return (
    <div className="space-y-6">
      <Hero fullName={fullName} roleLabel="Jefe de Pilotos" orgName={orgName} highlight={{ label: 'Pilotos en servicio', value: `${pilotsOnDuty}/${pilotsTotal}`, sub: 'operando ahora' }} />

      <section>
        <SectionTitle>Estado de la operación</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">{kpis.map((k) => <StatCard key={k.label} {...k} />)}</div>
      </section>

      <section>
        <SectionTitle>Requiere tu atención</SectionTitle>
        <AlertList alerts={alerts} />
      </section>

      <section>
        <SectionTitle>Acciones rápidas</SectionTitle>
        <QuickActions actions={QUICK} />
      </section>

      <div className="grid lg:grid-cols-2 gap-5">
        <Panel title="Misiones de la semana" action={{ label: 'Calendario', href: '/operacion/programacion' }} isEmpty={weekMissions.length === 0} empty="No hay misiones programadas esta semana.">
          <ul className="divide-y divide-navy-50">
            {weekMissions.slice(0, 4).map((m, i) => (
              <li key={i} className={`${i >= 3 ? 'hidden sm:flex' : 'flex'} items-start gap-3 px-5 py-3`}>
                <span className="material-symbols-outlined text-navy-300 mt-0.5">event</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy truncate">{m.zone}</p>
                  <p className="text-xs text-navy-400 mt-0.5 truncate">{m.pic ? `PIC: ${m.pic}` : 'Sin PIC'}{m.aircraft ? ` · ${m.aircraft}` : ''}</p>
                </div>
                <span className="text-[11px] font-semibold text-navy-500 shrink-0 text-right">{whenLabel(m.scheduled_at)}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Tripulación en servicio" action={{ label: 'Tiempos', href: '/operacion/duty' }} isEmpty={crewDuty.length === 0} empty="Nadie en servicio ahora.">
          <ul className="divide-y divide-navy-50">
            {crewDuty.slice(0, 5).map((c, i) => {
              const st = CREW_STATUS[c.status] || CREW_STATUS.disponible;
              const h = c.startedAt ? hoursSince(c.startedAt) : null;
              return (
                <li key={i} className={`${i >= 3 ? 'hidden sm:flex' : 'flex'} items-center gap-3 px-5 py-3`}>
                  <span className={`inline-block size-2 rounded-full shrink-0 ${st.dot}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy truncate">{c.name}</p>
                    <p className="text-xs text-navy-400 mt-0.5">{st.label}</p>
                  </div>
                  {h != null && <span className="text-sm font-bold text-navy tabular-nums shrink-0">{h.toFixed(1)} h</span>}
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
