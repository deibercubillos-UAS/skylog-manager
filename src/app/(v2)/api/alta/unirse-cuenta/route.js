// Skylog V2.0 — una persona que YA tiene cuenta se une a otra organización por NIT (Etapa B). Solo agrega una
// membresía: no migra datos ni cambia la organización activa (misma regla que la versión actual). Requiere sesión.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { loadJoinContext, decideJoin, joinErrorMessage, notifyJoin } from '@/lib/v2/joinOrganization';
import { JOINABLE_ROLES, normalizeNit } from '@skylog/domain';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  if (!checkRateLimit(`unirse-cuenta:${user.id}:${getClientIp(request)}`, { limit: 10, windowMs: 3_600_000 }).allowed) {
    return Response.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 });
  }
  if (adminKeyProblem()) return Response.json({ error: 'El servicio no está disponible por ahora.' }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const nit = normalizeNit(body.nit);
  const role = body.role;
  if (!/^[A-Z0-9]{5,20}$/.test(nit)) return Response.json({ error: 'Escribe el NIT de la organización.' }, { status: 400 });
  if (!JOINABLE_ROLES.includes(role)) return Response.json({ error: 'Elige tu rol.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: account } = await admin.from('accounts').select('person_id').eq('auth_user_id', user.id).maybeSingle();
  if (!account) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía.' }, { status: 404 });

  const ctx = await loadJoinContext(admin, nit);
  if (!ctx) return Response.json({ error: 'No se encontró ninguna organización con ese NIT. Verifica con tu gerente.' }, { status: 404 });
  const decision = decideJoin(ctx, role);
  if (!decision.ok) return Response.json({ error: decision.message, reason: decision.reason }, { status: 409 });

  const { error } = await admin.rpc('v2_join_organization', { p: { auth_user_id: user.id, organization_id: ctx.organizationId, role } });
  if (error) {
    const known = joinErrorMessage(error.message);
    if (!known) console.error('[unirse-cuenta] v2_join_organization falló:', error.message);
    return Response.json({ error: known?.error || 'No se pudo completar. Intenta de nuevo.' }, { status: known?.status || 500 });
  }

  const { data: person } = await admin.from('people').select('full_name, email').eq('id', account.person_id).maybeSingle();
  await notifyJoin(admin, { organizationId: ctx.organizationId, companyName: ctx.companyName, fullName: person?.full_name || 'Un usuario', email: person?.email || user.email, role });
  return Response.json({ ok: true, organizationName: ctx.companyName, organizationId: ctx.organizationId });
}
