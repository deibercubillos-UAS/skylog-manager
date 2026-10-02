// Skylog V2.0 — Flota & Equipo, Fase 4a. Tarea de mantenimiento dentro de
// un programa — los 3 tipos de intervalo simultáneos (ciclos/horas/
// calendario, `MAUT-5.0-12-090`) más una tolerancia. Al menos un intervalo
// es obligatorio (constraint `maintenance_tasks_has_interval` en la base —
// esta validación en la API solo da un mensaje claro antes del 500 crudo).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';

const TOLERANCE_UNITS = ['pct', 'hours', 'days', 'cycles'];

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, programId, name, systemCategory, intervalCycles, intervalHours, intervalCalendarDays, toleranceValue, toleranceUnit } = body;
  if (!organizationId || !programId || !name) {
    return Response.json({ error: 'organizationId, programId y name son requeridos' }, { status: 400 });
  }
  if (!intervalCycles && !intervalHours && !intervalCalendarDays) {
    return Response.json({ error: 'La tarea necesita al menos un intervalo (ciclos, horas o días calendario)' }, { status: 400 });
  }
  if (toleranceUnit && !TOLERANCE_UNITS.includes(toleranceUnit)) {
    return Response.json({ error: 'toleranceUnit debe ser uno de: ' + TOLERANCE_UNITS.join(', ') }, { status: 400 });
  }

  const { error: resolveError, memberships, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor puede configurar tareas de mantenimiento' }, { status: 403 });
  }

  const { data: program, error: programError } = await supabase
    .from('maintenance_programs')
    .select('id')
    .eq('id', programId)
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (programError) return Response.json({ error: 'Error verificando el programa' }, { status: 500 });
  if (!program) return Response.json({ error: 'El programa no pertenece a esta organización' }, { status: 400 });

  const { data, error } = await supabase
    .from('maintenance_tasks')
    .insert({
      organization_id: organizationId,
      program_id: programId,
      name,
      system_category: systemCategory || null,
      interval_cycles: intervalCycles || null,
      interval_hours: intervalHours || null,
      interval_calendar_days: intervalCalendarDays || null,
      tolerance_value: toleranceValue || null,
      tolerance_unit: toleranceUnit || null,
      created_by: personId,
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ task: data });
}
