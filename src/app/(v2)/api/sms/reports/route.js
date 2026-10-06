// Skylog V2.0 — F3. Reportes de seguridad operacional (MOR/VOR).
// docs/skylog-v2/40-sms.md §5.7 · 12-directivas-maut.md §2.
//
// "Diligenciar" es abierto por diseño — cualquier miembro de la organización
// puede crear un reporte (no solo Gerente SMS). La ruta (mor/vor/rac114) y si
// exige análisis previo se calculan server-side con classifyReportRoute() —
// nunca se confía en un valor mandado por el cliente (regla S2). Lo mismo con
// el evento oficial: el código/etiqueta salen de la lista de 12 eventos UAS
// del servidor, no del navegador.
//
// El reporte guarda CUÁNDO ocurrió el suceso, DÓNDE y con qué aeronave/vuelo:
// sin la fecha de ocurrencia no se puede calcular el plazo del MOR (5 días
// hábiles desde la ocurrencia, Directiva 02-24).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { bogotaDay } from '@/lib/v2/dispatchContext';
import { notifyNewReport } from '@/lib/v2/smsAlerts';
import {
  classifyReportRoute,
  redactReporterIdentity,
  computeReportDeadline,
  validateReportInput,
  REPORT_SEVERITY_LEVELS,
  UAS_EVENT_OPTIONS,
  OTHER_EVENT_ID,
} from '@skylog/domain';

export async function POST(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, severity, description, eventId, eventCode, eventLabel, occurredAt, location, aircraftId, flightId, confidentialityLevel } = body;
  if (!organizationId || !severity || !description) {
    return Response.json({ error: 'organizationId, severity y description son requeridos' }, { status: 400 });
  }

  const check = validateReportInput({ description, occurredAt, now: new Date().toISOString(), severity, severities: REPORT_SEVERITY_LEVELS });
  if (!check.ok) return Response.json({ error: check.errors.join(' '), errors: check.errors }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const membership = (memberships || []).find((m) => m.organization_id === organizationId);
  if (!membership) return Response.json({ error: 'Esta cuenta no pertenece a esa organización' }, { status: 403 });

  let route;
  try {
    route = classifyReportRoute({ severity, reportedByRole: membership.role });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }

  // Evento: de la lista oficial el servidor resuelve código y etiqueta; "otro" admite texto libre.
  let finalEventCode = null;
  let finalEventLabel = null;
  const official = UAS_EVENT_OPTIONS.find((o) => o.id === eventId);
  if (official) {
    finalEventCode = official.code;
    finalEventLabel = official.label;
  } else if (eventId === OTHER_EVENT_ID || (!eventId && (eventCode || eventLabel))) {
    finalEventCode = eventCode?.trim()?.slice(0, 40) || null;
    finalEventLabel = eventLabel?.trim()?.slice(0, 200) || null;
  }

  // Aeronave y vuelo deben ser de esta organización. El vuelo sigue la RLS de `flights`: un piloto
  // solo puede vincular los suyos; un gestor, los de la organización.
  let finalAircraftId = null;
  if (flightId) {
    const { data: flight } = await supabase.from('flights').select('id, aircraft_id').eq('id', flightId).eq('organization_id', organizationId).maybeSingle();
    if (!flight) return Response.json({ error: 'El vuelo no existe en esta organización o no tienes acceso a él' }, { status: 400 });
    finalAircraftId = flight.aircraft_id || null;
  }
  if (aircraftId) {
    const { data: aircraft } = await supabase.from('aircraft').select('id').eq('id', aircraftId).eq('organization_id', organizationId).maybeSingle();
    if (!aircraft) return Response.json({ error: 'La aeronave no existe en esta organización' }, { status: 400 });
    finalAircraftId = aircraftId;
  }

  const { data, error } = await supabase
    .from('sms_reports')
    .insert({
      organization_id: organizationId,
      reported_by: personId,
      severity,
      route: route.route,
      requires_manager_analysis: route.requiresManagerAnalysis,
      event_code: finalEventCode,
      event_label: finalEventLabel,
      description: description.trim(),
      occurred_at: occurredAt ? new Date(occurredAt).toISOString() : null,
      location: location?.trim()?.slice(0, 300) || null,
      aircraft_id: finalAircraftId,
      flight_id: flightId || null,
      confidentiality_level: confidentialityLevel === 'confidencial' ? 'confidencial' : 'normal',
    })
    .select()
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Aviso al Gerente SMS (mejor esfuerzo: un fallo del correo nunca invalida el reporte).
  await notifyNewReport({ organizationId, report: data });

  // accidente/incidente_grave bifurca a RAC 114 (§2.5) — nunca abre un caso
  // MOR/VOR. El reporte queda como evidencia, sin caso asociado todavía
  // (diseño de esa rama pendiente, ver 12-directivas-maut.md §2.5).
  if (route.route === 'rac114') {
    return Response.json({
      report: data,
      warning: 'Clasificado como accidente/incidente grave — no se radica por MOR/VOR. Sigue el procedimiento RAC 114 (rama pendiente de diseñar).',
    });
  }

  return Response.json({ report: data });
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  // `sms_cases` solo lo ve el Gerente SMS (RLS): para cualquier otro rol el embed llega vacío.
  let query = supabase
    .from('sms_reports')
    .select('*, sms_cases(id, status, assigned_to), sms_report_attachments(id), aircraft:aircraft_id(serial_number, model:model_id(brand, model))')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  // RLS ya filtra "propios o de mi organización si soy gestor" — este acotado
  // adicional evita que un no-gestor vea la lista completa si por error se le
  // pasara una organizationId ajena (defensa en profundidad, no sustituye RLS).
  if (!isDutyManager(memberships, organizationId)) {
    query = query.eq('reported_by', personId);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // SMS-H (40-sms.md §5.9, RAC 219 §219.115-140) — RLS deja pasar la FILA a
  // cualquier gestor, pero un reporte 'confidencial' solo expone la
  // identidad del notificante al Gerente SMS (o a sí mismo). Redacción en la
  // capa de API porque Postgres RLS filtra filas, no columnas.
  const membership = (memberships || []).find((m) => m.organization_id === organizationId);
  const today = bogotaDay(new Date());
  const reports = (data || []).map((r) => {
    const { sms_report_attachments, ...rest } = r;
    const redacted = redactReporterIdentity(rest, { viewerRole: membership?.role, viewerPersonId: personId, reporterFields: [] });
    return { ...redacted, attachments_count: (sms_report_attachments || []).length, deadline: computeReportDeadline(r, today) };
  });

  return Response.json({ reports, today });
}
