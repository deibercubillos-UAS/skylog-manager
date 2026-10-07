// Skylog V2.0 — organizaciones para el superadmin (Etapa F): buscar, ver y editar el plan/vencimiento, y eliminar.
// Eliminar una organización lo decide la BASE: si tiene registros operacionales bajo retención de 5 años (RAC 100
// §100.535(29)) o una custodia legal activa, el trigger lo impide y no se borra nada — se explica por qué.
import { requireSuperadmin } from '@/lib/v2/platformAdmin';
import { PLANS } from '@/lib/v2/planLimits';

export const dynamic = 'force-dynamic';
const bad = (message, status = 400) => Response.json({ error: message }, { status });
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request) {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const q = (new URL(request.url).searchParams.get('q') || '').trim().replace(/[%,()]/g, ' ');
  let query = g.admin.from('organizations').select('id, company_name, nit, created_at').order('created_at', { ascending: false }).limit(50);
  if (q) query = query.or(`company_name.ilike.%${q}%,nit.ilike.%${q}%`);
  const { data: orgs, error } = await query;
  if (error) return bad(error.message, 500);
  if (!orgs?.length) return Response.json({ organizations: [] });

  const ids = orgs.map((o) => o.id);
  const [subs, members, aircraft] = await Promise.all([
    g.admin.from('subscriptions').select('organization_id, plan, expires_at, billing, payment_provider, notes').in('organization_id', ids),
    g.admin.from('memberships').select('organization_id').in('organization_id', ids).eq('status', 'activa'),
    g.admin.from('aircraft').select('organization_id').in('organization_id', ids),
  ]);
  const count = (rows) => (rows || []).reduce((a, r) => ((a[r.organization_id] = (a[r.organization_id] || 0) + 1), a), {});
  const subBy = Object.fromEntries((subs.data || []).map((s) => [s.organization_id, s]));
  const mBy = count(members.data);
  const aBy = count(aircraft.data);
  return Response.json({
    organizations: orgs.map((o) => ({ ...o, subscription: subBy[o.id] || null, members: mBy[o.id] || 0, aircraft: aBy[o.id] || 0 })),
  });
}

export async function PATCH(request) {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const { organization_id, plan, expires_at, notes } = await request.json().catch(() => ({}));
  if (!organization_id) return bad('organization_id requerido');
  if (!PLANS.includes(plan)) return bad('Plan inválido.');
  if (expires_at !== null && expires_at !== '' && expires_at !== undefined && !DATE_RE.test(expires_at)) return bad('El vencimiento debe ser una fecha (AAAA-MM-DD) o quedar vacío.');
  const { data: org } = await g.admin.from('organizations').select('id').eq('id', organization_id).maybeSingle();
  if (!org) return bad('Organización no encontrada', 404);

  const { data, error } = await g.admin
    .from('subscriptions')
    .upsert({ organization_id, plan, expires_at: expires_at || null, notes: String(notes || '').trim() || null, updated_by: g.personId, updated_at: new Date().toISOString() }, { onConflict: 'organization_id' })
    .select()
    .single();
  if (error) return bad(error.message, 500);
  return Response.json({ subscription: data });
}

export async function DELETE(request) {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const { organization_id, confirmName } = await request.json().catch(() => ({}));
  if (!organization_id) return bad('organization_id requerido');
  const { data: org } = await g.admin.from('organizations').select('id, company_name').eq('id', organization_id).maybeSingle();
  if (!org) return bad('Organización no encontrada', 404);
  if (String(confirmName || '').trim() !== org.company_name) return bad('Escribe el nombre exacto de la organización para confirmar.');
  // Nunca se elimina la organización donde hay un superadmin: dejaría a la plataforma sin administrador.
  const { data: sa } = await g.admin.from('memberships').select('id').eq('organization_id', organization_id).eq('role', 'superadmin').eq('status', 'activa').limit(1);
  if (sa?.length) return bad('Esta organización tiene un superadmin y no se puede eliminar.', 409);

  const { error } = await g.admin.from('organizations').delete().eq('id', organization_id);
  if (error) {
    const retained = error.code === '23001' || /retenci|custodia/i.test(error.message);
    if (retained) return bad(`No se puede eliminar: ${error.message} Solo podrá eliminarse cuando venza la retención; mientras tanto, déjala sin plan.`, 409);
    return bad(error.message, 500);
  }
  return Response.json({ ok: true });
}
