// Skylog V2.0 — Flota & Equipo: existencias de equipo de operación (una fila por tipo con su cantidad). Lectura para
// cualquier miembro; alta solo para gestores. La RLS de `equipment_stock` repite estas mismas reglas.
import { logAudit } from '@/lib/v2/auditLog';
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { validateStockItem } from '@skylog/domain';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId || !(memberships || []).some((m) => m.organization_id === organizationId)) {
    return Response.json({ error: 'organizationId requerido y con membresía activa' }, { status: 400 });
  }
  const { data, error } = await supabase.from('equipment_stock').select('*').eq('organization_id', organizationId).order('name');
  if (error) return Response.json({ error: 'Error consultando las existencias' }, { status: 500 });
  return Response.json({ items: data || [], isManager: isDutyManager(memberships, organizationId) });
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const { organizationId } = body;
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });
  const { error: resolveError, memberships, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) return Response.json({ error: 'Solo un gestor puede registrar existencias' }, { status: 403 });
  const check = validateStockItem(body);
  if (!check.ok) return Response.json({ error: check.errors.join(' ') }, { status: 400 });
  const { data, error } = await supabase.from('equipment_stock').insert({ organization_id: organizationId, ...check.clean, created_by: personId }).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  await logAudit({ organizationId, action: 'create', module: 'Equipo', entityLabel: `${data.name} (${data.quantity})` });
  return Response.json({ item: data });
}
