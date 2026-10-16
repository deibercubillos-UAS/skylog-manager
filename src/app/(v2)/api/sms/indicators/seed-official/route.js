// Skylog V2.0 — F3/SPI. Siembra los 11 indicadores oficiales
// (13-herramientas-spi.md §2/§10) — precargados con su taxonomía exacta, el
// cliente los activa/desactiva pero no los inventa ni renombra. Idempotente
// por (organization_id, taxonomy_code): no duplica en clics repetidos.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { OFFICIAL_INDICATORS } from '@skylog/domain';
import { membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';

export async function POST(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId } = body;
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!membershipsCanEdit(memberships, organizationId, 'R2')) {
    return Response.json({ error: 'Solo un gestor puede sembrar el catálogo oficial' }, { status: 403 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('safety_indicators')
    .select('taxonomy_code')
    .eq('organization_id', organizationId)
    .eq('is_official', true);
  if (existingError) return Response.json({ error: existingError.message }, { status: 500 });

  const existingCodes = new Set((existing || []).map((i) => i.taxonomy_code));
  const toInsert = OFFICIAL_INDICATORS.filter((i) => !existingCodes.has(i.code)).map((i) => ({
    organization_id: organizationId,
    name: i.name,
    taxonomy_code: i.code,
    is_official: true,
    created_by: personId,
  }));

  if (toInsert.length === 0) {
    return Response.json({ inserted: 0, message: 'El catálogo oficial ya estaba sembrado' });
  }

  const { data, error } = await supabase.from('safety_indicators').insert(toInsert).select();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ inserted: data.length, indicators: data });
}
