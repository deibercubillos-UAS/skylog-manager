// Skylog V2.0 — reenvío del correo de confirmación del registro. Endpoint PÚBLICO: responde siempre lo mismo (no
// revela si el correo existe ni si ya está confirmado) y solo envía a cuentas que siguen SIN confirmar.
import { createAdminClient } from '@/lib/supabaseServer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { sendSignupConfirmation } from '@/lib/v2/signupVerification';

export async function POST(request) {
  if (!checkRateLimit(`reenviar:${getClientIp(request)}`, { limit: 10, windowMs: 3_600_000 }).allowed) {
    return Response.json({ error: 'Demasiados intentos desde esta conexión. Intenta más tarde.' }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const email = String(body?.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) return Response.json({ error: 'Escribe un correo válido.' }, { status: 400 });
  if (!checkRateLimit(`reenviar-email:${email}`, { limit: 3, windowMs: 3_600_000 }).allowed) {
    return Response.json({ error: 'Demasiados intentos con este correo. Intenta más tarde.' }, { status: 429 });
  }
  await sendSignupConfirmation(createAdminClient(), { email });
  return Response.json({ ok: true });
}
