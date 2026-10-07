// Skylog V2.0 — apoyo del servidor para «unirse a una organización por NIT» (Etapa B de
// docs/skylog-v2/44-alta-y-socios.md). La decisión de negocio es pura (`evaluateJoin`, en el dominio); aquí solo se
// cargan los datos y se avisa a los gestores. Todo con service role: lo llaman rutas públicas o de una cuenta nueva.
import { Resend } from 'resend';
import { evaluateJoin, JOIN_ROLE_LABELS, INVITE_ROLE_LABELS, normalizeNit } from '@skylog/domain';
import { PLAN_LIMITS, crewCountsForLimit } from '@/lib/v2/planLimits';
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
    admin.from('subscriptions').select('plan').eq('organization_id', org.id).maybeSingle(),
  ]);
  const plan = sub?.plan && PLAN_LIMITS[sub.plan] ? sub.plan : 'piloto';
  return {
    organizationId: org.id,
    companyName: org.company_name,
    members: members || [],
    plan,
    crewLimit: PLAN_LIMITS[plan].pilots,
    crewCount: (members || []).filter((m) => crewCountsForLimit(m.role)).length,
  };
}

export const decideJoin = (ctx, role) => evaluateJoin({ role, members: ctx.members, crewLimit: ctx.crewLimit, crewCount: ctx.crewCount });

/** Mensaje del servidor para un error de la función de la base. */
export function joinErrorMessage(message) {
  if (/ya eres miembro/i.test(message)) return { status: 409, error: 'Ya eres miembro de esta organización.' };
  if (/ya está ocupado/i.test(message)) return { status: 409, error: 'Ese cargo acaba de ocuparse en la organización. Elige otro rol.' };
  return null;
}

/**
 * Avisa por correo (mejor esfuerzo) al Gerente General, Jefe de Pilotos y Gerente SMS de que alguien se unió. Es la
 * contrapartida de que entrar por NIT no requiera aprobación: los gestores se enteran de inmediato y pueden
 * cerrar la membresía desde Tripulación si no la reconocen.
 */
export async function notifyJoin(admin, { organizationId, companyName, fullName, email, role, via = 'nit' }) {
  try {
    if (!process.env.RESEND_API_KEY) return;
    const { data: managers } = await admin.from('memberships').select('person_id').eq('organization_id', organizationId).eq('status', 'activa').in('role', ['admin', 'jefe_pilotos', 'gerente_sms']);
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
      <tr><td style="padding:28px 40px;"><h2 style="margin:0 0 12px;font-size:18px;color:#1A202C;">Alguien se unió a ${escHtml(companyName)}</h2>
      <p style="font-size:14px;color:#4a5568;margin:0 0 8px;"><b>${escHtml(fullName)}</b> (${escHtml(email)}) ${via === 'invitacion' ? 'aceptó una invitación y entró' : 'entró con el NIT de la organización'} como <b>${escHtml(JOIN_ROLE_LABELS[role] || INVITE_ROLE_LABELS[role] || role)}</b>.</p>
      <p style="font-size:13px;color:#4a5568;margin:0;">${via === 'invitacion' ? 'La invitación la envió un gestor de la organización.' : 'Si no reconoces a esta persona, ciérrale la membresía desde Tripulación.'}</p>
      <p style="margin-top:20px;"><a href="${escHtml(base)}/flota/tripulacion" style="background:#ec5b13;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Ver tripulación</a></p></td></tr>${emailFooter()}</table>`;
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({ from: 'Skylog <notificaciones@bitafly.com>', to, subject: `Nuevo miembro en ${companyName}`, html });
    if (error) console.error('[joinOrganization] Resend error:', error);
  } catch (e) {
    console.error('[joinOrganization] no se pudo avisar a los gestores:', e);
  }
}
