// Skylog V2.0 — GET /api/suscripcion/aviso?organizationId= — qué aviso de suscripción ve el Gerente General (vence pronto,
// venció, o «activa tu pago en la nueva versión» si viene de ePayco). Solo `admin`/`superadmin` de esa organización: el
// resto no gestiona la facturación y no ve avisos de cobro. Lectura pura; la lógica vive en @skylog/domain.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { subscriptionNotice } from '@skylog/domain';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  const isAdmin = (memberships || []).some((m) => m.organization_id === organizationId && ['admin', 'superadmin'].includes(m.role));
  if (!isAdmin) return Response.json({ notice: { level: 'none', daysLeft: null } });

  const { data: sub, error: subError } = await supabase.from('subscriptions').select('plan, billing, expires_at, payment_provider, wompi_payment_source_id, migrated_from_v1').eq('organization_id', organizationId).maybeSingle();
  if (subError) return Response.json({ error: subError.message }, { status: 500 });
  // El plan y el ciclo que ya tenía, para llevarlo directo al pago (sin elegir de nuevo).
  return Response.json({ notice: subscriptionNotice(sub), plan: sub?.plan || null, billing: sub?.billing || 'monthly' });
}
