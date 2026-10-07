// Skylog V2.0 — POST /api/suscripcion/wompi/checkout
// Equivalente V2 de v1 `/api/wompi/checkout`: Wompi no tiene "planes
// hospedados" — devolvemos la config firmada para que el frontend abra el
// Widget de Wompi (checkout.wompi.co/widget.js) client-side. La tarjeta
// nunca pasa por nuestro servidor.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { PLAN_PRICING } from '@/lib/v2/planLimits';
import { buildIntegritySignature } from '@/lib/wompi';
import { findActiveCode } from '@/lib/v2/referrals';

function isAdmin(memberships, organizationId) {
  return (memberships || []).some((m) => m.organization_id === organizationId && ['admin', 'superadmin'].includes(m.role));
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, plan, billing } = body;
  if (!organizationId || !plan || !billing) {
    return Response.json({ error: 'organizationId, plan y billing son requeridos' }, { status: 400 });
  }

  const cfg = PLAN_PRICING[plan]?.[billing];
  if (!cfg) return Response.json({ error: 'Plan o ciclo inválido para pago (Enterprise se gestiona a medida)' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });
  if (!isAdmin(memberships, organizationId)) {
    return Response.json({ error: 'Solo el Gerente General puede pagar el plan de la organización' }, { status: 403 });
  }

  const reference = `bitafly_v2_${plan}_${billing}_${organizationId}_${Date.now()}`;

  const admin = createAdminClient();
  // Código de un socio (opcional): se valida aquí para avisar al instante si está mal escrito.
  let partnerCode = null;
  if (body.partnerCode && String(body.partnerCode).trim()) {
    const found = await findActiveCode(admin, body.partnerCode);
    if (!found) return Response.json({ error: 'El código de socio no existe o está inactivo.' }, { status: 400 });
    partnerCode = found.code;
  }
  const { error } = await admin.from('pending_subscriptions').insert({
    reference,
    organization_id: organizationId,
    plan,
    billing,
    created_by: personId,
    partner_code: partnerCode,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const amountInCents = cfg.amount * 100;
  let signature;
  try {
    signature = buildIntegritySignature({ reference, amountInCents, currency: 'COP' });
  } catch (e) {
    // WOMPI_INTEGRITY_SECRET no configurada todavía en este entorno.
    return Response.json({ error: `Wompi no está configurado en este entorno: ${e.message}` }, { status: 500 });
  }

  return Response.json({
    reference,
    widget: {
      publicKey: process.env.WOMPI_PUBLIC_KEY,
      currency: 'COP',
      amountInCents,
      reference,
      signature: { integrity: signature },
      redirectUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com'}/suscripcion`,
      customerData: { email: user.email },
    },
  });
}
