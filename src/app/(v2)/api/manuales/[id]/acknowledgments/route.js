// Skylog V2.0 — Manuales: roster de la versión vigente para gestores —
// todos los miembros activos de la org con leído/pendiente + fecha.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

export async function GET(request, { params }) {
  params = await params;
  const { id } = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { data: manual, error } = await supabase.from('manuales').select('id, organization_id, current_version_id, title').eq('id', id).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!manual) return Response.json({ error: 'Manual no encontrado' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, manual.organization_id)) {
    return Response.json({ error: 'Solo un gestor puede ver el seguimiento de lectura' }, { status: 403 });
  }

  const { data: orgMembers, error: membersError } = await supabase
    .from('memberships')
    .select('role, person:people(id, full_name, email)')
    .eq('organization_id', manual.organization_id)
    .eq('status', 'activa');
  if (membersError) return Response.json({ error: membersError.message }, { status: 500 });

  let acks = [];
  if (manual.current_version_id) {
    const { data, error: acksError } = await supabase
      .from('manual_acknowledgments')
      .select('person_id, acknowledged_at')
      .eq('version_id', manual.current_version_id);
    if (acksError) return Response.json({ error: acksError.message }, { status: 500 });
    acks = data || [];
  }
  const ackByPerson = new Map(acks.map((a) => [a.person_id, a.acknowledged_at]));

  const roster = (orgMembers || [])
    .filter((m) => m.person)
    .map((m) => ({
      personId: m.person.id,
      fullName: m.person.full_name,
      email: m.person.email,
      role: m.role,
      acknowledgedAt: ackByPerson.get(m.person.id) || null,
    }))
    .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));

  return Response.json({
    title: manual.title,
    total: roster.length,
    read: roster.filter((r) => r.acknowledgedAt).length,
    roster,
  });
}
