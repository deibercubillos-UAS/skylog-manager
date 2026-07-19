// GET /api/cron/grant-expiring-reminder — Vercel Cron (diario)
//
// Avisa a quien tiene un acceso gratuito activo (regalo de socio o de
// Master sin organización, ambos en `free_grants`) que su vencimiento está
// a 5 días o menos — vía campana in-app + correo (Resend). Complementa al
// aviso post-vencimiento que ya hace /api/cron/free-grants (ese es
// reactivo, este es preventivo). Ver CLAUDE.md.
//
// Secured con Authorization: Bearer CRON_SECRET (mismo patrón que el resto
// de crons de recordatorio).

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { createNotifications } from '@/lib/notify';
import { escHtml, emailHeader, emailFooter } from '@/lib/emailHelpers';

export const dynamic = 'force-dynamic';

const REMIND_WITHIN_DAYS = 5;

function makeAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function verifyAuth(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return (request.headers.get('authorization') || '') === `Bearer ${secret}`;
}

// Dedup: no repetir el mismo aviso más de una vez por día para el mismo grant.
async function alreadyNotifiedToday(admin, grantId) {
  const since = new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(); // ~20h, tolera corrimiento del cron
  const { data } = await admin
    .from('notifications')
    .select('id')
    .eq('type', 'grant_expiring_soon')
    .contains('metadata', { grant_id: grantId })
    .gte('created_at', since)
    .limit(1);
  return (data || []).length > 0;
}

async function sendEmail({ resend, to, daysLeft, expiresLabel, link }) {
  if (!resend || !to) return;
  try {
    await resend.emails.send({
      from: 'BitaFly <no-reply@bitafly.com>',
      to,
      subject: daysLeft <= 0
        ? 'Tu acceso gratuito en BitaFly vence hoy'
        : `Tu acceso gratuito en BitaFly vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
      html: `
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;font-family:sans-serif;">
          ${emailHeader()}
          <tr><td style="padding:32px 40px;">
            <p>Hola,</p>
            <p>Tu acceso gratuito a BitaFly vence el <strong>${escHtml(expiresLabel)}</strong>.
              Suscríbete para no perder tu bitácora digital, el control de tu flota y el cumplimiento RAC 100.</p>
            <p style="margin-top:24px;">
              <a href="${escHtml(link)}" style="background:#ec5b13;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Ver planes de suscripción</a>
            </p>
          </td></tr>
          ${emailFooter()}
        </table>
      `,
    });
  } catch (err) {
    console.warn('[cron/grant-expiring-reminder] email falló:', err.message);
  }
}

export async function GET(request) {
  if (!verifyAuth(request)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const admin = makeAdmin();
  const resendKey = process.env.RESEND_API_KEY;
  const resend = resendKey ? new Resend(resendKey) : null;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://bitafly.com').replace(/\/$/, '');

  const results = { notified: 0, skippedDedup: 0, skippedNoOrg: 0, errors: [] };

  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + REMIND_WITHIN_DAYS * 86400000).toISOString();

    const { data: grants } = await admin
      .from('free_grants')
      .select('id, email, expires_at, redeemed_org_id')
      .eq('status', 'activado')
      .lte('expires_at', windowEnd)
      .gt('expires_at', now.toISOString());

    for (const grant of grants || []) {
      try {
        if (!grant.redeemed_org_id) { results.skippedNoOrg++; continue; }
        if (await alreadyNotifiedToday(admin, grant.id)) { results.skippedDedup++; continue; }

        const daysLeft = Math.ceil((new Date(grant.expires_at) - now) / 86400000);
        const expiresLabel = new Date(grant.expires_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
        const link = '/dashboard/subscription';
        const title = daysLeft <= 0
          ? 'Tu acceso gratuito vence hoy'
          : `Tu acceso gratuito vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`;
        const body = `Suscríbete antes del ${expiresLabel} para no perder acceso a tu bitácora y flota.`;

        await createNotifications({
          orgId:  grant.redeemed_org_id,
          roles:  ['admin'],
          type:   'grant_expiring_soon',
          title,
          body,
          link,
          metadata: { grant_id: grant.id },
        });

        await sendEmail({ resend, to: grant.email, daysLeft, expiresLabel, link: `${siteUrl}${link}` });

        results.notified++;
      } catch (err) {
        results.errors.push(`grant ${grant.id}: ${err.message}`);
      }
    }
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  console.log('[cron/grant-expiring-reminder] done', results);
  return NextResponse.json(results);
}
