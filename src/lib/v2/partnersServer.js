// Skylog V2.0 — apoyo del servidor al programa de socios (Etapa E): códigos únicos, plan Enterprise del dueño de una
// escuela y correos. Todo lo que va al correo pasa por `escHtml` y se revisa el `{ error }` de Resend (el SDK no lanza).
import crypto from 'crypto';
import { Resend } from 'resend';
import { codeCandidate, PARTNER_INVITATION_TTL_DAYS } from '@skylog/domain';
import { escHtml, emailHeader, emailFooter } from '@/lib/emailHelpers';

export const newPartnerToken = () => crypto.randomBytes(24).toString('base64url');
export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'https://bitafly.com';

/** Código único `INICIALES-XXXX` (reintenta si ya existe; sufijo con la hora como último recurso). */
export async function generateUniqueCode(admin, name) {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = codeCandidate(name);
    const { data: exists } = await admin.from('partner_codes').select('id').eq('code', code).maybeSingle();
    if (!exists) return code;
  }
  return `${codeCandidate(name).split('-')[0]}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
}

const SCHOOL_NOTE = 'Enterprise por socio escuela';

/**
 * Beneficio del dueño de una ESCUELA: plan Enterprise permanente en las organizaciones que administra. Se marca en
 * `notes` para poder revertirlo sin tocar un Enterprise concedido por otra vía.
 */
export async function setOwnerEnterprise(admin, personId, partnerId, on) {
  const { data: orgs } = await admin.from('memberships').select('organization_id').eq('person_id', personId).eq('role', 'admin').eq('status', 'activa');
  const note = `${SCHOOL_NOTE} ${partnerId}`;
  for (const { organization_id } of orgs || []) {
    if (on) {
      await admin.from('subscriptions').upsert({ organization_id, plan: 'enterprise', expires_at: null, billing: 'monthly', notes: note }, { onConflict: 'organization_id' });
    } else {
      await admin.from('subscriptions').update({ plan: 'piloto' }).eq('organization_id', organization_id).eq('plan', 'enterprise').eq('notes', note);
    }
  }
}

function shell(partner, inner) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:auto;font-family:Arial,sans-serif;">${emailHeader({ partnerLogoUrl: partner.logo_url, partnerName: partner.name })}<tr><td style="padding:28px 40px;">${inner}</td></tr>${emailFooter()}</table>`;
}
const button = (href, label) => `<p style="margin:16px 0;"><a href="${escHtml(href)}" style="background:#ec5b13;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">${escHtml(label)}</a></p>`;

async function send({ to, subject, html }) {
  try {
    if (!process.env.RESEND_API_KEY) return { sent: false, reason: 'sin_resend' };
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: 'BitaFly Socios <no-reply@bitafly.com>', to: [to], subject, html });
    if (error) {
      console.error('[socios] Resend error:', error);
      return { sent: false, reason: 'resend' };
    }
    return { sent: true };
  } catch (e) {
    console.error('[socios] no se pudo enviar el correo:', e);
    return { sent: false, reason: 'error' };
  }
}

export function sendMemberWelcome({ to, name, partner, role, code }) {
  const html = shell(partner, `<p style="font-size:14px;color:#4a5568;margin:0 0 12px;">Hola${name ? ` ${escHtml(name)}` : ''}, ya tienes acceso al panel de socio de <b>${escHtml(partner.name)}</b> como ${role === 'owner' ? 'dueño' : 'asesor'}.</p>${code ? `<p style="font-size:14px;color:#4a5568;margin:0 0 12px;">Tu código de ventas: <b style="letter-spacing:.05em">${escHtml(code)}</b></p>` : ''}${button(`${appUrl()}/socio`, 'Ver mi panel')}`);
  return send({ to, subject: `Bienvenido al programa de socios — ${partner.name}`, html });
}

export function sendMemberInvitation({ to, partner, role, token }) {
  const link = `${appUrl()}/invitacion-socio/${token}`;
  const html = shell(partner, `<p style="font-size:14px;color:#4a5568;margin:0 0 12px;">Te invitaron como <b>${role === 'owner' ? 'dueño/representante' : 'asesor de ventas'}</b> de <b>${escHtml(partner.name)}</b> en el programa de socios de BitaFly.</p><p style="font-size:14px;color:#4a5568;margin:0 0 12px;">Crea tu cuenta gratuita para ver tu panel, tus comisiones y a tus clientes.</p>${button(link, 'Crear cuenta y unirme')}<p style="font-size:12px;color:#a0aec0;margin:0;">El enlace vence en ${PARTNER_INVITATION_TTL_DAYS} días.</p>`);
  return send({ to, subject: `Invitación al programa de socios de ${partner.name}`, html });
}

/** Al crear una organización (o aceptar ser dueño): si la persona es dueña de una escuela ACTIVA, esa organización es Enterprise. */
export async function applyOwnerBenefits(admin, personId) {
  try {
    const { data: owned } = await admin.from('partner_members').select('partner_id, partner:partners(type, status)').eq('person_id', personId).eq('role', 'owner');
    for (const o of owned || []) {
      if (o.partner?.type === 'escuela' && o.partner?.status === 'activo') await setOwnerEnterprise(admin, personId, o.partner_id, true);
    }
  } catch (e) {
    console.error('[socios] no se pudo aplicar el beneficio del dueño:', e.message);
  }
}
