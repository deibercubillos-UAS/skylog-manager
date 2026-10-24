// Skylog V2.0 — Reportes: Libro de Mantenimiento. Por aeronave (o toda la flota): sus datos y los registros del
// periodo — eventos inesperados (parte 1: información de falla) y eventos de mantenimiento (parte 2: solución).
// Solo gestores.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanView } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';

export async function GET(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const aircraftId = searchParams.get('aircraftId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanView(memberships, organizationId, 'AC1')) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  let aircraftQuery = supabase.from('aircraft').select('id, serial_number, ruas_number, operational_status, model:model_id(brand, model)').eq('organization_id', organizationId).order('serial_number');
  if (aircraftId) aircraftQuery = aircraftQuery.eq('id', aircraftId);

  let eventsQuery = supabase
    .from('maintenance_events')
    .select('id, aircraft_id, sequence_number, performed_at, performed_at_aircraft_hours, type, findings, return_to_service, document_url, document_path, performer:performed_by(full_name, license_number), supplier:supplier_id(name)')
    .eq('organization_id', organizationId)
    .order('performed_at');
  if (from) eventsQuery = eventsQuery.gte('performed_at', from);
  if (to) eventsQuery = eventsQuery.lte('performed_at', `${to}T23:59:59`);
  if (aircraftId) eventsQuery = eventsQuery.eq('aircraft_id', aircraftId);

  let unexpectedQuery = supabase.from('unexpected_events').select('id, aircraft_id, reported_at, type, description').eq('organization_id', organizationId).order('reported_at');
  if (from) unexpectedQuery = unexpectedQuery.gte('reported_at', from);
  if (to) unexpectedQuery = unexpectedQuery.lte('reported_at', `${to}T23:59:59`);
  if (aircraftId) unexpectedQuery = unexpectedQuery.eq('aircraft_id', aircraftId);

  const [{ data: aircraft, error: aircraftError }, { data: events, error: eventsError }, { data: unexpected, error: unexpectedError }, { data: org }] = await Promise.all([
    aircraftQuery,
    eventsQuery,
    unexpectedQuery,
    supabase.from('organizations').select('nit').eq('id', organizationId).maybeSingle(),
  ]);
  const failure = aircraftError || eventsError || unexpectedError;
  if (failure) return Response.json({ error: failure.message }, { status: 500 });

  return Response.json({ aircraft: aircraft || [], events: (events || []).map(({ document_path, ...e }) => ({ ...e, has_document: !!document_path })), unexpected: unexpected || [], org: org ? { nit: org.nit } : null });
}
