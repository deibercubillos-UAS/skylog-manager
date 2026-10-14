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

  // Las tres consultas son independientes: en paralelo (antes iban una tras otra).
  const orgIds = memberships.map((m) => m.organization_id);
  const [{ data: person }, { data: orgs, error: orgsError }, { data: partnerRows }] = await Promise.all([
    // fullName — el shell de nav lo necesita para el menú de cuenta (avatar/nombre).
    supabase.from('people').select('full_name').eq('id', personId).maybeSingle(),
    orgIds.length
      ? supabase.from('organizations').select('id, company_name, logo_url').in('id', orgIds)
      : Promise.resolve({ data: [], error: null }),
    // ¿Es miembro de un socio ACTIVO (escuela/asesor)? Habilita el acceso al panel /socio.
    supabase.from('partner_members').select('partner:partners(status)').eq('person_id', personId),
  ]);
  if (orgsError) return Response.json({ error: 'Error consultando organizaciones' }, { status: 500 });

  const organizations = memberships.map((m) => {
    const org = orgs.find((o) => o.id === m.organization_id);
    return {
      id: m.organization_id,
      role: m.role,
      isDutyManager: ['admin', 'jefe_pilotos', 'gerente_sms', 'superadmin'].includes(m.role),
      name: org?.company_name || m.organization_id,
      logoUrl: org?.logo_url || null,
    };
  });

  const isPartner = (partnerRows || []).some((r) => r.partner?.status === 'activo');

  return Response.json({ personId, fullName: person?.full_name || null, organizations, isPartner });
}
