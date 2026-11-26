'use client';

// Dashboard del GERENTE GENERAL (admin) — "dirección + administración"
// (plan 78-dashboards-por-rol.md, F3). Único rol con finanzas/plan y gestión de
// miembros. Usa los widgets sobrios compartidos. Recibe el bloque `gerenteGeneral`.
//
// Honestidad de datos (V/Q3): el Gerente General NO cuenta contra el límite de pilotos
// (CLAUDE.md), así que `pilotsUsed` = pilotos con rol `piloto`. El límite viene del plan
// (planLimits); `null` = ilimitado. No se fabrica un "% de cumplimiento": la salud se
// arma con conteos reales (operación, seguridad, flota).

import { Hero, SectionTitle, StatCard, AlertList, QuickActions, Panel, whenLabel, fmtTime } from './widgets';

const QUICK = [
  { icon: 'group', label: 'Personas', href: '/flota/tripulacion' },
  { icon: 'workspace_premium', label: 'Suscripción', href: '/suscripcion' },
  { icon: 'description', label: 'Reportes', href: '/reportes' },
  { icon: 'apartment', label: 'Organización', href: '/organizacion' },
];

function HealthRow({ icon, label, value, note, tone }) {
  const dot = tone === 'warn' ? 'bg-amber-500' : tone === 'danger' ? 'bg-red-500' : 'bg-emerald-500';
  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <span className="material-symbols-outlined text-navy-300">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-navy">{label}</p>
        {note && <p className="text-xs text-navy-400 mt-0.5">{note}</p>}
      </div>
      <span className="inline-flex items-center gap-1.5 shrink-0">
        <span className={`inline-block size-2 rounded-full ${dot}`} />
        <span className="text-sm font-bold text-navy tabular-nums">{value}</span>
      </span>
    </li>
  );
}

export default function GerenteGeneralDashboard({ fullName, orgName, data }) {
  const d = data || {};
  const flightsThisMonth = Number(d.flightsThisMonth || 0);
  const missionsThisWeek = Number(d.missionsThisWeek || 0);
  const fleet = d.fleet || null;
  const plan = d.plan || null;
  const pilotsUsed = Number(d.pilotsUsed || 0);
  const pilotsLimit = d.pilotsLimit ?? null; // null = ilimitado
  const joinRequests = Number(d.joinRequests || 0);
  const reportsToAnalyze = Number(d.reportsToAnalyze || 0);
  const casesOpen = Number(d.casesOpen || 0);
  const morToFile = Number(d.morToFile || 0);
  const recentActivity = d.recentActivity || [];

  const atPilotLimit = pilotsLimit != null && pilotsUsed >= pilotsLimit;

  const alerts = [];
  if (plan && plan.daysLeft != null && plan.daysLeft <= 7) {
    alerts.push({ sev: plan.daysLeft <= 3 ? 'red' : 'amber', icon: 'workspace_premium', text: plan.daysLeft < 0 ? `Tu plan ${plan.name} está vencido.` : `Tu plan ${plan.name} vence en ${plan.daysLeft} día${plan.daysLeft !== 1 ? 's' : ''}.`, cta: 'Renovar', href: '/suscripcion' });
  }
  if (atPilotLimit) {
    alerts.push({ sev: 'amber', icon: 'group', text: `Alcanzaste el límite de ${pilotsLimit} piloto${pilotsLimit !== 1 ? 's' : ''} de tu plan.`, cta: 'Ampliar plan', href: '/suscripcion' });
  }
  if (joinRequests > 0) {
    alerts.push({ sev: 'amber', icon: 'person_add', text: `${joinRequests} solicitud${joinRequests !== 1 ? 'es' : ''} de ingreso por aprobar.`, cta: 'Revisar', href: '/flota/tripulacion' });
  }
  if (morToFile > 0) {
    alerts.push({ sev: 'red', icon: 'gavel', text: `${morToFile} MOR sin radicar ante la Aerocivil.`, cta: 'Ver seguridad', href: '/sms/reportes' });
  }
  if (fleet && fleet.aircraftMaintenance > 0) {
    alerts.push({ sev: 'amber', icon: 'build', text: `${fleet.aircraftMaintenance} aeronave${fleet.aircraftMaintenance !== 1 ? 's' : ''} en mantenimiento.`, cta: 'Ver flota', href: '/flota/equipo' });
  }

  const kpis = [
    { icon: 'flight_takeoff', label: 'Vuelos del mes', value: flightsThisMonth, sub: 'de toda la operación' },
    fleet
      ? { icon: 'flightsmode', label: 'Flota operativa', value: `${fleet.aircraftOperational ?? 0}`, sub: fleet.aircraftMaintenance > 0 ? `${fleet.aircraftMaintenance} en mantenimiento` : `${fleet.batteries ?? 0} baterías`, tone: fleet.aircraftMaintenance > 0 ? 'warn' : undefined }
      : { icon: 'flightsmode', label: 'Flota operativa', value: '—', sub: 'Sin aeronaves' },
    plan
      ? { icon: 'workspace_premium', label: 'Plan', value: plan.name, sub: plan.daysLeft != null ? `${plan.daysLeft} día${plan.daysLeft !== 1 ? 's' : ''} restantes` : 'Activo', tone: plan.daysLeft != null && plan.daysLeft <= 3 ? 'danger' : plan.daysLeft != null && plan.daysLeft <= 7 ? 'warn' : undefined }
      : { icon: 'workspace_premium', label: 'Plan', value: '—', sub: 'Sin suscripción' },
    { icon: 'group', label: 'Pilotos', value: pilotsLimit != null ? `${pilotsUsed}/${pilotsLimit}` : `${pilotsUsed}`, sub: pilotsLimit != null ? 'de tu plan' : 'sin límite', tone: atPilotLimit ? 'warn' : undefined },
  ];

  const pilotPct = pilotsLimit ? Math.min(100, Math.round((pilotsUsed / pilotsLimit) * 100)) : 0;

  return (
    <div className="space-y-6">
      <Hero fullName={fullName} roleLabel="Gerente General" orgName={orgName} highlight={plan ? { label: 'Plan', value: plan.name, sub: plan.daysLeft != null ? `${plan.daysLeft} días restantes` : 'activo' } : { label: 'Vuelos del mes', value: flightsThisMonth, sub: 'operación' }} />

      <section>
        <SectionTitle>Dirección</SectionTitle>
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
        <Panel title="Salud de la organización" action={{ label: 'Reportes', href: '/reportes' }}>
          <ul className="divide-y divide-navy-50">
            <HealthRow icon="flight_takeoff" label="Operación" note={`${missionsThisWeek} misión${missionsThisWeek !== 1 ? 'es' : ''} esta semana`} value={`${flightsThisMonth} vuelos`} tone="ok" />
            <HealthRow icon="health_and_safety" label="Seguridad" note={`${casesOpen} caso${casesOpen !== 1 ? 's' : ''} abierto${casesOpen !== 1 ? 's' : ''}`} value={reportsToAnalyze === 0 && morToFile === 0 ? 'Al día' : `${reportsToAnalyze + morToFile} pend.`} tone={morToFile > 0 ? 'danger' : reportsToAnalyze > 0 ? 'warn' : 'ok'} />
            <HealthRow icon="flightsmode" label="Flota" note={fleet ? `${fleet.batteries ?? 0} baterías` : 'sin registrar'} value={fleet ? `${fleet.aircraftOperational} operativa${fleet.aircraftOperational !== 1 ? 's' : ''}` : '—'} tone={fleet && fleet.aircraftMaintenance > 0 ? 'warn' : 'ok'} />
          </ul>
        </Panel>

        <Panel title="Uso del plan" action={{ label: 'Suscripción', href: '/suscripcion' }}>
          <div className="px-5 py-4 space-y-4">
            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-sm font-semibold text-navy">Pilotos</span>
                <span className="text-sm font-bold text-navy tabular-nums">{pilotsLimit != null ? `${pilotsUsed} / ${pilotsLimit}` : `${pilotsUsed} · sin límite`}</span>
              </div>
              {pilotsLimit != null && (
                <div className="h-2 rounded-full bg-navy-100 overflow-hidden">
                  <div className={`h-full rounded-full ${atPilotLimit ? 'bg-amber-400' : 'bg-primary'}`} style={{ width: `${pilotPct}%` }} />
                </div>
              )}
              <p className="text-[11px] text-navy-400 mt-1">El Gerente General no cuenta contra el límite.</p>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-navy-50">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">Plan</p>
                <p className="text-lg font-black text-navy mt-0.5">{plan?.name || '—'}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-navy-400">Vence en</p>
                <p className={`text-lg font-black mt-0.5 tabular-nums ${plan && plan.daysLeft != null && plan.daysLeft <= 7 ? 'text-amber-600' : 'text-navy'}`}>{plan?.daysLeft != null ? `${plan.daysLeft} días` : '—'}</p>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {recentActivity.length > 0 && (
        <Panel title="Actividad reciente" action={{ label: 'Bitácora', href: '/operacion/bitacora' }}>
          <ul className="divide-y divide-navy-50">
            {recentActivity.slice(0, 5).map((f, i) => (
              <li key={i} className={`${i >= 3 ? 'hidden sm:flex' : 'flex'} items-center gap-3 px-5 py-3`}>
                <span className="material-symbols-outlined text-navy-300">flight</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy truncate">{f.pilot?.full_name || 'Vuelo registrado'}</p>
                  <p className="text-xs text-navy-400 mt-0.5">{f.takeoff_at ? whenLabel(f.takeoff_at) : ''}{f.takeoff_at ? ` · ${fmtTime(f.takeoff_at)}` : ''}</p>
                </div>
                {f.total_time != null && <span className="text-sm font-bold text-navy tabular-nums shrink-0">{Number(f.total_time).toFixed(1)} h</span>}
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
