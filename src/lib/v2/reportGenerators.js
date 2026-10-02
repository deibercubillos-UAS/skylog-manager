// Skylog V2.0 — Reportes: generadores de PDF, uno por formato. Todos se
// generan 100% client-side al momento de descargar (mismo criterio que
// v1: nunca se persiste el archivo) y usan `pdfCommon.js` para el
// encabezado/logo/nota de trazabilidad compartidos. Solo cubre datos
// 100% reales de V2 (flights/aircraft/batteries/mantenimiento/
// tripulación/capacitación/proveedores) — nada de SPI/GAP/manuales/VOR-MOR
// todavía, porque esas piezas no existen en V2 (documentado en la
// bitácora, no fabricado aquí).
import autoTable from 'jspdf-autotable';
import { resolveLogo, fetchBitaflyLogo, drawReportHeader, drawFooterNote, slugify } from './pdfCommon';

const TABLE_STYLES = { fontSize: 7, cellPadding: 1.3, lineColor: [220, 220, 220], lineWidth: 0.1 };
const HEAD_STYLES = { fillColor: [26, 32, 44], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' };

async function baseDoc({ orgName, logoUrl, title, subtitle }) {
  const { jsPDF } = await import('jspdf');
  const logo = (await resolveLogo(logoUrl)) || (await fetchBitaflyLogo());
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = drawReportHeader(doc, { logo, orgName, title, subtitle });
  return { doc, startY };
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtHours(h) {
  return h == null ? '—' : Number(h).toFixed(1);
}

export async function generateFlightLogPdf(flights, { orgName, logoUrl, periodLabel }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, title: 'Libro de Vuelo', subtitle: periodLabel });
  autoTable(doc, {
    startY,
    head: [['FECHA', 'DESPEGUE', 'ATERRIZAJE', 'DURACIÓN (H)', 'AERONAVE', 'PILOTO', 'TIPO DE MISIÓN', 'CONDICIÓN VISUAL']],
    body: (flights || []).map((f) => [
      fmtDate(f.takeoff_at),
      fmtDateTime(f.takeoff_at),
      fmtDateTime(f.landing_at),
      fmtHours(f.total_time),
      f.aircraft_label || '—',
      f.pilot_name || '—',
      f.mission_type || '—',
      f.visual_condition || '—',
    ]),
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    margin: { left: 10, right: 10 },
  });
  drawFooterNote(doc, periodLabel);
  doc.save(`libro-de-vuelo-${slugify(orgName)}.pdf`);
}

function intervalLabel(t) {
  const parts = [];
  if (t.interval_cycles != null) parts.push(`${t.interval_cycles} ciclos`);
  if (t.interval_hours != null) parts.push(`${t.interval_hours} h`);
  if (t.interval_calendar_days != null) parts.push(`${t.interval_calendar_days} días`);
  return parts.join(' · ') || '—';
}

export async function generateMaintenanceReportPdf({ events, unexpected, programs }, { orgName, logoUrl, periodLabel }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, title: 'Mantenimiento', subtitle: periodLabel });
  autoTable(doc, {
    startY,
    head: [['FECHA', 'AERONAVE', 'TIPO', 'HORAS AERONAVE', 'HALLAZGOS', 'VUELVE A SERVICIO']],
    body: (events || []).map((e) => [
      fmtDate(e.performed_at),
      e.aircraft_label || '—',
      e.type || '—',
      fmtHours(e.performed_at_aircraft_hours),
      e.findings || '—',
      e.return_to_service ? 'Sí' : 'No',
    ]),
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    margin: { left: 10, right: 10 },
  });

  let y = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 32, 44);
  doc.text('EVENTOS INESPERADOS', 10, y);
  y += 3;
  autoTable(doc, {
    startY: y,
    head: [['FECHA REPORTE', 'AERONAVE', 'TIPO', 'DESCRIPCIÓN', 'EVALUADO', 'RESULTADO']],
    body: (unexpected || []).map((u) => [
      fmtDate(u.reported_at),
      u.aircraft_label || '—',
      u.type || '—',
      u.description || '—',
      u.evaluated ? 'Sí' : 'No',
      u.evaluation_result || '—',
    ]),
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    margin: { left: 10, right: 10 },
  });

  y = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 32, 44);
  doc.text('PROGRAMA DE MANTENIMIENTO POR MODELO (100.535(3))', 10, y);
  y += 3;
  autoTable(doc, {
    startY: y,
    head: [['MODELO', 'TAREA', 'SISTEMA', 'INTERVALO', 'TOLERANCIA']],
    body: (programs || []).map((t) => [t.model_label, t.name, t.system_category || '—', intervalLabel(t), t.tolerance_value != null ? `${t.tolerance_value} ${t.tolerance_unit || ''}`.trim() : '—']),
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    margin: { left: 10, right: 10 },
  });

  drawFooterNote(doc, periodLabel);
  doc.save(`mantenimiento-${slugify(orgName)}.pdf`);
}

export async function generateFleetReportPdf(aircraft, { orgName, logoUrl }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, title: 'Flota', subtitle: 'Instantánea (sin rango de fechas)' });
  autoTable(doc, {
    startY,
    head: [['SERIE', 'MODELO', 'RUAS', 'HORAS TOTALES', 'ESTADO', 'PROPIEDAD', 'REFERENCIA', 'FIRMWARE VIGENTE', 'FIRMWARE ANTERIOR', 'ACTUALIZADO']],
    body: (aircraft || []).map((a) => [
      a.serial_number || '—',
      a.model_label || '—',
      a.ruas_number || '—',
      fmtHours(a.total_hours),
      a.operational_status || '—',
      a.ownership_type || '—',
      a.ownership_reference || '—',
      a.firmware_version || '—',
      a.firmware_previous_version || '—',
      a.firmware_updated_at ? fmtDate(a.firmware_updated_at) : '—',
    ]),
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    margin: { left: 10, right: 10 },
  });
  drawFooterNote(doc, 'Instantánea (sin rango de fechas)');
  doc.save(`flota-${slugify(orgName)}.pdf`);
}

export async function generateBatteryReportPdf({ batteries, components }, { orgName, logoUrl }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, title: 'Baterías y Componentes', subtitle: 'Instantánea (sin rango de fechas)' });
  autoTable(doc, {
    startY,
    head: [['SERIE', 'MARCA', 'MODELO', 'CICLOS', 'SALUD', 'ESTADO']],
    body: (batteries || []).map((b) => [b.serial_number || '—', b.brand || '—', b.model || '—', b.cycles ?? '—', b.health_status || '—', b.status || '—']),
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    margin: { left: 10, right: 10 },
  });

  let y = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 32, 44);
  doc.text('COMPONENTES ACTIVOS', 10, y);
  y += 3;
  autoTable(doc, {
    startY: y,
    head: [['AERONAVE', 'TIPO', 'SERIE', 'INSTALADO', 'HORAS DE USO', 'ESTADO']],
    body: (components || []).map((c) => [c.aircraft_label || '—', c.component_type || '—', c.serial_number || '—', fmtDate(c.installed_at), fmtHours(c.used_hours), c.status || '—']),
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    margin: { left: 10, right: 10 },
  });

  drawFooterNote(doc, 'Instantánea (sin rango de fechas)');
  doc.save(`baterias-componentes-${slugify(orgName)}.pdf`);
}

export async function generateCrewReportPdf(members, { orgName, logoUrl }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, title: 'Expediente de Tripulación', subtitle: 'Instantánea (sin rango de fechas)' });
  autoTable(doc, {
    startY,
    head: [['NOMBRE', 'DOCUMENTO', 'ROL', 'LICENCIA', 'VENCIMIENTO CERT. MÉDICO', 'CORREO']],
    body: (members || []).map((m) => [
      m.full_name || '—',
      m.document_number ? `${m.document_type || ''} ${m.document_number}`.trim() : '—',
      m.role || '—',
      m.license_number || '—',
      m.medical_cert_expiry ? fmtDate(m.medical_cert_expiry) : '—',
      m.email || '—',
    ]),
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    margin: { left: 10, right: 10 },
  });
  drawFooterNote(doc, 'Instantánea (sin rango de fechas)');
  doc.save(`tripulacion-${slugify(orgName)}.pdf`);
}

export async function generateTrainingReportPdf({ evaluations, roster }, { orgName, logoUrl, typeLabel }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, title: 'Capacitación', subtitle: typeLabel });
  autoTable(doc, {
    startY,
    head: [['EVALUACIÓN', 'FECHA LÍMITE', 'NOTA MÍNIMA', 'INTENTOS PERMITIDOS']],
    body: (evaluations || []).map((e) => [e.title, fmtDate(e.due_date), `${e.passing_score}%`, e.max_attempts]),
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    margin: { left: 10, right: 10 },
  });

  let y = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(26, 32, 44);
  doc.text('CUMPLIMIENTO DEL EQUIPO', 10, y);
  y += 3;
  const STATUS_LABELS = { ok: 'Aprobado', pending: 'Pendiente', overdue: 'Vencido', failed: 'Reprobado', not_configured: 'Sin evaluaciones' };
  autoTable(doc, {
    startY: y,
    head: [['PERSONA', 'ESTADO ACTUAL']],
    body: (roster || []).map((r) => [r.fullName, STATUS_LABELS[r.compliance?.status] || '—']),
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    margin: { left: 10, right: 10 },
  });

  drawFooterNote(doc, typeLabel);
  doc.save(`capacitacion-${slugify(orgName)}.pdf`);
}

export async function generateSupplierAuditReportPdf(rows, { orgName, logoUrl, scopeLabel, periodLabel }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, title: 'Auditoría de Proveedores', subtitle: `${scopeLabel} — ${periodLabel}` });
  autoTable(doc, {
    startY,
    head: [['PROVEEDOR', 'CATEGORÍA', 'FECHA', 'AUDITOR', '% CUMPLIMIENTO', 'OBSERVACIONES']],
    body: (rows || []).map((r) => [r.supplier_name || '—', r.supplier_category || '—', fmtDate(r.audit_date), r.auditor_name || '—', r.percentage == null ? '—' : `${r.percentage}%`, r.overall_notes || '—']),
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    margin: { left: 10, right: 10 },
  });
  drawFooterNote(doc, periodLabel);
  doc.save(`auditoria-proveedores-${slugify(orgName)}.pdf`);
}

// RAC 100 §100.540 — registro diario de tiempos de servicio/descanso/
// disponibilidad/entrenamiento por piloto (obligación 100.535(10)-(11)).
export async function generateDutyReportPdf(periods, { orgName, logoUrl, periodLabel }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, title: 'Tiempos de Servicio', subtitle: periodLabel });
  const TYPE_LABELS = { servicio: 'Servicio', descanso: 'Descanso', disponibilidad: 'Disponibilidad', entrenamiento: 'Entrenamiento' };
  autoTable(doc, {
    startY,
    head: [['PERSONA', 'TIPO', 'INICIO', 'FIN', 'DURACIÓN (H)']],
    body: (periods || []).map((p) => {
      const hours = p.ended_at ? (new Date(p.ended_at) - new Date(p.started_at)) / 3_600_000 : null;
      return [p.person_name || '—', TYPE_LABELS[p.type] || p.type, fmtDateTime(p.started_at), p.ended_at ? fmtDateTime(p.ended_at) : 'En curso', fmtHours(hours)];
    }),
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    margin: { left: 10, right: 10 },
  });
  drawFooterNote(doc, periodLabel);
  doc.save(`tiempos-de-servicio-${slugify(orgName)}.pdf`);
}

// RAC 100 §100.535(24)-(25) — expediente por autorización + análisis de
// riesgos (MAUT-5.0-12-055) asociado a cada una.
export async function generateMissionsReportPdf(missions, { orgName, logoUrl, periodLabel }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, title: 'Programación y Autorizaciones', subtitle: periodLabel });
  autoTable(doc, {
    startY,
    head: [['MISIÓN', 'FECHA PROGRAMADA', 'PIC', 'AERONAVE', 'ZONA', 'LÍNEA DE VISTA', 'RADICADO', 'ESTADO AUTORIZACIÓN', 'ANÁLISIS DE RIESGOS']],
    body: (missions || []).map((m) => [
      m.name || '—',
      fmtDateTime(m.scheduled_at),
      m.pic_name || '—',
      m.aircraft_label || '—',
      m.zone || '—',
      m.line_of_sight || '—',
      m.radicado_number || '—',
      m.authorization_status || 'Sin autorización asociada',
      m.risk_signed ? 'Firmado' : m.has_risk_analysis ? 'Sin firmar' : 'Sin análisis',
    ]),
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    margin: { left: 10, right: 10 },
  });
  drawFooterNote(doc, periodLabel);
  doc.save(`programacion-autorizaciones-${slugify(orgName)}.pdf`);
}

// RAC 100 Apéndice 1 §2.1 — Equipo Tecnológico Asociado, con número RETA.
export async function generateEtaReportPdf(items, { orgName, logoUrl }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, title: 'Equipo Tecnológico Asociado (ETA)', subtitle: 'Instantánea (sin rango de fechas)' });
  autoTable(doc, {
    startY,
    head: [['MARCA', 'MODELO', 'N.º RETA', 'DESCRIPCIÓN FUNCIONAL']],
    body: (items || []).map((i) => [i.brand || '—', i.model || '—', i.reta_number || '—', i.description || '—']),
    styles: TABLE_STYLES,
    headStyles: HEAD_STYLES,
    margin: { left: 10, right: 10 },
  });
  drawFooterNote(doc, 'Instantánea (sin rango de fechas)');
  doc.save(`eta-${slugify(orgName)}.pdf`);
}
