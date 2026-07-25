import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { escHtml, emailHeader, emailFooter } from '@/lib/emailHelpers';
import { syncOrgMembership } from '@/lib/orgMembership';

export const dynamic = 'force-dynamic';

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

// Resuelve la membresía del usuario actual (socio principal).
async function getMembership(admin, userId) {
  const { data } = await admin
    .from('partner_members')
    .select('id, role, partner_id')
    .eq('profile_id', userId)
    .limit(1)
    .maybeSingle();
  return data;
}

// ── GET: listar perfiles regalados del socio ────────────────────────────────
export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const membership = await getMembership(admin, user.id);
    if (!membership) return NextResponse.json({ error: 'No es socio' }, { status: 403 });

    const { data } = await admin
      .from('free_grants')
      .select('id, email, status, granted_at, expires_at, redeemed_org_id')
      .eq('partner_id', membership.partner_id)
      .order('granted_at', { ascending: false });

    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST: regalar un perfil gratis a un correo ──────────────────────────────
export async function POST(request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const membership = await getMembership(admin, user.id);
    if (!membership) return NextResponse.json({ error: 'No es socio' }, { status: 403 });

    const { email: rawEmail } = await request.json();
    const email = String(rawEmail || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Correo inválido' }, { status: 400 });
    }

    // Socio activo + configuración
    const { data: partner } = await admin
      .from('partners')
      .select('id, name, status, free_days, free_seats_limit, free_seats_used, logo_url')
      .eq('id', membership.partner_id)
      .single();
    if (!partner || partner.status !== 'activo') {
      return NextResponse.json({ error: 'El socio no está activo.' }, { status: 403 });
    }

    // Cupo (NULL = ilimitado)
    if (partner.free_seats_limit != null && partner.free_seats_used >= partner.free_seats_limit) {
      return NextResponse.json({ error: 'Se agotaron los cupos de perfiles gratis.' }, { status: 409 });
    }

    // Regla #9: 1 perfil gratis por correo, NO renovable (en cualquier estado)
    const { data: existing } = await admin
      .from('free_grants').select('id, status').eq('email', email).maybeSingle();
    if (existing) {
      return NextResponse.json({
        error: 'Este correo ya recibió un perfil gratis anteriormente y no es renovable.',
      }, { status: 409 });
    }

    // Cuenta ya existente con ese correo → no aplica regalo (debe ser usuario nuevo)
    const { data: existingProfile } = await admin
      .from('profiles').select('id').ilike('email', email).maybeSingle();
    if (existingProfile) {
      return NextResponse.json({
        error: 'Ya existe una cuenta con ese correo. El perfil gratis es solo para usuarios nuevos.',
      }, { status: 409 });
    }

    const token = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (partner.free_days || 90) * 86400000);
    const purgeAfter = new Date(expiresAt.getTime() + 90 * 86400000); // +3 meses tras expirar

    const { data: grant, error: insErr } = await admin.from('free_grants').insert({
      partner_id:        partner.id,
      advisor_member_id: membership.id,
      email,
      status:            'enviado',
      token,
      granted_at:        now.toISOString(),
      expires_at:        expiresAt.toISOString(),
      purge_after:       purgeAfter.toISOString(),
    }).select('id').single();
    if (insErr) throw insErr;

    // Incrementar cupos usados
    await admin.from('partners')
      .update({ free_seats_used: (partner.free_seats_used || 0) + 1 })
      .eq('id', partner.id);

    // Enviar invitación con el token del regalo
    await sendGrantEmail({ to: email, orgName: partner.name, freeDays: partner.free_days || 90, token, logoUrl: partner.logo_url });

    return NextResponse.json({ success: true, grant_id: grant.id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE: anular un perfil regalado ───────────────────────────────────────
// Borra la invitación/regalo. Si ya fue canjeado, degrada el perfil del
// beneficiario a piloto (revoca el beneficio). Solo el owner del socio.
export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const membership = await getMembership(admin, user.id);
    if (!membership) return NextResponse.json({ error: 'No es socio' }, { status: 403 });
    if (membership.role !== 'owner') {
      return NextResponse.json({ error: 'Solo el administrador puede anular perfiles regalados.' }, { status: 403 });
    }

    const { grant_id } = await request.json();
    if (!grant_id) return NextResponse.json({ error: 'grant_id requerido' }, { status: 400 });

    // El regalo debe pertenecer al socio del usuario (sin cross-tenant)
    const { data: grant } = await admin
      .from('free_grants')
      .select('id, partner_id, status, redeemed_org_id')
      .eq('id', grant_id)
      .maybeSingle();
    if (!grant || grant.partner_id !== membership.partner_id) {
      return NextResponse.json({ error: 'Regalo no encontrado.' }, { status: 404 });
    }

    // Si ya fue canjeado: degradar a los miembros reales de la org beneficiaria.
    // Auditoría 2026-07-22: resolver vía organization_members (membresía real),
    // no profiles.organization_id — esa columna solo refleja la organización
    // ACTIVA de cada cuenta ahora mismo. Con el filtro anterior, si el
    // beneficiario cambiaba su organización activa a otra, la anulación no lo
    // alcanzaba (su membresía regalada quedaba intacta); y si otra cuenta sin
    // relación tenía esta org activa en ese momento, se degradaba por error.
    if (grant.redeemed_org_id) {
      const revokedAt = new Date().toISOString();
      const { data: members } = await admin
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', grant.redeemed_org_id)
        .eq('is_active', true);

      for (const m of members || []) {
        await syncOrgMembership(admin, {
          userId: m.user_id,
          organizationId: grant.redeemed_org_id,
          subscriptionPlan: 'piloto',
          subscriptionExpiresAt: revokedAt,
        });

        // profiles solo refleja la organización activa — solo se toca si esta
        // org sigue siendo esa (si no, pisaría el plan de la que sí tiene activa).
        const { data: prof } = await admin
          .from('profiles')
          .select('active_organization_id')
          .eq('id', m.user_id)
          .maybeSingle();
        if (prof?.active_organization_id === grant.redeemed_org_id) {
          await admin.from('profiles')
            .update({ subscription_plan: 'piloto', subscription_expires_at: revokedAt })
            .eq('id', m.user_id);
        }
      }
    }

    // Borrar el regalo y liberar el cupo.
    await admin.from('free_grants').delete().eq('id', grant.id);
    const { data: p } = await admin.from('partners')
      .select('free_seats_used').eq('id', membership.partner_id).single();
    await admin.from('partners')
      .update({ free_seats_used: Math.max(0, (p?.free_seats_used || 1) - 1) })
      .eq('id', membership.partner_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function sendGrantEmail({ to, orgName, freeDays, token, logoUrl }) {
  if (!process.env.RESEND_API_KEY) return; // no romper el flujo si no hay correo configurado
  const resend = new Resend(process.env.RESEND_API_KEY);
  const safeOrg = escHtml(orgName || 'una escuela aliada');
  const url = `${SITE()}/registro?email=${encodeURIComponent(to)}&grant=${encodeURIComponent(token)}`;

  // ⚠️ Resend retorna { error } sin lanzar.
  const { error } = await resend.emails.send({
    from: 'BitaFly <no-reply@bitafly.com>',
    replyTo: 'soporte@bitafly.com',
    to: [to],
    subject: `🎁 Tu perfil BitaFly de regalo (${freeDays} días gratis)`,
    html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;">
        ${emailHeader({ partnerLogoUrl: logoUrl, partnerName: orgName })}
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1a202c;">¡Tienes un regalo! 🎁</p>
          <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">
            <strong>${safeOrg}</strong> te regaló un perfil de piloto en BitaFly con
            <strong>${freeDays} días gratis</strong>. Registra tus vuelos, cumple la normativa RAC 100
            y mantén tu bitácora digital al día.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr>
            <td style="background:#ec5b13;border-radius:10px;">
              <a href="${url}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:900;text-decoration:none;">
                Activar mi perfil gratis →
              </a>
            </td>
          </tr></table>
          <p style="margin:0;font-size:13px;color:#718096;">Este beneficio es único por persona y no es renovable.</p>
        </td></tr>
        ${emailFooter()}
      </table>
    </td></tr>
  </table>
</body></html>`,
  });
  if (error) throw new Error(error.message || 'No se pudo enviar el correo del regalo.');
}
