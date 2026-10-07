// migration/sms — reportes SMS, VOR/MOR, casos, acciones, peligros y barreras (32-migracion.md §2.1). Son registros
// regulados (retención de 5 años): se migran a las tablas operativas de V2 con su fecha original; todo lo demás de v1
// (indicadores de ejemplo, respuestas GAP sin diligenciar, escalas de riesgo por defecto) queda en el archivo de v1.
import { classifyReportRoute } from '../smsReporting.js';
import { colombiaInstant } from './core.js';

const clean = (v) => (v === null || v === undefined ? '' : String(v).trim());
const SEVERITIES = ['incidente', 'incidente_grave', 'accidente'];

export function mapCaseStatus(status) {
  const s = clean(status).toLowerCase().replace(/\s+/g, '_');
  if (['cerrado', 'archivado'].includes(s)) return 'cerrado';
  if (['en_analisis', 'en_investigacion', 'en_investigación'].includes(s)) return 'en_analisis';
  return 'abierto';
}

const normalizeSeverity = (v) => { const s = clean(v).toLowerCase(); return SEVERITIES.includes(s) ? s : null; };

/** Un reporte SMS de v1 (accidente/incidente) → reporte de V2. La ruta la decide la misma regla que usa V2 al crearlos. */
export function transformSmsReport(r, ctx) {
  const warnings = [];
  const organization = ctx.organization(r.organization_id);
  if (!organization) return { ok: false, reason: 'organización no migrada' };
  const severity = normalizeSeverity(r.severity);
  if (!severity) return { ok: false, reason: `severidad «${r.severity}» inválida` };
  const reporterKey = r.owner_id ? ctx.personOfProfile(r.owner_id) : null;
  const { route, requiresManagerAnalysis } = classifyReportRoute({ severity, reportedByRole: reporterKey !== null ? ctx.roleOf(reporterKey, r.organization_id) : null });
  const parts = [clean(r.narrative), clean(r.damage_description) && `Daños: ${clean(r.damage_description)}`, clean(r.third_party_damage) && `Daños a terceros: ${clean(r.third_party_damage)}`, clean(r.immediate_actions) && `Acciones inmediatas: ${clean(r.immediate_actions)}`, clean(r.aircraft_status_post) && `Estado de la aeronave: ${clean(r.aircraft_status_post)}`].filter(Boolean);
  if (!parts.length) { parts.push(clean(r.event_type) || 'Reporte migrado sin descripción'); warnings.push('sin narrativa'); }
  return {
    ok: true,
    warnings,
    reporterKey,
    row: {
      reported_by: null, // se completa con la persona resuelta al escribir
      severity,
      route,
      requires_manager_analysis: requiresManagerAnalysis,
      description: parts.join('\n'),
      confidentiality_level: 'normal',
      source: 'manual',
      occurred_at: r.occurrence_date || null,
      location: clean(r.location) || null,
      event_label: clean(r.event_type) || null,
      created_at: r.created_at || undefined,
    },
    flightV1: r.flight_id || null,
    caseStatus: mapCaseStatus(r.status),
    caseClosedAt: mapCaseStatus(r.status) === 'cerrado' ? r.updated_at || r.created_at || null : null,
  };
}

/** Un VOR/MOR recibido por el formulario público → reporte de V2 (fuente `public`). */
export function transformVorMor(v, ctx) {
  const warnings = [];
  const organization = ctx.organization(v.organization_id);
  if (!organization) return { ok: false, reason: 'organización no migrada' };
  const type = clean(v.type).toUpperCase();
  if (!['VOR', 'MOR'].includes(type)) return { ok: false, reason: `tipo «${v.type}» desconocido` };
  const severity = normalizeSeverity(v.severity) || normalizeSeverity(v.reported_severity) || 'incidente';
  if (!normalizeSeverity(v.severity)) warnings.push('sin severidad asignada por el gestor → incidente (revisar)');
  let occurred = null;
  if (v.occurrence_date) occurred = v.occurrence_time ? colombiaInstant(v.occurrence_date, v.occurrence_time) : colombiaInstant(v.occurrence_date, '12:00');
  const extra = [clean(v.immediate_actions) && `Acciones inmediatas: ${clean(v.immediate_actions)}`].filter(Boolean);
  return {
    ok: true,
    warnings,
    assignedProfile: v.assigned_to || null,
    row: {
      severity: severity === 'accidente' || severity === 'incidente_grave' ? severity : severity,
      route: type === 'MOR' ? 'mor' : 'vor',
      requires_manager_analysis: type === 'MOR',
      description: [clean(v.description), ...extra].join('\n'),
      confidentiality_level: v.is_anonymous ? 'confidencial' : 'normal',
      source: 'public',
      occurred_at: occurred,
      location: clean(v.location) || null,
      reporter_contact: v.is_anonymous ? null : [clean(v.reporter_name), clean(v.reporter_email)].filter(Boolean).join(' · ') || null,
      iris_reference: null,
      filed_at: v.aerocivil_notified_at || null,
      created_at: v.created_at || undefined,
    },
    caseStatus: mapCaseStatus(v.status),
    caseClosedAt: mapCaseStatus(v.status) === 'cerrado' ? v.updated_at || v.created_at || null : null,
    investigationSummary: clean(v.investigation_summary) || null,
    contributingFactors: clean(v.contributing_factors) || null,
    internalNotes: clean(v.internal_notes) || null,
  };
}

/** Acción correctiva de un caso. El responsable de v1 era texto libre; V2 guarda una persona: el texto pasa a la descripción. */
export function transformCaseAction(a) {
  const description = [clean(a.label), clean(a.owner) && `(responsable: ${clean(a.owner)})`].filter(Boolean).join(' ');
  return { description: description || 'Acción migrada', due_date: a.due_date || null, done_at: a.done ? a.done_at || a.created_at || new Date(0).toISOString() : null, created_at: a.created_at || undefined };
}

export function transformCaseEvent(e) {
  return { event_type: 'migrado', payload: { label: clean(e.label), actor_name: clean(e.actor_name) || null, source: 'v1' }, created_at: e.created_at || undefined };
}

/** Peligro registrado (v1) → peligro de V2 + su evaluación de riesgo si los códigos son los de V2 (probabilidad numérica). */
export function transformHazard(h) {
  const prob = Number(String(h.initial_probability_code).replace(/\D/g, ''));
  const residualProb = Number(String(h.residual_probability_code ?? '').replace(/\D/g, ''));
  const hazard = { description: clean(h.description), source: clean(h.source) || null, created_at: h.created_at || undefined };
  const assessment = Number.isInteger(prob) && prob > 0 && clean(h.initial_severity_code)
    ? {
        probability_code: prob,
        severity_code: clean(h.initial_severity_code),
        mitigation: [clean(h.mitigation), clean(h.responsible) && `Responsable: ${clean(h.responsible)}`, h.due_date && `Vence: ${String(h.due_date).slice(0, 10)}`].filter(Boolean).join('\n') || null,
        residual_probability_code: Number.isInteger(residualProb) && residualProb > 0 ? residualProb : null,
        residual_severity_code: clean(h.residual_severity_code) || null,
        created_at: h.created_at || undefined,
      }
    : null;
  return { hazard, assessment, warning: assessment ? null : 'códigos de probabilidad/gravedad no reconocidos: la evaluación de riesgo queda solo en el archivo de v1' };
}

export function transformBarrier(b) {
  return { description: [clean(b.name), clean(b.description)].filter(Boolean).join(': ') || 'Barrera migrada', category: clean(b.category) || null, created_at: b.created_at || undefined };
}
