// /api/socio/advisors — gestión de asesores de una escuela
// GET  → lista los asesores (partner hijos) de la escuela del owner
// POST → crea un asesor bajo la escuela e invita al correo
// DELETE { advisor_id } → desactiva el asesor (soft)
//
// Solo para miembros con role='owner' de un partner tipo='escuela'.

import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { escHtml, emailHeader, emailFooter } from '@/lib/emailHelpers';

export const dynamic = 'force-dynamic';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

async function generateCode(admin, name) {
  const initials = String(name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase().split(/\s+/).filter(Boolean)
    .map(w => w[0]).join('').replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'ASR';
  for (let i = 0; i < 12; i++) {
    let suffix = '';
    for (let j = 0; j < 4; j++) suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    const code = `${initials}-${suffix}`;
    const { data: exists } = await admin.from('partner_codes').select('id').eq('code', code).maybeSingle();
    if (!exists) return code;
  }
  return `${initials}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

async function getSchoolOwnerContext(admin, userId) {
  const { data: membership } = await admin
    .from('partner_members')
    .select('partner_id, role')
    .eq('profile_id', userId)
    .eq('role', 'owner')
    .maybeSingle();
  if (!membership) return null;

  const { data: partner } = await admin
    .from('partners')
    .select('id, name, type, status, commission_pct, free_days, free_seats_limit, logo_url')
    .eq('id', membership.partner_id)
    .eq('type', 'escuela')
    .maybeSingle();
  return partner || null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const school = await getSchoolOwnerContext(admin, user.id);
    if (!school) return NextResponse.json({ error: 'No es dueño de una escuela' }, { status: 403 });

    const { data: advisors } = await admin
      .from('partners')
      .select('id, name, status, commission_pct, free_seats_used, free_seats_limit, created_at')
      .eq('parent_partner_id', school.id)
      .eq('type', 'asesor')
      .order('created_at', { ascending: false });

    if (!advisors?.length) return NextResponse.json([]);

    const advisorIds = advisors.map(a => a.id);
    const [{ data: codes }, { data: members }, { data: refs }, { data: grants }] = await Promise.all([
      admin.from('partner_codes').select('partner_id, code, active').in('partner_id', advisorIds),
      admin.from('partner_members')
        .select('partner_id, role, profiles:profile_id(email, full_name)')
        .in('partner_id', advisorIds),
      admin.from('referrals').select('partner_id, status').in('partner_id', advisorIds),
      admin.from('free_grants').select('partner_id, status').in('partner_id', advisorIds),
    ]);

    const byId = (arr, key) => {
      const m = {};
      (arr || []).forEach(r => { (m[r[key]] ||= []).push(r); });
      return m;
    };
    const codeMap   = byId(codes, 'partner_id');
    const memberMap = byId(members, 'partner_id');
    const refMap    = byId(refs, 'partner_id');
    const grantMap  = byId(grants, 'partner_id');

    const result = advisors.map(a => ({
      ...a,
      codes:   (codeMap[a.id] || []),
      members: (memberMap[a.id] || []).map(m => ({ role: m.role, email: m.profiles?.email, name: m.profiles?.full_name })),
      stats: {
        referrals_active: (refMap[a.id] || []).filter(r => r.status === 'activa').length,
        referrals_total:  (refMap[a.id] || []).length,
        grants_total:     (grantMap[a.id] || []).length,
        grants_active:    (grantMap[a.id] || []).filter(g => g.status === 'activado').length,
      },
    }));

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const school = await getSchoolOwnerContext(admin, user.id);
    if (!school) return NextResponse.json({ error: 'No es dueño de una escuela' }, { status: 403 });

    const { name, email } = await request.json();
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre del asesor requerido' }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: 'Correo del asesor requerido' }, { status: 400 });

    const normalEmail = email.trim().toLowerCase();

    // Crear el partner asesor hijo de esta escuela
    const { data: advisor, error: aErr } = await admin.from('partners').insert({
      type:              'asesor',
      name:              name.trim(),
      parent_partner_id: school.id,
      commission_pct:    school.commission_pct,
      free_seats_limit:  school.free_seats_limit,
      free_days:         school.free_days,
      status:            'activo',
      created_by:        user.id,
    }).select().single();
    if (aErr) throw aErr;

    const code = await generateCode(admin, advisor.name);
    await admin.from('partner_codes').insert({ partner_id: advisor.id, code });

    // Si ya tiene cuenta en BitaFly → vincular como owner inmediatamente
    const { data: profile } = await admin
      .from('profiles')
      .select('id, full_name')
      .ilike('email', normalEmail)
      .maybeSingle();

    let linked = false;
    if (profile) {
      await admin.from('partner_members').upsert(
        { partner_id: advisor.id, profile_id: profile.id, role: 'owner' },
        { onConflict: 'partner_id,profile_id' },
      );
      linked = true;
    }

    // Correo de invitación al asesor (con logo de la escuela + BitaFly)
    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com').replace(/\/$/, '');
    const registerLink = `${appUrl}/registro?email=${encodeURIComponent(normalEmail)}`;
    const panelLink    = `${appUrl}/socio`;
    const ctaUrl   = linked ? panelLink : registerLink;
    const ctaLabel = linked ? 'Ver mi panel de socio →' : 'Crear cuenta →';

    const { error: emailErr } = await resend.emails.send({
      from:    'BitaFly Socios <no-reply@bitafly.com>',
      to:      [normalEmail],
      subject: `${escHtml(school.name)} te invita como asesor en BitaFly`,
      html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:40px 0;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;">
      ${emailHeader({ partnerLogoUrl: school.logo_url, partnerName: school.name })}
      <tr><td style="padding:40px;">
        <p style="margin:0 0 16px;font-size:15px;color:#1a202c;">Hola${profile?.full_name ? ` ${escHtml(profile.full_name)}` : ''},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;"><strong>${escHtml(school.name)}</strong> te ha registrado como asesor de ventas en <strong>BitaFly</strong>.</p>
        <p style="margin:0 0 16px;font-size:15px;color:#4a5568;">Tu código de ventas es: <strong style="font-size:1.2em;letter-spacing:.05em">${escHtml(code)}</strong></p>
        <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Comparte este código con pilotos que se suscriban a BitaFly y generarás comisiones del ${school.commission_pct}% por cada venta.</p>
        ${!linked ? '<p style="margin:0 0 8px;font-size:14px;color:#718096;">Para activar tu panel, crea tu cuenta en BitaFly con este correo.</p>' : ''}
        <table cellpadding="0" cellspacing="0" style="margin:20px 0;"><tr><td style="background:#ec5b13;border-radius:10px;">
          <a href="${escHtml(ctaUrl)}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:900;text-decoration:none;">${ctaLabel}</a>
        </td></tr></table>
      </td></tr>
      ${emailFooter()}
    </table>
  </td></tr></table>
</body></html>`,
    });
    if (emailErr) console.error('[socio/advisors] Resend error:', emailErr);

    return NextResponse.json({ advisor: { ...advisor, codes: [{ code, active: true }] }, linked, emailSent: !emailErr });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

    const school = await getSchoolOwnerContext(admin, user.id);
    if (!school) return NextResponse.json({ error: 'No es dueño de una escuela' }, { status: 403 });

    const { advisor_id } = await request.json();
    if (!advisor_id) return NextResponse.json({ error: 'advisor_id requerido' }, { status: 400 });

    // Verificar que el asesor pertenezca a esta escuela
    const { data: adv } = await admin
      .from('partners').select('id').eq('id', advisor_id).eq('parent_partner_id', school.id).maybeSingle();
    if (!adv) return NextResponse.json({ error: 'Asesor no encontrado en tu escuela' }, { status: 404 });

    await admin.from('partners').update({ status: 'inactivo' }).eq('id', advisor_id);
    await admin.from('partner_codes').update({ active: false }).eq('partner_id', advisor_id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
