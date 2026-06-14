import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { cancelSubscription, cancelSubscriptionsByEmail } from '@/lib/epayco';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const supabase = await createClientSSR();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    // Leer perfil completo antes de cancelar
    const { data: profile } = await supabase
      .from('profiles')
      .select('epayco_subscription_id, email, organization_id')
      .eq('id', user.id)
      .single();

    // ── Cancelar en ePayco ────────────────────────────────────────────────────
    if (profile?.epayco_subscription_id) {
      // Camino principal: tenemos el ID guardado
      try {
        await cancelSubscription(profile.epayco_subscription_id);
        console.log(`[epayco] ✓ Cancel OK uid=${profile.epayco_subscription_id} user=${user.id}`);
      } catch (err) {
        console.error(`✗ Cancel ePayco falló uid=${profile.epayco_subscription_id}:`, err.message);
      }
    } else {
      // Fallback: buscar por email en listado de suscripciones de ePayco
      const email = profile?.email || user.email;
      console.log(`[epayco] Cancel fallback: buscando suscripciones por email=${email} user=${user.id}`);
      try {
        const result = await cancelSubscriptionsByEmail(email);
        console.log(`[epayco] Cancel by email: matched=${result.matched}`, JSON.stringify(result.results));
      } catch (err) {
        console.error('Cancel by email falló:', err.message);
      }
    }

    // ── Degradar a plan piloto en Supabase (siempre, independiente de ePayco) ─
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_plan:       'piloto',
        epayco_subscription_id:  null,
        epayco_ref:              null,
        subscription_expires_at: null,
        updated_at:              new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) throw error;

    // ── Cortar comisión del socio: el referido deja de pagar → status cancelada ──
    if (profile?.organization_id) {
      try {
        const admin = createAdminClient();
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
