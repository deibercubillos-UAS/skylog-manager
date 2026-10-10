// /api/perfil/cuenta — «Eliminar mi cuenta» (Ley 1581). GET = vista previa de lo que pasaría y de lo que lo impide;
// DELETE = ejecutarlo (pide escribir el correo exacto). Usa la misma función de base que el superadmin
// (`v2_admin_delete_account`): elimina las organizaciones donde la persona es la única integrante y, cuando la
// retención obligatoria impide borrar a la persona, la anonimiza y deja sus registros.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { planAccountDeletion } from '@skylog/domain';

export const dynamic = 'force-dynamic';

async function gather(admin, personId, memberships) {
  const orgIds = memberships.map((m) => m.organization_id);
  const [{ data: orgs }, { data: members }, { data: owned }] = await Promise.all([
    orgIds.length ? admin.from('organizations').select('id, company_name').in('id', orgIds) : { data: [] },
    orgIds.length ? admin.from('memberships').select('organization_id, person_id, role').in('organization_id', orgIds).eq('status', 'activa') : { data: [] },
    admin.from('partner_members').select('partner_id, partners(name)').eq('person_id', personId).eq('role', 'owner'),
  ]);
  const nameById = Object.fromEntries((orgs || []).map((o) => [o.id, o.company_name]));
  const membersByOrg = {};
  for (const m of members || []) (membersByOrg[m.organization_id] ||= []).push({ person_id: m.person_id, role: m.role });
  const partnerOwnerships = [];
  for (const o of owned || []) {
    const [{ data: otherOwners }, { data: advisors }] = await Promise.all([
      admin.from('partner_members').select('id').eq('partner_id', o.partner_id).eq('role', 'owner').neq('person_id', personId),
      admin.from('partners').select('id').eq('parent_partner_id', o.partner_id).eq('status', 'activo'),
    ]);
    partnerOwnerships.push({ partner_id: o.partner_id, partner_name: o.partners?.name, otherOwners: (otherOwners || []).length, activeAdvisors: (advisors || []).length });
  }
  return planAccountDeletion({
    personId,
    memberships: memberships.map((m) => ({ ...m, organization_name: nameById[m.organization_id] })),
    membersByOrg,
    partnerOwnerships,
  });
}

async function session() {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  if (!personId) return { error: Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado' }, { status: 404 }) };
  return { user, personId, memberships: memberships || [] };
}

export async function GET() {
  const s = await session();
  if (s.error) return s.error;
  const plan = await gather(createAdminClient(), s.personId, s.memberships);
  return Response.json(plan);
}

export async function DELETE(request) {
  const s = await session();
  if (s.error) return s.error;
  const { confirmEmail } = await request.json().catch(() => ({}));
  if (!confirmEmail || String(confirmEmail).trim().toLowerCase() !== String(s.user.email || '').toLowerCase()) {
    return Response.json({ error: 'Escribe tu correo exactamente para confirmar.' }, { status: 400 });
  }

  const admin = createAdminClient();
  const plan = await gather(admin, s.personId, s.memberships);
  if (!plan.canDelete) return Response.json({ error: plan.blockers[0].message, blockers: plan.blockers }, { status: 409 });

  const { data, error } = await admin.rpc('v2_admin_delete_account', { p_person: s.personId });
  if (error) {
    if (error.code === '23001' || /retenci|custodia/i.test(error.message)) {
      return Response.json({ error: `No se pudo eliminar: ${error.message} No se borró nada.` }, { status: 409 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
  let authDeleted = true;
  if (data?.auth_user_id) {
    const { error: authError } = await admin.auth.admin.deleteUser(data.auth_user_id);
    if (authError) {
      authDeleted = false;
      console.error('[perfil/cuenta] el usuario de autenticación no se pudo eliminar:', authError.message);
    }
  }
  return Response.json({ ok: true, organizations_deleted: data?.organizations_deleted ?? 0, anonymized: data ? !data.person_deleted : false, auth_deleted: authDeleted });
}
