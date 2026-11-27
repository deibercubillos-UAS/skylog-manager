// Skylog V2.0 — F3/SPI. Catálogo de indicadores (regla C5): los 11 oficiales
// (endpoint /seed-official, precargados con su taxonomía, no editables) + los
// propios (validados contra §5 — qué NO es un SPI — antes de guardarse).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { validateIndicatorDefinition, OFFICIAL_INDICATORS } from '@skylog/domain';
import { membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { dbError } from '@/lib/v2/apiErrors';

export async function POST(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, name, expectedImprovementPct, hazardId } = body;
  if (!organizationId || !name) return Response.json({ error: 'organizationId y name son requeridos' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!membershipsCanEdit(memberships, organizationId, 'R2')) {
    return Response.json({ error: 'Solo un gestor puede definir indicadores' }, { status: 403 });
  }

  const validation = validateIndicatorDefinition(name);
  if (!validation.valid) return Response.json({ error: validation.reason }, { status: 400 });

  // Un KPI (indicador propio) mide un peligro: la asociación es obligatoria y el
  // peligro debe ser de la misma organización. (Los SPI oficiales se siembran
  // por /seed-official y no pasan por aquí.)
  if (!hazardId) return Response.json({ error: 'Un KPI debe asociarse a un peligro' }, { status: 400 });
  const { data: hazard, error: hazardError } = await supabase.from('hazards').select('id').eq('id', hazardId).eq('organization_id', organizationId).maybeSingle();
  if (hazardError) return Response.json({ error: 'Error verificando el peligro' }, { status: 500 });
  if (!hazard) return Response.json({ error: 'El peligro no pertenece a esta organización' }, { status: 400 });

  const { data, error } = await supabase
    .from('safety_indicators')
    .insert({
      organization_id: organizationId,
      name,
      is_official: false,
      hazard_id: hazardId,
      expected_improvement_pct: expectedImprovementPct ?? null,
      created_by: personId,
    })
    .select()
    .single();
  if (error) return dbError(error, 'sms/indicators');
  return Response.json({ indicator: data });
}

export async function PATCH(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { indicatorId, organizationId } = body;
  if (!indicatorId || !organizationId) return Response.json({ error: 'indicatorId y organizationId son requeridos' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!membershipsCanEdit(memberships, organizationId, 'R2')) {
    return Response.json({ error: 'Solo un gestor puede editar indicadores' }, { status: 403 });
  }

  // Cargar el indicador para conocer su alcance (oficial vs propio) y confirmar la organización.
  const { data: current, error: loadError } = await supabase
    .from('safety_indicators')
    .select('id, organization_id, is_official')
    .eq('id', indicatorId)
    .eq('organization_id', organizationId)
    .single();
  if (loadError || !current) return Response.json({ error: 'Indicador no encontrado' }, { status: 404 });

  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
  const updates = {};

  if (has('name')) {
    // La taxonomía oficial (MAUT-1.0-22-005) es inmutable: su nombre no se cambia.
    if (current.is_official) return Response.json({ error: 'El nombre de un indicador oficial no se puede cambiar' }, { status: 400 });
    const name = String(body.name || '').trim();
    const validation = validateIndicatorDefinition(name);
    if (!validation.valid) return Response.json({ error: validation.reason }, { status: 400 });
    updates.name = name;
  }

  if (has('expectedImprovementPct')) {
    const raw = body.expectedImprovementPct;
    if (raw === null || raw === '') {
      updates.expected_improvement_pct = null;
    } else {
      const num = Number(raw);
      if (!Number.isFinite(num)) return Response.json({ error: 'La mejora esperada debe ser un número' }, { status: 400 });
      updates.expected_improvement_pct = num;
    }
  }

  if (has('active')) updates.active = !!body.active;

  if (has('hazardId')) {
    // El peligro solo aplica a KPI (propios); un SPI oficial no se asocia a peligros.
    if (current.is_official) return Response.json({ error: 'Un indicador oficial (SPI) no se asocia a peligros' }, { status: 400 });
    const hid = body.hazardId;
    if (!hid) return Response.json({ error: 'Un KPI debe tener un peligro asociado' }, { status: 400 });
    const { data: hz, error: he } = await supabase.from('hazards').select('id').eq('id', hid).eq('organization_id', organizationId).maybeSingle();
    if (he) return Response.json({ error: 'Error verificando el peligro' }, { status: 500 });
    if (!hz) return Response.json({ error: 'El peligro no pertenece a esta organización' }, { status: 400 });
    updates.hazard_id = hid;
  }

  if (Object.keys(updates).length === 0) return Response.json({ error: 'No hay cambios para guardar' }, { status: 400 });

  const { data, error } = await supabase
    .from('safety_indicators')
    .update(updates)
    .eq('id', indicatorId)
    .eq('organization_id', organizationId)
    .select()
    .single();
  if (error) return dbError(error, 'sms/indicators');
  return Response.json({ indicator: data });
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { data, error } = await supabase
    .from('safety_indicators')
    .select('*, hazard:hazard_id(id, description)')
    .eq('organization_id', organizationId)
    .order('is_official', { ascending: false })
    .order('created_at');
  if (error) return dbError(error, 'sms/indicators');
  return Response.json({ indicators: data, officialCatalog: OFFICIAL_INDICATORS });
}
