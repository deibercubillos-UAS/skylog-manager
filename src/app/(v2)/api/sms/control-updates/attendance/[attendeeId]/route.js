// Skylog V2.0 — SMS Matriz de peligros: eliminar una fila de la lista de
// asistencia en línea de un avance. Gestor SMS (P2).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { dbError } from '@/lib/v2/apiErrors';

export async function DELETE(request, { params }) {
  const { attendeeId } = await params;
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { data: row, error: fetchError } = await supabase.from('hazard_control_update_attendees').select('id, organization_id').eq('id', attendeeId).maybeSingle();
  if (fetchError) return Response.json({ error: 'Error consultando el asistente' }, { status: 500 });
  if (!row) return Response.json({ error: 'Asistente no encontrado' }, { status: 404 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!membershipsCanEdit(memberships, row.organization_id, 'P2')) {
    return Response.json({ error: 'Solo un gestor puede editar la asistencia' }, { status: 403 });
  }

  const { error } = await supabase.from('hazard_control_update_attendees').delete().eq('id', attendeeId).eq('organization_id', row.organization_id);
  if (error) return dbError(error, 'sms/control-updates/attendance');
  return Response.json({ ok: true });
}
