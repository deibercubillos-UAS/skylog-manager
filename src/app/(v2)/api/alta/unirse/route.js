// Skylog V2.0 — registro de una cuenta NUEVA que se une a una organización existente por NIT (Etapa B). Gratis: no
// crea organización ni suscripción (el plan lo tiene la organización). Endpoint PÚBLICO: mismas defensas que
// /api/alta (límite por conexión y por correo, campo trampa) y mismo orden: usuario → función atómica → si falla,
// se borra el usuario. Al terminar avisa por correo a los gestores de la organización.
import { createAdminClient } from '@/lib/supabaseServer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { loadJoinContext, decideJoin, joinErrorMessage, notifyJoin } from '@/lib/v2/joinOrganization';
import { validateJoinRegistration } from '@skylog/domain';

const MAX_ATTRIBUTION_BYTES = 2000;

export async function POST(request) {
  if (!checkRateLimit(`unirse:${getClientIp(request)}`, { limit: 8, windowMs: 3_600_000 }).allowed) {
    return Response.json({ error: 'Demasiados registros desde esta conexión. Intenta más tarde.' }, { status: 429 });
  }
  if (adminKeyProblem()) return Response.json({ error: 'El registro no está disponible por ahora. Intenta más tarde.' }, { status: 503 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return Response.json({ error: 'Solicitud inválida.' }, { status: 400 });
  if (body.website) return Response.json({ ok: true }); // campo trampa

  const check = validateJoinRegistration(body);
  if (!check.ok) return Response.json({ error: check.errors.join(' '), errors: check.errors }, { status: 400 });
  const { clean } = check;
  if (!checkRateLimit(`unirse-email:${clean.email}`, { limit: 3, windowMs: 3_600_000 }).allowed) {
    return Response.json({ error: 'Demasiados intentos con este correo. Intenta más tarde.' }, { status: 429 });
  }

  const admin = createAdminClient();
  const ctx = await loadJoinContext(admin, clean.nit);
  if (!ctx) return Response.json({ error: 'No se encontró ninguna organización con ese NIT. Verifica con tu gerente.' }, { status: 404 });
  const decision = decideJoin(ctx, clean.role);
  if (!decision.ok) return Response.json({ error: decision.message, reason: decision.reason }, { status: 409 });

  let attribution = null;
  const first = body.attribution?.first;
  if (first && typeof first === 'object' && JSON.stringify(first).length <= MAX_ATTRIBUTION_BYTES) attribution = first;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: clean.email,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: clean.fullName },
  });
  if (createError || !created?.user) {
    const exists = /already|registered|exists/i.test(createError?.message || '');
    return Response.json({ error: exists ? 'Ya existe una cuenta con ese correo. Inicia sesión y únete desde tu perfil.' : 'No se pudo crear la cuenta. Intenta de nuevo.' }, { status: exists ? 409 : 500 });
  }

  const { error } = await admin.rpc('v2_join_organization', {
    p: { auth_user_id: created.user.id, organization_id: ctx.organizationId, role: clean.role, full_name: clean.fullName, email: clean.email, phone: clean.phone, attribution },
  });
  if (error) {
    await admin.auth.admin.deleteUser(created.user.id); // sin cuentas a medias
    const known = joinErrorMessage(error.message);
    if (!known) console.error('[unirse] v2_join_organization falló:', error.message);
    return Response.json({ error: known?.error || 'No se pudo completar el registro. Intenta de nuevo.' }, { status: known?.status || 500 });
  }

  await notifyJoin(admin, { organizationId: ctx.organizationId, companyName: ctx.companyName, fullName: clean.fullName, email: clean.email, role: clean.role });
  return Response.json({ ok: true, organizationName: ctx.companyName });
}
