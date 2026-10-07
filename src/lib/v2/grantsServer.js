// Skylog V2.0 — regalos de perfiles gratis (Etapa E2): búsqueda por token, canje al registrarse y correos. Todo lo
// que va al correo pasa por `escHtml` y se revisa el `{ error }` de Resend (el SDK no lanza).
import { Resend } from 'resend';
import { grantDaysLeft } from '@skylog/domain';
import { escHtml, emailHeader, emailFooter } from '@/lib/emailHelpers';
import { appUrl } from '@/lib/v2/partnersServer';

/** El socio (panel) de una persona: la primera membresía de un socio ACTIVO. null si no es socio o está inactivo. */
export async function resolvePartnerMember(admin, personId) {
  const { data } = await admin.from('partner_members').select('id, role, partner_id, partner:partners(id, name, type, status, logo_url, free_days, free_seats_limit, free_seats_used, commission_pct, parent_partner_id)').eq('person_id', personId);
  const active = (data || []).filter((m) => m.partner?.status === 'activo');
  return active.find((m) => m.role === 'owner') || active[0] || null;
}

/** Regalo por token: { state: 'usable' | 'usado' | 'vencido' | 'inexistente', grant, partner }. */
export async function loadGrant(admin, token) {
  const t = String(token || '').trim();
  if (!t || t.length > 200) return { state: 'inexistente' };
  const { data: grant } = await admin.from('free_grants').select('id, email, status, expires_at, partner_id, redeemed_organization_id, partner:partners(name, logo_url)').eq('token', t).maybeSingle();
  if (!grant) return { state: 'inexistente' };
  if (grant.status !== 'enviado') return { state: 'usado', grant };
  if (grantDaysLeft(grant.expires_at) <= 0) return { state: 'vencido', grant };
  return { state: 'usable', grant, partner: grant.partner };
}

/** Marca el regalo como activado y deja la suscripción de la organización con su vencimiento. Nunca lanza. */
export async function redeemGrant(admin, { grantId, organizationId }) {
  try {
    const { data: grant } = await admin.from('free_grants').update({ status: 'activado', redeemed_organization_id: organizationId }).eq('id', grantId).eq('status', 'enviado').select('expires_at, partner:partners(name)').maybeSingle();
    if (!grant) return { ok: false };
    await admin.from('subscriptions').update({ plan: 'piloto', expires_at: String(grant.expires_at).slice(0, 10), notes: `Regalo de socio: ${grant.partner?.name || 's/d'}` }).eq('organization_id', organizationId);
    return { ok: true };
  } catch (e) {
    console.error('[regalos] no se pudo canjear el regalo:', e.message);
    return { ok: false };
  }
}

async function send({ to, subject, html, from = 'BitaFly <no-reply@bitafly.com>' }) {
  try {
    if (!process.env.RESEND_API_KEY) return { sent: false, reason: 'sin_resend' };
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from, replyTo: 'soporte@bitafly.com', to: [to], subject, html });
    if (error) {
      console.error('[regalos] Resend error:', error);
      return { sent: false, reason: 'resend' };
    }
    return { sent: true };
  } catch (e) {
    console.error('[regalos] no se pudo enviar el correo:', e);
    return { sent: false, reason: 'error' };
  }
}

const shell = (partner, inner) => `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:auto;font-family:Arial,sans-serif;">${emailHeader({ partnerLogoUrl: partner?.logo_url, partnerName: partner?.name })}<tr><td style="padding:28px 40px;">${inner}</td></tr>${emailFooter()}</table>`;
const button = (href, label) => `<p style="margin:16px 0;"><a href="${escHtml(href)}" style="background:#ec5b13;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">${escHtml(label)}</a></p>`;

export function grantLink(email, token) {
  return `${appUrl()}/registro?email=${encodeURIComponent(email)}&grant=${encodeURIComponent(token)}`;
}

export function sendGrantEmail({ to, partner, freeDays, token }) {
  const html = shell(partner, `<p style="font-size:16px;color:#1a202c;margin:0 0 12px;">¡Tienes un regalo! 🎁</p><p style="font-size:14px;color:#4a5568;margin:0 0 12px;"><b>${escHtml(partner.name)}</b> te regaló un perfil de piloto en BitaFly con <b>${freeDays} días gratis</b>. Registra tus vuelos, cumple el RAC 100 y mantén tu bitácora al día.</p>${button(grantLink(to, token), 'Activar mi perfil gratis')}<p style="font-size:12px;color:#718096;margin:0;">Este beneficio es único por persona y no es renovable.</p>`);
  return send({ to, subject: `🎁 Tu perfil BitaFly de regalo (${freeDays} días gratis)`, html });
}

export function sendGrantExpiredEmail({ to, partnerName }) {
  const html = shell({ name: partnerName }, `<p style="font-size:14px;color:#4a5568;margin:0 0 12px;">Tu perfil gratis de BitaFly${partnerName ? `, regalo de <b>${escHtml(partnerName)}</b>,` : ''} venció. Tus datos se conservan; para seguir operando elige un plan.</p>${button(`${appUrl()}/suscripcion`, 'Ver planes')}`);
  return send({ to, subject: 'Tu perfil gratis de BitaFly venció', html });
}

export function sendGrantReminderEmail({ to, daysLeft, partnerName }) {
  const html = shell({ name: partnerName }, `<p style="font-size:14px;color:#4a5568;margin:0 0 12px;">A tu perfil gratis de BitaFly le ${daysLeft === 1 ? 'queda <b>1 día</b>' : `quedan <b>${daysLeft} días</b>`}. Elige un plan para no perder el acceso.</p>${button(`${appUrl()}/suscripcion`, 'Elegir plan')}`);
  return send({ to, subject: `Tu perfil gratis de BitaFly vence en ${daysLeft} día(s)`, html });
}
