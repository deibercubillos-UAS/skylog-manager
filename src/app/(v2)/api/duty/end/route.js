// Skylog V2.0 — F5 §100.540. Cierra el período de servicio abierto de la persona
// autenticada. No permite reabrir/editar uno ya cerrado (clase ④ evento —
// 30-entidades.md §1): eso se corrige con un nuevo período, no con un UPDATE libre.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, getOpenDutyPeriod } from '@/lib/v2/duty';

export async function POST() {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const { data: open, error: openError } = await getOpenDutyPeriod(supabase, personId);
  if (openError) return Response.json({ error: 'Error consultando períodos abiertos' }, { status: 500 });
  if (!open) return Response.json({ error: 'No hay ningún período abierto para cerrar' }, { status: 404 });

  const endedAt = new Date().toISOString();
  if (new Date(endedAt) <= new Date(open.started_at)) {
    return Response.json({ error: 'La hora de cierre debe ser posterior al inicio' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('duty_periods')
    .update({ ended_at: endedAt })
    .eq('id', open.id)
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ dutyPeriod: data });
}
