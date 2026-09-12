// Skylog V2.0 — F5. Contexto mínimo para la UI de captura: en qué organización(es)
// tiene membresía activa la persona autenticada, y si gestiona tiempos de servicio
// en cada una. Evita que el cliente consulte `memberships`/`accounts` directo.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';

export async function GET() {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) {
    return Response.json({ personId: null, organizations: [] });
  }

  const orgIds = memberships.map((m) => m.organization_id);
  const { data: orgs, error: orgsError } = orgIds.length
    ? await supabase.from('organizations').select('id, company_name').in('id', orgIds)
    : { data: [], error: null };
  if (orgsError) return Response.json({ error: 'Error consultando organizaciones' }, { status: 500 });

  const organizations = memberships.map((m) => ({
    id: m.organization_id,
    role: m.role,
    isDutyManager: ['admin', 'jefe_pilotos', 'gerente_sms', 'superadmin'].includes(m.role),
    name: orgs.find((o) => o.id === m.organization_id)?.company_name || m.organization_id,
  }));

  return Response.json({ personId, organizations });
}
