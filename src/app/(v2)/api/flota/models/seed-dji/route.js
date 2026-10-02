// Skylog V2.0 — Flota & Equipo. Precarga el catálogo estándar de modelos
// DJI (a pedido explícito del usuario: "que sea sencillo... y estandarizado")
// para que crear una aeronave no dependa de teclear marca/modelo a mano
// cada vez, con el riesgo real de typos que generarían duplicados de facto
// ("Matrice 350 RTK" vs "M350rtk"). Idempotente por (brand, model) — nunca
// duplica si ya existe, ni sobrescribe uno que la organización ya editó.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { DJI_MODELS_CATALOG } from '@/lib/v2/djiModelsCatalog';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId } = body;
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede precargar el catálogo DJI' }, { status: 403 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('aircraft_models')
    .select('brand, model')
    .eq('organization_id', organizationId);
  if (existingError) return Response.json({ error: 'Error consultando modelos existentes' }, { status: 500 });

  const existingKeys = new Set((existing || []).map((m) => `${m.brand.toLowerCase()}::${m.model.toLowerCase()}`));
  const toInsert = DJI_MODELS_CATALOG.filter((m) => !existingKeys.has(`${m.brand.toLowerCase()}::${m.model.toLowerCase()}`));

  if (toInsert.length === 0) {
    return Response.json({ created: [], skipped: DJI_MODELS_CATALOG.length });
  }

  const { data: created, error } = await supabase
    .from('aircraft_models')
    .insert(toInsert.map((m) => ({ ...m, organization_id: organizationId, created_by: personId })))
    .select();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ created, skipped: DJI_MODELS_CATALOG.length - toInsert.length });
}
