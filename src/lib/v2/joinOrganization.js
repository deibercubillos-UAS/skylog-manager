// Skylog V2.0 — apoyo del servidor para «unirse a una organización por NIT» (Etapa B de
// docs/skylog-v2/44-alta-y-socios.md). La decisión de negocio es pura (`evaluateJoin`, en el dominio); aquí solo se
// cargan los datos y se avisa a los gestores. Todo con service role: lo llaman rutas públicas o de una cuenta nueva.
import { createNotifications } from '@/lib/v2/notify';
import { Resend } from 'resend';
import { evaluateJoin, JOIN_ROLE_LABELS, INVITE_ROLE_LABELS, normalizeNit } from '@skylog/domain';
import { crewCountsForLimit, limitsForSubscription } from '@/lib/v2/planLimits';
import { escHtml, emailHeader, emailFooter } from '@/lib/emailHelpers';

/** Organización (y lo necesario para decidir) a partir de un NIT; null si no existe. */
export async function loadJoinContext(admin, rawNit) {
  const nit = normalizeNit(rawNit);
  if (!nit) return null;
  const { data: found } = await admin.rpc('v2_org_by_nit', { p_nit: nit });
  const org = Array.isArray(found) ? found[0] : found;
  if (!org) return null;
  return loadJoinContextByOrgId(admin, org);
}

/** Lo mismo a partir de una organización ya conocida ({ id, company_name }) — lo usan las invitaciones. */
export async function loadJoinContextByOrgId(admin, org) {
  const [{ data: members }, { data: sub }] = await Promise.all([
    admin.from('memberships').select('role').eq('organization_id', org.id).eq('status', 'activa'),
    admin.from('subscriptions').select('*').eq('organization_id', org.id).maybeSingle(),
  ]);
  const { plan, limits } = limitsForSubscription(sub);
  return {
    organizationId: org.id,
    companyName: org.company_name,
    members: members || [],
    plan,
    crewLimit: limits.pilots,
    crewCount: (members || []).filter((m) => crewCountsForLimit(m.role)).length,
  };
}

export const decideJoin = (ctx, role) => evaluateJoin({ role, members: ctx.members, crewLimit: ctx.crewLimit, crewCount: ctx.crewCount });

/** Mensaje del servidor para un error de la función de la base. */
export function joinErrorMessage(message) {
  if (/ya eres miembro/i.test(message)) return { status: 409, error: 'Ya eres miembro de esta organización.' };
  if (/ya está ocupado/i.test(message)) return { status: 409, error: 'Ese cargo acaba de ocuparse en la organización. Elige otro rol.' };
  if (/solicitud pendiente/i.test(message)) return { status: 409, error: 'Ya tienes una solicitud pendiente en esta organización.' };
  if (/demasiadas solicitudes/i.test(message)) return { status: 429, error: 'La organización tiene demasiadas solicitudes pendientes. Pídele a su gerente que las revise.' };
  return null;
}

/**
 * Avisa por correo (mejor esfuerzo) al Gerente General, Jefe de Pilotos y Gerente SMS de que alguien se unió. Es la
 * contrapartida de que entrar por NIT no requiera aprobación: los gestores se enteran de inmediato y pueden
 * cerrar la membresía desde Tripulación si no la reconocen.
 */
export async function notifyJoin(admin, { organizationId, companyName, fullName, email, role, via = 'nit' }) {
  const { data: joiner } = email ? await admin.from('people').select('id').ilike('email', email).limit(1).maybeSingle() : { data: null };
  await createNotifications({
    organizationId,
    roles: via === 'solicitud' ? ['admin', 'jefe_pilotos'] : ['admin', 'jefe_pilotos', 'gerente_sms'],
    actorPersonId: joiner?.id, // quien se unió no recibe el aviso de su propia entrada
    type: 'miembro_nuevo',
    title: via === 'solicitud' ? `${fullName} pidió unirse a ${companyName}` : `${fullName} se unió a ${companyName}`,
    body: via === 'solicitud'
      ? `Pide entrar como ${JOIN_ROLE_LABELS[role] || role} con el NIT. Apruébala o recházala en Tripulación.`
      : `Entró como ${JOIN_ROLE_LABELS[role] || INVITE_ROLE_LABELS[role] || role}${via === 'invitacion' ? ' por invitación' : ' con el NIT'}.`,
    link: '/flota/tripulacion',
  }, admin);
  try {
    if (!process.env.RESEND_API_KEY) return;
    const { data: managers } = await admin.from('memberships').select('person_id').eq('organization_id', organizationId).eq('status', 'activa').in('role', via === 'solicitud' ? ['admin', 'jefe_pilotos'] : ['admin', 'jefe_pilotos', 'gerente_sms']);
    const ids = (managers || []).map((m) => m.person_id);
    if (ids.length === 0) return;
    const { data: accounts } = await admin.from('accounts').select('auth_user_id').in('person_id', ids);
    const to = [];
    for (const a of accounts || []) {
      const { data } = await admin.auth.admin.getUserById(a.auth_user_id);
      if (data?.user?.email) to.push(data.user.email);
    }
    if (to.length === 0) return;
    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://bitafly.com';
    const html = `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:auto;font-family:Arial,sans-serif;">${emailHeader()}
      <tr><td style="padding:28px 40px;"><h2 style="margin:0 0 12px;font-size:18px;color:#1A202C;">${via === 'solicitud' ? `Solicitud para unirse a ${escHtml(companyName)}` : `Alguien se unió a ${escHtml(companyName)}`}</h2>
      <p style="font-size:14px;color:#4a5568;margin:0 0 8px;"><b>${escHtml(fullName)}</b> (${escHtml(email)}) ${via === 'solicitud' ? 'pidió entrar con el NIT de la organización' : via === 'invitacion' ? 'aceptó una invitación y entró' : 'entró con el NIT de la organización'} como <b>${escHtml(JOIN_ROLE_LABELS[role] || INVITE_ROLE_LABELS[role] || role)}</b>.</p>
      <p style="font-size:13px;color:#4a5568;margin:0;">${via === 'solicitud' ? 'No tendrá acceso hasta que la apruebes. Si no reconoces a esta persona, recházala desde Tripulación.' : via === 'invitacion' ? 'La invitación la envió un gestor de la organización.' : 'Si no reconoces a esta persona, ciérrale la membresía desde Tripulación.'}</p>
      <p style="margin-top:20px;"><a href="${escHtml(base)}/flota/tripulacion" style="background:#ec5b13;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Ver tripulación</a></p></td></tr>${emailFooter()}</table>`;
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: 'Skylog <notificaciones@bitafly.com>', to, subject: via === 'solicitud' ? `Solicitud para unirse a ${companyName}` : `Nuevo miembro en ${companyName}`, html });
    if (error) console.error('[joinOrganization] Resend error:', error);
  } catch (e) {
    console.error('[joinOrganization] no se pudo avisar a los gestores:', e);
  }
}

/** Avisa por correo (mejor esfuerzo) a quien pidió unirse que su solicitud fue aprobada o rechazada. */
export async function notifyJoinDecision(admin, { personId, companyName, role, approved }) {
  try {
    if (!process.env.RESEND_API_KEY) return;
    const { data: person } = await admin.from('people').select('email, full_name').eq('id', personId).maybeSingle();
    let to = person?.email;
    if (!to) {
      const { data: account } = await admin.from('accounts').select('auth_user_id').eq('person_id', personId).maybeSingle();
      if (account) to = (await admin.auth.admin.getUserById(account.auth_user_id)).data?.user?.email;
    }
    if (!to) return;
    const base = process.env.NEXT_PUBLIC_APP_URL || 'https://bitafly.com';
    const roleLabel = JOIN_ROLE_LABELS[role] || role;
    const html = `<table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:auto;font-family:Arial,sans-serif;">${emailHeader()}
      <tr><td style="padding:28px 40px;"><h2 style="margin:0 0 12px;font-size:18px;color:#1A202C;">${approved ? 'Ya eres parte de' : 'No se aprobó tu solicitud para'} ${escHtml(companyName)}</h2>
      <p style="font-size:14px;color:#4a5568;margin:0 0 8px;">${approved ? `Un gestor aprobó tu solicitud como <b>${escHtml(roleLabel)}</b>. Ya puedes entrar.` : 'Un gestor de la organización no aprobó tu solicitud. Si crees que es un error, habla con ellos.'}</p>
      ${approved ? `<p style="margin-top:20px;"><a href="${escHtml(base)}/inicio" style="background:#ec5b13;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Entrar a BitaFly</a></p>` : ''}</td></tr>${emailFooter()}</table>`;
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: 'Skylog <notificaciones@bitafly.com>', to, subject: approved ? `Tu solicitud en ${companyName} fue aprobada` : `Tu solicitud en ${companyName} no fue aprobada`, html });
    if (error) console.error('[joinOrganization] Resend error (decisión):', error);
  } catch (e) {
    console.error('[joinOrganization] no se pudo avisar al solicitante:', e);
  }
}
