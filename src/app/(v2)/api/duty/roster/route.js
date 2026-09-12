// Skylog V2.0 — F5 §41-tiempos-servicio.md §7.2. Vista de planificación para el
// Jefe de Pilotos: quién está disponible hoy, quién está en servicio/descanso/
// disponibilidad/entrenamiento, y para quién está en descanso, hasta cuándo lo
// exige §100.540(f) — reutiliza checkRestPeriod de packages/domain, no
// reimplementa el cálculo. Convierte la obligación de registrar en una
// herramienta útil de planificación (única pieza de diseño de F5 que faltaba).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager, getLastClosedServicePeriod } from '@/lib/v2/duty';
import { checkRestPeriod } from '@skylog/domain';

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
    return Response.json({ error: 'Solo un gestor (Jefe de Pilotos, Gerente SMS, admin) puede ver la planificación' }, { status: 403 });
  }

  const { data: orgMemberships, error: membersError } = await supabase
    .from('memberships')
    .select('person_id, role, people(full_name)')
    .eq('organization_id', organizationId)
    .eq('status', 'activa');
  if (membersError) return Response.json({ error: 'Error consultando la tripulación' }, { status: 500 });

  const now = new Date();

  const roster = await Promise.all(
    (orgMemberships || []).map(async (m) => {
      const { data: open } = await supabase
        .from('duty_periods')
        .select('*')
        .eq('person_id', m.person_id)
        .is('ended_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let availableAt = null;
      if (open?.type === 'descanso') {
        // Estima cuándo termina el descanso obligatorio: última vez que cerró
        // un 'servicio' + el descanso mínimo que le correspondía (§100.540(f)).
        const { data: lastService } = await getLastClosedServicePeriod(supabase, m.person_id);
        if (lastService) {
          const serviceDurationHours =
            (new Date(lastService.ended_at).getTime() - new Date(lastService.started_at).getTime()) / 3_600_000;
          const rest = checkRestPeriod({ serviceDurationHours, restDurationHours: 0 });
          availableAt = new Date(new Date(lastService.ended_at).getTime() + rest.requiredHours * 3_600_000).toISOString();
        }
      }

      return {
        personId: m.person_id,
        fullName: m.people?.full_name || m.person_id,
        role: m.role,
        status: open?.type || 'disponible',
        since: open?.started_at || null,
        availableAt,
      };
    })
  );

  return Response.json({ asOf: now.toISOString(), roster });
}
