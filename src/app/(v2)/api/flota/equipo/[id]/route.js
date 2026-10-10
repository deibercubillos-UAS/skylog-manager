// Skylog V2.0 — editar / eliminar una existencia de equipo (solo gestores; la RLS lo repite).
import { logAudit } from '@/lib/v2/auditLog';
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { validateStockItem } from '@skylog/domain';

export const dynamic = 'force-dynamic';

async function guard(supabase, id) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { data: row } = await supabase.from('equipment_stock').select('id, organization_id').eq('id', id).maybeSingle();
  if (!row) return { error: Response.json({ error: 'No encontrado' }, { status: 404 }) };
  const { error, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  if (!isDutyManager(memberships, row.organization_id)) return { error: Response.json({ error: 'Solo un gestor puede modificar las existencias' }, { status: 403 }) };
  return { row };
}

export async function PATCH(request, { params }) {
  params = await params;
  const supabase = await createClientSSR();
  const g = await guard(supabase, params.id);
  if (g.error) return g.error;
  const check = validateStockItem(await request.json().catch(() => ({})));
  if (!check.ok) return Response.json({ error: check.errors.join(' ') }, { status: 400 });
  const { data, error } = await supabase.from('equipment_stock').update(check.clean).eq('id', params.id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await logAudit({ organizationId: g.row.organization_id, action: 'update', module: 'Equipo', entityLabel: `${data.name} (${data.quantity})` });
  return Response.json({ item: data });
}

export async function DELETE(_request, { params }) {
  params = await params;
  const supabase = await createClientSSR();
  const g = await guard(supabase, params.id);
  if (g.error) return g.error;
  const { error } = await supabase.from('equipment_stock').delete().eq('id', params.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await logAudit({ organizationId: g.row.organization_id, action: 'delete', module: 'Equipo', entityLabel: 'Existencia de equipo eliminada' });
  return Response.json({ ok: true });
}
