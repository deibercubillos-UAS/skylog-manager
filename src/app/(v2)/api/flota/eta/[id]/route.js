// Skylog V2.0 — Flota & Equipo, Fase 3. Editar o eliminar un ítem de ETA.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

const ALLOWED_FIELDS = ['brand', 'model', 'reta_number', 'description'];
const FIELD_MAP = { brand: 'brand', model: 'model', retaNumber: 'reta_number', description: 'description' };

async function authorize(supabase, userId, id) {
  const { data: existing, error: fetchError } = await supabase.from('eta_items').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return { error: Response.json({ error: 'Error consultando el equipo' }, { status: 500 }) };
  if (!existing) return { error: Response.json({ error: 'Equipo no encontrado' }, { status: 404 }) };

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, userId);
  if (resolveError) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  if (!isDutyManager(memberships, existing.organization_id)) {
    return { error: Response.json({ error: 'Solo un gestor puede editar equipo tecnológico asociado' }, { status: 403 }) };
  }
  return { existing };
}

export async function PATCH(request, { params }) {
  params = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { error: authError } = await authorize(supabase, user.id, id);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const patch = {};
  for (const [key, column] of Object.entries(FIELD_MAP)) {
    if (body[key] !== undefined && ALLOWED_FIELDS.includes(column)) patch[column] = body[key] || null;
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: 'Nada para actualizar' }, { status: 400 });

  const { data, error } = await supabase.from('eta_items').update(patch).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ item: data });
}

export async function DELETE(request, { params }) {
  params = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { error: authError } = await authorize(supabase, user.id, id);
  if (authError) return authError;

  const { error } = await supabase.from('eta_items').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
