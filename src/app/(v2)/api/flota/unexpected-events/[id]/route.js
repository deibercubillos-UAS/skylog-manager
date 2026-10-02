// Skylog V2.0 — Flota & Equipo, Fase 4c. Evaluar y cerrar un evento
// inesperado — solo un gestor (RLS también lo exige). El resultado de la
// evaluación decide qué pasa con la aeronave: `aeronavegable` la devuelve a
// servicio, `requiere_mantenimiento` la deja en mantenimiento,
// `fuera_de_servicio` la saca de la flota activa (mismo estado ya
// construido a pedido del usuario). Un evento ya evaluado no se reabre —
// es evidencia, no un borrador.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

const RESULTS = ['aeronavegable', 'requiere_mantenimiento', 'fuera_de_servicio'];

export async function PATCH(request, { params }) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { data: existing, error: fetchError } = await supabase
    .from('unexpected_events')
    .select('organization_id, aircraft_id, evaluated')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) return Response.json({ error: 'Error consultando el evento' }, { status: 500 });
  if (!existing) return Response.json({ error: 'Evento no encontrado' }, { status: 404 });
  if (existing.evaluated) return Response.json({ error: 'Este evento ya fue evaluado' }, { status: 400 });

  const { error: resolveError, memberships, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede evaluar un evento inesperado' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (!body.evaluationResult || !RESULTS.includes(body.evaluationResult)) {
    return Response.json({ error: 'evaluationResult debe ser uno de: ' + RESULTS.join(', ') }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('unexpected_events')
    .update({
      evaluated: true,
      evaluated_by: personId,
      evaluated_at: new Date().toISOString(),
      evaluation_result: body.evaluationResult,
      evaluation_notes: body.evaluationNotes || null,
    })
    .eq('id', id)
    .select('*, aircraft:aircraft_id(serial_number, model:model_id(brand, model)), reporter:reported_by(full_name), evaluator:evaluated_by(full_name)')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const nextAircraftStatus = { aeronavegable: 'disponible', requiere_mantenimiento: 'en_mantenimiento', fuera_de_servicio: 'fuera_de_servicio' }[body.evaluationResult];
  await supabase.from('aircraft').update({ operational_status: nextAircraftStatus }).eq('id', existing.aircraft_id);

  return Response.json({ event: data });
}
