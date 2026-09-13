import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { syncOrgMembership } from '@/lib/orgMembership';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = await createClientSSR();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // Gate de rol en la API, no solo en la UI (ver Auditoría 2026-07-22): solo
    // el dueño de la cuenta puede cancelar la suscripción de su organización.
    const ctx = await getOrgContext(supabase);
    if (!['superadmin', 'admin'].includes(ctx.role)) {
      return NextResponse.json({ error: 'Solo el administrador de la organización puede cancelar la suscripción.' }, { status: 403 });
    }

    // Leer perfil completo antes de cancelar
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, organization_id')
      .eq('id', user.id)
      .single();

    // ── Cancelar con Wompi ────────────────────────────────────────────────────
    // A diferencia de ePayco, no existe un "plan hospedado" que cancelar
    // remotamente — Wompi solo guarda el token de tarjeta (payment_source_id).
    // Cancelar = limpiar ese token para que el cron de recurrencia
    // (api/cron/wompi-recurring-charge) deje de intentar cobrar.

    // ── Degradar a plan piloto en Supabase ─────────────────────────────────────
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_plan:       'piloto',
        epayco_subscription_id:  null,
        epayco_ref:              null,
        payment_provider:        null,
        wompi_payment_source_id: null,
        subscription_expires_at: null,
        updated_at:              new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) throw error;

    const admin = createAdminClient();

    if (profile?.organization_id) {
      await syncOrgMembership(admin, {
        userId: user.id,
        organizationId: profile.organization_id,
        subscriptionPlan: 'piloto',
        epaycoSubscriptionId: null,
        epaycoRef: null,
        paymentProvider: null,
        wompiPaymentSourceId: null,
        subscriptionExpiresAt: null,
      });

      // ── Cortar comisión del socio: el referido deja de pagar → status cancelada ──
      try {
        await admin.from('referrals')
          .update({ status: 'cancelada' })
          .eq('org_id', profile.organization_id)
          .eq('status', 'activa');
      } catch (e) {
        console.error('[socios] no se pudo cancelar referral:', e.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Cancel route error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
