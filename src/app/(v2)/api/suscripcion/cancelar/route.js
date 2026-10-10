// POST /api/suscripcion/cancelar — el Gerente General retira el cobro automático (tarjeta tokenizada de Wompi).
// No quita acceso: el plan sigue vigente hasta `expires_at`; después, queda sujeto a las reglas de vencimiento de siempre.
// Volver a pagar desde /suscripcion lo reactiva (activateSubscription limpia `canceled_at`).
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { createNotifications } from '@/lib/v2/notify';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { organizationId } = await request.json().catch(() => ({}));
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  const isAdmin = (memberships || []).some((m) => m.organization_id === organizationId && ['admin', 'superadmin'].includes(m.role));
  if (!isAdmin) return Response.json({ error: 'Solo el Gerente General puede cancelar la renovación automática' }, { status: 403 });

  const admin = createAdminClient();
  const { data: sub, error: findError } = await admin.from('subscriptions').select('organization_id, plan, expires_at, payment_provider, wompi_payment_source_id, canceled_at').eq('organization_id', organizationId).maybeSingle();
  if (findError) return Response.json({ error: findError.message }, { status: 500 });
  if (!sub || sub.payment_provider !== 'wompi' || !sub.wompi_payment_source_id) {
    return Response.json({ error: sub?.canceled_at ? 'La renovación automática ya estaba cancelada.' : 'Esta organización no tiene cobro automático activo.' }, { status: 409 });
  }

  const { error } = await admin
    .from('subscriptions')
    .update({ wompi_payment_source_id: null, canceled_at: new Date().toISOString(), updated_by: personId, updated_at: new Date().toISOString() })
    .eq('organization_id', organizationId);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  await createNotifications({
    organizationId,
    roles: ['admin'],
    type: 'sistema',
    title: 'Se canceló la renovación automática',
    body: sub.expires_at ? `Tu plan sigue activo hasta el ${sub.expires_at}. Después no se cobrará.` : 'No se volverá a cobrar la tarjeta.',
    link: '/suscripcion',
    actorPersonId: personId,
    includeActor: true,
  }, admin);

  return Response.json({ ok: true, expires_at: sub.expires_at });
}
