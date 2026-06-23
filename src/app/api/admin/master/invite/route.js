import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { Resend } from 'resend';
import { escHtml } from '@/lib/emailHelpers';

export const dynamic = 'force-dynamic';

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

const ROLE_LABEL = {
  admin:        'Gerente General',
  jefe_pilotos: 'Jefe de Pilotos',
  gerente_sms:  'Gerente SMS',
  piloto:       'Piloto',
};

const VALID_ROLES = Object.keys(ROLE_LABEL);

function isValidEmail(e) {
  return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

// ── Guard superadmin ──────────────────────────────────────────────────────────
async function assertSuperadmin() {
  const supabase  = await createClient();
  const admin     = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado', status: 401 };
  const { data: p } = await admin.from('profiles').select('role, full_name').eq('id', user.id).single();
  if (p?.role !== 'superadmin') return { error: 'Acceso denegado', status: 403 };
  return { user, admin, senderName: p.full_name || 'BitaFly' };
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

  const { email, role, name, orgId, message } = await request.json();

  if (!isValidEmail(email)) return NextResponse.json({ error: 'Email inválido' }, { status: 400 });
  if (!VALID_ROLES.includes(role)) return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });

  const cleanEmail = email.trim().toLowerCase();
  const { admin, senderName } = ctx;

  // Verificar si ya tiene cuenta
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', cleanEmail)
    .maybeSingle();
  const isExistingUser = !!existing;

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
            ? `<p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.7;">
                <strong>${safeSender}</strong> te invitó a unirte a <strong>${safeOrg}</strong>
                en BitaFly con el rol de <strong>${safeRole}</strong>.
               </p>`
            : `<p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.7;">
                El equipo de <strong>BitaFly</strong> te invita a conocer la plataforma de gestión de
                operaciones con drones más completa de Colombia. Cumple con la normativa RAC 100,
                lleva tu bitácora digital y programa tus vuelos con seguridad.
               </p>`
          }
          ${safeMessage ? `<p style="margin:0 0 24px;font-size:15px;color:#4a5568;line-height:1.7;padding:16px;background:#f7f8fa;border-left:4px solid #ec5b13;border-radius:0 8px 8px 0;">${safeMessage}</p>` : ''}
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

  return NextResponse.json({ success: true, isExistingUser, orgName });
}
