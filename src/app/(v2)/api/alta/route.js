// Skylog V2.0 — alta de un explotador nuevo (Etapa A de docs/skylog-v2/44-alta-y-socios.md). Endpoint PÚBLICO:
// todo lo que llega es hostil hasta validarlo. Crea el usuario de autenticación y, con una función atómica de la
// base (`v2_register_explotador`), la persona, la cuenta, la organización, la membresía de administrador y la
// suscripción de prueba. Si la base falla, se borra el usuario recién creado: nunca quedan cuentas a medias.
// Cuenta primero con prueba gratuita (15 días, plan Piloto); el pago se hace después en /suscripcion.
import { createAdminClient } from '@/lib/supabaseServer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { PLAN_PRICING } from '@/lib/v2/planLimits';
import { validateRegistration } from '@skylog/domain';

const MAX_ATTRIBUTION_BYTES = 2000;

export async function POST(request) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`alta:${ip}`, { limit: 5, windowMs: 3_600_000 }).allowed) {
    return Response.json({ error: 'Demasiados registros desde esta conexión. Intenta más tarde.' }, { status: 429 });
  }
  if (adminKeyProblem()) return Response.json({ error: 'El registro no está disponible por ahora. Intenta más tarde.' }, { status: 503 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return Response.json({ error: 'Solicitud inválida.' }, { status: 400 });
  if (body.website) return Response.json({ ok: true }); // campo trampa de bots: se finge éxito sin crear nada

  const check = validateRegistration(body);
  if (!check.ok) return Response.json({ error: check.errors.join(' '), errors: check.errors }, { status: 400 });
  const { clean } = check;
  if (!checkRateLimit(`alta-email:${clean.email}`, { limit: 3, windowMs: 3_600_000 }).allowed) {
    return Response.json({ error: 'Demasiados intentos con este correo. Intenta más tarde.' }, { status: 429 });
  }

  // La atribución es solo texto de marketing; se acota para que nadie guarde un documento enorme.
  let attribution = null;
  if (body.attribution && typeof body.attribution === 'object') {
    const first = body.attribution.first && typeof body.attribution.first === 'object' ? body.attribution.first : null;
    if (first && JSON.stringify(first).length <= MAX_ATTRIBUTION_BYTES) attribution = first;
  }

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: clean.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: clean.fullName },
  });
  if (createError || !created?.user) {
    const exists = /already|registered|exists/i.test(createError?.message || '');
    return Response.json(
      { error: exists ? 'Ya existe una cuenta con ese correo. Inicia sesión.' : 'No se pudo crear la cuenta. Intenta de nuevo.' },
      { status: exists ? 409 : 500 }
    );
  }

  const { data, error } = await admin.rpc('v2_register_explotador', {
    p: {
      auth_user_id: created.user.id,
      full_name: clean.fullName,
      email: clean.email,
      phone: clean.phone,
      company_name: clean.companyName,
      nit: clean.nit,
      nit_type: clean.nitType,
      trial_days: PLAN_PRICING.piloto.monthly.trialDays,
      attribution,
    },
  });
  if (error) {
    await admin.auth.admin.deleteUser(created.user.id); // sin cuentas a medias
    const known = /ya existe una organización/i.test(error.message);
    if (!known) console.error('[alta] v2_register_explotador falló:', error.message);
    return Response.json(
      { error: known ? 'Ya existe una organización registrada con ese NIT. Si trabajas allí, pide que te inviten.' : 'No se pudo completar el registro. Intenta de nuevo.' },
      { status: known ? 409 : 500 }
    );
  }

  return Response.json({ ok: true, organizationId: data.organization_id, trialDays: PLAN_PRICING.piloto.monthly.trialDays });
}
