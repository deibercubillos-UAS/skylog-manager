import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabaseServer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { Resend } from 'resend';
import { escHtml } from '@/lib/emailHelpers';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_SOURCES = ['newsletter', 'checklist', 'landing', 'blog'];

export async function POST(request) {
  try {
    // Rate limit: 5 por IP por hora (anti-spam en endpoint público)
    const ip = getClientIp(request);
    const { allowed } = checkRateLimit(`lead:${ip}`, { limit: 5, windowMs: 3_600_000 });
    if (!allowed) {
      return NextResponse.json({ error: 'Demasiados envíos. Intenta más tarde.' }, { status: 429 });
    }

    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 200) {
      return NextResponse.json({ error: 'Correo inválido.' }, { status: 400 });
    }

    const source = VALID_SOURCES.includes(body.source) ? body.source : 'newsletter';
    const name   = body.name ? String(body.name).slice(0, 120) : null;
    // Atribución: solo el objeto first-touch (campos UTM), saneado
    const utm = (body.attribution && typeof body.attribution === 'object')
      ? body.attribution.first || null
      : null;
    const referrer     = utm?.referrer ? String(utm.referrer).slice(0, 300) : null;
    const landing_path = utm?.landing_path ? String(utm.landing_path).slice(0, 200) : null;

    const admin = createAdminClient();

    // Idempotente por (email, source): upsert no duplica
    const { error } = await admin
      .from('leads')
      .upsert({ email, name, source, utm, referrer, landing_path }, { onConflict: 'email,source', ignoreDuplicates: true });
    if (error) throw error;

    // Notificación interna (no crítica)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from:    'BitaFly <no-reply@bitafly.com>',
          to:      ['soporte@bitafly.com'],
          subject: `📬 Nuevo lead (${source}): ${email}`,
          html: `<p>Nuevo lead capturado.</p>
                 <ul>
                   <li><strong>Email:</strong> ${escHtml(email)}</li>
                   <li><strong>Fuente:</strong> ${escHtml(source)}</li>
                   <li><strong>Campaña:</strong> ${escHtml(utm?.utm_campaign || '(directo)')}</li>
                   <li><strong>Origen:</strong> ${escHtml(utm?.utm_source || referrer || '(directo)')}</li>
                 </ul>`,
        });
      } catch (e) { console.warn('[leads] email no enviado:', e.message); }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[leads POST]', err.message);
    return NextResponse.json({ error: 'No se pudo registrar. Intenta de nuevo.' }, { status: 500 });
  }
}
