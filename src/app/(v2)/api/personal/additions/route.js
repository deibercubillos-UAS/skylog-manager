// Skylog V2.0 — adiciones de la licencia de una persona (CIPU, RAC 100 §100.810(d)).
// La RLS de `person_additions` decide quién ve y quién escribe (la propia persona o un gestor de una
// organización donde participa); aquí solo se valida el catálogo y se devuelven mensajes claros.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { PILOT_ADDITIONS } from '@skylog/domain';

async function session() {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, personId } = await resolveCurrentPerson(supabase, user.id);
  if (error) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  return { supabase, personId };
}

export async function GET(request) {
  const s = await session();
  if (s.error) return s.error;
  const personId = new URL(request.url).searchParams.get('personId') || s.personId;
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado' }, { status: 404 });
  const { data, error } = await s.supabase.from('person_additions').select('id, addition, valid_until').eq('person_id', personId).order('addition');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ additions: data || [], catalog: PILOT_ADDITIONS });
}

// POST — agrega o actualiza la vigencia de una adición (idempotente por persona+adición).
export async function POST(request) {
  const s = await session();
  if (s.error) return s.error;
  const body = await request.json().catch(() => ({}));
  const personId = body.personId || s.personId;
  if (!personId) return Response.json({ error: 'Falta la persona' }, { status: 400 });
  if (!PILOT_ADDITIONS.includes(body.addition)) return Response.json({ error: 'Adición no válida' }, { status: 400 });
  if (body.validUntil && !/^\d{4}-\d{2}-\d{2}$/.test(body.validUntil)) return Response.json({ error: 'La vigencia debe ser una fecha válida' }, { status: 400 });

  const { data, error } = await s.supabase
    .from('person_additions')
    .upsert({ person_id: personId, addition: body.addition, valid_until: body.validUntil || null, created_by: s.personId }, { onConflict: 'person_id,addition' })
    .select('id, addition, valid_until')
    .single();
  if (error) return Response.json({ error: 'No tienes permiso para registrar adiciones de esta persona' }, { status: 403 });
  return Response.json({ addition: data });
}

export async function DELETE(request) {
  const s = await session();
  if (s.error) return s.error;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'id es requerido' }, { status: 400 });
  const { data, error } = await s.supabase.from('person_additions').delete().eq('id', id).select('id');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data?.length) return Response.json({ error: 'No se encontró la adición o no tienes permiso para quitarla' }, { status: 404 });
  return Response.json({ ok: true });
}
