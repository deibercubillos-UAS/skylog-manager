// Skylog V2.0 — Flota: corregir el proveedor y el enlace al informe de un mantenimiento ya registrado. Solo esos dos
// campos: el resto del evento (fecha, horas de la aeronave, tipo, responsable) es un registro inmutable. La tabla no
// tiene política de UPDATE (a propósito), así que la corrección se escribe con la llave de servicio, solo después de
// comprobar sesión, rol y pertenencia del proveedor, y solo estos dos campos.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';

export async function PATCH(request, { params }) {
  const { id } = await params;
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { supplierId, documentUrl } = body;
  if (supplierId === undefined && documentUrl === undefined) return Response.json({ error: 'Nada que actualizar' }, { status: 400 });

  const { data: existing, error: fetchError } = await supabase.from('maintenance_events').select('id, organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: 'Error consultando el mantenimiento' }, { status: 500 });
  if (!existing) return Response.json({ error: 'Mantenimiento no encontrado' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanEdit(memberships, existing.organization_id, 'L2')) return Response.json({ error: 'Solo un gestor puede editar mantenimientos' }, { status: 403 });

  const patch = {};
  if (supplierId !== undefined) {
    if (supplierId) {
      const { data: supplier, error: supplierError } = await supabase.from('suppliers').select('id').eq('id', supplierId).eq('organization_id', existing.organization_id).maybeSingle();
      if (supplierError) return Response.json({ error: 'Error verificando el proveedor' }, { status: 500 });
      if (!supplier) return Response.json({ error: 'El proveedor no pertenece a esta organización' }, { status: 400 });
    }
    patch.supplier_id = supplierId || null;
  }
  if (documentUrl !== undefined) {
    const link = typeof documentUrl === 'string' ? documentUrl.trim() : '';
    if (link && (link.length > 500 || !/^https?:\/\/\S+$/i.test(link))) {
      return Response.json({ error: 'El enlace al informe debe empezar por http:// o https:// (máx. 500 caracteres)' }, { status: 400 });
    }
    patch.document_url = link || null;
  }

  const { data, error } = await createAdminClient().from('maintenance_events').update(patch).eq('id', id).eq('organization_id', existing.organization_id).select('id, supplier_id, document_url, supplier:supplier_id(name)').single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ event: data });
}
