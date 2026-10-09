// Skylog V2.0 — Programación (Operación). CRUD mínimo sobre `missions`
// (30-entidades.md §4 · 31-esquema-datos.md §3, "lo programado"), migración
// 20260913000000_missions_minimal.sql. Sin autorización formal todavía —
// solo PIC, zona (texto libre) y fecha/hora programada. `aircraft_id` es
// opcional (Flota & Equipo Fase 1, 35-frontend.md §3.7): la columna existía
// desde F5/F4a sin FK, hoy ya apunta a `aircraft` real. La RLS de `missions`
// decide visibilidad (el PIC ve las suyas, un gestor ve todas las de su
// org); programar es función de gestión — la política de INSERT ya rechaza
// a quien no sea gestor.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { createNotifications } from '@/lib/v2/notify';
import { bogotaDay } from '@/lib/v2/dispatchContext';
import { normalizeRequiredAdditions, evaluatePicQualifications, qualificationMessages } from '@skylog/domain';

const MISSION_SELECT = '*, pic:pic_person_id(full_name, license_number, person_additions!person_additions_person_id_fkey(addition, valid_until)), observer:observer_person_id(full_name), aircraft:aircraft_id(serial_number, model:model_id(brand, model))';

// CIPU y adiciones del PIC frente a lo que exige la misión (§100.810(d)). Informativo: nunca bloquea.
// Se calcula al consultar (no se guarda) para que un vencimiento aparezca solo, y no se expone la lista de adiciones.
function withQualification(mission) {
  const { person_additions, license_number, ...picRest } = mission.pic || {};
  const result = evaluatePicQualifications({
    licenseNumber: license_number,
    additions: person_additions || [],
    required: mission.required_additions || [],
    missionDay: bogotaDay(new Date(mission.scheduled_at)),
  });
  return { ...mission, pic: mission.pic ? picRest : mission.pic, qualificationWarnings: qualificationMessages(result) };
}

// GET — listado por organización y rango de fechas (vista de calendario
// semanal en la UI, pero el backend solo pide un rango genérico `from`/`to`).
export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const orgIds = (memberships || []).map((m) => m.organization_id);
  if (!organizationId || !orgIds.includes(organizationId)) {
    return Response.json({ error: 'organizationId requerido y con membresía activa' }, { status: 400 });
  }
  if (!from || !to) {
    return Response.json({ error: 'from y to son requeridos' }, { status: 400 });
  }

  let query = supabase
    .from('missions')
    .select(MISSION_SELECT)
    .eq('organization_id', organizationId)
    .gte('scheduled_at', from)
    .lt('scheduled_at', to)
    .order('scheduled_at', { ascending: true });

  const { data: missions, error } = await query;
  if (error) return Response.json({ error: 'Error consultando misiones' }, { status: 500 });

  return Response.json({ missions: (missions || []).map(withQualification), isManager: isDutyManager(memberships, organizationId) });
}

// POST — programar una misión nueva. Solo gestores (RLS lo exige también,
// esto es solo para devolver un mensaje claro en vez del 403 crudo de PostgREST).
export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, picPersonId, observerPersonId, aircraftId, name, zone, scheduledAt, notes, zoneGeo, lineOfSight, altitudeAglM, requiredAdditions } = body;

  if (!organizationId || !picPersonId || !name || !zone || !scheduledAt) {
    return Response.json({ error: 'organizationId, picPersonId, name, zone y scheduledAt son requeridos' }, { status: 400 });
  }
  const VISUAL_LINES = ['VLOS', 'EVLOS', 'BVLOS'];
  if (lineOfSight && !VISUAL_LINES.includes(lineOfSight)) {
    return Response.json({ error: 'lineOfSight debe ser uno de: ' + VISUAL_LINES.join(', ') }, { status: 400 });
  }
  if (observerPersonId && observerPersonId === picPersonId) {
    return Response.json({ error: 'El observador no puede ser la misma persona que el PIC' }, { status: 400 });
  }

  const { error: resolveError, memberships, personId } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!isDutyManager(memberships, organizationId)) {
    return Response.json({ error: 'Solo un gestor (Jefe de Pilotos, Gerente SMS, admin) puede programar misiones' }, { status: 403 });
  }

  if (aircraftId) {
    const { data: aircraftRow, error: aircraftError } = await supabase
      .from('aircraft')
      .select('id')
      .eq('id', aircraftId)
      .eq('organization_id', organizationId)
      .maybeSingle();
    if (aircraftError) return Response.json({ error: 'Error verificando la aeronave' }, { status: 500 });
    if (!aircraftRow) return Response.json({ error: 'La aeronave no pertenece a esta organización' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('missions')
    .insert({
      organization_id: organizationId,
      pic_person_id: picPersonId,
      observer_person_id: observerPersonId || null,
      aircraft_id: aircraftId || null,
      name,
      zone,
      scheduled_at: scheduledAt,
      notes: notes || null,
      zone_geo: zoneGeo || null,
      line_of_sight: lineOfSight || null,
      altitude_agl_m: altitudeAglM || null,
      required_additions: normalizeRequiredAdditions(requiredAdditions, { lineOfSight }),
    })
    .select(MISSION_SELECT)
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });
  await createNotifications({
    organizationId,
    personIds: [picPersonId, observerPersonId].filter(Boolean),
    type: 'mision_programada',
    title: `Nueva misión: ${name}`,
    body: [zone, scheduledAt].filter(Boolean).join(' · ') || null,
    link: '/operacion/programacion',
    actorPersonId: personId,
  });
  return Response.json({ mission: withQualification(data) });
}
