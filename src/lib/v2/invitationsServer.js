// Skylog V2.0 — apoyo del servidor para las invitaciones (Etapa C de docs/skylog-v2/44-alta-y-socios.md): token y
// correo. Todo lo que va al correo pasa por `escHtml` y se revisa el `{ error }` de Resend (el SDK no lanza).
import crypto from 'crypto';
import { Resend } from 'resend';
import { INVITE_ROLE_LABELS, INVITATION_TTL_DAYS } from '@skylog/domain';
import { escHtml, emailHeader, emailFooter } from '@/lib/emailHelpers';

export const newInvitationToken = () => crypto.randomBytes(24).toString('base64url');

// `ilike` trata `_` y `%` como comodines: en un correo (a_b@x.co) `_` es un carácter común. Se escapan para comparar exacto sin importar mayúsculas.
export const likeExact = (value) => String(value).replace(/[\\%_]/g, '\\$&');

export const invitationLink = (token) => `${process.env.NEXT_PUBLIC_APP_URL || 'https://bitafly.com'}/invitacion/${token}`;

/** Devuelve { sent, reason? } y nunca lanza: si el correo falla, el gestor aún puede copiar el enlace. */
export async function sendInvitationEmail({ to, name, role, organizationName, inviterName, token }) {
  try {
    if (!process.env.RESEND_API_KEY) return { sent: false, reason: 'sin_resend' };
    const link = invitationLink(token);
    const html = `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:auto;font-family:Arial,sans-serif;">${emailHeader()}
      <tr><td style="padding:28px 40px;"><h2 style="margin:0 0 12px;font-size:18px;color:#1A202C;">Te invitaron a ${escHtml(organizationName)}</h2>
      <p style="font-size:14px;color:#4a5568;margin:0 0 8px;">${name ? `Hola ${escHtml(name)}, ` : ''}<b>${escHtml(inviterName || 'Un gestor')}</b> te invitó a unirte a <b>${escHtml(organizationName)}</b> en BitaFly como <b>${escHtml(INVITE_ROLE_LABELS[role] || role)}</b>.</p>
      <p style="font-size:13px;color:#4a5568;margin:0 0 16px;">El enlace es personal y vence en ${INVITATION_TTL_DAYS} días. Entrar es gratis: el plan lo paga la organización.</p>
      <p style="margin:0;"><a href="${escHtml(link)}" style="background:#ec5b13;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Aceptar invitación</a></p>
      <p style="font-size:11px;color:#a0aec0;margin-top:16px;word-break:break-all;">Si el botón no funciona, copia este enlace: ${escHtml(link)}</p></td></tr>${emailFooter()}</table>`;
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: 'Skylog <notificaciones@bitafly.com>', to: [to], subject: `Invitación a ${organizationName} en BitaFly`, html });
    if (error) {
      console.error('[invitaciones] Resend error:', error);
      return { sent: false, reason: 'resend' };
    }
    return { sent: true };
  } catch (e) {
    console.error('[invitaciones] no se pudo enviar el correo:', e);
    return { sent: false, reason: 'error' };
  }
}
