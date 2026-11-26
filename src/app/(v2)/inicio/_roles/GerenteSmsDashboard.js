'use client';

// Dashboard del GERENTE SMS (plan 78-dashboards-por-rol.md, F2). Enfoque:
// seguridad operacional (RAC 219 SMS). Usa los widgets sobrios compartidos.
// Componente presentacional: recibe el bloque `gerenteSms` de /api/inicio/resumen.
//
// Honestidad de datos (reglas V/Q3, docs SMS):
// - sms_reports.route ∈ mor/vor/rac114. "MOR por radicar" = route='mor' y filed_at NULL.
//   NO se fabrica el plazo IRIS exacto: se muestra el tiempo transcurrido desde el evento.
// - "Reporte por analizar" = analyzed_at NULL (y requires_manager_analysis).
// - "Acción correctiva vencida" = sms_case_actions con done_at NULL y due_date < hoy.
// - El SPI "fuera de meta" exige el cálculo mensual (otro módulo); aquí el panel SPI
//   lista los indicadores reales sin inventar un veredicto de meta.

import { Hero, SectionTitle, StatCard, AlertList, QuickActions, Panel, shortDate, whenLabel, daysUntil } from './widgets';

const QUICK = [
  { icon: 'fact_check', label: 'Analizar reporte', href: '/sms/reportes' },
  { icon: 'cases', label: 'Casos', href: '/sms/casos' },
  { icon: 'monitoring', label: 'Indicadores (SPI)', href: '/sms/indicadores' },
  { icon: 'target', label: 'Objetivos', href: '/sms/objetivos' },
];

// Etiqueta y tono del tipo de reporte. MOR es reportable a la Aerocivil (más crítico).
const ROUTE = {
  mor: { label: 'MOR', chip: 'bg-amber-50 text-amber-700' },
  vor: { label: 'VOR', chip: 'bg-navy-100 text-navy-600' },
  rac114: { label: 'RAC 114', chip: 'bg-navy-100 text-navy-600' },
};

function daysSince(iso) {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export default function GerenteSmsDashboard({ fullName, orgName, data }) {
  const d = data || {};
  const reportsToAnalyze = Number(d.reportsToAnalyze || 0);
  const casesOpen = Number(d.casesOpen || 0);
  const morToFile = d.morToFile || [];
  const actionsOverdue = d.actionsOverdue || [];
  const inbox = d.inbox || [];
  const spi = d.spi || [];
  const committeeNext = d.committeeNext || null;

  const alerts = [];
  for (const m of morToFile) {
    const days = daysSince(m.occurred_at);
    alerts.push({ sev: 'red', icon: 'gavel', text: `MOR sin radicar ante la Aerocivil${m.event_label ? `: ${m.event_label}` : ''}${days != null ? ` (evento hace ${days} día${days !== 1 ? 's' : ''})` : ''}.`, cta: 'Radicar', href: '/sms/reportes' });
  }
  if (reportsToAnalyze > 0) {
    alerts.push({ sev: 'amber', icon: 'fact_check', text: `${reportsToAnalyze} reporte${reportsToAnalyze !== 1 ? 's' : ''} sin analizar.`, cta: 'Analizar', href: '/sms/reportes' });
  }
  for (const a of actionsOverdue) {
    alerts.push({ sev: 'red', icon: 'assignment_late', text: `Acción correctiva vencida${a.due_date ? ` (venció ${shortDate(a.due_date)})` : ''}: ${a.description || 'sin descripción'}.`, cta: 'Ver caso', href: '/sms/casos' });
  }
  if (committeeNext?.scheduled_at) {
    const days = daysUntil(String(committeeNext.scheduled_at).slice(0, 10));
    alerts.push({ sev: days != null && days <= 3 ? 'amber' : 'ok', icon: 'groups', text: `Comité ${committeeNext.kind === 'sag' ? 'SAG' : 'SRB'} ${days != null && days < 0 ? 'vencido' : `en ${days} día${days !== 1 ? 's' : ''}`}.`, cta: 'Ver comité', href: committeeNext.kind === 'sag' ? '/sms/sag' : '/sms/srb' });
  }

  const kpis = [
    { icon: 'fact_check', label: 'Reportes por analizar', value: reportsToAnalyze, sub: reportsToAnalyze === 0 ? 'Al día' : 'Pendientes', tone: reportsToAnalyze > 0 ? 'warn' : 'ok' },
    { icon: 'cases', label: 'Casos abiertos', value: casesOpen, sub: casesOpen === 0 ? 'Ninguno' : 'En investigación' },
    { icon: 'gavel', label: 'MOR por radicar', value: morToFile.length, sub: morToFile.length === 0 ? 'Al día' : 'Plazo Aerocivil', tone: morToFile.length > 0 ? 'danger' : 'ok' },
    { icon: 'assignment_late', label: 'Acciones vencidas', value: actionsOverdue.length, sub: actionsOverdue.length === 0 ? 'Al día' : 'Correctivas', tone: actionsOverdue.length > 0 ? 'danger' : undefined },
  ];

  return (
    <div className="space-y-6">
      <Hero fullName={fullName} roleLabel="Gerente SMS" orgName={orgName} highlight={{ label: 'Reportes por analizar', value: reportsToAnalyze, sub: reportsToAnalyze === 0 ? 'al día' : 'pendientes' }} />

      <section>
        <SectionTitle>Seguridad operacional</SectionTitle>
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
        <Panel title="Bandeja de reportes" action={{ label: 'Todos', href: '/sms/reportes' }} isEmpty={inbox.length === 0} empty="No hay reportes recientes.">
          <ul className="divide-y divide-navy-50">
            {inbox.slice(0, 5).map((r, i) => {
              const rt = ROUTE[r.route] || ROUTE.vor;
              return (
                <li key={i} className={`${i >= 3 ? 'hidden sm:flex' : 'flex'} items-start gap-3 px-5 py-3`}>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${rt.chip}`}>{rt.label}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy truncate">{r.event_label || 'Reporte'}</p>
                    <p className="text-xs text-navy-400 mt-0.5">{whenLabel(r.occurred_at)}</p>
                  </div>
                  <span className={`text-[11px] font-semibold shrink-0 ${r.analyzed ? 'text-emerald-600' : 'text-amber-600'}`}>{r.analyzed ? 'Analizado' : 'Pendiente'}</span>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Indicadores de seguridad (SPI)" action={{ label: 'Ver todos', href: '/sms/indicadores' }} isEmpty={spi.length === 0} empty="Sin indicadores activos.">
          <ul className="divide-y divide-navy-50">
            {spi.slice(0, 5).map((s, i) => (
              <li key={i} className={`${i >= 3 ? 'hidden sm:flex' : 'flex'} items-center gap-3 px-5 py-3`}>
                {s.taxonomy_code && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 bg-navy-100 text-navy-600">{s.taxonomy_code}</span>}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy truncate">{s.name}</p>
                  {s.expected_improvement_pct != null && <p className="text-xs text-navy-400 mt-0.5">Meta: mejorar {s.expected_improvement_pct}%</p>}
                </div>
                {s.official && <span className="material-symbols-outlined text-navy-300 text-base shrink-0" title="Indicador oficial">verified</span>}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
