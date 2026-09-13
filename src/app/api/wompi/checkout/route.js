// POST /api/wompi/checkout — reemplaza /api/epayco/checkout.
// Wompi no tiene "planes hospedados" como ePayco — en vez de devolver una URL
// de redirección, devolvemos la config firmada para que el frontend abra el
// Widget de Wompi (checkout.wompi.co/widget.js) client-side. La tarjeta nunca
// pasa por nuestro servidor.
import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';
import { WOMPI_PLANS } from '@/lib/planLimits';
import { getOrgContext } from '@/lib/apiAuth';
import { buildIntegritySignature } from '@/lib/wompi';

export async function POST(request) {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const ctx = await getOrgContext(supabase);
  if (!['superadmin', 'admin'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Solo el administrador de la organización puede gestionar el pago.' }, { status: 403 });
  }

  const { planKey, billing, partnerCode } = await request.json();
  const cfg = WOMPI_PLANS[planKey]?.[billing];
  if (!cfg) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });

  const code = partnerCode ? String(partnerCode).trim().toUpperCase().slice(0, 32) : null;
  const reference = `bitafly_${planKey}_${billing}_${user.id}_${Date.now()}`;

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await admin.from('pending_subscriptions').insert({
    reference,
    user_id:      user.id,
    plan_key:     planKey,
    billing,
    partner_code: code,
  });

  if (error) {
    console.error('pending_subscriptions insert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const amountInCents = cfg.amount * 100;
  const signature = buildIntegritySignature({ reference, amountInCents, currency: 'COP' });

  return NextResponse.json({
    reference,
    widget: {
      publicKey: process.env.WOMPI_PUBLIC_KEY,
      currency: 'COP',
      amountInCents,
      reference,
      signature: { integrity: signature },
      redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com'}/dashboard/subscription/response`,
      customerData: { email: user.email },
    },
  });
}
