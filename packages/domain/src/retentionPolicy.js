// retentionPolicy — retención de registros operacionales y custodia legal
// (RAC 100 §100.535(29); ítem 34 de MAUT-5.0-12-095). Lógica pura, con tests
// (regla Q2). Fechas 'YYYY-MM-DD' comparadas como texto: la fecha de hoy la
// inyecta quien llama, sin Date.now() ni zonas horarias adentro.
//
// ⚠️ RETAINED_RECORD_TYPES y los triggers de la migración
// 20261005010000_v2_retention_custody.sql describen LAS MISMAS tablas: si se
// agrega una a un lado, hay que agregarla al otro (la migración es la que
// realmente impide el borrado; esta lista es la que se muestra al usuario).

export const RETENTION_YEARS = 5;

export const RETAINED_RECORD_TYPES = [
  { table: 'flights', label: 'Vuelos (bitácora y libro de vuelo)', dateColumn: 'takeoff_at' },
  { table: 'maintenance_events', label: 'Eventos de mantenimiento', dateColumn: 'performed_at' },
  { table: 'unexpected_events', label: 'Eventos inesperados de aeronave', dateColumn: 'reported_at' },
  { table: 'duty_periods', label: 'Tiempos de servicio, vuelo y descanso', dateColumn: 'started_at' },
  { table: 'duty_exceptions', label: 'Excepciones a tiempos de servicio', dateColumn: 'created_at' },
  { table: 'duty_annual_certifications', label: 'Certificaciones anuales de horas', dateColumn: 'certified_at' },
  { table: 'missions', label: 'Misiones programadas', dateColumn: 'scheduled_at' },
  { table: 'dispatches', label: 'Despachos de vuelo (verificaciones y riesgos)', dateColumn: 'dispatched_at' },
  { table: 'dispatch_checklist_items', label: 'Listas de chequeo diligenciadas en el despacho', dateColumn: 'created_at' },
  { table: 'authorization_requests', label: 'Solicitudes de autorización de vuelo', dateColumn: 'created_at' },
  { table: 'risk_analyses', label: 'Análisis de riesgos por autorización', dateColumn: 'created_at' },
  { table: 'sms_reports', label: 'Reportes SMS (MOR/VOR)', dateColumn: 'created_at' },
  { table: 'sms_cases', label: 'Casos SMS', dateColumn: 'created_at' },
  { table: 'sms_report_attachments', label: 'Evidencias adjuntas de reportes SMS', dateColumn: 'created_at' },
  { table: 'sms_case_actions', label: 'Acciones correctivas de casos SMS', dateColumn: 'created_at' },
  { table: 'sms_case_events', label: 'Línea de tiempo de casos SMS', dateColumn: 'created_at' },
  { table: 'sms_monthly_reports', label: 'Constancias de reporte mensual', dateColumn: 'created_at' },
];

// Liberar una custodia exige autoridad (no basta ser gestor operativo): el Jefe de
// Pilotos puede ABRIRLA pero no levantarla. Misma lista que `v2_is_org_authority` en SQL.
export const HOLD_RELEASE_ROLES = ['admin', 'gerente_sms', 'superadmin'];

export function canReleaseHold(role) {
  return HOLD_RELEASE_ROLES.includes(role);
}

/** Suma años a 'YYYY-MM-DD'. El 29 de febrero cae al 28 en años no bisiestos (igual que Postgres). */
export function addYears(dateStr, years) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const ny = y + years;
  const lastDay = new Date(Date.UTC(ny, m, 0)).getUTCDate();
  const nd = Math.min(d, lastDay);
  return `${String(ny).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(nd).padStart(2, '0')}`;
}

/** Último día en que el registro sigue protegido por el plazo de retención. */
export function retentionExpiry(recordDate) {
  return addYears(recordDate.slice(0, 10), RETENTION_YEARS);
}

/** ¿El registro sigue dentro del plazo? El día de vencimiento todavía está protegido. */
export function isWithinRetention(recordDate, today) {
  return today <= retentionExpiry(recordDate);
}

export function holdStatus(hold) {
  return hold?.released_at ? 'liberada' : 'activa';
}
