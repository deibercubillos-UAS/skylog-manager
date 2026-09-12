// Skylog V2.0 — F5 §100.535(12). Certificación anual del tiempo de vuelo
// acumulado por piloto, firmada por el Jefe de Pilotos (u otro rol de gestión).
// Ver docs/skylog-v2/41-tiempos-servicio.md §1.2.
//
// Regla S2 (01-reglas.md §5): lo que el sistema puede calcular no se le pide
// al usuario — `total_hours` se calcula aquí server-side sumando `flights`
// reales del año, nunca se acepta como valor del cliente.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, targetPersonId, year } = body;
  if (!organizationId || !targetPersonId || !year) {
    return Response.json({ error: 'organizationId, targetPersonId y year son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor (Jefe de Pilotos, Gerente SMS, admin) puede certificar' }, { status: 403 });
  }

  // El piloto a certificar debe tener membresía real en la misma organización —
  // nunca se confía en el id que manda el cliente sin verificar pertenencia.
  const { data: targetMembership, error: targetError } = await supabase
    .from('memberships')
    .select('id')
    .eq('person_id', targetPersonId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (targetError) return Response.json({ error: 'Error verificando al piloto' }, { status: 500 });
  if (!targetMembership) return Response.json({ error: 'Ese piloto no pertenece a esta organización' }, { status: 404 });

  const yearStart = `${year}-01-01T00:00:00.000Z`;
  const yearEnd = `${Number(year) + 1}-01-01T00:00:00.000Z`;
  const { data: flights, error: flightsError } = await supabase
    .from('flights')
    .select('total_time')
    .eq('pilot_person_id', targetPersonId)
    .gte('takeoff_at', yearStart)
    .lt('takeoff_at', yearEnd);
  if (flightsError) return Response.json({ error: 'Error calculando horas del año' }, { status: 500 });

  const totalHours = flights.reduce((sum, f) => sum + Number(f.total_time), 0);

  const { data, error } = await supabase
    .from('duty_annual_certifications')
    .insert({
      organization_id: organizationId,
      person_id: targetPersonId,
      year,
      total_hours: totalHours,
      certified_by: personId,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return Response.json({ error: 'Ya existe una certificación para ese piloto y año' }, { status: 409 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({ certification: data });
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

  let query = supabase.from('duty_annual_certifications').select('*').order('year', { ascending: false });
  query = organizationId ? query.eq('organization_id', organizationId) : query;
  // RLS ya filtra a "propias o de mi organización si soy gestor" — este query
  // solo acota además por organización si el cliente la pidió.

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ certifications: data });
}
