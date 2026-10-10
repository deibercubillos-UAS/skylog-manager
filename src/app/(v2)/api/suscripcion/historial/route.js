// GET /api/suscripcion/historial?organizationId= — pagos de la suscripción (informativo). Solo Gerente General.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });
  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  const isAdmin = (memberships || []).some((m) => m.organization_id === organizationId && ['admin', 'superadmin'].includes(m.role));
  if (!isAdmin) return Response.json({ error: 'Solo el Gerente General ve el historial de pagos' }, { status: 403 });

  const { data, error } = await createAdminClient()
    .from('billing_history')
    .select('id, transaction_id, reference, plan, billing, amount_cop, currency, status, paid_at')
    .eq('organization_id', organizationId)
    .order('paid_at', { ascending: false })
    .limit(200);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ payments: data || [] });
}
