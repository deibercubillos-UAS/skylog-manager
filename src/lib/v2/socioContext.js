// Skylog V2.0 — contexto de la persona en el panel /socio (Etapa E3): sesión → persona → membresías de socio ACTIVAS.
// Desactivar un socio solo marca `partners.status = 'inactivo'` (no borra sus miembros), así que SIEMPRE se filtra por
// socio activo: sin eso, un miembro de un socio ya desactivado conservaría el acceso completo al panel.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';

export async function socioContext() {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, personId } = await resolveCurrentPerson(supabase, user.id);
  if (error) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  if (!personId) return { error: Response.json({ error: 'No es socio' }, { status: 403 }) };

  const admin = createAdminClient();
  const { data: all } = await admin.from('partner_members').select('id, role, partner_id, partner:partners(id, name, type, status, commission_pct, free_seats_limit, free_seats_used, free_days, logo_url, parent_partner_id)').eq('person_id', personId);
  if (!all?.length) return { error: Response.json({ error: 'No es socio' }, { status: 403 }) };
  const memberships = all.filter((m) => m.partner?.status === 'activo');
  if (!memberships.length) return { error: Response.json({ error: 'Tu acceso de socio fue desactivado' }, { status: 403 }) };
  // Principal: la primera membresía de dueño (si hay); si no, la primera.
  const primary = memberships.find((m) => m.role === 'owner') || memberships[0];
  return { admin, user, personId, memberships, primary, partner: primary.partner };
}

/** Solo el dueño de una ESCUELA: { admin, user, personId, school } o { error }. */
export async function schoolOwnerContext() {
  const c = await socioContext();
  if (c.error) return c;
  const m = c.memberships.find((x) => x.role === 'owner' && x.partner?.type === 'escuela');
  if (!m) return { error: Response.json({ error: 'No es dueño de una escuela' }, { status: 403 }) };
  return { ...c, school: m.partner };
}
