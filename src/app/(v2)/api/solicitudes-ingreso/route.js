// Skylog V2.0 — solicitudes para unirse a una organización por NIT. Unirse por NIT no da acceso: crea una solicitud
// (v2_request_join) que un Gerente General o Jefe de Pilotos aprueba o rechaza aquí (auditoría 2026-11-12: el NIT no
// es secreto y quien se une elige su rol). La membresía solo se crea al aprobar, con la función de siempre.
//   GET ?organizationId=…  → solicitudes pendientes de esa organización (solo gestores que pueden aprobar).
//   GET                    → mis solicitudes pendientes (cualquier cuenta).
//   POST { id, action: 'aprobar' | 'rechazar' }
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { adminKeyProblem } from '@/lib/v2/adminKey';
import { loadJoinContextByOrgId, decideJoin, joinErrorMessage, notifyJoinDecision } from '@/lib/v2/joinOrganization';
import { canInviteRole } from '@skylog/domain';
import { readOnlyBlock } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';

async function session() {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  return { personId, memberships: memberships || [] };
}

const rolesIn = (memberships, orgId) => memberships.filter((m) => m.organization_id === orgId).map((m) => m.role);

export async function GET(request) {
  const s = await session();
  if (s.error) return s.error;
  const organizationId = new URL(request.url).searchParams.get('organizationId');
  const admin = createAdminClient();

  if (!organizationId) {
    if (!s.personId) return Response.json({ requests: [] });
    const { data, error } = await admin.from('join_requests').select('id, role, status, created_at, organization:organizations(company_name)').eq('person_id', s.personId).eq('status', 'pendiente').order('created_at', { ascending: false });
    if (error) return Response.json({ error: 'No se pudieron consultar tus solicitudes' }, { status: 500 });
    return Response.json({ requests: (data || []).map((r) => ({ id: r.id, role: r.role, created_at: r.created_at, organizationName: r.organization?.company_name || null })) });
  }

  // Solo quien puede aprobar el rol más amplio que se puede pedir (cualquiera de los tres: GG o JP).
  if (!canInviteRole(rolesIn(s.memberships, organizationId), 'piloto')) {
    return Response.json({ error: 'Solo un gestor puede ver las solicitudes de ingreso' }, { status: 403 });
  }
  const { data, error } = await admin.from('join_requests').select('id, role, status, created_at, person:people(full_name, email, phone)').eq('organization_id', organizationId).eq('status', 'pendiente').order('created_at', { ascending: true });
  if (error) return Response.json({ error: 'No se pudieron consultar las solicitudes' }, { status: 500 });
  return Response.json({ requests: (data || []).map((r) => ({ id: r.id, role: r.role, created_at: r.created_at, fullName: r.person?.full_name || '—', email: r.person?.email || null, phone: r.person?.phone || null })) });
}

export async function POST(request) {
  const s = await session();
  if (s.error) return s.error;
  if (adminKeyProblem()) return Response.json({ error: 'El servicio no está disponible por ahora.' }, { status: 503 });
  const { id, action } = await request.json().catch(() => ({}));
  if (!id || !['aprobar', 'rechazar'].includes(action)) return Response.json({ error: 'id y action (aprobar/rechazar) son requeridos' }, { status: 400 });

  const admin = createAdminClient();
  const { data: req } = await admin.from('join_requests').select('id, organization_id, person_id, role, status').eq('id', id).maybeSingle();
  if (!req) return Response.json({ error: 'Solicitud no encontrada' }, { status: 404 });
  // El rol se comprueba aquí, no solo en la pantalla: GG o JP de ESA organización (canInviteRole = regla K7).
  if (!canInviteRole(rolesIn(s.memberships, req.organization_id), req.role)) {
    return Response.json({ error: 'Solo un gestor de la organización puede decidir esta solicitud' }, { status: 403 });
  }
  const readOnly = readOnlyBlock(s.memberships, req.organization_id);
  if (readOnly) return readOnly;
  if (req.status !== 'pendiente') return Response.json({ error: 'Esta solicitud ya fue decidida.' }, { status: 409 });

  const { data: org } = await admin.from('organizations').select('id, company_name').eq('id', req.organization_id).maybeSingle();
  if (!org) return Response.json({ error: 'Organización no encontrada' }, { status: 404 });
  const decidedAt = new Date().toISOString();

  if (action === 'rechazar') {
    const { data: done } = await admin.from('join_requests').update({ status: 'rechazada', decided_by: s.personId, decided_at: decidedAt }).eq('id', id).eq('status', 'pendiente').select('id');
    if (!done?.length) return Response.json({ error: 'Esta solicitud ya fue decidida.' }, { status: 409 });
    await notifyJoinDecision(admin, { personId: req.person_id, companyName: org.company_name, role: req.role, approved: false });
    return Response.json({ ok: true, status: 'rechazada' });
  }

  // Aprobar: el cargo único y el cupo del plan se vuelven a validar AHORA (pudieron cambiar desde la solicitud).
  const ctx = await loadJoinContextByOrgId(admin, org);
  const decision = decideJoin(ctx, req.role);
  if (!decision.ok) return Response.json({ error: decision.message, reason: decision.reason }, { status: 409 });

  const { data: account } = await admin.from('accounts').select('auth_user_id').eq('person_id', req.person_id).maybeSingle();
  if (!account) return Response.json({ error: 'La cuenta de esta persona ya no existe.' }, { status: 409 });

  // Se reclama la solicitud antes de crear la membresía: dos gestores aprobando a la vez no la duplican.
  const { data: claimed } = await admin.from('join_requests').update({ status: 'aprobada', decided_by: s.personId, decided_at: decidedAt }).eq('id', id).eq('status', 'pendiente').select('id');
  if (!claimed?.length) return Response.json({ error: 'Esta solicitud ya fue decidida.' }, { status: 409 });

  const { error } = await admin.rpc('v2_join_organization', { p: { auth_user_id: account.auth_user_id, organization_id: req.organization_id, role: req.role } });
  if (error) {
    await admin.from('join_requests').update({ status: 'pendiente', decided_by: null, decided_at: null }).eq('id', id);
    const known = joinErrorMessage(error.message);
    if (!known) console.error('[solicitudes-ingreso] v2_join_organization falló:', error.message);
    return Response.json({ error: known?.error || 'No se pudo aprobar. Intenta de nuevo.' }, { status: known?.status || 500 });
  }
  await notifyJoinDecision(admin, { personId: req.person_id, companyName: org.company_name, role: req.role, approved: true });
  return Response.json({ ok: true, status: 'aprobada' });
}
