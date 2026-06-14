import { createAdminClient, createClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { escHtml, emailHeader, emailFooter } from '@/lib/emailHelpers';

export const dynamic = 'force-dynamic';

// ── Guard: solo superadmin ──────────────────────────────────────────────────
async function requireSuperadmin() {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado', status: 401 };
  const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (prof?.role !== 'superadmin') return { error: 'Acceso denegado', status: 403 };
  return { admin, user };
}

// Genera un código a partir de las iniciales del nombre + sufijo aleatorio.
// Ej: "Escuela Águilas del Cielo" → "EAC-XB12". Garantiza unicidad en BD.
async function generateCode(admin, name) {
  const initials = String(name || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // quitar acentos
    .toUpperCase()
    .split(/\s+/).filter(Boolean)
    .map(w => w[0])
    .join('')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4) || 'BF';

  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin chars ambiguos
  for (let attempt = 0; attempt < 12; attempt++) {
    let suffix = '';
    for (let i = 0; i < 4; i++) suffix += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    const code = `${initials}-${suffix}`;
    const { data: exists } = await admin
      .from('partner_codes').select('id').eq('code', code).maybeSingle();
    if (!exists) return code;
  }
  // Fallback improbable
  return `${initials}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

// ── GET: listar socios con sus códigos y conteo de miembros ──────────────────
export async function GET() {
  const g = await requireSuperadmin();
  if (g.error) return NextResponse.json({ error: g.error }, { status: g.status });
  const { admin } = g;
  try {
    const [{ data: partners }, { data: codes }, { data: members }, { data: invites }] = await Promise.all([
      admin.from('partners').select('*').order('created_at', { ascending: false }),
      admin.from('partner_codes').select('id, partner_id, code, active'),
      admin.from('partner_members').select('id, partner_id, role, profile_id, profiles:profile_id(email, full_name)'),
      admin.from('partner_invitations').select('id, partner_id, email, role, status, created_at, expires_at').order('created_at', { ascending: false }),
    ]);
    const codesByPartner = {};
    (codes || []).forEach(c => { (codesByPartner[c.partner_id] ||= []).push(c); });
    const membersByPartner = {};
    (members || []).forEach(m => {
      (membersByPartner[m.partner_id] ||= []).push({
        id: m.id, role: m.role, profile_id: m.profile_id,
        email: m.profiles?.email || null, name: m.profiles?.full_name || null,
      });
    });
    const invitesByPartner = {};
    (invites || []).forEach(i => { (invitesByPartner[i.partner_id] ||= []).push(i); });

    const result = (partners || []).map(p => ({
      ...p,
      codes: codesByPartner[p.id] || [],
      members: membersByPartner[p.id] || [],
      member_count: (membersByPartner[p.id] || []).length,
      invitations: invitesByPartner[p.id] || [],
    }));
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST: crear socio (+ código) o agregar código a uno existente ────────────
export async function POST(request) {
  const g = await requireSuperadmin();
  if (g.error) return NextResponse.json({ error: g.error }, { status: g.status });
  const { admin, user } = g;
  try {
    const body = await request.json();

    // Agregar un código adicional a un socio existente
    if (body.action === 'add_code') {
      if (!body.partner_id) return NextResponse.json({ error: 'partner_id requerido' }, { status: 400 });
      const { data: partner } = await admin.from('partners').select('name').eq('id', body.partner_id).single();
      if (!partner) return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 });
      const code = await generateCode(admin, partner.name);
      const { data, error } = await admin.from('partner_codes')
        .insert({ partner_id: body.partner_id, code }).select().single();
      if (error) throw error;
      return NextResponse.json(data);
    }

    // Vincular un usuario (por email) como miembro del socio.
    // Si tiene cuenta → vincular + correo bienvenida + campana.
    // Si no tiene cuenta → insertar partner_invitation + correo de invitación.
    if (body.action === 'add_member') {
      if (!body.partner_id || !body.email) return NextResponse.json({ error: 'partner_id y email requeridos' }, { status: 400 });
      const email = String(body.email).trim().toLowerCase();
      const role  = body.role === 'owner' ? 'owner' : 'asesor';
      const resend = new Resend(process.env.RESEND_API_KEY);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bitafly.co';

      // Obtener info del partner para personalizar correos
      const { data: partner } = await admin
        .from('partners').select('name, type, logo_url').eq('id', body.partner_id).single();
      if (!partner) return NextResponse.json({ error: 'Socio no encontrado' }, { status: 404 });

      // Obtener código activo del partner para mostrarlo en bienvenida
      const { data: firstCode } = await admin
        .from('partner_codes').select('code').eq('partner_id', body.partner_id).eq('active', true).limit(1).maybeSingle();

      const { data: prof } = await admin.from('profiles').select('id, full_name').ilike('email', email).maybeSingle();

      if (prof) {
        // ── Tiene cuenta: vincular + notificar ────────────────────────────────
        const { error } = await admin.from('partner_members')
          .upsert({ partner_id: body.partner_id, profile_id: prof.id, role }, { onConflict: 'partner_id,profile_id' });
        if (error) throw error;

        // Campana in-app (inserción directa — el socio puede ser de cualquier org)
        try {
          const { data: profFull } = await admin.from('profiles').select('organization_id').eq('id', prof.id).single();
          if (profFull?.organization_id) {
            await admin.from('notifications').insert({
              organization_id: profFull.organization_id,
              profile_id:      prof.id,
              type:            'system',
              title:           '¡Ya tienes acceso al panel de socio!',
              body:            `Fuiste vinculado como ${role === 'owner' ? 'dueño' : 'asesor'} de ${partner.name}.`,
              link:            '/socio',
            });
          }
        } catch { /* no crítico */ }

        // Correo de bienvenida
        const { error: emailErr } = await resend.emails.send({
          from:    'BitaFly Socios <no-reply@bitafly.com>',
          to:      [email],
          subject: `Bienvenido al programa de socios BitaFly — ${escHtml(partner.name)}`,
          html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:40px 0;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;">
      ${emailHeader({ partnerLogoUrl: partner.logo_url, partnerName: partner.name })}
      <tr><td style="padding:40px;">
        <p style="margin:0 0 16px;font-size:15px;color:#1a202c;">Hola${prof.full_name ? ` ${escHtml(prof.full_name)}` : ''},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Ya tienes acceso al panel de socio de <strong>${escHtml(partner.name)}</strong> en BitaFly.</p>
        ${firstCode ? `<p style="margin:0 0 16px;font-size:15px;color:#4a5568;">Tu código de ventas: <strong style="font-size:1.2em;letter-spacing:.05em">${escHtml(firstCode.code)}</strong></p>` : ''}
        <table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="background:#ec5b13;border-radius:10px;">
          <a href="${escHtml(appUrl)}/socio" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:900;text-decoration:none;">Ver mi panel →</a>
        </td></tr></table>
      </td></tr>
      ${emailFooter()}
    </table>
  </td></tr></table>
</body></html>`,
        });
        if (emailErr) console.error('[master/partners] Resend bienvenida:', emailErr);

        return NextResponse.json({
          success: true, linked: true,
          email_error: emailErr ? emailErr.message || String(emailErr) : null,
        });
      } else {
        // ── No tiene cuenta: crear invitación ────────────────────────────────
        // Revocar invitaciones anteriores pendientes para este email+partner
        await admin.from('partner_invitations')
          .update({ status: 'expirada' })
          .eq('partner_id', body.partner_id)
          .eq('email', email)
          .eq('status', 'pendiente');

        const { data: invite, error: invErr } = await admin.from('partner_invitations')
          .insert({ partner_id: body.partner_id, email, role })
          .select('token').single();
        if (invErr) throw invErr;

        const registerUrl = `${appUrl}/registro?socio_invite=${invite.token}`;
        const roleLabel   = role === 'owner' ? 'dueño/representante' : 'asesor de ventas';

        const { error: emailErr } = await resend.emails.send({
          from:    'BitaFly Socios <no-reply@bitafly.com>',
          to:      [email],
          subject: `Invitación: únete al programa de socios de ${escHtml(partner.name)} en BitaFly`,
          html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:40px 0;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;">
      ${emailHeader({ partnerLogoUrl: partner.logo_url, partnerName: partner.name })}
      <tr><td style="padding:40px;">
        <p style="margin:0 0 16px;font-size:15px;color:#1a202c;">Hola,</p>
        <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Te han invitado como <strong>${escHtml(roleLabel)}</strong> de <strong>${escHtml(partner.name)}</strong> en el programa de socios de BitaFly.</p>
        <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Crea tu cuenta gratuita para acceder a tu panel, ver tus comisiones y gestionar tus clientes:</p>
        <table cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="background:#ec5b13;border-radius:10px;">
          <a href="${escHtml(registerUrl)}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:900;text-decoration:none;">Crear cuenta y unirme →</a>
        </td></tr></table>
        <p style="margin:0;font-size:13px;color:#a0aec0;">Este enlace expira en 7 días. Si no lo solicitaste, puedes ignorarlo.</p>
      </td></tr>
      ${emailFooter()}
    </table>
  </td></tr></table>
</body></html>`,
        });
        if (emailErr) console.error('[master/partners] Resend invitación:', emailErr);

        return NextResponse.json({
          success: true, linked: false, invited: true,
          email_error: emailErr ? emailErr.message || String(emailErr) : null,
        });
      }
    }

    // Quitar un miembro
    if (body.action === 'remove_member') {
      if (!body.member_id) return NextResponse.json({ error: 'member_id requerido' }, { status: 400 });
      const { error } = await admin.from('partner_members').delete().eq('id', body.member_id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    // Crear socio
    const { type, name, parent_partner_id, commission_pct, free_seats_limit, free_days } = body;
    if (!['escuela', 'asesor'].includes(type)) return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    if (!name?.trim()) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 });

    const insert = {
      type,
      name: name.trim(),
      parent_partner_id: parent_partner_id || null,
      commission_pct: Number(commission_pct) || 0,
      free_seats_limit: free_seats_limit === '' || free_seats_limit == null ? null : parseInt(free_seats_limit, 10),
      free_days: parseInt(free_days, 10) || 90,
      created_by: user.id,
    };
    const { data: partner, error } = await admin.from('partners').insert(insert).select().single();
    if (error) throw error;

    const code = await generateCode(admin, partner.name);
    await admin.from('partner_codes').insert({ partner_id: partner.id, code });

    return NextResponse.json({ ...partner, codes: [{ code }] });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── PATCH: editar socio ──────────────────────────────────────────────────────
export async function PATCH(request) {
  const g = await requireSuperadmin();
  if (g.error) return NextResponse.json({ error: g.error }, { status: g.status });
  const { admin } = g;
  try {
    const { id, updateData } = await request.json();
    if (!id || !updateData) return NextResponse.json({ error: 'id y updateData requeridos' }, { status: 400 });

    const ALLOWED = ['name', 'status', 'commission_pct', 'free_seats_limit', 'free_days', 'parent_partner_id'];
    const safe = {};
    for (const [k, v] of Object.entries(updateData)) {
      if (!ALLOWED.includes(k)) continue;
      if (k === 'commission_pct') safe[k] = Number(v) || 0;
      else if (k === 'free_seats_limit') safe[k] = (v === '' || v == null) ? null : parseInt(v, 10);
      else if (k === 'free_days') safe[k] = parseInt(v, 10) || 90;
      else safe[k] = v;
    }
    if (!Object.keys(safe).length) return NextResponse.json({ error: 'Sin campos válidos' }, { status: 400 });

    const { data, error } = await admin.from('partners').update(safe).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── DELETE: desactivar socio (soft) ──────────────────────────────────────────
export async function DELETE(request) {
  const g = await requireSuperadmin();
  if (g.error) return NextResponse.json({ error: g.error }, { status: g.status });
  const { admin } = g;
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
    const { error } = await admin.from('partners').update({ status: 'inactivo' }).eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
