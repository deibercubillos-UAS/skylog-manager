// GET /api/dashboard/subscription-expiry — vigencia de la suscripción de pago de
// la organización activa (solo lectura). Alimenta el banner "vence en N días" /
// "cuenta vencida" en el dashboard — distinto de /api/dashboard/grant-expiry
// (ese es para regalos gratuitos vía free_grants, este es para el ciclo de pago
// real de un plan piloto/escuadrilla/flota).
//
// Solo aplica a quien puede gestionar el pago (PERMISSIONS.canManageSubscription
// — Gerente General/Piloto Independiente, ambos role='admin', o superadmin):
// Jefe de Pilotos/Gerente SMS/Piloto no ven ni gestionan la facturación de la org.

import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClientSSR();
    const ctx = await getOrgContext(supabase);
    if (!ctx.user || !ctx.orgId) return NextResponse.json({ show: false });
    if (!PERMISSIONS.canManageSubscription.includes(ctx.role)) {
      return NextResponse.json({ show: false });
    }

    const { data: membership } = await supabase
      .from('organization_members')
      .select('subscription_plan, subscription_expires_at, epayco_subscription_id')
      .eq('user_id', ctx.user.id)
      .eq('organization_id', ctx.orgId)
      .maybeSingle();

    // Sin fecha de vencimiento (ej. Enterprise, o cuenta sin plan configurado
    // todavía) → nada que avisar.
    if (!membership?.subscription_expires_at) return NextResponse.json({ show: false });

    const daysLeft = Math.ceil((new Date(membership.subscription_expires_at) - new Date()) / 86400000);

    return NextResponse.json({
      show:       true,
      daysLeft,
      expiresAt:  membership.subscription_expires_at,
      planKey:    membership.subscription_plan,
      recurring:  !!membership.epayco_subscription_id,
    });
  } catch (err) {
    console.error('[dashboard/subscription-expiry]', err.message);
    return NextResponse.json({ show: false });
  }
}
