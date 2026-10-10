// Skylog V2.0 — Flota & Equipo, Fase 2. Retirar o reemplazar un componente.
// `retired_at_aircraft_hours` congela el reloj de uso en las horas reales de
// la aeronave al momento de la acción — nunca se acepta del cliente.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function PATCH(request, { params }) {
  params = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { data: existing, error: fetchError } = await supabase
    .from('aircraft_components')
    .select('id, organization_id, aircraft_id, component_type, status')
    .eq('id', id)
    .maybeSingle();
  if (fetchError) return Response.json({ error: 'Error consultando el componente' }, { status: 500 });
  if (!existing) return Response.json({ error: 'Componente no encontrado' }, { status: 404 });
  if (existing.status === 'retirado') return Response.json({ error: 'Este componente ya está retirado' }, { status: 400 });

  const { error: resolveError, memberships, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede retirar o reemplazar componentes' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = body.action === 'replace' ? 'replace' : 'retire';

  const { data: aircraft, error: aircraftError } = await supabase.from('aircraft').select('total_hours').eq('id', existing.aircraft_id).single();
  if (aircraftError) return Response.json({ error: 'Error consultando la aeronave' }, { status: 500 });

  const { data: retired, error: retireError } = await supabase
    .from('aircraft_components')
    .update({ status: 'retirado', retired_at: new Date().toISOString(), retired_at_aircraft_hours: aircraft.total_hours })
    .eq('id', id)
    .select('*, aircraft:aircraft_id(serial_number, total_hours, model:model_id(brand, model))')
    .single();
  if (retireError) return Response.json({ error: retireError.message }, { status: 500 });

  if (action === 'retire') return Response.json({ component: retired });

  const { data: replacement, error: replaceError } = await supabase
    .from('aircraft_components')
    .insert({
      organization_id: existing.organization_id,
      aircraft_id: existing.aircraft_id,
      component_type: body.componentType || existing.component_type,
      serial_number: body.serialNumber || null,
      installed_at_aircraft_hours: aircraft.total_hours,
      created_by: personId,
    })
    .select('*, aircraft:aircraft_id(serial_number, total_hours, model:model_id(brand, model))')
    .single();
  if (replaceError) return Response.json({ error: replaceError.message }, { status: 500 });

  return Response.json({ retired, component: replacement });
}
