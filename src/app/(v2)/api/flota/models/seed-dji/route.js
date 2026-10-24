// Skylog V2.0 — Flota & Equipo. Precarga el catálogo estándar de modelos
// DJI (a pedido explícito del usuario: "que sea sencillo... y estandarizado")
// para que crear una aeronave no dependa de teclear marca/modelo a mano
// cada vez, con el riesgo real de typos que generarían duplicados de facto
// ("Matrice 350 RTK" vs "M350rtk"). Idempotente por (brand, model) — nunca
// duplica si ya existe, ni sobrescribe uno que la organización ya editó.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { DJI_MODELS_CATALOG } from '@/lib/v2/djiModelsCatalog';
import { sanitizeSpecInput, SPEC_FIELD_KEYS } from '@skylog/domain';
import { membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';

export async function POST(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, keys } = body;
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanEdit(memberships, organizationId, 'I9')) {
    return Response.json({ error: 'Solo un gestor puede precargar el catálogo DJI' }, { status: 403 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('aircraft_models')
    .select(['id', 'brand', 'model', ...SPEC_FIELD_KEYS].join(', '))
    .eq('organization_id', organizationId);
  if (existingError) return Response.json({ error: 'Error consultando modelos existentes' }, { status: 500 });

  const keyOf = (m) => `${m.brand.toLowerCase()}::${m.model.toLowerCase()}`;
  const existingByKey = new Map((existing || []).map((m) => [keyOf(m), m]));
  // `keys` (opcional): solo los modelos elegidos, como "brand::model". Sin `keys` se agregan todos (compatibilidad).
  const chosen = Array.isArray(keys) ? new Set(keys.map((k) => String(k).toLowerCase())) : null;
  if (chosen && chosen.size === 0) return Response.json({ error: 'Elige al menos un modelo' }, { status: 400 });
  const selected = DJI_MODELS_CATALOG.filter((m) => !chosen || chosen.has(keyOf(m)));
  const specOf = (m) => (m.spec ? sanitizeSpecInput(m.spec).values : {});
  const isEmpty = (v) => v === null || v === undefined || (Array.isArray(v) && v.length === 0) || (typeof v === 'string' && v.trim() === '');
  const toInsert = selected.filter((m) => !existingByKey.has(keyOf(m)));

  // Modelos que la organización ya tenía: se completan SOLO los campos vacíos de la ficha (nunca se pisa lo que editó).
  let completed = 0;
  for (const m of selected) {
    const current = existingByKey.get(keyOf(m));
    if (!current) continue;
    const patch = {};
    for (const [k, v] of Object.entries(specOf(m))) if (isEmpty(current[k]) && !isEmpty(v)) patch[k] = v;
    if (Object.keys(patch).length === 0) continue;
    const { error: updError } = await supabase.from('aircraft_models').update(patch).eq('id', current.id);
    if (updError) return Response.json({ error: updError.message }, { status: 500 });
    completed += 1;
  }

  if (toInsert.length === 0) {
    return Response.json({ created: [], completed, skipped: selected.length });
  }

  const { data: created, error } = await supabase
    .from('aircraft_models')
    .insert(toInsert.map((m) => ({ brand: m.brand, model: m.model, category: m.category, ...specOf(m), organization_id: organizationId, created_by: personId })))
    .select();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ created, completed, skipped: selected.length - toInsert.length });
}
