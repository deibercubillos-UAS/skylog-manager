// POST /api/epayco/checkout
// Guarda el intent de suscripción y devuelve la URL de la página hosteada de ePayco
import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { createClient } from '@supabase/supabase-js';
import { EPAYCO_PLANS } from '@/lib/planLimits';
import { getOrgContext } from '@/lib/apiAuth';

export async function POST(request) {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  // Gate de rol en la API, no solo en la UI (ver Auditoría 2026-07-22): solo
  // el dueño de la cuenta puede iniciar un checkout para su organización.
  const ctx = await getOrgContext(supabase);
  if (!['superadmin', 'admin'].includes(ctx.role)) {
    return NextResponse.json({ error: 'Solo el administrador de la organización puede gestionar el pago.' }, { status: 403 });
  }

  const { planKey, billing, partnerCode } = await request.json();
  const cfg = EPAYCO_PLANS[planKey]?.[billing];
  if (!cfg) return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });

  // Código de socio/asesor (opcional) — normalizado; se valida en el webhook (P7)
  const code = partnerCode ? String(partnerCode).trim().toUpperCase().slice(0, 32) : null;

  // Referencia única para este intent
  const reference = `bitafly_${planKey}_${billing}_${user.id}_${Date.now()}`;

  // Guardar intent en Supabase (Service Role para evitar RLS)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await admin.from('pending_subscriptions').insert({
    reference,
    user_id:   user.id,
    plan_key:  planKey,
    billing,
    epayco_id: cfg.epaycoId,
    partner_code: code,
  });

  if (error) {
    console.error('pending_subscriptions insert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // La URL del landing de ePayco usa el _id interno (planUid), no el id_plan
  const epaycoUrl = `https://subscription-landing.epayco.co/plan/${cfg.planUid}`;

  return NextResponse.json({ url: epaycoUrl, reference });
}
