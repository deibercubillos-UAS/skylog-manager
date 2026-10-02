// Skylog V2.0 — Flota & Equipo, Fase 2. PATCH acotado: salud/estado/ciclos.
// `cycles` se acepta aquí como incremento explícito (no valor absoluto) y se
// aplica vía RPC — nunca un `update` directo de la columna derivada.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

const HEALTH_STATUSES = ['buena', 'regular', 'mala'];
const STATUSES = ['operativo', 'baja'];

export async function PATCH(request, { params }) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { data: existing, error: fetchError } = await supabase.from('batteries').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: 'Error consultando la batería' }, { status: 500 });
  if (!existing) return Response.json({ error: 'Batería no encontrada' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, existing.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede editar baterías' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.healthStatus && !HEALTH_STATUSES.includes(body.healthStatus)) {
    return Response.json({ error: 'healthStatus debe ser uno de: ' + HEALTH_STATUSES.join(', ') }, { status: 400 });
  }
  if (body.status && !STATUSES.includes(body.status)) {
    return Response.json({ error: 'status debe ser uno de: ' + STATUSES.join(', ') }, { status: 400 });
  }

  if (body.addCycles) {
    const { error: rpcError } = await supabase.rpc('increment_battery_cycles', { p_id: id, p_cycles: Number(body.addCycles) });
    if (rpcError) return Response.json({ error: rpcError.message }, { status: 500 });
  }

  const patch = {};
  if (body.healthStatus !== undefined) patch.health_status = body.healthStatus || null;
  if (body.status !== undefined) patch.status = body.status;

  let data = null;
  if (Object.keys(patch).length > 0) {
    const { data: updated, error } = await supabase.from('batteries').update(patch).eq('id', id).select().single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    data = updated;
  } else {
    const { data: fresh } = await supabase.from('batteries').select().eq('id', id).single();
    data = fresh;
  }

  return Response.json({ battery: data });
}
