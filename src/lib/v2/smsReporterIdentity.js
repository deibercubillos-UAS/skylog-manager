// Identidad del notificante de `sms_reports` (SMS-H, RAC 219 §219.115-140, regla S4).
// `reported_by` y `reporter_contact` NO son legibles con la sesión del usuario: la migración 20261112150000 les
// quita el SELECT a `authenticated`/`anon`, porque RLS filtra filas y no columnas (un gestor llegaba a PostgREST
// directo y leía la identidad de un reporte confidencial). Solo el servidor las lee, con la llave de servicio, y
// siempre sobre filas que la sesión del usuario ya pudo ver (RLS), y las pasa por `redactReporterIdentity`.
import { createAdminClient } from '@/lib/supabaseServer';

// Todas las columnas de `sms_reports` salvo la identidad del notificante: se usan en lugar de `*`.
export const SMS_REPORT_COLUMNS =
  'id, organization_id, severity, route, requires_manager_analysis, event_code, event_label, description, confidentiality_level, source, analyzed_by, analyzed_at, filed_at, iris_reference, created_at, occurred_at, location, aircraft_id, flight_id';

/**
 * Agrega `reported_by`, `reporter_contact` y `reporter: { full_name }` a filas de `sms_reports` ya leídas con la
 * sesión del usuario. Devuelve copias; el llamador debe aplicar `redactReporterIdentity` antes de responder.
 */
export async function attachReporterIdentity(rows) {
  const list = (rows || []).filter(Boolean);
  if (list.length === 0) return rows || [];
  const admin = createAdminClient();
  const { data: identities, error } = await admin.from('sms_reports').select('id, reported_by, reporter_contact').in('id', list.map((r) => r.id));
  if (error) throw new Error('No se pudo leer el notificante del reporte');
  const byId = new Map((identities || []).map((i) => [i.id, i]));

  const personIds = [...new Set((identities || []).map((i) => i.reported_by).filter(Boolean))];
  const names = new Map();
  if (personIds.length > 0) {
    const { data: people, error: peopleError } = await admin.from('people').select('id, full_name').in('id', personIds);
    if (peopleError) throw new Error('No se pudo leer el notificante del reporte');
    for (const p of people || []) names.set(p.id, p.full_name);
  }

  return list.map((r) => {
    const i = byId.get(r.id);
    return {
      ...r,
      reported_by: i?.reported_by ?? null,
      reporter_contact: i?.reporter_contact ?? null,
      reporter: i?.reported_by ? { full_name: names.get(i.reported_by) ?? null } : null,
    };
  });
}

/** Quién reportó (id de persona) un reporte concreto, o null. */
export async function reporterIdOf(reportId) {
  const { data } = await createAdminClient().from('sms_reports').select('reported_by').eq('id', reportId).maybeSingle();
  return data?.reported_by ?? null;
}

/** Ids de los reportes de una persona en una organización (para listar «solo los míos» sin filtrar por la columna). */
export async function ownReportIds(organizationId, personId) {
  const { data, error } = await createAdminClient().from('sms_reports').select('id').eq('organization_id', organizationId).eq('reported_by', personId);
  if (error) throw new Error('No se pudieron consultar tus reportes');
  return (data || []).map((r) => r.id);
}
