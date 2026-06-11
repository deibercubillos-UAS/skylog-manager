import { createAdminClient } from '@/lib/supabaseServer';
import { Resend } from 'resend';
import { escHtml } from '@/lib/emailHelpers';

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';

/**
 * Notifica a TODOS los miembros de la organización que un manual cambió
 * (nuevo manual cargado o nueva versión publicada).
 *
 * Fire-and-forget: si RESEND_API_KEY no existe o falla el envío, no rompe
 * la operación que la disparó (el caller la envuelve en try/catch).
 *
 * @param {object}  args
 * @param {string}  args.orgId    — organización
 * @param {object}  args.manual   — fila company_manuals (title, category)
 * @param {object}  args.version  — fila manual_versions (version, effective_date, comments)
 * @param {string}  args.actorId  — quién hizo el cambio (se excluye del envío)
 * @param {'created'|'updated'} args.action — manual nuevo vs nueva versión
 */
export async function notifyManualChange({ orgId, manual, version, actorId, action = 'updated' }) {
  if (!process.env.RESEND_API_KEY) return;

  const admin = createAdminClient();

  // Todos los miembros de la org (incluye pilotos — la idea es que todos se enteren)
  const { data: members } = await admin
    .from('profiles')
    .select('email, id')
    .eq('organization_id', orgId);

  const recipients = (members || [])
    .filter(m => m.id !== actorId && m.email)
    .map(m => m.email);
  if (recipients.length === 0) return;

  const { data: org } = await admin
    .from('organizations').select('company_name').eq('id', orgId).maybeSingle();

  const resend  = new Resend(process.env.RESEND_API_KEY);
  const orgNm   = escHtml(org?.company_name || 'la organización');
  const title   = escHtml(manual?.title || 'Manual');
  const ver     = escHtml(version?.version || '—');
  const date    = escHtml(version?.effective_date || 'sin fecha');
  const comments = version?.comments ? escHtml(version.comments) : null;
  const verb    = action === 'created' ? 'cargó un nuevo manual' : 'publicó una nueva versión';
  const emoji   = action === 'created' ? '📘' : '🔄';

  await resend.emails.send({
    from:    'BitaFly <no-reply@bitafly.com>',
    replyTo: 'soporte@bitafly.com',
    to:      recipients,
    subject: `${emoji} ${title} · versión ${version?.version || ''} (${org?.company_name || 'BitaFly'})`,
    html: `
<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:40px 0;"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;max-width:600px;">
      <tr><td style="background:#ec5b13;padding:32px 40px;">
        <h1 style="margin:0;color:#fff;font-size:24px;font-weight:900;">BitaFly</h1>
        <p style="margin:6px 0 0;color:#fde0cc;font-size:13px;">Manual actualizado</p>
      </td></tr>
      <tr><td style="padding:40px;">
        <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">
          Se ${verb} en <strong>${orgNm}</strong>. Revisa la versión vigente en la plataforma.
        </p>
        <table cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;font-size:14px;color:#1a202c;">
          <tr><td style="padding:6px 0;color:#718096;width:130px;">Manual</td><td style="padding:6px 0;font-weight:700;">${title}</td></tr>
          <tr><td style="padding:6px 0;color:#718096;">Versión</td><td style="padding:6px 0;font-weight:700;">${ver}</td></tr>
          <tr><td style="padding:6px 0;color:#718096;">Fecha de vigencia</td><td style="padding:6px 0;font-weight:700;">${date}</td></tr>
          ${comments ? `<tr><td style="padding:6px 0;color:#718096;vertical-align:top;">Comentarios</td><td style="padding:6px 0;font-weight:400;color:#4a5568;">${comments}</td></tr>` : ''}
        </table>
        <table cellpadding="0" cellspacing="0"><tr><td style="background:#ec5b13;border-radius:10px;">
          <a href="${SITE()}/dashboard/manuales" style="display:inline-block;padding:14px 32px;color:#fff;font-size:15px;font-weight:900;text-decoration:none;">Ver manuales →</a>
        </td></tr></table>
      </td></tr>
      <tr><td style="background:#f7f8fa;padding:20px 40px;border-top:1px solid #edf2f7;">
        <p style="margin:0;font-size:12px;color:#a0aec0;text-align:center;">BitaFly · bitafly.com</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`,
  });
}
