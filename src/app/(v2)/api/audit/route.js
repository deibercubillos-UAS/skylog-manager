// GET /api/audit?organizationId=&module=&action=&limit= — registro de acciones. Solo gestores (la RLS de `audit_log`
// repite la regla). Los más recientes primero; tope de 500.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const sp = new URL(request.url).searchParams;
  const organizationId = sp.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });
  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) return Response.json({ error: 'Solo un gestor puede ver el registro de acciones' }, { status: 403 });

  const limit = Math.min(Math.max(parseInt(sp.get('limit') || '200', 10) || 200, 1), 500);
  let q = supabase.from('audit_log').select('id, actor_name, action, module, entity_label, created_at').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(limit);
  if (sp.get('module')) q = q.eq('module', sp.get('module'));
  if (sp.get('action')) q = q.eq('action', sp.get('action'));
  const { data, error } = await q;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ entries: data || [] });
}
