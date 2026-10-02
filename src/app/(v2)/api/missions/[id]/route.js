// Skylog V2.0 — Programación (Operación). PATCH edita una misión ya
// programada — campos explícitos (`name`, `zone`, `scheduledAt`, `notes`,
// `status`), nunca mass-assignment. `name` es editable después de crear la
// misión (pedido explícito del usuario). Sin DELETE — se conserva el
// registro (evidencia de qué se programó/canceló), mismo criterio que
// cancelar en vez de borrar.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

const EDITABLE_FIELDS = {
  name: 'name',
  zone: 'zone',
  scheduledAt: 'scheduled_at',
  notes: 'notes',
  status: 'status',
};

export async function PATCH(request, { params }) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  if (body.status !== undefined && body.status !== 'cancelada' && body.status !== 'programada') {
    return Response.json({ error: "status debe ser 'programada' o 'cancelada'" }, { status: 400 });
  }
  if (body.name !== undefined && !String(body.name).trim()) {
    return Response.json({ error: 'name no puede quedar vacío' }, { status: 400 });
  }

  const updates = {};
  for (const [key, column] of Object.entries(EDITABLE_FIELDS)) {
    if (body[key] !== undefined) updates[column] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: 'Ningún campo editable en el cuerpo de la petición' }, { status: 400 });
  }

  const { data: mission, error: findError } = await supabase.from('missions').select('organization_id').eq('id', params.id).maybeSingle();
  if (findError) return Response.json({ error: 'Error consultando la misión' }, { status: 500 });
  if (!mission) return Response.json({ error: 'Misión no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, mission.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede modificar una misión programada' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('missions')
    .update(updates)
    .eq('id', params.id)
    .select('*, pic:pic_person_id(full_name)')
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ mission: data });
}
