// Skylog V2.0 — cuentas para el superadmin (Etapa F): buscar y eliminar. La eliminación es una sola transacción en la
// base (`v2_admin_delete_account`): elimina las organizaciones donde la persona es el único miembro (si algo está bajo
// retención legal, no se borra NADA), cierra el resto de sus membresías y elimina o anonimiza a la persona. Solo
// después se elimina el usuario de autenticación.
import { requireSuperadmin } from '@/lib/v2/platformAdmin';
import { adminKeyProblem } from '@/lib/v2/adminKey';

export const dynamic = 'force-dynamic';
const bad = (message, status = 400) => Response.json({ error: message }, { status });

export async function GET(request) {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const q = (new URL(request.url).searchParams.get('q') || '').trim().replace(/[%,()]/g, ' ');
  if (q.length < 3) return Response.json({ people: [] });
  const { data: people, error } = await g.admin.from('people').select('id, full_name, email, created_at').or(`email.ilike.%${q}%,full_name.ilike.%${q}%`).order('created_at', { ascending: false }).limit(20);
  if (error) return bad(error.message, 500);
  if (!people?.length) return Response.json({ people: [] });
  const ids = people.map((p) => p.id);
  const [accounts, memberships, partners] = await Promise.all([
    g.admin.from('accounts').select('person_id').in('person_id', ids),
    g.admin.from('memberships').select('person_id, role, status, organization:organizations(company_name)').in('person_id', ids).eq('status', 'activa'),
    g.admin.from('partner_members').select('person_id, role, partner:partners(name)').in('person_id', ids),
  ]);
  const hasAccount = new Set((accounts.data || []).map((a) => a.person_id));
  const group = (rows) => (rows || []).reduce((a, r) => ((a[r.person_id] ||= []).push(r), a), {});
  const mBy = group(memberships.data);
  const pBy = group(partners.data);
  return Response.json({
    people: people.map((p) => ({
      ...p,
      has_account: hasAccount.has(p.id),
      memberships: (mBy[p.id] || []).map((m) => ({ role: m.role, organization: m.organization?.company_name })),
      partners: (pBy[p.id] || []).map((m) => ({ role: m.role, name: m.partner?.name })),
    })),
  });
}

export async function DELETE(request) {
  const g = await requireSuperadmin();
  if (g.error) return g.error;
  const keyProblem = adminKeyProblem();
  if (keyProblem) return Response.json({ error: keyProblem, setup: true }, { status: 503 });
  const { person_id, confirmEmail } = await request.json().catch(() => ({}));
  if (!person_id) return bad('person_id requerido');
  if (person_id === g.personId) return bad('No puedes eliminar tu propia cuenta desde aquí.', 409);

  const { data: person } = await g.admin.from('people').select('id, email').eq('id', person_id).maybeSingle();
  if (!person) return bad('Persona no encontrada', 404);
  if (!person.email || String(confirmEmail || '').trim().toLowerCase() !== person.email.toLowerCase()) return bad('Escribe el correo exacto de la cuenta para confirmar.');

  const { data, error } = await g.admin.rpc('v2_admin_delete_account', { p_person: person_id });
  if (error) {
    if (/superadmin/i.test(error.message)) return bad('No se puede eliminar a un superadmin.', 409);
    if (error.code === '23001' || /retenci|custodia/i.test(error.message)) return bad(`No se pudo eliminar: ${error.message} No se borró nada.`, 409);
    return bad(error.message, 500);
  }
  let authDeleted = true;
  if (data.auth_user_id) {
    const { error: authError } = await g.admin.auth.admin.deleteUser(data.auth_user_id);
    if (authError) {
      authDeleted = false;
      console.error('[admin/cuentas] el usuario de autenticación no se pudo eliminar:', authError.message);
    }
  }
  return Response.json({ ok: true, organizations_deleted: data.organizations_deleted, person_deleted: data.person_deleted, anonymized: !data.person_deleted, auth_deleted: authDeleted });
}
