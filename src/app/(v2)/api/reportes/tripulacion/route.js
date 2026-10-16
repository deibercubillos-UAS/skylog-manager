// Skylog V2.0 — Reportes: Expediente de Tripulación (roster con membresía
// activa, instantánea). Solo gestores.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanView } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';

export async function GET(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanView(memberships, organizationId, 'AC2')) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  const { data, error } = await supabase
    .from('memberships')
    .select('role, person:person_id(full_name, document_type, document_number, license_number, medical_cert_expiry, email)')
    .eq('organization_id', organizationId)
    .eq('status', 'activa');
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const members = (data || []).map((m) => ({ ...m.person, role: m.role })).sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));
  return Response.json({ members });
}
