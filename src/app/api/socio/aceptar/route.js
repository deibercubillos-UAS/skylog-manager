// Skylog V2.0 — POST /api/socio/aceptar — aceptar la invitación de un socio (dueño o asesor) (Etapa E2). Dos caminos:
// con sesión (el correo de la sesión debe ser el de la invitación) o sin ella (se crea la cuenta con el correo de la
// invitación, bloqueado). Todo en una función atómica de la base; si falla, se borra el usuario recién creado.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { passwordProblem, partnerInvitationState } from '@skylog/domain';
import { applyOwnerBenefits } from '@/lib/v2/partnersServer';

export const dynamic = 'force-dynamic';

const PHRASES = [
  [/no existe/i, 'Esta invitación no existe.', 404],
  [/ya no est/i, 'Esta invitación ya no está vigente.', 410],
  [/venci/i, 'Esta invitación venció. Pide que te envíen una nueva.', 410],
  [/no coincide/i, 'El correo de tu sesión no es el de la invitación. Cierra sesión e ingresa con el correo invitado.', 403],
  [/socio no est/i, 'El socio ya no está activo.', 409],
];

export async function POST(request) {
  if (!checkRateLimit(`socio-aceptar:${getClientIp(request)}`, { limit: 10, windowMs: 3_600_000 }).allowed) {
    return Response.json({ error: 'Demasiados intentos desde esta conexión. Intenta más tarde.' }, { status: 429 });
  }
  if (adminKeyProblem()) return Response.json({ error: 'El servicio no está disponible por ahora.' }, { status: 503 });

  const body = await request.json().catch(() => null);
  const token = String(body?.token || '').trim();
  if (!token || token.length > 200) return Response.json({ error: 'token requerido' }, { status: 400 });

  const admin = createAdminClient();
  const { data: inv } = await admin.from('partner_invitations').select('email, status, expires_at').eq('token', token).maybeSingle();
  if (!inv) return Response.json({ error: 'Esta invitación no existe.' }, { status: 404 });
  const state = partnerInvitationState(inv);
  if (state !== 'usable') return Response.json({ error: state === 'usada' ? 'Esta invitación ya fue aceptada.' : state === 'revocada' ? 'Esta invitación fue cancelada.' : 'Esta invitación venció. Pide que te envíen una nueva.' }, { status: 410 });

  const supabase = await createClientSSR();
  const { data: { user: sessionUser } } = await supabase.auth.getUser();
  let authUserId = sessionUser?.id || null;
  let created = false;
  let fullName = null;
  let phone = null;

  if (sessionUser) {
    if ((sessionUser.email || '').toLowerCase() !== inv.email.toLowerCase()) return Response.json({ error: PHRASES[3][1], reason: 'correo_distinto' }, { status: 403 });
  } else {
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const problems = [];
    if (firstName.length < 2) problems.push('Escribe tu nombre.');
    if (lastName.length < 2) problems.push('Escribe tus apellidos.');
    const pw = passwordProblem(body.password);
    if (pw) problems.push(pw);
    if (body.acceptedTerms !== true) problems.push('Debes aceptar los términos y la política de privacidad.');
    if (problems.length) return Response.json({ error: problems.join(' '), errors: problems }, { status: 400 });
    fullName = `${firstName} ${lastName}`;
    phone = String(body.phone || '').trim().slice(0, 30) || null;
    const { data: made, error: createError } = await admin.auth.admin.createUser({ email: inv.email.toLowerCase(), password: body.password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (createError || !made?.user) {
      const exists = /already|registered|exists/i.test(createError?.message || '');
      return Response.json({ error: exists ? 'Ya existe una cuenta con ese correo. Inicia sesión para aceptar la invitación.' : 'No se pudo crear la cuenta. Intenta de nuevo.', reason: exists ? 'cuenta_existente' : undefined }, { status: exists ? 409 : 500 });
    }
    authUserId = made.user.id;
    created = true;
  }

  const { data, error } = await admin.rpc('v2_accept_partner_invitation', { p: { token, auth_user_id: authUserId, email: inv.email, full_name: fullName, phone } });
  if (error) {
    if (created) await admin.auth.admin.deleteUser(authUserId);
    const hit = PHRASES.find(([re]) => re.test(error.message));
    if (!hit) console.error('[socio-aceptar] v2_accept_partner_invitation falló:', error.message);
    return Response.json({ error: hit ? hit[1] : 'No se pudo aceptar la invitación. Intenta de nuevo.' }, { status: hit ? hit[2] : 500 });
  }
  await applyOwnerBenefits(admin, data.person_id);
  return Response.json({ ok: true, role: data.role, signedIn: !!sessionUser });
}
