// Skylog V2.0 — ficha técnica de un modelo de UAS (RAC 100 Apéndice 1, Parte B). Edita marca/modelo y los
// atributos del catálogo `SPEC_FIELDS`; todo lo demás se ignora (mass-assignment). Lo valida el dominio.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { sanitizeSpecInput } from '@skylog/domain';

export async function PATCH(request, { params }) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { data: existing, error: fetchError } = await supabase.from('aircraft_models').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: 'Error consultando el modelo' }, { status: 500 });
  if (!existing) return Response.json({ error: 'Modelo no encontrado' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede editar la ficha de un modelo' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { values, errors } = sanitizeSpecInput(body);
  if (errors.length) return Response.json({ error: errors.join('. '), errors }, { status: 400 });

  const patch = { ...values };
  for (const k of ['brand', 'model']) {
    if (body[k] !== undefined) {
      const v = String(body[k]).trim();
      if (!v) return Response.json({ error: `${k === 'brand' ? 'La marca' : 'El modelo'} no puede quedar vacío` }, { status: 400 });
      patch[k] = v;
    }
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: 'Nada para actualizar' }, { status: 400 });

  const { data, error } = await supabase.from('aircraft_models').update(patch).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ model: data });
}
