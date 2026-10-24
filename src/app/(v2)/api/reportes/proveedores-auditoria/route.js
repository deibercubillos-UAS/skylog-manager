// Skylog V2.0 — Reportes: Formato de Auditoría al Proveedor. Entrega los proveedores (activos, o uno) y el checklist
// que la organización configuró en Proveedores (criterios agrupados por categoría) para armar el formato imprimible.
// Solo gestores.
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

  let suppliersQuery = supabase.from('suppliers').select('id, name, category, nit, contact, address, email, phone').eq('organization_id', organizationId).order('name');
  suppliersQuery = supplierId ? suppliersQuery.eq('id', supplierId) : suppliersQuery.eq('is_active', true);

  const [{ data: suppliers, error }, { data: criteria, error: criteriaError }, { data: org }] = await Promise.all([
    suppliersQuery,
    supabase.from('supplier_audit_criteria').select('id, criterion, category, order_index').eq('organization_id', organizationId).order('order_index').order('created_at'),
    supabase.from('organizations').select('nit').eq('id', organizationId).maybeSingle(),
  ]);
  if (error || criteriaError) return Response.json({ error: (error || criteriaError).message }, { status: 500 });

  return Response.json({ suppliers: suppliers || [], criteria: criteria || [], org: org ? { nit: org.nit } : null });
}
