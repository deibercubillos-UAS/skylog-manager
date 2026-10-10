// Skylog V2.0 — Flota & Equipo, Fase 4a. Editar o eliminar una tarea de
// mantenimiento.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

const ALLOWED_FIELDS = ['name', 'system_category', 'interval_cycles', 'interval_hours', 'interval_calendar_days', 'tolerance_value', 'tolerance_unit'];
const FIELD_MAP = {
  name: 'name',
  systemCategory: 'system_category',
  intervalCycles: 'interval_cycles',
  intervalHours: 'interval_hours',
  intervalCalendarDays: 'interval_calendar_days',
  toleranceValue: 'tolerance_value',
  toleranceUnit: 'tolerance_unit',
};
const TOLERANCE_UNITS = ['pct', 'hours', 'days', 'cycles'];

async function authorize(supabase, userId, id) {
  const { data: existing, error: fetchError } = await supabase.from('maintenance_tasks').select('organization_id').eq('id', id).maybeSingle();
  if (fetchError) return { error: Response.json({ error: 'Error consultando la tarea' }, { status: 500 }) };
  if (!existing) return { error: Response.json({ error: 'Tarea no encontrada' }, { status: 404 }) };

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, userId);
  if (resolveError) return { error: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  if (!isDutyManager(memberships, existing.organization_id)) {
    return { error: Response.json({ error: 'Solo un gestor puede editar tareas de mantenimiento' }, { status: 403 }) };
  }
  return { existing };
}

export async function PATCH(request, { params }) {
  params = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { error: authError } = await authorize(supabase, user.id, id);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  if (body.toleranceUnit && !TOLERANCE_UNITS.includes(body.toleranceUnit)) {
    return Response.json({ error: 'toleranceUnit debe ser uno de: ' + TOLERANCE_UNITS.join(', ') }, { status: 400 });
  }

  const patch = {};
  for (const [key, column] of Object.entries(FIELD_MAP)) {
    if (body[key] !== undefined && ALLOWED_FIELDS.includes(column)) patch[column] = body[key] || null;
  }
  if (Object.keys(patch).length === 0) return Response.json({ error: 'Nada para actualizar' }, { status: 400 });

  const { data, error } = await supabase.from('maintenance_tasks').update(patch).eq('id', id).select().single();
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ task: data });
}

export async function DELETE(request, { params }) {
  params = await params;
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { id } = await params;
  const { error: authError } = await authorize(supabase, user.id, id);
  if (authError) return authError;

  const { error } = await supabase.from('maintenance_tasks').delete().eq('id', id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ ok: true });
}
