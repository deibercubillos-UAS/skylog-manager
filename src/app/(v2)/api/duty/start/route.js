// Skylog V2.0 — F5 §100.540. Inicia un período de servicio/descanso/disponibilidad/
// entrenamiento para la persona autenticada. Ver docs/skylog-v2/41-tiempos-servicio.md.
//
// Bloqueo real (§7.2): iniciar 'servicio' se **rechaza** con 409 si (a) el mes o
// el día ya están en el límite de horas de vuelo, o (b) no pasó el descanso
// mínimo desde el último 'servicio' cerrado (§100.540(f)). 'descanso'/
// 'disponibilidad'/'entrenamiento' nunca se bloquean por estas reglas — son
// justamente lo que resuelve la situación, no lo que la causa.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, getOpenDutyPeriod } from '@/lib/v2/duty';
import { evaluateServiceGates } from '@/lib/v2/serviceGates';

const VALID_TYPES = ['servicio', 'descanso', 'disponibilidad', 'entrenamiento'];

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, type } = body;
  if (!organizationId || !VALID_TYPES.includes(type)) {
    return Response.json({ error: 'organizationId y type (uno de: ' + VALID_TYPES.join(', ') + ') son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId, organizationIds } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!organizationIds.includes(organizationId)) {
    return Response.json({ error: 'Sin membresía activa en esa organización' }, { status: 403 });
  }

  // 100.540(f)(2)(iv) — el descanso no se fracciona; en general un solo período
  // abierto por persona a la vez evita solapamientos que no tendrían sentido físico.
  const { data: open, error: openError } = await getOpenDutyPeriod(supabase, personId);
  if (openError) return Response.json({ error: 'Error consultando períodos abiertos' }, { status: 500 });
  if (open) {
    return Response.json(
      { error: 'Ya existe un período abierto (' + open.type + ', desde ' + open.started_at + '). Ciérralo antes de iniciar otro.' },
      { status: 409 }
    );
  }

  if (type === 'servicio') {
    // Mismas verificaciones que el Despacho (lib/v2/serviceGates.js): una sola fuente de verdad.
    // Orden de respuesta conservado: examen → descanso mínimo → límites de horas de vuelo.
    const gates = await evaluateServiceGates(supabase, { organizationId, personId, now: new Date() });
    if (gates.error) return Response.json({ error: gates.error }, { status: 500 });

    if (gates.examCompliance && !gates.examCompliance.compliant) {
      return Response.json(
        {
          error: 'Examen de Capacitación reprobado sin intentos disponibles en el ciclo vigente — no se puede iniciar servicio',
          examCompliance: gates.examCompliance,
        },
        { status: 409 }
      );
    }
    if (gates.rest && !gates.rest.compliant) {
      return Response.json({ error: 'No ha pasado el descanso mínimo desde el último servicio (§100.540(f))', check: gates.rest }, { status: 409 });
    }
    if (!gates.monthly.compliant || !gates.daily.compliant) {
      return Response.json(
        { error: 'Ya se excedió un límite de horas de vuelo (§100.540) — no se puede iniciar más servicio', checks: { monthly: gates.monthly, daily: gates.daily } },
        { status: 409 }
      );
    }
  }

  const { data, error } = await supabase
    .from('duty_periods')
    .insert({
      organization_id: organizationId,
      person_id: personId,
      type,
      started_at: new Date().toISOString(),
      source: 'manual',
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ dutyPeriod: data });
}
