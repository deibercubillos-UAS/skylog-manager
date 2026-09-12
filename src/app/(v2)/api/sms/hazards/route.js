// Skylog V2.0 — F3. Catálogo de peligros identificados por la organización.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, description, source, missionType, relatedBarrierId } = body;
  if (!organizationId || !description) return Response.json({ error: 'organizationId y description son requeridos' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede registrar peligros' }, { status: 403 });
  }

  if (relatedBarrierId) {
    const { data: barrier, error: barrierError } = await supabase
      .from('barriers')
      .select('id')
      .eq('id', relatedBarrierId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (barrierError) return Response.json({ error: 'Error verificando la barrera' }, { status: 500 });
    if (!barrier) return Response.json({ error: 'La barrera no existe o no pertenece a esta organización' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('hazards')
    .insert({
      organization_id: organizationId,
      description,
      source: source || 'observacion',
      mission_type: missionType || null,
      related_barrier_id: relatedBarrierId || null,
      created_by: personId,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ hazard: data });
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { data, error } = await supabase
    .from('hazards')
    .select('*, risk_assessments(*)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ hazards: data });
}
