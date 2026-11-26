'use client';

// Dashboard del PILOTO INDEPENDIENTE (plan 78-dashboards-por-rol.md, variante de F0).
// El independiente es un `admin` con independent:true (columna PI de la matriz de
// permisos): una organización de una sola persona. Vuela Y administra su propia
// micro-operación — GANA suscripción/plan, flota y mantenimiento, y programación; y
// NO lleva SMS (columna PI del SMS en '—'), por eso no hay bloque SMS ni acción de
// reporte. Usa los widgets sobrios compartidos (widgets.js).

import { Hero, SectionTitle, StatCard, AlertList, QuickActions, Panel, SERVICE_THRESHOLD_H, hoursSince, fmtTime, isToday, whenLabel, daysUntil, shortDate } from './widgets';

const QUICK = [
  { icon: 'rocket_launch', label: 'Prevuelo / Despacho', href: '/operacion/despacho' },
  { icon: 'edit_note', label: 'Registrar vuelo', href: '/operacion/bitacora' },
  { icon: 'event_available', label: 'Programar misión', href: '/operacion/programacion' },
  { icon: 'partly_cloudy_day', label: 'Meteorología', href: '/operacion/meteorologia' },
];

export default function PilotoIndependienteDashboard({ fullName, orgName, data }) {
  const d = data || {};
  const hours90d = Number(d.hours90d || 0);
  const flights90dCount = Number(d.flights90dCount || 0);
  const myMissions = d.myMissions || [];
  const expiring = d.expiringAdditions || [];
  const serviceStart = d.openServiceStartedAt || null;
  const plan = d.plan || null;      // { name, daysLeft, ... }
  const fleet = d.fleet || null;    // { aircraftOperational, aircraftMaintenance, batteries, overdueMaintenance, nextMaintenance }

  const serviceH = serviceStart ? Math.max(0, hoursSince(serviceStart)) : null;
  const todayMission = myMissions.find((m) => isToday(m.scheduled_at)) || null;

  const alerts = [];
  if (plan && plan.daysLeft != null && plan.daysLeft <= 7) {
    alerts.push({ sev: plan.daysLeft < 0 ? 'red' : 'amber', icon: 'credit_card', text: plan.daysLeft < 0 ? `Tu plan venció hace ${Math.abs(plan.daysLeft)} día${Math.abs(plan.daysLeft) !== 1 ? 's' : ''} — renuévalo para no quedar en solo lectura.` : `Tu plan vence en ${plan.daysLeft} día${plan.daysLeft !== 1 ? 's' : ''}.`, cta: 'Ir a suscripción', href: '/suscripcion' });
  }
  if (fleet && fleet.overdueMaintenance > 0) {
    alerts.push({ sev: 'red', icon: 'build', text: `${fleet.overdueMaintenance} tarea${fleet.overdueMaintenance !== 1 ? 's' : ''} de mantenimiento vencida${fleet.overdueMaintenance !== 1 ? 's' : ''}.`, cta: 'Ver mantenimiento', href: '/flota/mantenimiento' });
  }
  if (serviceH != null && serviceH >= SERVICE_THRESHOLD_H) {
    alerts.push({ sev: 'amber', icon: 'timer', text: `Llevas ${serviceH.toFixed(1)} h de servicio; al cerrar necesitarás 12 h de descanso.`, cta: 'Ver tiempos', href: '/operacion/duty' });
  }
  if (todayMission) {
    alerts.push({ sev: 'red', icon: 'rocket_launch', text: `Tienes una misión hoy a las ${fmtTime(todayMission.scheduled_at)} en ${todayMission.zone}.`, cta: 'Ir a despacho', href: '/operacion/despacho' });
  }
  for (const a of expiring) {
    const days = a.valid_until ? daysUntil(a.valid_until) : null;
    if (days == null) continue;
    alerts.push({ sev: days < 0 ? 'red' : 'amber', icon: 'workspace_premium', text: days < 0 ? `Tu habilitación "${a.addition}" venció hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}.` : `Tu habilitación "${a.addition}" vence en ${days} día${days !== 1 ? 's' : ''}.`, cta: 'Ver perfil', href: '/perfil' });
  }

  const kpis = [
    { icon: 'schedule', label: 'Mis horas (90 días)', value: `${hours90d.toFixed(1)} h`, sub: `${flights90dCount} vuelo${flights90dCount !== 1 ? 's' : ''}` },
    serviceStart
      ? { icon: 'timer', label: 'Servicio hoy', value: `${serviceH.toFixed(1)} h`, sub: `Desde las ${fmtTime(serviceStart)}`, tone: serviceH >= SERVICE_THRESHOLD_H ? 'warn' : undefined }
      : { icon: 'timer', label: 'Servicio hoy', value: '—', sub: 'Sin servicio activo' },
    fleet
      ? { icon: 'flightsmode', label: 'Mi flota', value: `${fleet.aircraftOperational ?? 0} operativa${(fleet.aircraftOperational ?? 0) !== 1 ? 's' : ''}`, sub: fleet.aircraftMaintenance > 0 ? `${fleet.aircraftMaintenance} en mantenimiento` : `${fleet.batteries ?? 0} baterías`, tone: fleet.aircraftMaintenance > 0 ? 'warn' : undefined }
      : { icon: 'flightsmode', label: 'Mi flota', value: '—', sub: 'Sin aeronaves registradas' },
    plan
      ? { icon: 'card_membership', label: 'Mi plan', value: plan.name || 'Activo', sub: plan.daysLeft != null ? (plan.daysLeft < 0 ? 'Vencido' : `${plan.daysLeft} días restantes`) : null, tone: plan.daysLeft != null && plan.daysLeft <= 7 ? (plan.daysLeft < 0 ? 'danger' : 'warn') : undefined }
      : { icon: 'card_membership', label: 'Mi plan', value: '—', sub: 'Sin datos del plan' },
  ];

  return (
    <div className="space-y-6">
      <Hero fullName={fullName} roleLabel="Piloto independiente" orgName={orgName} serviceStartedAt={serviceStart} />

      <section>
        <SectionTitle>Mi operación</SectionTitle>
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
        <Panel title="Estado de mi flota" action={{ label: 'Ver flota', href: '/flota/equipo' }} isEmpty={!fleet} empty="Aún no has registrado aeronaves.">
          {fleet && (
            <div className="px-5 py-5">
              <div className="grid grid-cols-3 divide-x divide-navy-100 text-center">
                <FleetStat value={fleet.aircraftOperational ?? 0} label="Operativas" tone="ok" />
                <FleetStat value={fleet.aircraftMaintenance ?? 0} label="Mantenim." tone={fleet.aircraftMaintenance > 0 ? 'warn' : null} />
                <FleetStat value={fleet.batteries ?? 0} label="Baterías" tone={null} />
              </div>
              {fleet.nextMaintenance && (
                <div className="mt-4 flex items-center gap-2 text-xs text-navy-500 border-t border-navy-100 pt-3">
                  <span className="material-symbols-outlined text-[18px] text-navy-300">schedule</span>
                  Próximo mantenimiento: <b className="text-navy font-semibold">{fleet.nextMaintenance.aircraft}</b>
                  <span className="text-navy-400">· {fleet.nextMaintenance.due_date ? shortDate(fleet.nextMaintenance.due_date) : '—'}</span>
                </div>
              )}
            </div>
          )}
        </Panel>

        <Panel title="Mi semana" action={{ label: 'Ver todas', href: '/operacion/programacion' }} isEmpty={myMissions.length === 0} empty="No tienes misiones programadas.">
          <ul className="divide-y divide-navy-50">
            {myMissions.slice(0, 4).map((m, i) => (
              <li key={i} className={`${i >= 3 ? 'hidden sm:flex' : 'flex'} items-start gap-3 px-5 py-3`}>
                <span className="material-symbols-outlined text-navy-300 mt-0.5">event</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy truncate">{m.zone}</p>
                  {m.notes && <p className="text-xs text-navy-400 mt-0.5 truncate">{m.notes}</p>}
                </div>
                <span className="text-[11px] font-semibold text-navy-500 shrink-0 text-right">{whenLabel(m.scheduled_at)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function FleetStat({ value, label, tone }) {
  const col = { ok: 'text-emerald-600', warn: 'text-amber-600' }[tone] || 'text-navy';
  return (
    <div className="px-2">
      <p className={`text-2xl font-black leading-none tabular-nums ${col}`}>{value}</p>
      <p className="text-[11px] text-navy-400 font-medium mt-1.5">{label}</p>
    </div>
  );
}
