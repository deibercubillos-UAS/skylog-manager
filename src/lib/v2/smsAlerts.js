// Skylog V2.0 — avisos del seguimiento de sucesos (correo, mejor esfuerzo).
// Nunca bloquea ni rompe la operación que los dispara: si falta RESEND_API_KEY o el envío falla, se registra y se sigue.
import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabaseServer';
import { escHtml, emailHeader, emailFooter } from '@/lib/emailHelpers';

const FROM = 'Skylog <notificaciones@bitafly.com>';

/** Correos de los Gerentes SMS activos de la organización (membresía → cuenta → usuario de auth). */
export async function analystEmails(organizationId) {
  const admin = createAdminClient();
  const { data: members } = await admin.from('memberships').select('person_id').eq('organization_id', organizationId).eq('role', 'gerente_sms').eq('status', 'activa');
  const personIds = (members || []).map((m) => m.person_id);
  if (personIds.length === 0) return [];
  const { data: accounts } = await admin.from('accounts').select('auth_user_id').in('person_id', personIds);
  const emails = [];
  for (const a of accounts || []) {
    const { data } = await admin.auth.admin.getUserById(a.auth_user_id);
    if (data?.user?.email) emails.push(data.user.email);
  }
  return [...new Set(emails)];
}

function shell(title, bodyHtml, ctaUrl, ctaLabel) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:auto;font-family:Arial,sans-serif;">
    ${emailHeader()}
    <tr><td style="padding:28px 40px;">
      <h2 style="margin:0 0 12px;font-size:18px;color:#1A202C;">${escHtml(title)}</h2>
      ${bodyHtml}
      ${ctaUrl ? `<p style="margin-top:20px;"><a href="${escHtml(ctaUrl)}" style="background:#ec5b13;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">${escHtml(ctaLabel)}</a></p>` : ''}
    </td></tr>
    ${emailFooter()}
  </table>`;
}

export async function sendAnalystMail({ organizationId, subject, title, bodyHtml, path, ctaLabel }) {
  try {
    if (!process.env.RESEND_API_KEY) return { sent: 0, skipped: 'sin_resend' };
    const to = await analystEmails(organizationId);
    if (to.length === 0) return { sent: 0, skipped: 'sin_destinatarios' };
    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://bitafly.com';
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: FROM, to, subject, html: shell(title, bodyHtml, path ? `${base}${path}` : null, ctaLabel) });
    if (error) {
      console.error('[smsAlerts] Resend error:', error);
      return { sent: 0, error: true };
    }
    return { sent: to.length };
  } catch (e) {
    console.error('[smsAlerts] fallo al avisar:', e);
    return { sent: 0, error: true };
  }
}

/** Aviso al llegar un reporte nuevo (interno o público). No incluye identidad del reportante. */
export function notifyNewReport({ organizationId, report }) {
  const sev = { incidente: 'Incidente', incidente_grave: 'Incidente grave', accidente: 'Accidente' }[report.severity] || report.severity;
  const route = report.route === 'rac114' ? 'RAC 114' : (report.route || 'vor').toUpperCase();
  const body = `<p style="font-size:14px;color:#4a5568;margin:0 0 8px;"><b>${escHtml(report.event_label || 'Suceso')}</b> · ${escHtml(sev)} · ${escHtml(route)}${report.source === 'public' ? ' · enlace público' : ''}</p>
    <p style="font-size:13px;color:#4a5568;margin:0;">${escHtml(String(report.description || '').slice(0, 300))}</p>`;
  return sendAnalystMail({ organizationId, subject: `Nuevo reporte ${route}: ${report.event_label || 'suceso'}`, title: 'Llegó un reporte de seguridad', bodyHtml: body, path: '/sms/reportes', ctaLabel: 'Ver en Skylog' });
}
