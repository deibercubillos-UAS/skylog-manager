// Skylog V2.0 — SMS Matriz de peligros: lista de asistencia en línea de un
// avance de control. Una fila por asistente: miembro de la organización
// (person_id) o invitado externo (nombre libre), sin firma. Ver: P1; agregar:
// gestor SMS (P2). Eliminar una fila: ruta hermana `attendance/[attendeeId]`.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { membershipsCanView, membershipsCanEdit } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { dbError } from '@/lib/v2/apiErrors';

async function loadUpdate(supabase, id, user) {
  const { data: update, error: fetchError } = await supabase.from('hazard_control_updates').select('id, organization_id').eq('id', id).maybeSingle();
  if (fetchError) return { error: Response.json({ error: 'Error consultando el avance' }, { status: 500 }) };
  if (!update) return { error: Response.json({ error: 'Avance no encontrado' }, { status: 404 }) };
  const { error: resolveError, memberships, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  return { update, memberships, personId };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const loaded = await loadUpdate(supabase, id, user);
  if (loaded.error) return loaded.error;
  if (!membershipsCanView(loaded.memberships, loaded.update.organization_id, 'P1')) {
    return Response.json({ error: 'No tienes permiso para ver la lista de asistencia' }, { status: 403 });
  }
  const { data, error } = await supabase
    .from('hazard_control_update_attendees')
    .select('id, person_id, full_name, document, role, created_at')
    .eq('update_id', id)
    .order('created_at', { ascending: true });
  if (error) return dbError(error, 'sms/control-updates/attendance');
  return Response.json({ attendees: data || [] });
}

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const loaded = await loadUpdate(supabase, id, user);
  if (loaded.error) return loaded.error;
  const { update, memberships, personId } = loaded;
  if (!membershipsCanEdit(memberships, update.organization_id, 'P2')) {
    return Response.json({ error: 'Solo un gestor puede registrar la asistencia' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const fullName = String(body.fullName || '').trim();
  if (!fullName) return Response.json({ error: 'El nombre del asistente es requerido' }, { status: 400 });

  const { data, error } = await supabase
    .from('hazard_control_update_attendees')
    .insert({
      organization_id: update.organization_id,
      update_id: id,
      person_id: body.personId || null,
      full_name: fullName.slice(0, 200),
      document: body.document ? String(body.document).trim().slice(0, 50) : null,
      role: body.role ? String(body.role).trim().slice(0, 100) : null,
      created_by: personId || null,
    })
    .select('id, person_id, full_name, document, role, created_at')
    .single();
  if (error) return dbError(error, 'sms/control-updates/attendance');
  return Response.json({ attendee: data });
}
