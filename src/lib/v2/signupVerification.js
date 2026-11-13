// Skylog V2.0 — verificación del correo en el registro con correo (auditoría 2026-11-12). Antes el usuario se creaba
// con `email_confirm: true` y la contraseña que escribía quien llenaba el formulario, sin probar que el correo fuera
// suyo: cualquiera podía registrar el correo de otra persona con una contraseña conocida por él. Ahora el usuario se
// crea SIN confirmar y con una contraseña aleatoria que nadie conoce; el enlace llega solo al dueño del correo, lo
// confirma y le pide definir su contraseña (`/registro/clave`). Mientras no abra el enlace, nadie puede iniciar sesión.
import crypto from 'crypto';
import { Resend } from 'resend';
import { escHtml, emailHeader, emailFooter } from '@/lib/emailHelpers';

/** Contraseña que el usuario nunca conoce: el usuario define la suya tras confirmar el correo. */
export const unknowablePassword = () => `${crypto.randomBytes(24).toString('base64url')}Aa1`;

const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

/**
 * Envía (o reenvía) el enlace de confirmación. Nunca lanza. Devuelve { sent, confirmed?, reason? }:
 * si el correo ya estaba confirmado NO se envía nada (así el reenvío no sirve para llenar de correos a un usuario real).
 */
export async function sendSignupConfirmation(admin, { email, fullName }) {
  try {
    if (!process.env.RESEND_API_KEY) return { sent: false, reason: 'sin_resend' };
    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });
    if (error || !data?.properties?.hashed_token) return { sent: false, reason: 'sin_usuario' };
    if (data.user?.email_confirmed_at) return { sent: false, confirmed: true };

    const link = `${siteUrl()}/auth/confirmar?token_hash=${encodeURIComponent(data.properties.hashed_token)}`;
    const html = `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:auto;font-family:Arial,sans-serif;">${emailHeader()}
      <tr><td style="padding:28px 40px;"><h2 style="margin:0 0 12px;font-size:18px;color:#1A202C;">Confirma tu correo</h2>
      <p style="font-size:14px;color:#4a5568;margin:0 0 8px;">${fullName ? `Hola ${escHtml(fullName)}, ` : ''}abre el enlace para confirmar que este correo es tuyo y definir tu contraseña de BitaFly.</p>
      <p style="font-size:13px;color:#4a5568;margin:0 0 16px;">El enlace vence en 1 hora. Si no creaste una cuenta en BitaFly, ignora este mensaje: no pasa nada.</p>
      <p style="margin:0;"><a href="${escHtml(link)}" style="background:#ec5b13;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Confirmar mi correo</a></p>
      <p style="font-size:11px;color:#a0aec0;margin-top:16px;word-break:break-all;">Si el botón no funciona, copia este enlace: ${escHtml(link)}</p></td></tr>${emailFooter()}</table>`;
    const { error: sendError } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: 'BitaFly <notificaciones@bitafly.com>', to: [email], subject: 'Confirma tu correo en BitaFly', html });
    if (sendError) {
      console.error('[registro] Resend error:', sendError);
      return { sent: false, reason: 'resend' };
    }
    return { sent: true };
  } catch (err) {
    console.error('[registro] confirmación falló:', err?.message);
    return { sent: false, reason: 'error' };
  }
}
