// Skylog V2.0 — SMS Matriz de peligros: eliminar un avance. Solo gestor (P2).
// El archivo de evidencia en R2 se limpia con DELETE del endpoint de evidencia;
// aquí se borra la fila (el path queda huérfano solo si no se quitó antes).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { dbError } from '@/lib/v2/apiErrors';

export async function DELETE(request, { params }) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { data: existing, error: fetchError } = await supabase.from('hazard_control_updates').select('id, organization_id').eq('id', id).maybeSingle();
  if (fetchError) return Response.json({ error: 'Error consultando el avance' }, { status: 500 });
  if (!existing) return Response.json({ error: 'Avance no encontrado' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanEdit(memberships, existing.organization_id, 'P2')) {
    return Response.json({ error: 'Solo un gestor puede eliminar avances' }, { status: 403 });
  }

  const { error } = await supabase.from('hazard_control_updates').delete().eq('id', id);
  if (error) return dbError(error, 'sms/control-updates');
  return Response.json({ ok: true });
}
