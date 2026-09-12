// Skylog V2.0 — F4a. Solicitud de autorización de vuelo ante la Aerocivil
// (100.805(a)): una campaña con zona, rango de fechas y total de vuelos
// planeados — nunca un vuelo ni una misión individual (docs/skylog-v2/
// 43-aerocivil.md §6.3 · 31-esquema-datos.md §3).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, zone, scopeStart, scopeEnd, totalFlightsPlanned } = body;
  if (!organizationId || !zone || !scopeStart || !scopeEnd || !totalFlightsPlanned) {
    return Response.json(
      { error: 'organizationId, zone, scopeStart, scopeEnd y totalFlightsPlanned son requeridos' },
      { status: 400 }
    );
  }
  if (Number(totalFlightsPlanned) <= 0) {
    return Response.json({ error: 'totalFlightsPlanned debe ser mayor a cero' }, { status: 400 });
  }
  if (new Date(scopeEnd) < new Date(scopeStart)) {
    return Response.json({ error: 'scopeEnd no puede ser anterior a scopeStart' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor (Jefe de Pilotos, Gerente SMS, admin) puede preparar el expediente Aerocivil' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('authorization_requests')
    .insert({
      organization_id: organizationId,
      zone,
      scope_start: scopeStart,
      scope_end: scopeEnd,
      total_flights_planned: totalFlightsPlanned,
      created_by: personId,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ authorizationRequest: data });
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');

  let query = supabase.from('authorization_requests').select('*, risk_analyses(id, can_sign, signed_at)').order('created_at', { ascending: false });
  query = organizationId ? query.eq('organization_id', organizationId) : query;

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ authorizationRequests: data });
}
