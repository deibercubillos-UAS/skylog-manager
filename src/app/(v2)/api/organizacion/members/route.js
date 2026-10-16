// Skylog V2.0 — Organización. Roster de miembros (`memberships` activas +
// `people.full_name`) + cambio de rol — cierra la fase pendiente que este
// archivo dejaba explícita ("gestión de roles queda para una fase
// posterior"). Nunca permite dejar una organización sin ningún `admin`
// activo (mismo resguardo real que v1: "no degradar al último Admin").
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanEdit, membershipsCanView } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';

const ASSIGNABLE_ROLES = ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto'];

export async function GET(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanView(memberships, organizationId, 'AD1')) {
    return Response.json({ error: 'Tu rol no puede ver los datos de la organización' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('memberships')
    .select('person_id, role, status, started_at, people(full_name)')
    .eq('organization_id', organizationId)
    .eq('status', 'activa')
    .order('started_at');
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ members: data });
}

export async function PATCH(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, personId, role } = body;
  if (!organizationId || !personId || !role) return Response.json({ error: 'organizationId, personId y role son requeridos' }, { status: 400 });
  if (!ASSIGNABLE_ROLES.includes(role)) return Response.json({ error: 'role inválido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanEdit(memberships, organizationId, 'K5')) {
    return Response.json({ error: 'Solo un Gerente General puede cambiar roles' }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: target, error: targetError } = await admin
    .from('memberships')
    .select('role')
    .eq('organization_id', organizationId)
    .eq('person_id', personId)
    .eq('status', 'activa')
    .maybeSingle();
  if (targetError) return Response.json({ error: targetError.message }, { status: 500 });
  if (!target) return Response.json({ error: 'Membresía no encontrada' }, { status: 404 });
  // El superadmin es de la plataforma: su rol no se cambia desde una organización (auditoría 2026-10-16).
  if (target.role === 'superadmin') return Response.json({ error: 'Esta membresía es de la plataforma y no se edita aquí' }, { status: 403 });

  if (target.role === 'admin' && role !== 'admin') {
    const { data: admins, error: adminsError } = await admin
      .from('memberships')
      .select('person_id')
      .eq('organization_id', organizationId)
      .eq('status', 'activa')
      .eq('role', 'admin');
    if (adminsError) return Response.json({ error: adminsError.message }, { status: 500 });
    if ((admins || []).length <= 1) {
      return Response.json({ error: 'No se puede degradar al único Gerente General de la organización' }, { status: 409 });
    }
  }

  const { data, error } = await admin
    .from('memberships')
    .update({ role })
    .eq('organization_id', organizationId)
    .eq('person_id', personId)
    .eq('status', 'activa')
    .select('person_id, role, status, started_at, people(full_name)')
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ member: data });
}
