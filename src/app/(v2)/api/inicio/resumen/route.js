// Skylog V2.0 — resumen del Dashboard (/inicio) en UNA petición. Antes la pantalla pedía /api/flights (200 vuelos
// completos con piloto, aeronave y el JSON del clima), /api/missions (todas las de la semana con PIC y adiciones) y
// /api/sms/cases (todos los casos con sus acciones) solo para contar y mostrar 8 filas: tres funciones, tres veces la
// resolución de la persona y cientos de KB por visita. Aquí se pide solo lo que la pantalla pinta.
// La visibilidad la sigue decidiendo la RLS (un piloto ve sus vuelos; un gestor, los de la organización), igual que antes.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { getAuthUser } from '@/lib/v2/authUser';

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

  return Response.json({
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
