// Skylog V2.0 — aceptar una invitación (Etapa C). El TOKEN es la capacidad: quien lo tiene ve a qué organización y con
// qué rol lo invitaron. Endpoint PÚBLICO con límites por conexión.
//   GET  → datos de la invitación y si ese correo ya tiene cuenta (para mostrar «inicia sesión» o «crea tu cuenta»).
//   POST → acepta: con sesión (el correo de la sesión debe ser el de la invitación) o creando la cuenta con ese correo.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { loadJoinContextByOrgId, decideJoin, joinErrorMessage, notifyJoin } from '@/lib/v2/joinOrganization';
import { invitationState, INVITATION_STATE_MESSAGES, INVITE_ROLE_LABELS, passwordProblem } from '@skylog/domain';

const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

async function loadInvitation(admin, token) {
  if (!TOKEN_RE.test(token || '')) return null;
  const { data } = await admin.from('invitations').select('*, organization:organization_id(id, company_name)').eq('token', token).maybeSingle();
  return data || null;
}

export async function GET(request, { params }) {
  params = await params;
  const { token } = await params;
  if (!checkRateLimit(`inv-get:${getClientIp(request)}`, { limit: 30, windowMs: 60_000 }).allowed) {
    return Response.json({ error: 'Demasiadas consultas. Intenta en un minuto.' }, { status: 429 });
  }
  if (adminKeyProblem()) return Response.json({ error: 'Servicio no disponible por ahora.' }, { status: 503 });

  const admin = createAdminClient();
  const inv = await loadInvitation(admin, token);
  const state = invitationState(inv, Date.now());
  if (state !== 'usable') return Response.json({ state, message: INVITATION_STATE_MESSAGES[state] }, { status: state === 'inexistente' ? 404 : 410 });

  // ¿Ese correo ya tiene cuenta? (persona con ese correo que tenga una cuenta)
  const { data: person } = await admin.from('people').select('id').ilike('email', inv.email.replace(/[\\%_]/g, '\\$&')).limit(1).maybeSingle();
  let hasAccount = false;
  if (person) {
    const { data: acc } = await admin.from('accounts').select('id').eq('person_id', person.id).maybeSingle();
    hasAccount = !!acc;
  }
  return Response.json({ state, email: inv.email, name: inv.name, role: inv.role, roleLabel: INVITE_ROLE_LABELS[inv.role], organizationName: inv.organization?.company_name, hasAccount });
}

export async function POST(request, { params }) {
  params = await params;
  const { token } = await params;
  if (!checkRateLimit(`inv-accept:${getClientIp(request)}`, { limit: 10, windowMs: 3_600_000 }).allowed) {
    return Response.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 });
  }
  if (adminKeyProblem()) return Response.json({ error: 'El servicio no está disponible por ahora.' }, { status: 503 });

  const admin = createAdminClient();
  const inv = await loadInvitation(admin, token);
  const state = invitationState(inv, Date.now());
  if (state !== 'usable') return Response.json({ error: INVITATION_STATE_MESSAGES[state] }, { status: state === 'inexistente' ? 404 : 410 });

  // Plan y cargo único: el estado de la organización puede haber cambiado desde que se envió la invitación.
  if (inv.role !== 'admin') {
    const ctx = await loadJoinContextByOrgId(admin, inv.organization);
    const decision = decideJoin(ctx, inv.role);
    if (!decision.ok) return Response.json({ error: decision.message, reason: decision.reason }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const supabase = await createClientSSR();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  let authUserId;
  let createdHere = false;
  let fullName = inv.name || inv.email;
  let phone = null;

  if (sessionUser) {
    // Cuenta existente: la invitación es para ESE correo.
    if ((sessionUser.email || '').toLowerCase() !== inv.email.toLowerCase()) {
      return Response.json({ error: `Esta invitación es para ${inv.email}. Cierra sesión e ingresa con ese correo.`, reason: 'correo_distinto' }, { status: 403 });
    }
    authUserId = sessionUser.id;
  } else {
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const problems = [];
    if (firstName.length < 2) problems.push('Escribe tu nombre.');
    if (lastName.length < 2) problems.push('Escribe tus apellidos.');
    const pw = passwordProblem(body.password);
    if (pw) problems.push(pw);
    if (body.acceptedTerms !== true) problems.push('Debes aceptar los términos y la política de privacidad.');
    const phoneRaw = String(body.phone || '').trim();
    if (phoneRaw && !/^[0-9+()\s-]{7,20}$/.test(phoneRaw)) problems.push('El teléfono no es válido.');
    if (problems.length) return Response.json({ error: problems.join(' '), errors: problems }, { status: 400 });
    fullName = `${firstName} ${lastName}`;
    phone = phoneRaw || null;

    const { data: created, error: createError } = await admin.auth.admin.createUser({ email: inv.email, password: body.password, email_confirm: true, user_metadata: { full_name: fullName } });
    if (createError || !created?.user) {
      const exists = /already|registered|exists/i.test(createError?.message || '');
      return Response.json({ error: exists ? 'Ya tienes una cuenta con este correo. Inicia sesión para aceptar la invitación.' : 'No se pudo crear la cuenta. Intenta de nuevo.', reason: exists ? 'cuenta_existente' : undefined }, { status: exists ? 409 : 500 });
    }
    authUserId = created.user.id;
    createdHere = true;
  }

  const { error } = await admin.rpc('v2_accept_invitation', { p: { token, auth_user_id: authUserId, full_name: fullName, phone } });
  if (error) {
    if (createdHere) await admin.auth.admin.deleteUser(authUserId); // sin cuentas a medias
    const known = joinErrorMessage(error.message) || (/invitación|venció/i.test(error.message) ? { status: 410, error: error.message } : null);
    if (!known) console.error('[invitaciones] v2_accept_invitation falló:', error.message);
    return Response.json({ error: known?.error || 'No se pudo aceptar la invitación. Intenta de nuevo.' }, { status: known?.status || 500 });
  }

  await notifyJoin(admin, { organizationId: inv.organization.id, companyName: inv.organization.company_name, fullName, email: inv.email, role: inv.role, via: 'invitacion' });
  return Response.json({ ok: true, organizationName: inv.organization.company_name, signedIn: !!sessionUser });
}
