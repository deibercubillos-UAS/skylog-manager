// Skylog V2.0 — completar el registro de quien entró con Google por primera vez (Etapa D): tiene sesión y correo
// verificado por Google, pero aún no persona, cuenta ni organización. Dos caminos, los mismos que el registro con
// contraseña: crear su empresa (prueba de 15 días) o unirse a una por NIT. Usa las mismas funciones atómicas.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { PLAN_PRICING } from '@/lib/v2/planLimits';
import { loadJoinContext, decideJoin, joinErrorMessage, notifyJoin } from '@/lib/v2/joinOrganization';
import { validateRegistration, validateJoinRegistration } from '@skylog/domain';

const PLACEHOLDER_PASSWORD = 'Aa1' + 'x'.repeat(12); // solo para reutilizar la validación: no se guarda ni se usa

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return Response.json({ error: 'No autenticado' }, { status: 401 });
  if (!checkRateLimit(`completar:${user.id}:${getClientIp(request)}`, { limit: 10, windowMs: 3_600_000 }).allowed) {
    return Response.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 });
  }
  if (adminKeyProblem()) return Response.json({ error: 'El registro no está disponible por ahora. Intenta más tarde.' }, { status: 503 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return Response.json({ error: 'Solicitud inválida.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing } = await admin.from('accounts').select('id').eq('auth_user_id', user.id).maybeSingle();
  if (existing) return Response.json({ error: 'Tu cuenta ya está registrada.' }, { status: 409 });

  // El correo es el de la sesión (verificado por Google): nunca el que mande el cliente.
  const input = { ...body, email: user.email, password: PLACEHOLDER_PASSWORD };
  const joining = body.mode === 'unirme';
  const check = joining ? validateJoinRegistration(input) : validateRegistration(input);
  if (!check.ok) return Response.json({ error: check.errors.join(' '), errors: check.errors }, { status: 400 });
  const { clean } = check;

  let attribution = null;
  const first = body.attribution?.first;
  if (first && typeof first === 'object' && JSON.stringify(first).length <= 2000) attribution = first;

  if (joining) {
    const ctx = await loadJoinContext(admin, clean.nit);
    if (!ctx) return Response.json({ error: 'No se encontró ninguna organización con ese NIT. Verifica con tu gerente.' }, { status: 404 });
    const decision = decideJoin(ctx, clean.role);
    if (!decision.ok) return Response.json({ error: decision.message, reason: decision.reason }, { status: 409 });
    const { error } = await admin.rpc('v2_join_organization', {
      p: { auth_user_id: user.id, organization_id: ctx.organizationId, role: clean.role, full_name: clean.fullName, email: clean.email, phone: clean.phone, attribution },
    });
    if (error) {
      const known = joinErrorMessage(error.message);
      if (!known) console.error('[completar] v2_join_organization falló:', error.message);
      return Response.json({ error: known?.error || 'No se pudo completar el registro. Intenta de nuevo.' }, { status: known?.status || 500 });
    }
    await notifyJoin(admin, { organizationId: ctx.organizationId, companyName: ctx.companyName, fullName: clean.fullName, email: clean.email, role: clean.role });
    return Response.json({ ok: true, organizationName: ctx.companyName });
  }

  const { data, error } = await admin.rpc('v2_register_explotador', {
    p: {
      auth_user_id: user.id,
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
    const known = /ya existe una organización/i.test(error.message);
    if (!known) console.error('[completar] v2_register_explotador falló:', error.message);
    return Response.json(
      { error: known ? 'Ya existe una organización registrada con ese NIT. Si trabajas allí, pide que te inviten.' : 'No se pudo completar el registro. Intenta de nuevo.' },
      { status: known ? 409 : 500 }
    );
  }
  return Response.json({ ok: true, organizationId: data.organization_id, trialDays: PLAN_PRICING.piloto.monthly.trialDays });
}
