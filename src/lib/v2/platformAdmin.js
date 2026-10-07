// Skylog V2.0 — administrador de la plataforma (rol `superadmin`). V2 no tiene un panel Master completo: este rol
// solo abre las pantallas de operación mínimas (socios, planes). Se identifica por una membresía activa con rol
// `superadmin`; las acciones se ejecutan con la llave de servicio DESPUÉS de comprobarlo aquí.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';

export const isPlatformSuperadmin = (memberships) => (memberships || []).some((m) => m.role === 'superadmin');

/** { error: Response } si no es superadmin; si lo es, { admin, personId, user }. */
export async function requireSuperadmin() {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  if (!personId || !isPlatformSuperadmin(memberships)) return { error: Response.json({ error: 'Acceso denegado' }, { status: 403 }) };
  return { admin: createAdminClient(), personId, user };
}
