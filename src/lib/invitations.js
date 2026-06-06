/**
 * invitations.js — helpers para invitar tripulantes a una organización.
 *
 * Modelo:
 *  - pilots.invitation_status: 'pending' | 'accepted' | null (sin invitación)
 *  - invitations: { email, role, organization_id, status, token, pilot_id, invited_by, name, accepted_at }
 *
 * El banner del dashboard del invitado se deriva de `invitations` por email + status='pending'.
 */
import { Resend } from 'resend';
import { escHtml } from '@/lib/emailHelpers';

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

// Mapea el "Rol" textual de la plantilla/excel a un rol del sistema
export function roleFromPilotRole(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (s.includes('jefe'))   return 'jefe_pilotos';
  if (s.includes('sms') || s.includes('gerente')) return 'gerente_sms';
  return 'piloto'; // Piloto, Observador, vacío, etc.
}

const ROLE_LABEL = {
  admin:        'Gerente General',
  jefe_pilotos: 'Jefe de Pilotos',
  gerente_sms:  'Gerente SMS',
  piloto:       'Piloto',
};

/**
 * Crea (o reactiva) una invitación para un tripulante y envía el correo.
 * Idempotente por (organization_id, lower(email)): si ya existe pendiente, la reutiliza.
 *
 * @returns {{ invitation, isExistingUser }}
 */
export async function createCrewInvitation(admin, { orgId, invitedBy, pilotId, name, email, role, orgName, senderName }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail) return { invitation: null, isExistingUser: false };

  const sysRole = ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto'].includes(role)
    ? role
    : roleFromPilotRole(role);

  // ¿Ya tiene cuenta en Bitafly?
  const { data: existingProfile } = await admin
    .from('profiles').select('id').ilike('email', cleanEmail).maybeSingle();
  const isExistingUser = !!existingProfile;

  // ¿Ya hay invitación para este email en esta org?
  const { data: existing } = await admin
    .from('invitations')
    .select('id, status, token')
    .eq('organization_id', orgId)
    .ilike('email', cleanEmail)
    .maybeSingle();

  let invitation;
  if (existing) {
    const { data } = await admin
      .from('invitations')
      .update({ role: sysRole, status: 'pending', pilot_id: pilotId, invited_by: invitedBy, name: name || null, accepted_at: null })
      .eq('id', existing.id)
      .select('id, token, email, role')
      .single();
    invitation = data;
  } else {
    const { data } = await admin
      .from('invitations')
      .insert({ organization_id: orgId, email: cleanEmail, role: sysRole, status: 'pending', pilot_id: pilotId, invited_by: invitedBy, name: name || null })
      .select('id, token, email, role')
      .single();
    invitation = data;
  }

  // Enviar correo (no crítico — no rompe el import si Resend falla)
  try {
    await sendInvitationEmail({
      to:             cleanEmail,
      name:           name,
      orgName:        orgName,
      senderName:     senderName,
      role:           sysRole,
      isExistingUser,
    });
  } catch (e) {
    console.warn('[invitations] email no enviado a', cleanEmail, e.message);
  }

  return { invitation, isExistingUser };
}

export async function sendInvitationEmail({ to, name, orgName, senderName, role, isExistingUser }) {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);

  const safeName   = escHtml(name || 'Hola');
  const safeOrg    = escHtml(orgName || 'una organización');
  const safeSender = escHtml(senderName || 'Un administrador');
  const roleLabel  = escHtml(ROLE_LABEL[role] || 'Tripulante');

  // Usuario existente → entra y ve el banner en su dashboard.
  // Usuario nuevo → se registra con su email.
  const cta = isExistingUser
    ? { url: `${SITE()}/login?next=${encodeURIComponent('/dashboard')}`, label: 'Ver invitación en mi dashboard' }
    : { url: `${SITE()}/registro?email=${encodeURIComponent(to)}`,       label: 'Crear mi cuenta y unirme' };

  await resend.emails.send({
    from:    'BitaFly <no-reply@bitafly.com>',
    replyTo: 'soporte@bitafly.com',
    to:      [to],
    subject: `🚁 ${safeSender} te invitó a la tripulación de ${orgName || 'BitaFly'}`,
    html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;">
        <tr><td style="background:#ec5b13;padding:32px 40px;">
          <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;">BitaFly</h1>
          <p style="margin:6px 0 0;color:#fde0cc;font-size:13px;">Gestión de operaciones con drones</p>
        </td></tr>
        <tr><td style="padding:40px;">
          <p style="margin:0 0 16px;font-size:16px;color:#1a202c;"><strong>${safeName}</strong>,</p>
          <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">
            <strong>${safeSender}</strong> te invitó a unirte a la tripulación de
            <strong>${safeOrg}</strong> en BitaFly con el rol de <strong>${roleLabel}</strong>.
          </p>
          <p style="margin:0 0 24px;font-size:15px;color:#4a5568;line-height:1.6;">
            ${isExistingUser
              ? 'Como ya tienes cuenta en BitaFly, inicia sesión y verás la invitación en tu dashboard para aceptarla.'
              : 'Crea tu cuenta gratuita para aceptar la invitación y empezar a registrar tus vuelos.'}
          </p>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;"><tr>
            <td style="background:#ec5b13;border-radius:10px;">
              <a href="${cta.url}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:900;text-decoration:none;">
                ${cta.label} →
              </a>
            </td>
          </tr></table>
          <p style="margin:0;font-size:13px;color:#718096;">Si no esperabas esta invitación, puedes ignorar este correo.</p>
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
