// Skylog V2.0 — F3/SPI. Catálogo de indicadores (regla C5): los 11 oficiales
// (endpoint /seed-official, precargados con su taxonomía, no editables) + los
// propios (validados contra §5 — qué NO es un SPI — antes de guardarse).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { validateIndicatorDefinition, OFFICIAL_INDICATORS } from '@skylog/domain';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, name, expectedImprovementPct } = body;
  if (!organizationId || !name) return Response.json({ error: 'organizationId y name son requeridos' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede definir indicadores' }, { status: 403 });
  }

  const validation = validateIndicatorDefinition(name);
  if (!validation.valid) return Response.json({ error: validation.reason }, { status: 400 });

  const { data, error } = await supabase
    .from('safety_indicators')
    .insert({
      organization_id: organizationId,
      name,
      is_official: false,
      expected_improvement_pct: expectedImprovementPct ?? null,
      created_by: personId,
    })
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ indicator: data });
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
    .from('safety_indicators')
    .select('*')
    .eq('organization_id', organizationId)
    .order('is_official', { ascending: false })
    .order('created_at');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ indicators: data, officialCatalog: OFFICIAL_INDICATORS });
}
