import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { Resend } from 'resend';
import { escHtml } from '@/lib/emailHelpers';

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

// Campos del expediente que el propio piloto puede gestionar desde su perfil.
const DOC_FIELDS = [
  'id_doc_url',
  'pilot_course_url',
  'theoretical_exam_url',
  'medical_cert_url',
  'medical_expiry',
  'cipu_number',
  'emergency_contact_name',
  'emergency_contact_phone',
];

// Localiza la fila pilots vinculada al usuario actual dentro de su org.
async function findMyPilot(admin, { userId, orgId, email }) {
  const orQuery = [`profile_id.eq.${userId}`, `owner_id.eq.${userId}`];
  if (email) orQuery.push(`email.eq.${email}`);
  const { data } = await admin
    .from('pilots')
    .select('*')
    .eq('organization_id', orgId)
    .or(orQuery.join(','))
    .limit(1)
    .maybeSingle();
  return data || null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { user, orgId } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const admin = createAdminClient();
    const pilot = await findMyPilot(admin, { userId: user.id, orgId, email: user.email });
    if (!pilot) return NextResponse.json({ pilot: null });

    const out = { id: pilot.id };
    for (const f of DOC_FIELDS) out[f] = pilot[f] ?? null;
    return NextResponse.json({ pilot: out });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const supabase = await createClient();
    const { user, orgId } = await getOrgContext(supabase);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización' }, { status: 400 });

    const body = await request.json();

    // Solo campos permitidos (nunca mass-assignment)
    const updateData = {};
    for (const f of DOC_FIELDS) {
      if (f in body) updateData[f] = body[f] === '' ? null : body[f];
    }
    updateData.updated_at = new Date().toISOString();

    const admin = createAdminClient();
    let pilot = await findMyPilot(admin, { userId: user.id, orgId, email: user.email });

    // Si no existe la fila pilots, crearla con datos básicos del perfil.
    if (!pilot) {
      const { data: prof } = await admin
        .from('profiles')
        .select('full_name, first_name, last_name, email, phone, city')
        .eq('id', user.id)
        .maybeSingle();
      const { data: created, error: insErr } = await admin
        .from('pilots')
        .insert([{
          organization_id: orgId,
          owner_id:        user.id,
          profile_id:      user.id,
          name:            prof?.full_name || `${prof?.first_name || ''} ${prof?.last_name || ''}`.trim() || user.email,
          email:           prof?.email || user.email,
          phone:           prof?.phone || null,
          city:            prof?.city || null,
          pilot_role:      'Piloto',
          is_active:       true,
          ...updateData,
        }])
        .select('*')
        .single();
      if (insErr) throw insErr;
      pilot = created;
    } else {
      const { error: updErr } = await admin
        .from('pilots')
        .update(updateData)
        .eq('id', pilot.id);
      if (updErr) throw updErr;
    }

    // ── Notificar a GG / JP / GSMS de la organización (no a sí mismo) ──
    try {
      await notifyManagers(admin, { orgId, pilot, actorId: user.id });
    } catch (e) {
      console.warn('[my-documents] notificación no enviada:', e.message);
    }

    return NextResponse.json({ success: true, pilotId: pilot.id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

async function notifyManagers(admin, { orgId, pilot, actorId }) {
  if (!process.env.RESEND_API_KEY) return;

  const { data: managers } = await admin
    .from('profiles')
    .select('email, full_name, role, id')
    .eq('organization_id', orgId)
    .in('role', ['admin', 'jefe_pilotos', 'gerente_sms']);

  const recipients = (managers || [])
    .filter(m => m.id !== actorId && m.email)
    .map(m => m.email);
  if (recipients.length === 0) return;

  const { data: org } = await admin
    .from('organizations')
    .select('company_name')
    .eq('id', orgId)
    .maybeSingle();

  const resend   = new Resend(process.env.RESEND_API_KEY);
  const pilotNm  = escHtml(pilot.name || 'Un tripulante');
  const orgNm    = escHtml(org?.company_name || 'tu organización');

  await resend.emails.send({
    from:    'BitaFly <no-reply@bitafly.com>',
    replyTo: 'soporte@bitafly.com',
    to:      recipients,
    subject: `📄 ${pilot.name || 'Un piloto'} actualizó sus documentos`,
    html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;">
        <tr><td style="background:#ec5b13;padding:32px 40px;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;">BitaFly</h1>
          <p style="margin:6px 0 0;color:#fde0cc;font-size:13px;">Actualización de expediente de tripulación</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">
            <strong>${pilotNm}</strong> actualizó sus documentos / credenciales en <strong>${orgNm}</strong>.
            Revisa su expediente en la sección Tripulación para validar los cambios.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
            <td style="background:#ec5b13;border-radius:10px;">
              <a href="${SITE()}/dashboard/pilots" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:900;text-decoration:none;">
                Ver expediente →
              </a>
            </td>
          </tr></table>
          <p style="margin:0;font-size:13px;color:#718096;">Notificación automática de BitaFly.</p>
        </td></tr>
        <tr><td style="background:#f7f8fa;padding:20px 40px;border-top:1px solid #edf2f7;">
          <p style="margin:0;font-size:12px;color:#a0aec0;text-align:center;">BitaFly · bitafly.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
  });
}
