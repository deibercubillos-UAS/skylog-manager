'use client';

// Dashboard del rol PILOTO (plan 78-dashboards-por-rol.md, F0). Componente
// presentacional: recibe el bloque `piloto` de /api/inicio/resumen y lo pinta con
// los widgets sobrios compartidos (widgets.js). "Mi operación y mi cumplimiento":
// horas propias, tiempo de servicio, mis misiones asignadas, certificaciones por
// vencer. No fabrica datos: si algo no existe, muestra su estado vacío honesto.
//
// Nota regulatoria: "servicio hoy" = tiempo transcurrido del período de servicio
// ABIERTO (duty_periods type='servicio'). El umbral de 8 h decide 10 h vs 12 h de
// descanso (100.540(f)); se rotula como umbral, no como tope de servicio.

import { Hero, SectionTitle, StatCard, AlertList, QuickActions, Panel, SERVICE_THRESHOLD_H, hoursSince, fmtTime, isToday, whenLabel, daysUntil, shortDate } from './widgets';

const QUICK = [
  { icon: 'rocket_launch', label: 'Prevuelo / Despacho', href: '/operacion/despacho' },
  { icon: 'edit_note', label: 'Registrar vuelo', href: '/operacion/bitacora' },
  { icon: 'report', label: 'Reportar MOR/VOR', href: '/sms/reportes' },
  { icon: 'partly_cloudy_day', label: 'Meteorología', href: '/operacion/meteorologia' },
];

function hm(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

export default function PilotoDashboard({ fullName, orgName, data }) {
  const d = data || {};
  const hours90d = Number(d.hours90d || 0);
  const flights90dCount = Number(d.flights90dCount || 0);
  const recentFlights = d.recentFlights || [];
  const myMissions = d.myMissions || [];
  const expiring = d.expiringAdditions || [];
  const serviceStart = d.openServiceStartedAt || null;

  const serviceH = serviceStart ? Math.max(0, hoursSince(serviceStart)) : null;
  const nextMission = myMissions[0] || null;
  const todayMission = myMissions.find((m) => isToday(m.scheduled_at)) || null;

  const alerts = [];
  if (serviceH != null && serviceH >= SERVICE_THRESHOLD_H) {
    alerts.push({ sev: 'amber', icon: 'timer', text: `Llevas ${serviceH.toFixed(1)} h de servicio; al cerrar necesitarás 12 h de descanso.`, cta: 'Ver tiempos', href: '/operacion/duty' });
  } else if (serviceH != null && serviceH >= 6) {
    alerts.push({ sev: 'amber', icon: 'timer', text: `Llevas ${serviceH.toFixed(1)} h de servicio — planifica tu descanso.`, cta: 'Ver tiempos', href: '/operacion/duty' });
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
    nextMission
      ? { icon: 'event_available', label: 'Próxima misión', value: isToday(nextMission.scheduled_at) ? `Hoy ${fmtTime(nextMission.scheduled_at)}` : shortDate(nextMission.scheduled_at), sub: nextMission.zone }
      : { icon: 'event_busy', label: 'Próxima misión', value: 'Ninguna', sub: 'Sin misiones programadas' },
    expiring.length > 0
      ? { icon: 'workspace_premium', label: 'Certificaciones', value: `${expiring.length} por vencer`, sub: expiring[0]?.valid_until ? `La próxima en ${daysUntil(expiring[0].valid_until)} días` : null, tone: 'warn' }
      : { icon: 'verified', label: 'Certificaciones', value: 'Al día', sub: 'Sin vencimientos próximos', tone: 'ok' },
  ];

  return (
    <div className="space-y-6">
      <Hero fullName={fullName} roleLabel="Piloto" orgName={orgName} serviceStartedAt={serviceStart} />

      <section>
        <SectionTitle>Mi cumplimiento</SectionTitle>
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

        <Panel title="Mis últimos vuelos" action={{ label: 'Bitácora', href: '/operacion/bitacora' }} isEmpty={recentFlights.length === 0} empty="Aún no has registrado vuelos.">
          <ul className="divide-y divide-navy-50">
            {recentFlights.slice(0, 5).map((f, i) => (
              <li key={i} className={`${i >= 3 ? 'hidden sm:flex' : 'flex'} items-center gap-3 px-5 py-3`}>
                <span className="material-symbols-outlined text-navy-300">flight</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy truncate">{f.mission_type || 'Vuelo'}</p>
                  <p className="text-xs text-navy-400 mt-0.5">{f.visual_condition || '—'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-navy tabular-nums">{hm(Number(f.total_time || 0))}</p>
                  <p className="text-[11px] text-navy-400">{shortDate(f.takeoff_at)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
