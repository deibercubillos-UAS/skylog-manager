// Eliminar mi cuenta (Ley 1581): qué pasaría y qué lo impide. Lógica pura; el servidor trae los datos y ejecuta
// `v2_admin_delete_account`. Reglas:
//  - Si la persona es la ÚNICA integrante activa de una organización, esa organización se elimina con ella.
//  - Si es el ÚNICO Gerente General de una organización que sigue teniendo más integrantes, se bloquea: primero
//    debe nombrar a otro Gerente General (si no, la organización quedaría sin nadie que la administre).
//  - Dueña única de una escuela de socios con asesores activos: se bloquea.
//  - Un superadmin no se elimina desde aquí.

/**
 * @param {{ personId: string, memberships: {organization_id:string, organization_name?:string, role:string}[],
 *   membersByOrg: Record<string, {person_id:string, role:string}[]>,
 *   partnerOwnerships?: {partner_id:string, partner_name?:string, otherOwners:number, activeAdvisors:number}[] }} input
 */
export function planAccountDeletion({ personId, memberships = [], membersByOrg = {}, partnerOwnerships = [] }) {
  const blockers = [];
  const orgsToDelete = [];
  const orgsToLeave = [];

  if (memberships.some((m) => m.role === 'superadmin')) {
    blockers.push({ code: 'superadmin', message: 'Una cuenta de superadmin no se elimina desde aquí.' });
  }

  for (const m of memberships) {
    const name = m.organization_name || 'tu organización';
    const others = (membersByOrg[m.organization_id] || []).filter((x) => x.person_id !== personId);
    if (others.length === 0) {
      orgsToDelete.push({ organization_id: m.organization_id, name });
      continue;
    }
    orgsToLeave.push({ organization_id: m.organization_id, name });
    const otherAdmins = others.filter((x) => x.role === 'admin');
    if (m.role === 'admin' && otherAdmins.length === 0) {
      blockers.push({
        code: 'unico_gerente_general',
        organization_id: m.organization_id,
        message: `Eres el único Gerente General de «${name}» y tiene ${others.length} integrante(s) más. Nombra a otro Gerente General antes de eliminar tu cuenta.`,
      });
    }
  }

  for (const p of partnerOwnerships) {
    if (p.otherOwners === 0 && p.activeAdvisors > 0) {
      blockers.push({
        code: 'socio_con_asesores',
        message: `Eres el único administrador de «${p.partner_name || 'tu escuela'}» y aún tiene asesores activos. Desactívalos antes de eliminar tu cuenta.`,
      });
    }
  }

  return { blockers, orgsToDelete, orgsToLeave, canDelete: blockers.length === 0 };
}

/** Tablas de datos personales que incluye la exportación («Descargar mis datos»), con la columna que las liga a la persona. */
export const EXPORT_SOURCES = [
  { key: 'persona', table: 'people', column: 'id' },
  { key: 'membresias', table: 'memberships', column: 'person_id' },
  { key: 'adiciones', table: 'person_additions', column: 'person_id' },
  { key: 'documentos', table: 'person_documents', column: 'person_id', columns: 'id, doc_type, document_path, created_at' },
  { key: 'designaciones', table: 'designations', column: 'person_id' },
  { key: 'vuelos_como_piloto', table: 'flights', column: 'pilot_person_id' },
  { key: 'tiempos_de_servicio', table: 'duty_periods', column: 'person_id' },
  { key: 'certificaciones_anuales_de_horas', table: 'duty_annual_certifications', column: 'person_id' },
  { key: 'misiones_como_piloto', table: 'missions', column: 'pic_person_id' },
  { key: 'misiones_como_observador', table: 'missions', column: 'observer_person_id' },
  { key: 'despachos', table: 'dispatches', column: 'pilot_person_id' },
  { key: 'intentos_de_examen', table: 'training_exam_attempts', column: 'person_id' },
  { key: 'intentos_de_evaluacion', table: 'capacitacion_evaluation_attempts', column: 'person_id' },
  { key: 'asistencia_capacitacion_sms', table: 'sms_training_attendance', column: 'person_id' },
  { key: 'lecturas_de_manuales', table: 'manual_acknowledgments', column: 'person_id' },
  { key: 'reportes_sms_propios', table: 'sms_reports', column: 'reported_by' },
  { key: 'notificaciones', table: 'notifications', column: 'person_id' },
  { key: 'programa_de_socios', table: 'partner_members', column: 'person_id' },
];
