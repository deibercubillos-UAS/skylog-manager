// Skylog V2.0 — Flota & Equipo, Fase 4c. Evaluar y cerrar un evento
// inesperado — solo un gestor (RLS también lo exige). El resultado de la
// evaluación decide qué pasa con la aeronave: `aeronavegable` la devuelve a
// servicio, `requiere_mantenimiento` la deja en mantenimiento,
// `fuera_de_servicio` la saca de la flota activa (mismo estado ya
// construido a pedido del usuario). Un evento ya evaluado no se reabre —
// es evidencia, no un borrador.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanEdit } from '@/lib/v2/permissions';

const RESULTS = ['aeronavegable', 'requiere_mantenimiento', 'fuera_de_servicio'];

export async function PATCH(request, { params }) {
  params = await params;
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
  if (!membershipsCanEdit(memberships, existing.organization_id, 'I12')) {
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

  // El Gerente SMS evalúa (matriz I12) pero la puerta de rol de `aircraft` solo deja escribir a GG/JP: ya validado el
  // permiso, el estado de la aeronave se cambia con la llave de servicio y su error ya no se ignora (auditoría 2026-10-16).
  let nextAircraftStatus = { aeronavegable: 'disponible', requiere_mantenimiento: 'en_mantenimiento', fuera_de_servicio: 'fuera_de_servicio' }[body.evaluationResult];
  const admin = createAdminClient();
  if (nextAircraftStatus === 'disponible') {
    // No vuelve a servicio mientras tenga otro evento inesperado sin evaluar.
    const { data: open } = await admin.from('unexpected_events').select('id').eq('aircraft_id', existing.aircraft_id).eq('evaluated', false).limit(1);
    if (open?.length) nextAircraftStatus = 'en_mantenimiento';
  }
  const { data: current } = await admin.from('aircraft').select('operational_status').eq('id', existing.aircraft_id).maybeSingle();
  // Una aeronave fuera de servicio solo vuelve por una decisión de gestión explícita, nunca por evaluar otro evento.
  if (current?.operational_status === 'fuera_de_servicio' && nextAircraftStatus !== 'fuera_de_servicio') {
    return Response.json({ event: data, aircraftStatus: current.operational_status });
  }
  const { error: statusError } = await admin
    .from('aircraft')
    .update({ operational_status: nextAircraftStatus })
    .eq('id', existing.aircraft_id)
    .eq('organization_id', existing.organization_id);
  if (statusError) {
    console.error('[unexpected-events] no se pudo cambiar el estado de la aeronave:', existing.aircraft_id, statusError.message);
    return Response.json({ event: data, warning: 'La evaluación quedó registrada, pero no se pudo cambiar el estado de la aeronave.' });
  }

  return Response.json({ event: data, aircraftStatus: nextAircraftStatus });
}
