// Skylog V2.0 — Flota & Equipo, Fase 3: ETA (Equipo Tecnológico Asociado,
// 30-entidades.md §3.2) — se registra ante AeroCivil igual que una
// aeronave, entidad independiente (no cuelga de ninguna aeronave puntual).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const orgIds = (memberships || []).map((m) => m.organization_id);
  if (!organizationId || !orgIds.includes(organizationId)) {
    return Response.json({ error: 'organizationId requerido y con membresía activa' }, { status: 400 });
  }

  const { data: items, error } = await supabase
    .from('eta_items')
    .select('*')
    .eq('organization_id', organizationId)
    .order('brand', { ascending: true });
  if (error) return Response.json({ error: 'Error consultando equipo tecnológico asociado' }, { status: 500 });

  return Response.json({ items, isManager: isDutyManager(memberships, organizationId) });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, brand, model, retaNumber, description } = body;
  if (!organizationId || !brand || !model) {
    return Response.json({ error: 'organizationId, brand y model son requeridos' }, { status: 400 });
  }

  const { error: resolveError, memberships, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede registrar equipo tecnológico asociado' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('eta_items')
    .insert({ organization_id: organizationId, brand, model, reta_number: retaNumber || null, description: description || null, created_by: personId })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ item: data });
}
