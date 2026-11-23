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
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { bogotaDay } from '@/lib/v2/dispatchContext';
import { notifyNewReport } from '@/lib/v2/smsAlerts';
import { membershipsCanView, readOnlyBlock } from '@/lib/v2/permissions';
import {
  classifyReportRoute,
  redactReporterIdentity,
  computeReportDeadline,
  validateReportFormSubmission,
  effectiveFormFields,
  REPORT_SEVERITY_LEVELS,
  UAS_EVENT_OPTIONS,
  OTHER_EVENT_ID,
} from '@skylog/domain';

const FORM_FIELD_COLS = 'id, kind, field_key, label, input_type, options, required, visible, locked, sort_order';
import { getAuthUser } from '@/lib/v2/authUser';
import { SMS_REPORT_COLUMNS, attachReporterIdentity, ownReportIds, reporterIdOf } from '@/lib/v2/smsReporterIdentity';
import { logAudit } from '@/lib/v2/auditLog';
import { dbError } from '@/lib/v2/apiErrors';

// Resuelve el evento oficial (código/etiqueta) a partir de lo enviado, igual que el alta: de la lista
// oficial salen código y etiqueta; "otro" admite texto libre; sin evento, quedan en null.
function resolveEvent({ eventId, eventCode, eventLabel }) {
  const official = UAS_EVENT_OPTIONS.find((o) => o.id === eventId);
  if (official) return { event_code: official.code, event_label: official.label };
  if (eventId === OTHER_EVENT_ID || (!eventId && (eventCode || eventLabel))) {
    return { event_code: eventCode?.trim()?.slice(0, 40) || null, event_label: eventLabel?.trim()?.slice(0, 200) || null };
  }
  return { event_code: null, event_label: null };
}

export async function POST(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { organizationId, severity, description, eventId, eventCode, eventLabel, occurredAt, location, aircraftId, flightId, confidentialityLevel, customFields } = body;
  if (!organizationId || !severity || !description) {
    return Response.json({ error: 'organizationId, severity y description son requeridos' }, { status: 400 });
  }

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const membership = (memberships || []).find((m) => m.organization_id === organizationId);
  if (!membership) return Response.json({ error: 'Esta cuenta no pertenece a esa organización' }, { status: 403 });

  // Validar contra la definición del formulario del tipo que corresponde a quien reporta (mor si es el Gerente
  // SMS, vor en otro caso): campos estándar visibles + obligatorios, reglas base y preguntas propias.
  const formType = membership.role === 'gerente_sms' ? 'mor' : 'vor';
  const { data: defRows } = await supabase.from('sms_report_form_fields').select(FORM_FIELD_COLS).eq('organization_id', organizationId).eq('report_type', formType);
  const check = validateReportFormSubmission({
    fieldDefs: effectiveFormFields(formType, defRows || []),
    standardValues: { event: eventId, severity, occurred_at: occurredAt, location, aircraft: aircraftId, flight: flightId, description, confidential: confidentialityLevel === 'confidencial' },
    customValues: customFields || {},
    now: new Date().toISOString(),
    severities: REPORT_SEVERITY_LEVELS,
  });
  if (!check.ok) return Response.json({ error: check.errors.join(' '), errors: check.errors }, { status: 400 });

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
      custom_fields: check.customFields,
    })
    .select(SMS_REPORT_COLUMNS)
    .single();

  if (error) return dbError(error, 'sms/reports');

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

// Corrección de un reporte por el Gerente SMS (40-sms.md §5.7): puede ajustar qué/cuándo/dónde, la
// severidad, el vuelo/aeronave y la confidencialidad de un reporte ya diligenciado. La ruta (MOR/VOR/RAC114)
// NO se toma del cliente: se recalcula en el servidor según la nueva severidad y quién reportó (regla S2).
// No cambia al notificante (reported_by) ni el estado del flujo (análisis/radicación), para no borrar su rastro.
export async function PATCH(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const { reportId, severity, description, eventId, eventCode, eventLabel, occurredAt, location, aircraftId, flightId, confidentialityLevel, customFields } = body;
  if (!reportId || !severity || !description) {
    return Response.json({ error: 'reportId, severity y description son requeridos' }, { status: 400 });
  }
  const hasCustom = Object.prototype.hasOwnProperty.call(body, 'customFields');

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  // Cargar el reporte (RLS deja ver los de la organización a un gestor) para conocer su organización y ruta actual.
  const { data: report, error: reportError } = await supabase.from('sms_reports').select(SMS_REPORT_COLUMNS).eq('id', reportId).maybeSingle();
  if (reportError) return Response.json({ error: 'Error verificando el reporte' }, { status: 500 });
  if (!report) return Response.json({ error: 'Reporte no encontrado' }, { status: 404 });

  // Solo el Gerente SMS designado (o superadmin) corrige — 40-sms.md §5.7 lo fija como el rol nominal.
  const membership = (memberships || []).find((m) => m.organization_id === report.organization_id);
  if (!membership || !['gerente_sms', 'superadmin'].includes(membership.role)) {
    return Response.json({ error: 'Solo el Gerente SMS puede corregir un reporte' }, { status: 403 });
  }
  const readOnly = readOnlyBlock(memberships, report.organization_id);
  if (readOnly) return readOnly;

  // Validar contra la definición del tipo actual del reporte (mor/vor). Las preguntas propias solo se tocan
  // si el cuerpo trae customFields; si no, se revalidan las ya guardadas y la columna no se modifica.
  const formType = report.route === 'mor' ? 'mor' : 'vor';
  const { data: defRows } = await supabase.from('sms_report_form_fields').select(FORM_FIELD_COLS).eq('organization_id', report.organization_id).eq('report_type', formType);
  const check = validateReportFormSubmission({
    fieldDefs: effectiveFormFields(formType, defRows || []),
    standardValues: { event: eventId, severity, occurred_at: occurredAt, location, aircraft: aircraftId, flight: flightId, description, confidential: confidentialityLevel === 'confidencial' },
    customValues: hasCustom ? (customFields || {}) : (report.custom_fields || {}),
    now: new Date().toISOString(),
    severities: REPORT_SEVERITY_LEVELS,
  });
  if (!check.ok) return Response.json({ error: check.errors.join(' '), errors: check.errors }, { status: 400 });

  // Recalcular la ruta según la nueva severidad y quién reportó. El carácter MOR/VOR original se conserva por
  // la ruta actual (mor ⇒ lo reportó el Gerente SMS, vor ⇒ otra persona); solo si hoy es RAC114 se consulta
  // el rol real del notificante (admin: reported_by no es legible con la sesión del usuario).
  let reportedByRole = null;
  if (report.route === 'mor') reportedByRole = 'gerente_sms';
  else if (report.route === 'vor') reportedByRole = 'piloto';
  else {
    const rid = await reporterIdOf(reportId);
    if (rid) {
      const { data: rm } = await createAdminClient().from('memberships').select('role').eq('person_id', rid).eq('organization_id', report.organization_id).eq('status', 'activa').maybeSingle();
      reportedByRole = rm?.role || null;
    }
  }
  let route;
  try {
    route = classifyReportRoute({ severity, reportedByRole });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }

  const { event_code, event_label } = resolveEvent({ eventId, eventCode, eventLabel });

  // Aeronave y vuelo deben ser de esta organización (misma validación que el alta).
  let finalAircraftId = null;
  if (flightId) {
    const { data: flight } = await supabase.from('flights').select('id, aircraft_id').eq('id', flightId).eq('organization_id', report.organization_id).maybeSingle();
    if (!flight) return Response.json({ error: 'El vuelo no existe en esta organización o no tienes acceso a él' }, { status: 400 });
    finalAircraftId = flight.aircraft_id || null;
  }
  if (aircraftId) {
    const { data: aircraft } = await supabase.from('aircraft').select('id').eq('id', aircraftId).eq('organization_id', report.organization_id).maybeSingle();
    if (!aircraft) return Response.json({ error: 'La aeronave no existe en esta organización' }, { status: 400 });
    finalAircraftId = aircraftId;
  }

  const { data, error } = await supabase
    .from('sms_reports')
    .update({
      severity,
      route: route.route,
      requires_manager_analysis: route.requiresManagerAnalysis,
      event_code,
      event_label,
      description: description.trim(),
      occurred_at: occurredAt ? new Date(occurredAt).toISOString() : null,
      location: location?.trim()?.slice(0, 300) || null,
      aircraft_id: finalAircraftId,
      flight_id: flightId || null,
      confidentiality_level: confidentialityLevel === 'confidencial' ? 'confidencial' : 'normal',
      ...(hasCustom ? { custom_fields: check.customFields } : {}),
    })
    .eq('id', reportId)
    .select(SMS_REPORT_COLUMNS)
    .single();
  if (error) return dbError(error, 'sms/reports');

  await logAudit({ organizationId: report.organization_id, action: 'update', module: 'Reportes SMS', entityLabel: `Reporte ${reportId} corregido` });
  return Response.json({ report: data, warning: route.route === 'rac114' ? 'Reclasificado como accidente/incidente grave — se sigue el procedimiento RAC 114, no se radica por MOR/VOR.' : undefined });
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const user = await getAuthUser(supabase);
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
    .select(`${SMS_REPORT_COLUMNS}, sms_cases(id, status, assigned_to), sms_report_attachments(id), aircraft:aircraft_id(serial_number, model:model_id(brand, model))`)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  // RLS ya filtra "propios o de mi organización si soy gestor" — este acotado
  // adicional evita que un no-gestor vea la lista completa si por error se le
  // pasara una organizationId ajena (defensa en profundidad, no sustituye RLS).
  // `reported_by` no es legible con la sesión del usuario (ver smsReporterIdentity.js): «solo los míos» se acota por id.
  if (!membershipsCanView(memberships, organizationId, 'U3')) {
    let ownIds;
    try {
      ownIds = await ownReportIds(organizationId, personId);
    } catch (e) {
      return Response.json({ error: e.message }, { status: 500 });
    }
    if (ownIds.length === 0) return Response.json({ reports: [], today: bogotaDay(new Date()) });
    query = query.in('id', ownIds);
  }

  const { data: rawData, error } = await query;
  if (error) return dbError(error, 'sms/reports');
  let data;
  try {
    data = await attachReporterIdentity(rawData);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }

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
