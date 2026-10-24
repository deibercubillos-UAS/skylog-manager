// Skylog V2.0 — Reportes: Listado de Proveedores inscritos (una hoja por proveedor, para completar a mano lo que el
// sistema no registra). Sin `supplierId` trae los proveedores activos. Solo gestores.
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
  const supplierId = searchParams.get('supplierId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanView(memberships, organizationId, 'AC1')) return Response.json({ error: 'Solo un gestor puede ver reportes' }, { status: 403 });

  let query = supabase
    .from('suppliers')
    .select('id, name, category, nit, contact, notes')
    .eq('organization_id', organizationId)
    .order('name');
  query = supplierId ? query.eq('id', supplierId) : query.eq('is_active', true);

  const [{ data: suppliers, error }, { data: org }] = await Promise.all([query, supabase.from('organizations').select('nit').eq('id', organizationId).maybeSingle()]);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ suppliers: suppliers || [], org: org ? { nit: org.nit } : null });
}
