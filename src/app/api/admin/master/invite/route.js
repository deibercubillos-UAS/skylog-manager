import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { Resend } from 'resend';
import { escHtml } from '@/lib/emailHelpers';
import { getOrgContext } from '@/lib/apiAuth';
import { syncOrgMembership } from '@/lib/orgMembership';

export const dynamic = 'force-dynamic';

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

const ROLE_LABEL = {
  admin:        'Gerente General',
  jefe_pilotos: 'Jefe de Pilotos',
  gerente_sms:  'Gerente SMS',
  piloto:       'Piloto',
};

const VALID_ROLES = Object.keys(ROLE_LABEL);

const PLAN_INFO = {
  piloto:      { label: 'Piloto',      price: 'Gratis',       features: '1 drone · 1 piloto · bitácora digital RAC 100' },
  escuadrilla: { label: 'Escuadrilla', price: '$59.000/mes',  features: '3 drones · 4 pilotos · reportes SMS · programación de vuelos' },
  flota:       { label: 'Flota',       price: '$159.000/mes', features: '10 drones · 10 pilotos · todas las funciones · soporte prioritario' },
  enterprise:  { label: 'Enterprise',  price: 'A convenir',   features: 'Ilimitado · API · soporte dedicado · onboarding personalizado' },
};

function isValidEmail(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

// ── Guard superadmin ──────────────────────────────────────────────────────────
async function assertSuperadmin() {
  const supabase  = await createClient();
  const admin     = createAdminClient();
  const ctx = await getOrgContext(supabase);
  if (!ctx.user) return { error: 'No autenticado', status: 401 };
  if (ctx.role !== 'superadmin') return { error: 'Acceso denegado', status: 403 };
  return { user: ctx.user, admin, senderName: ctx.fullName || 'BitaFly' };
}

// GET /api/admin/master/invite — lista de organizaciones para el selector
export async function GET() {
  const ctx = await assertSuperadmin();
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { data: orgs } = await ctx.admin
    .from('organizations')
    .select('id, company_name, tax_id, unique_code')
    .order('company_name', { ascending: true });

  return NextResponse.json(orgs || []);
}

// POST /api/admin/master/invite — enviar invitación
// Body: { email, role, name?, orgId?, message? }
export async function POST(request) {
  const ctx = await assertSuperadmin();
  if (ctx.error) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const { email, role, plan, name, orgId, message } = await request.json();

  if (!isValidEmail(email)) return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  if (!VALID_ROLES.includes(role)) return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });

  const cleanEmail = email.trim().toLowerCase();
  const { admin, senderName } = ctx;

  // Verificar si ya tiene cuenta
  const { data: existing } = await admin
    .from('profiles')
    .select('id, organization_id')
    .ilike('email', cleanEmail)
    .maybeSingle();
  const isExistingUser = !!existing;

  // Activación directa sin ePayco: si el destinatario YA tiene cuenta y se
  // eligió un plan, se activa de una vez sobre su organización activa — sin
  // pasar por checkout ni tarjeta. A propósito NO se toca
  // `subscription_expires_at` aquí: el superadmin la define después, a mano,
  // desde el tab Usuarios (pedido explícito del usuario, 2026-07-07).
  let activatedPlan = null;
  if (isExistingUser && plan && PLAN_INFO[plan]) {
    const { error: planErr } = await admin
      .from('profiles')
      .update({ subscription_plan: plan })
      .eq('id', existing.id);
    if (!planErr) {
      activatedPlan = plan;
      if (existing.organization_id) {
        await syncOrgMembership(admin, {
          userId: existing.id,
          organizationId: existing.organization_id,
          subscriptionPlan: plan,
        });
      }
    } else {
      console.warn('[master/invite] no se pudo activar el plan:', planErr.message);
    }
  }

  let orgName    = null;
  let joinNit    = null;
  let inviteToken = null;

  // Si se especificó org → crear registro en invitations
  if (orgId) {
    const { data: org } = await admin
      .from('organizations')
      .select('company_name, tax_id, unique_code')
      .eq('id', orgId)
      .single();

    if (!org) return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });

    orgName  = org.company_name;
    joinNit  = (org.tax_id || org.unique_code || '').replace(/[\s\-.]/g, '');

    // Upsert invitación (idempotente por org + email)
    const { data: existingInv } = await admin
      .from('invitations')
      .select('id')
      .eq('organization_id', orgId)
      .ilike('email', cleanEmail)
      .maybeSingle();

    if (existingInv) {
      const { data: inv } = await admin
        .from('invitations')
        .update({ role, status: 'pending', name: name || null, accepted_at: null })
        .eq('id', existingInv.id)
        .select('token')
        .single();
      inviteToken = inv?.token;
    } else {
      const { data: inv } = await admin
        .from('invitations')
        .insert({ organization_id: orgId, email: cleanEmail, role, status: 'pending', name: name || null })
        .select('token')
        .single();
      inviteToken = inv?.token;
    }
  }

  // Construir CTA
  let ctaUrl;
  if (isExistingUser && orgId) {
    ctaUrl = `${SITE()}/login?next=${encodeURIComponent('/dashboard')}`;
  } else if (orgId && joinNit) {
    ctaUrl = `${SITE()}/registro?email=${encodeURIComponent(cleanEmail)}&join=1&nit=${encodeURIComponent(joinNit)}`;
  } else {
    ctaUrl = `${SITE()}/registro?email=${encodeURIComponent(cleanEmail)}`;
  }

  const ctaLabel = isExistingUser
    ? 'Ver invitación en mi dashboard'
    : orgId
      ? 'Crear cuenta y unirme a la organización'
      : 'Crear mi cuenta en BitaFly';

  const safeName    = escHtml(name || 'Hola');
  const safeRole    = escHtml(ROLE_LABEL[role]);
  const safeOrg     = escHtml(orgName || 'BitaFly');
  const safeSender  = escHtml(senderName);
  const safeMessage = message ? escHtml(message) : null;
  const planData    = plan && PLAN_INFO[plan] ? PLAN_INFO[plan] : null;

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ error: 'Servicio de correo no configurado' }, { status: 500 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: emailErr } = await resend.emails.send({
    from:    'BitaFly <no-reply@bitafly.com>',
    replyTo: 'soporte@bitafly.com',
    to:      [cleanEmail],
    subject: orgId
      ? `Invitación para unirte a ${orgName} en BitaFly`
      : '¡Te invitamos a gestionar tus operaciones de drones con BitaFly!',
    html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;box-shadow:0 4px 24px rgba(0,0,0,.08);">
        <tr><td style="background:#ec5b13;padding:32px 40px;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">BitaFly</h1>
          <p style="margin:6px 0 0;color:#fde0cc;font-size:13px;">Gestión de operaciones con drones · RAC 100</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1a202c;font-weight:700;">${safeName},</p>
          ${orgId
            ? `<p style="margin:0 0 20px;font-size:15px;color:#4a5568;line-height:1.7;">
                <strong>${safeSender}</strong> te invitó a unirte a <strong>${safeOrg}</strong>
                en BitaFly con el rol de <strong>${safeRole}</strong>.
               </p>`
            : `<p style="margin:0 0 20px;font-size:15px;color:#4a5568;line-height:1.7;">
                El equipo de <strong>BitaFly</strong> te invita a conocer la plataforma de gestión de
                operaciones con drones más completa de Colombia. Cumple con la normativa RAC 100,
                lleva tu bitácora digital y programa tus vuelos con seguridad.
               </p>`
          }
          ${safeMessage ? `<p style="margin:0 0 24px;font-size:15px;color:#4a5568;line-height:1.7;padding:16px;background:#fff8f5;border-left:4px solid #ec5b13;border-radius:0 8px 8px 0;">${safeMessage}</p>` : ''}
          ${planData ? `
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;background:#fff8f5;border:2px solid #fde0cc;border-radius:12px;overflow:hidden;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;color:#ec5b13;">${activatedPlan ? 'Plan activado' : 'Plan sugerido'}</p>
              <table width="100%" cellpadding="0" cellspacing="0"><tr>
                <td>
                  <p style="margin:0;font-size:20px;font-weight:900;color:#1a202c;">${escHtml(planData.label)}</p>
                  <p style="margin:4px 0 0;font-size:13px;color:#718096;">${escHtml(planData.features)}</p>
                </td>
                <td align="right" style="vertical-align:top;white-space:nowrap;padding-left:16px;">
                  <p style="margin:0;font-size:18px;font-weight:900;color:#ec5b13;">${escHtml(planData.price)}</p>
                </td>
              </tr></table>
            </td></tr>
          </table>` : ''}
          <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;"><tr>
            <td style="background:#ec5b13;border-radius:10px;">
              <a href="${ctaUrl}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:900;text-decoration:none;letter-spacing:-0.2px;">
                ${ctaLabel} →
              </a>
            </td>
          </tr></table>
          <p style="margin:0;font-size:13px;color:#718096;">Si no esperabas este correo, puedes ignorarlo sin ningún problema.</p>
        </td></tr>
        <tr><td style="background:#f7f8fa;padding:20px 40px;border-top:1px solid #edf2f7;">
          <p style="margin:0;font-size:12px;color:#a0aec0;text-align:center;">BitaFly · bitafly.com · soporte@bitafly.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  });

  if (emailErr) {
    console.error('[master/invite] Resend error:', emailErr);
    return NextResponse.json({ error: emailErr.message || 'Error al enviar el correo' }, { status: 502 });
  }

  return NextResponse.json({ success: true, isExistingUser, orgName, activatedPlan });
}
