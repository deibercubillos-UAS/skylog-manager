// Skylog V2.0 — recuperación del segundo factor (TOTP). Si un miembro pierde su app autenticadora, el Gerente General
// (rol admin, permiso K5 de la matriz — el mismo que cambia roles) le quita el factor desde la app para que vuelva a
// entrar. Lo hace el servidor con la llave de servicio tras verificar que el que pide es gestor de ESA organización y
// que el objetivo es un miembro activo de la misma. Deja constancia en el registro de acciones (`audit_log`).
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { logAudit } from '@/lib/v2/auditLog';

export async function POST(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, personId } = body;
  if (!organizationId || !personId) {
    return Response.json({ error: 'organizationId y personId son requeridos' }, { status: 400 });
  }

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanEdit(memberships, organizationId, 'K5')) {
    return Response.json({ error: 'Solo un Gerente General puede quitar el segundo factor de un miembro' }, { status: 403 });
  }

  const admin = createAdminClient();

  // El objetivo debe ser miembro activo de ESTA organización (no se toca a nadie de otra).
  const { data: target, error: targetError } = await admin
    .from('memberships')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('person_id', personId)
    .eq('status', 'activa')
    .maybeSingle();
  if (targetError) return Response.json({ error: targetError.message }, { status: 500 });
  if (!target) return Response.json({ error: 'Membresía no encontrada' }, { status: 404 });
  if (target.role === 'superadmin') {
    return Response.json({ error: 'Esta membresía es de la plataforma y no se gestiona aquí' }, { status: 403 });
  }

  // person_id → auth_user_id (la API de MFA del admin trabaja con el usuario de Auth, no con la persona).
  const { data: account, error: accountError } = await admin
    .from('accounts')
    .select('auth_user_id')
    .eq('person_id', personId)
    .maybeSingle();
  if (accountError) return Response.json({ error: accountError.message }, { status: 500 });
  if (!account?.auth_user_id) return Response.json({ error: 'El miembro no tiene cuenta de acceso vinculada' }, { status: 404 });

  const { data: factorsData, error: listError } = await admin.auth.admin.mfa.listFactors({ userId: account.auth_user_id });
  if (listError) return Response.json({ error: listError.message }, { status: 500 });

  const factors = factorsData?.factors || [];
  let removed = 0;
  for (const f of factors) {
    const { error: delError } = await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: account.auth_user_id });
    if (delError) return Response.json({ error: delError.message }, { status: 500 });
    removed += 1;
  }

  // Baja la bandera de latencia del contexto de sesión (la verdad ya cambió en Auth; esto evita una confirmación extra).
  await admin.from('accounts').update({ mfa_enabled: false }).eq('person_id', personId);

  // Constancia en el registro de acciones (el helper resuelve al autor desde la sesión; mejor esfuerzo).
  await logAudit({
    organizationId,
    action: 'update',
    module: 'organizacion/members',
    entityLabel: `Quitó el segundo factor (${removed} factor/es)`,
    metadata: { target_person_id: personId, removed_factors: removed },
  });

  return Response.json({ ok: true, removed });
}
