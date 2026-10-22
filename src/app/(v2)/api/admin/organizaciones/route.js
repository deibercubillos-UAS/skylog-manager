// Skylog V2.0 — organizaciones para el superadmin (Etapa F): buscar, ver y editar el plan/vencimiento, y eliminar.
// Eliminar una organización lo decide la BASE: si tiene registros operacionales bajo retención de 5 años (RAC 100
// §100.535(29)) o una custodia legal activa, el trigger lo impide y no se borra nada — se explica por qué.
import { requireSuperadmin } from '@/lib/v2/platformAdmin';
import { PLANS, PLAN_LABELS } from '@/lib/v2/planLimits';
import { logAudit } from '@/lib/v2/auditLog';
import { loadOrgPlans } from '@/lib/v2/adminOrgPlans';
import { normalizeLimitsOverride } from '@skylog/domain';

export const dynamic = 'force-dynamic';
const bad = (message, status = 400) => Response.json({ error: message }, { status });
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const BILLINGS = ['monthly', 'annual'];
const BILLING_LABELS = { monthly: 'mensual', annual: 'anual' };
const LIMIT_LABELS = { pilots: 'pilotos', aircraft: 'aeronaves', batteries: 'baterías' };

export async function GET(request) {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const q = (new URL(request.url).searchParams.get('q') || '').trim().replace(/[%,()]/g, ' ');
  let query = g.admin.from('organizations').select('id, company_name, nit, created_at').order('created_at', { ascending: false }).limit(50);
  if (q) query = query.or(`company_name.ilike.%${q}%,nit.ilike.%${q}%`);
  const { data: orgs, error } = await query;
  if (error) return bad(error.message, 500);
  if (!orgs?.length) return Response.json({ organizations: [] });

  const plans = await loadOrgPlans(g.admin, orgs.map((o) => o.id));
  return Response.json({ organizations: orgs.map((o) => ({ ...o, ...plans[o.id] })) });
}

// PATCH — el superadmin cambia el plan, el periodo de cobro (mensual/anual) y el vencimiento de una organización
// (cortesías, acuerdos por fuera de la pasarela, corrección de errores). Queda en la auditoría de la organización con
// el antes y el después. Si la organización tiene tarjeta inscrita en Wompi, el cobro automático usará el plan y el
// periodo que queden aquí, a partir de la nueva fecha de vencimiento.
export async function PATCH(request) {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const { organization_id, plan, billing, expires_at, notes, limits_override } = await request.json().catch(() => ({}));
  if (!organization_id) return bad('organization_id requerido');
  if (!PLANS.includes(plan)) return bad('Plan inválido.');
  if (billing !== undefined && !BILLINGS.includes(billing)) return bad('El periodo de cobro debe ser mensual o anual.');
  if (expires_at !== null && expires_at !== '' && expires_at !== undefined && !DATE_RE.test(expires_at)) return bad('El vencimiento debe ser una fecha (AAAA-MM-DD) o quedar vacío.');
  // Límites ajustados para esta organización (opcional): número, ilimitado (null) o, si no se envía la llave, el del plan.
  const limits = limits_override === undefined ? null : normalizeLimitsOverride(limits_override);
  if (limits?.error) return bad(limits.error);
  const { data: org } = await g.admin.from('organizations').select('id, company_name').eq('id', organization_id).maybeSingle();
  if (!org) return bad('Organización no encontrada', 404);
  const { data: before } = await g.admin.from('subscriptions').select('*').eq('organization_id', organization_id).maybeSingle();

  const row = {
    organization_id,
    plan,
    billing: billing || before?.billing || 'monthly',
    expires_at: expires_at || null,
    notes: String(notes || '').trim() || null,
    updated_by: g.personId,
    updated_at: new Date().toISOString(),
  };
  if (limits) row.limits_override = limits.value;
  const { data, error } = await g.admin.from('subscriptions').upsert(row, { onConflict: 'organization_id' }).select().single();
  if (error) {
    if (/limits_override/.test(error.message)) return bad('Falta aplicar en la base la migración 20261022120000 (límites por organización).', 503);
    return bad('No se pudo guardar el plan.', 500);
  }

  const limitsText = (o) => (o ? ` · límites ${Object.entries(o).map(([k, v]) => `${LIMIT_LABELS[k]} ${v ?? '∞'}`).join(', ')}` : '');
  const describe = (s) => (s ? `${PLAN_LABELS[s.plan] || s.plan} ${BILLING_LABELS[s.billing] || ''} · ${s.expires_at ? `vence ${String(s.expires_at).slice(0, 10)}` : 'sin vencimiento'}${limitsText(s.limits_override)}` : 'sin plan');
  await logAudit({
    organizationId: organization_id,
    action: 'update',
    module: 'Suscripción (plataforma)',
    entityLabel: `${describe(before)} → ${describe(data)}`,
    metadata: {
      before: before ? { plan: before.plan, billing: before.billing, expires_at: before.expires_at, limits_override: before.limits_override ?? null } : null,
      after: { plan: data.plan, billing: data.billing, expires_at: data.expires_at, limits_override: data.limits_override ?? null },
    },
  });
  return Response.json({ subscription: data });
}

export async function DELETE(request) {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const { organization_id, confirmName } = await request.json().catch(() => ({}));
  if (!organization_id) return bad('organization_id requerido');
  // Límites ajustados para esta organización (opcional): número, ilimitado (null) o, si no se envía la llave, el del plan.
  const limits = limits_override === undefined ? null : normalizeLimitsOverride(limits_override);
  if (limits?.error) return bad(limits.error);
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
