// Skylog V2.0 — resumen del Dashboard (/inicio) en UNA petición. Antes la pantalla pedía /api/flights (200 vuelos
// completos con piloto, aeronave y el JSON del clima), /api/missions (todas las de la semana con PIC y adiciones) y
// /api/sms/cases (todos los casos con sus acciones) solo para contar y mostrar 8 filas: tres funciones, tres veces la
// resolución de la persona y cientos de KB por visita. Aquí se pide solo lo que la pantalla pinta.
// La visibilidad la sigue decidiendo la RLS (un piloto ve sus vuelos; un gestor, los de la organización), igual que antes.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { getAuthUser } from '@/lib/v2/authUser';
import { PLAN_LABELS, limitsForSubscription } from '@/lib/v2/planLimits';

const PAGE = 1000; // máximo de filas por consulta de PostgREST
const MAX_PAGES = 50;

// Duración y fecha de TODOS los vuelos visibles (dos columnas): las horas totales antes salían de los últimos 200.
async function allFlightTimes(supabase, organizationId) {
  const rows = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await supabase
      .from('flights')
      .select('takeoff_at, total_time')
      .eq('organization_id', organizationId)
      .order('takeoff_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) return { error };
    rows.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return { rows };
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Sin persona' }, { status: 403 });

  const organizationId = new URL(request.url).searchParams.get('organizationId');
  const membership = (memberships || []).find((m) => m.organization_id === organizationId);
  if (!organizationId || !membership) {
    return Response.json({ error: 'organizationId requerido y con membresía activa' }, { status: 400 });
  }
  // El detalle de los casos SMS es solo del Gerente SMS (misma regla que /api/sms/cases).
  const isAnalyst = ['gerente_sms', 'superadmin'].includes(membership.role);

  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 86_400_000);
  const since90d = new Date(now.getTime() - 90 * 86_400_000).toISOString();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const additionsHorizon = new Date(now.getTime() + 45 * 86_400_000).toISOString().slice(0, 10);

  // Bloque del rol PILOTO — "mi operación y mi cumplimiento" (plan 78-dashboards-por-rol.md).
  // Son datos PROPIOS de la persona; la RLS ya los limita a sus filas (flights/missions/
  // duty_periods/person_additions), y además se filtra explícitamente por personId.
  const [myFlights90, myRecent, myMissions, openService, expiringAdditions] = await Promise.all([
    supabase.from('flights').select('total_time').eq('organization_id', organizationId).eq('pilot_person_id', personId).gte('takeoff_at', since90d).limit(1000),
    supabase.from('flights').select('takeoff_at, total_time, visual_condition, mission_type').eq('organization_id', organizationId).eq('pilot_person_id', personId).order('takeoff_at', { ascending: false }).limit(5),
    supabase.from('missions').select('scheduled_at, zone, notes').eq('organization_id', organizationId).eq('pic_person_id', personId).neq('status', 'cancelada').gte('scheduled_at', startOfToday).order('scheduled_at', { ascending: true }).limit(6),
    supabase.from('duty_periods').select('started_at').eq('person_id', personId).eq('type', 'servicio').is('ended_at', null).order('started_at', { ascending: false }).limit(1),
    supabase.from('person_additions').select('addition, valid_until').eq('person_id', personId).not('valid_until', 'is', null).lte('valid_until', additionsHorizon).order('valid_until', { ascending: true }).limit(6),
  ]);

  const piloto = {
    hours90d: (myFlights90.data || []).reduce((s, f) => s + Number(f.total_time || 0), 0),
    flights90dCount: (myFlights90.data || []).length,
    recentFlights: myRecent.data || [],
    myMissions: myMissions.data || [],
    openServiceStartedAt: openService.data?.[0]?.started_at || null,
    expiringAdditions: expiringAdditions.data || [],
  };

  // Bloque del PILOTO INDEPENDIENTE: lo del piloto + plan (suscripción) y flota, que
  // administra él solo. Solo se calcula cuando la membresía es independiente, para no
  // pedir estos datos a los demás roles. No se fabrica "mantenimiento vencido/próximo"
  // (no hay fuente confiable en el esquema): solo se cuentan estados reales de aircraft.
  let pilotoIndependiente = null;
  if (membership.independent) {
    const [sub, ac, bat] = await Promise.all([
      supabase.from('subscriptions').select('plan, expires_at').eq('organization_id', organizationId).maybeSingle(),
      supabase.from('aircraft').select('operational_status').eq('organization_id', organizationId),
      supabase.from('batteries').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
    ]);
    let plan = null;
    if (sub.data?.plan) {
      const expires = sub.data.expires_at ? new Date(`${sub.data.expires_at}T00:00:00`) : null;
      const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      plan = { name: PLAN_LABELS[sub.data.plan] || sub.data.plan, daysLeft: expires ? Math.round((expires.getTime() - todayMid.getTime()) / 86_400_000) : null };
    }
    const acRows = ac.data || [];
    const fleet = {
      aircraftOperational: acRows.filter((a) => a.operational_status === 'disponible').length,
      aircraftMaintenance: acRows.filter((a) => a.operational_status === 'en_mantenimiento').length,
      batteries: bat.count || 0,
    };
    pilotoIndependiente = { ...piloto, plan, fleet: acRows.length > 0 || fleet.batteries > 0 ? fleet : null };
  }

  const [times, recent, missions, cases] = await Promise.all([
    allFlightTimes(supabase, organizationId),
    supabase
      .from('flights')
      .select('id, takeoff_at, total_time, visual_condition, pilot:pilot_person_id(full_name)')
      .eq('organization_id', organizationId)
      .order('takeoff_at', { ascending: false })
      .limit(8),
    supabase
      .from('missions')
      .select('scheduled_at', { count: 'exact' })
      .eq('organization_id', organizationId)
      .neq('status', 'cancelada')
      .gte('scheduled_at', now.toISOString())
      .lt('scheduled_at', weekAhead.toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(1),
    isAnalyst
      ? supabase
          .from('sms_cases')
          .select('id, status, sms_reports(description)', { count: 'exact' })
          .eq('organization_id', organizationId)
          .neq('status', 'cerrado')
          .order('created_at', { ascending: false })
          .limit(6)
      : Promise.resolve(null),
  ]);

  if (times.error || recent.error || missions.error || cases?.error) {
    return Response.json({ error: 'Error consultando el resumen' }, { status: 500 });
  }

  // Las horas totales se suman aquí; para la gráfica de 6 meses solo viajan las fechas recientes (el mes de cada vuelo
  // se agrupa en el navegador, con su zona horaria, como antes).
  const totalHours = times.rows.reduce((sum, f) => sum + Number(f.total_time || 0), 0);
  const chartFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 6, 1)).toISOString();
  const recentTakeoffs = times.rows.filter((f) => f.takeoff_at >= chartFrom).map((f) => f.takeoff_at);

  // Bloque del JEFE DE PILOTOS — "operación de flota y tripulación" (plan 78-dashboards-por-rol.md, F1).
  // Datos de TODA la organización; el JP es gestor (la RLS le permite verlos). Solo se calcula para ese rol.
  // Señales honestas: missions.pic_person_id es NOT NULL (no hay "sin PIC"); dispatches.status ∈
  // despachado/cerrado (la señal es "sin cerrar", no "por autorizar"); el nombre de la tripulación en
  // servicio se resuelve con el mapa de memberships (duty_periods.person_id no tiene FK a people).
  let jefePilotos = null;
  if (membership.role === 'jefe_pilotos') {
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const [fThis, fLast, wk, acj, batj, duty, members, disp, certs] = await Promise.all([
      supabase.from('flights').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).gte('takeoff_at', startThisMonth),
      supabase.from('flights').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).gte('takeoff_at', startLastMonth).lt('takeoff_at', startThisMonth),
      supabase.from('missions').select('scheduled_at, zone, pic:pic_person_id(full_name), aircraft:aircraft_id(serial_number, model:model_id(brand, model))').eq('organization_id', organizationId).neq('status', 'cancelada').gte('scheduled_at', startOfToday).lt('scheduled_at', weekAhead.toISOString()).order('scheduled_at', { ascending: true }).limit(6),
      supabase.from('aircraft').select('operational_status').eq('organization_id', organizationId),
      supabase.from('batteries').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('duty_periods').select('person_id, type, started_at').eq('organization_id', organizationId).is('ended_at', null),
      supabase.from('memberships').select('role, person:person_id(id, full_name)').eq('organization_id', organizationId).eq('status', 'activa'),
      supabase.from('dispatches').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'despachado'),
      supabase.from('person_additions').select('addition, valid_until, person:person_id(full_name)').not('valid_until', 'is', null).lte('valid_until', additionsHorizon).order('valid_until', { ascending: true }).limit(6),
    ]);
    const nameById = {};
    for (const m of members.data || []) if (m.person) nameById[m.person.id] = m.person.full_name;
    const openRows = duty.data || [];
    const crewDuty = openRows
      .map((r) => ({ name: nameById[r.person_id] || 'Tripulante', status: r.type, startedAt: r.type === 'servicio' ? r.started_at : null }))
      .sort((a, b) => (a.status === 'servicio' ? 0 : 1) - (b.status === 'servicio' ? 0 : 1));
    const serviceRows = openRows.filter((r) => r.type === 'servicio');
    const pilotsOverLimit = serviceRows
      .map((r) => ({ name: nameById[r.person_id] || 'Tripulante', serviceH: (now.getTime() - new Date(r.started_at).getTime()) / 3_600_000 }))
      .filter((p) => p.serviceH >= 8);
    const acRows = acj.data || [];
    const fleet = {
      aircraftOperational: acRows.filter((a) => a.operational_status === 'disponible').length,
      aircraftMaintenance: acRows.filter((a) => a.operational_status === 'en_mantenimiento').length,
      batteries: batj.count || 0,
    };
    const fThisCount = fThis.count || 0;
    const fLastCount = fLast.count || 0;
    jefePilotos = {
      flightsThisMonth: fThisCount,
      // Tendencia solo con base significativa: con 1 vuelo el mes pasado, "+700%" es ruido (QA 2026-11-25).
      flightsTrendPct: fLastCount >= 3 ? Math.round(((fThisCount - fLastCount) / fLastCount) * 100) : null,
      missionsThisWeek: missions.count || 0,
      fleet: acRows.length > 0 || fleet.batteries > 0 ? fleet : null,
      pilotsOnDuty: serviceRows.length,
      pilotsTotal: (members.data || []).filter((m) => m.role === 'piloto').length,
      weekMissions: (wk.data || []).map((m) => ({
        scheduled_at: m.scheduled_at,
        zone: m.zone,
        pic: m.pic?.full_name || null,
        aircraft: m.aircraft ? [m.aircraft.model?.brand, m.aircraft.model?.model].filter(Boolean).join(' ') || m.aircraft.serial_number : null,
      })),
      crewDuty,
      dispatchesOpen: disp.count || 0,
      pilotsOverLimit,
      crewCertsExpiring: (certs.data || []).map((c) => ({ name: c.person?.full_name || 'Tripulante', addition: c.addition, valid_until: c.valid_until })),
    };
  }

  // Bloque del GERENTE SMS — "seguridad operacional RAC 219" (plan 78-dashboards-por-rol.md, F2).
  // Solo para rol gerente_sms. Señales honestas (reglas V/Q3): "por analizar" = analyzed_at NULL;
  // "MOR por radicar" = route='mor' y filed_at NULL (no se fabrica el plazo IRIS, el componente usa
  // el tiempo transcurrido); "acción vencida" = done_at NULL y due_date < hoy. El veredicto de meta
  // del SPI vive en el cálculo mensual (otro módulo): aquí solo se listan los indicadores reales.
  let gerenteSms = null;
  if (membership.role === 'gerente_sms') {
    const todayDate = startOfToday.slice(0, 10);
    const [rToAnalyze, cOpen, mor, actions, inbox, spiRows, committee] = await Promise.all([
      supabase.from('sms_reports').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).is('analyzed_at', null).eq('requires_manager_analysis', true),
      supabase.from('sms_cases').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).neq('status', 'cerrado'),
      supabase.from('sms_reports').select('event_label, occurred_at').eq('organization_id', organizationId).eq('route', 'mor').is('filed_at', null).order('occurred_at', { ascending: true }).limit(5),
      supabase.from('sms_case_actions').select('description, due_date').eq('organization_id', organizationId).is('done_at', null).not('due_date', 'is', null).lt('due_date', todayDate).order('due_date', { ascending: true }).limit(5),
      supabase.from('sms_reports').select('event_label, route, occurred_at, analyzed_at').eq('organization_id', organizationId).order('occurred_at', { ascending: false }).limit(5),
      supabase.from('safety_indicators').select('name, taxonomy_code, expected_improvement_pct, is_official').eq('organization_id', organizationId).eq('active', true).limit(6),
      supabase.from('sms_committee_meetings').select('committee, meeting_date').eq('organization_id', organizationId).gte('meeting_date', todayDate).order('meeting_date', { ascending: true }).limit(1),
    ]);
    gerenteSms = {
      reportsToAnalyze: rToAnalyze.count || 0,
      casesOpen: cOpen.count || 0,
      morToFile: mor.data || [],
      actionsOverdue: actions.data || [],
      inbox: (inbox.data || []).map((r) => ({ event_label: r.event_label, route: r.route, occurred_at: r.occurred_at, analyzed: !!r.analyzed_at })),
      spi: (spiRows.data || []).map((s) => ({ name: s.name, taxonomy_code: s.taxonomy_code, expected_improvement_pct: s.expected_improvement_pct, official: !!s.is_official })),
      committeeNext: committee.data?.[0] ? { kind: committee.data[0].committee, scheduled_at: committee.data[0].meeting_date } : null,
    };
  }

  // Bloque del GERENTE GENERAL (admin no independiente) — "dirección + administración"
  // (plan 78-dashboards-por-rol.md, F3). Único rol con finanzas/plan y gestión de miembros.
  // El Gerente General NO cuenta contra el límite de pilotos (CLAUDE.md): pilotsUsed = rol 'piloto'.
  // El límite viene del plan (planLimits); null = ilimitado. Las señales de seguridad respetan la RLS.
  let gerenteGeneral = null;
  if (membership.role === 'admin' && !membership.independent) {
    const startThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const [fThis, sub, ac, bat, members, joinReqs, rAnalyze, cOpen, mor] = await Promise.all([
      supabase.from('flights').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).gte('takeoff_at', startThisMonth),
      supabase.from('subscriptions').select('plan, expires_at, limits_override').eq('organization_id', organizationId).maybeSingle(),
      supabase.from('aircraft').select('operational_status').eq('organization_id', organizationId),
      supabase.from('batteries').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
      supabase.from('memberships').select('role').eq('organization_id', organizationId).eq('status', 'activa'),
      supabase.from('join_requests').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('status', 'pendiente'),
      supabase.from('sms_reports').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).is('analyzed_at', null).eq('requires_manager_analysis', true),
      supabase.from('sms_cases').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).neq('status', 'cerrado'),
      supabase.from('sms_reports').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId).eq('route', 'mor').is('filed_at', null),
    ]);
    const { limits } = limitsForSubscription(sub.data || null);
    let plan = null;
    if (sub.data?.plan) {
      const expires = sub.data.expires_at ? new Date(`${sub.data.expires_at}T00:00:00`) : null;
      const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      plan = { name: PLAN_LABELS[sub.data.plan] || sub.data.plan, daysLeft: expires ? Math.round((expires.getTime() - todayMid.getTime()) / 86_400_000) : null };
    }
    const acRows = ac.data || [];
    gerenteGeneral = {
      flightsThisMonth: fThis.count || 0,
      missionsThisWeek: missions.count || 0,
      fleet: acRows.length > 0 || (bat.count || 0) > 0 ? { aircraftOperational: acRows.filter((a) => a.operational_status === 'disponible').length, aircraftMaintenance: acRows.filter((a) => a.operational_status === 'en_mantenimiento').length, batteries: bat.count || 0 } : null,
      plan,
      pilotsUsed: (members.data || []).filter((m) => m.role === 'piloto').length,
      pilotsLimit: limits?.pilots ?? null,
      joinRequests: joinReqs.count || 0,
      reportsToAnalyze: rAnalyze.count || 0,
      casesOpen: cOpen.count || 0,
      morToFile: mor.count || 0,
      recentActivity: recent.data || [],
    };
  }

  return Response.json({
    role: membership.role,
    piloto,
    pilotoIndependiente,
    jefePilotos,
    gerenteSms,
    gerenteGeneral,
    totalHours,
    recentTakeoffs,
    recentFlights: recent.data || [],
    nextMissionAt: missions.data?.[0]?.scheduled_at || null,
    missionsThisWeek: missions.count || 0,
    casesRestricted: !isAnalyst,
    openCases: cases?.data || [],
    openCasesCount: cases?.count || 0,
  });
}
