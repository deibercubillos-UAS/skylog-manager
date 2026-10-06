// smsTracking — seguimiento de sucesos VOR/MOR: plazo de radicación, cierre del caso y validación del
// reporte. Lógica pura, con tests (regla Q2). Fuente: docs/skylog-v2/12-directivas-maut.md §2.1:
//   · MOR → plazo de 5 DÍAS HÁBILES desde la ocurrencia (Directiva 02-24), en IRIS.
//   · VOR → "no se fija plazo" (v1 usaba uno "interno sugerido"; V2 sigue el texto de la directiva).
//   · accidente / incidente grave → RAC 114, otro procedimiento: aquí no hay plazo ni caso.
import { addBusinessDays, businessDaysUntil } from './colombianCalendar.js';
import { dayKey } from './operationCalendar.js';
import { UAS_MANDATORY_EVENTS } from './smsReporting.js';

export const MOR_DEADLINE_BUSINESS_DAYS = 5;
// A partir de cuántos días hábiles restantes un plazo pasa de "en plazo" a "por vencer".
export const DEADLINE_WARNING_BUSINESS_DAYS = 2;

// Los 12 eventos UAS de reporte obligatorio con un id estable (varios comparten código OACI, así que
// el código solo no identifica la opción elegida).
export const UAS_EVENT_OPTIONS = UAS_MANDATORY_EVENTS.map((e, i) => ({ id: `uas-${i + 1}`, code: e.code, label: e.label }));
export const OTHER_EVENT_ID = 'otro';

/** Día (hora de Colombia) en que ocurrió el suceso; si no se registró, el del registro del reporte. */
export function reportOccurrenceDay(report) {
  return dayKey(report.occurred_at || report.created_at);
}

/**
 * Estado del plazo de radicación de un reporte.
 *  applicable=false → no hay plazo (VOR, o RAC 114).
 *  status: en_plazo · por_vencer · vence_hoy · vencido · radicado · radicado_tarde
 *  estimated=true cuando el reporte no registró cuándo ocurrió el suceso y se cuenta desde su registro.
 * `today`: 'YYYY-MM-DD' (hora de Colombia), inyectado por quien llama.
 */
export function computeReportDeadline(report, today) {
  if (report.route !== 'mor') {
    return { applicable: false, reason: report.route === 'vor' ? 'sin_plazo_vor' : 'otro_procedimiento' };
  }
  const occurredOn = reportOccurrenceDay(report);
  const deadline = addBusinessDays(occurredOn, MOR_DEADLINE_BUSINESS_DAYS);
  const estimated = !report.occurred_at;

  if (report.filed_at) {
    const filedOn = dayKey(report.filed_at);
    const late = filedOn > deadline;
    return { applicable: true, deadline, occurredOn, estimated, status: late ? 'radicado_tarde' : 'radicado', filedOn, businessDaysLate: late ? businessDaysUntil(deadline, filedOn) : 0 };
  }

  const businessDaysLeft = businessDaysUntil(today, deadline);
  let status = 'en_plazo';
  if (businessDaysLeft < 0) status = 'vencido';
  else if (businessDaysLeft === 0) status = 'vence_hoy';
  else if (businessDaysLeft <= DEADLINE_WARNING_BUSINESS_DAYS) status = 'por_vencer';
  return { applicable: true, deadline, occurredOn, estimated, status, businessDaysLeft };
}

/**
 * ¿Se puede cerrar el caso? Exige un resumen de la investigación y, si es MOR, que ya esté radicado
 * (cerrar un MOR sin radicarlo dejaría la obligación regulatoria sin cumplir). Las acciones correctivas
 * pendientes NO bloquean —el seguimiento puede seguir después— pero se informan para que se confirme.
 */
export function canCloseCase({ report, investigationSummary, actions }) {
  const errors = [];
  if (!(investigationSummary || '').trim()) errors.push('Escribe el resumen de la investigación antes de cerrar el caso.');
  if (report?.route === 'mor' && !report.filed_at) errors.push('Un MOR debe radicarse en IRIS antes de cerrar el caso.');
  const pendingActions = (actions || []).filter((a) => !a.done_at).length;
  return { ok: errors.length === 0, errors, pendingActions };
}

/** Validación de un reporte nuevo (la usan el formulario interno y el público). */
export function validateReportInput({ description, occurredAt, now, severity, severities }) {
  const errors = [];
  if (!(description || '').trim() || description.trim().length < 10) errors.push('Describe el suceso con al menos 10 caracteres.');
  if (description && description.length > 5000) errors.push('La descripción es demasiado larga (máximo 5000 caracteres).');
  if (severities && !severities.includes(severity)) errors.push('Severidad inválida.');
  if (occurredAt) {
    const t = Date.parse(occurredAt);
    if (Number.isNaN(t)) errors.push('La fecha del suceso no es válida.');
    else if (t > Date.parse(now) + 5 * 60_000) errors.push('El suceso no puede haber ocurrido en el futuro.');
  }
  return { ok: errors.length === 0, errors };
}

// Línea de tiempo del caso: etiqueta e ícono por tipo de evento (sms_case_events.event_type es texto libre).
export const CASE_TIMELINE_META = {
  reporte_creado: { label: 'Reporte recibido', icon: 'inbox' },
  reporte_analizado: { label: 'Análisis inicial del Gerente SMS', icon: 'fact_check' },
  reporte_radicado: { label: 'Radicado en IRIS', icon: 'upload_file' },
  caso_abierto: { label: 'Caso abierto', icon: 'folder_open' },
  caso_en_analisis: { label: 'Caso en análisis', icon: 'manage_search' },
  analisis_actualizado: { label: 'Análisis actualizado', icon: 'edit_note' },
  accion_agregada: { label: 'Acción correctiva agregada', icon: 'add_task' },
  accion_completada: { label: 'Acción correctiva completada', icon: 'task_alt' },
  adjunto_agregado: { label: 'Evidencia adjunta', icon: 'attach_file' },
  caso_cerrado: { label: 'Caso cerrado', icon: 'check_circle' },
};

function describeCaseEvent(e) {
  const p = e.payload || {};
  switch (e.event_type) {
    case 'accion_agregada':
      return p.description ? `${p.description}${p.due_date ? ` (vence ${p.due_date})` : ''}` : null;
    case 'accion_completada':
      return p.description || null;
    case 'adjunto_agregado':
      return p.file_name || null;
    case 'analisis_actualizado':
      return Array.isArray(p.fields) && p.fields.length ? `Campos: ${p.fields.join(', ')}` : null;
    case 'caso_cerrado':
      return p.pending_actions ? `Se cerró con ${p.pending_actions} acción(es) correctiva(s) pendiente(s).` : null;
    default:
      return null;
  }
}

/**
 * Línea de tiempo de un caso: junta lo que el REPORTE ya sabe por sí mismo (recibido, analizado,
 * radicado — se deriva de sus fechas, no se duplica en eventos) con los eventos del caso. Ordenada de
 * más antigua a más reciente. `names`: { reporter, analyzer } ya resueltos por quien llama.
 */
export function buildCaseTimeline(report, events, names = {}) {
  const items = [{ id: 'report-created', at: report.created_at, type: 'reporte_creado', actor: names.reporter ?? null, detail: report.event_label || null }];
  if (report.analyzed_at) items.push({ id: 'report-analyzed', at: report.analyzed_at, type: 'reporte_analizado', actor: names.analyzer ?? null, detail: null });
  if (report.filed_at) items.push({ id: 'report-filed', at: report.filed_at, type: 'reporte_radicado', actor: null, detail: report.iris_reference ? `Referencia IRIS: ${report.iris_reference}` : null });
  for (const e of events || []) {
    items.push({ id: e.id, at: e.created_at, type: e.event_type, actor: e.actor ?? null, detail: describeCaseEvent(e) });
  }
  return items
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
    .map((it) => ({ ...it, label: CASE_TIMELINE_META[it.type]?.label || it.type, icon: CASE_TIMELINE_META[it.type]?.icon || 'circle' }));
}
