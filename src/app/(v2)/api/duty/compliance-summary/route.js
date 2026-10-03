// Skylog V2.0 — F5 §100.540. Resumen de cumplimiento de TODA la tripulación
// de una organización — lo que ve un gestor al entrar a Tiempos de servicio
// antes de filtrar por un piloto específico ("muestre el general de la
// empresa" al ingresar, pedido del usuario). Mismo cálculo por persona que
// ya usa `GET /api/duty/current` (evaluateDutyCompliance de
// packages/domain), solo que aquí corre una vez por cada miembro activo de
// la organización en vez de solo la sesión actual.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager, getRecentDutyPeriods, getRecentFlights } from '@/lib/v2/duty';
import { evaluateDutyCompliance, dayKey, monthKey } from '@skylog/domain';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor (Jefe de Pilotos, Gerente SMS, admin) puede ver el resumen de la empresa' }, { status: 403 });
  }

  const { data: orgMemberships, error: membersError } = await supabase
    .from('memberships')
    .select('person_id, role, people(full_name)')
    .eq('organization_id', organizationId)
    .eq('status', 'activa');
  if (membersError) return Response.json({ error: 'Error consultando la tripulación' }, { status: 500 });

  const now = new Date();
  const month = monthKey(now);
  const today = dayKey(now);

  const summary = await Promise.all(
    (orgMemberships || []).map(async (m) => {
      const [{ data: recentPeriods }, { data: recentFlights }] = await Promise.all([
        getRecentDutyPeriods(supabase, m.person_id, 32),
        getRecentFlights(supabase, m.person_id, 32),
      ]);

      const domainPeriods = (recentPeriods || []).map((p) => ({
        personId: p.person_id,
        type: p.type,
        startedAt: p.started_at,
        endedAt: p.ended_at || now.toISOString(),
      }));
      const domainFlights = (recentFlights || []).map((f) => ({
        personId: f.pilot_person_id,
        date: f.takeoff_at,
        totalTimeHours: Number(f.total_time),
        lineOfSight: f.visual_condition,
      }));
      const todayFlights = domainFlights.filter((f) => dayKey(new Date(f.date)) === today);
      const lineOfSight = todayFlights.some((f) => f.lineOfSight === 'BVLOS') ? 'BVLOS' : 'VLOS';

      const compliance = evaluateDutyCompliance(
        { dutyPeriods: domainPeriods, flights: domainFlights },
        { personId: m.person_id, month, day: today, lineOfSight }
      );

      return {
        personId: m.person_id,
        fullName: m.people?.full_name || m.person_id,
        role: m.role,
        compliance,
      };
    })
  );

  return Response.json({ summary });
}
