// Skylog V2.0 — Reportes: generadores de PDF, uno por formato. Todos se
// generan 100% client-side al momento de descargar (mismo criterio que
// v1: nunca se persiste el archivo) y usan `pdfCommon.js` para el
// encabezado/logo/nota de trazabilidad compartidos. Solo cubre datos
// 100% reales de V2 (flights/aircraft/batteries/mantenimiento/
// tripulación/capacitación/proveedores) — nada de SPI/GAP/manuales/VOR-MOR
// todavía, porque esas piezas no existen en V2 (documentado en la
// bitácora, no fabricado aquí).
import autoTable from 'jspdf-autotable';
import { SPEC_FIELDS, computeSpecCompleteness, formatSpecValue } from '@skylog/domain';
import { resolveLogo, fetchBitaflyLogo, addLogo, drawReportHeader, drawFooterNote, slugify } from './pdfCommon';

const TABLE_STYLES = { fontSize: 7, cellPadding: 1.3, lineColor: [220, 220, 220], lineWidth: 0.1 };
const HEAD_STYLES = { fillColor: [26, 32, 44], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' };

async function baseDoc({ orgName, logoUrl, title, subtitle, format }) {
  const { jsPDF } = await import('jspdf');
  const logo = (await resolveLogo(logoUrl)) || (await fetchBitaflyLogo());
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const startY = drawReportHeader(doc, { logo, orgName, title, subtitle, format });
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

// Libro de Vuelo: un formato por vuelo (una hoja horizontal), con las casillas del formato oficial de la
// organización. Lo que el sistema no registra (horas de cada motor, horas de inicio del UA, próximo mantenimiento)
// queda como casilla en blanco para diligenciar a mano.
export async function generateFlightLogPdf(flights, { orgName, logoUrl, periodLabel, format, extra = {} }) {
  const { jsPDF } = await import('jspdf');
  const logo = (await resolveLogo(logoUrl)) || (await fetchBitaflyLogo());
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const L = 10;
  const W = 277;
  const nit = extra.org?.nit ? `NIT: ${extra.org.nit}` : '';
  const today = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  // Sin vuelos el formato sale igual, en blanco y con los totales en 0.
  const empty = !flights || !flights.length;
  const list = empty ? [{}] : flights;

  list.slice().reverse().forEach((f, idx) => {
    if (idx > 0) doc.addPage();
    let y = 10;
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);

    // Dibuja una fila de casillas: cols = [{ w, label }] y valores en la fila de abajo.
    const row = (cols, values, { labelH = 6, valueH = 6, labelSize = 8, valueSize = 8 } = {}) => {
      let x = L;
      cols.forEach((c, i) => {
        doc.rect(x, y, c.w, labelH);
        doc.rect(x, y + labelH, c.w, valueH);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(labelSize);
        doc.text(c.label, x + c.w / 2, y + labelH / 2 + 1.1, { align: 'center', maxWidth: c.w - 2 });
        doc.setFontSize(valueSize);
        const v = values[i];
        if (v !== undefined && v !== null && v !== '') doc.text(String(v), x + c.w / 2, y + labelH + valueH / 2 + 1.2, { align: 'center', maxWidth: c.w - 2 });
        x += c.w;
      });
      y += labelH + valueH;
    };
    const section = (title) => {
      doc.setFillColor(238, 238, 232);
      doc.rect(L, y, W, 6, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(title, L + W / 2, y + 4.3, { align: 'center' });
      y += 6;
    };

    // Encabezado: logo + NIT | título | versión / fecha
    doc.rect(L, y, 100, 24);
    doc.rect(L + 100, y, 120, 24);
    const version = format?.version || '1.0';
    const boxes = format?.code ? [`CÓDIGO: ${format.code}`, `VERSIÓN: ${version}`, `FECHA: ${today}`] : [`VERSIÓN: ${version}`, `FECHA: ${today}`];
    const bh = 24 / boxes.length;
    boxes.forEach((t, i) => {
      doc.rect(L + 220, y + i * bh, 57, bh);
    });
    addLogo(doc, logo, L + 3, y + 2, 94, 17);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    if (nit) doc.text(nit, L + 50, y + 22.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.text('LIBRO DE VUELO', L + 160, y + 13.5, { align: 'center' });
    doc.setFontSize(9);
    boxes.forEach((t, i) => doc.text(t, L + 248.5, y + i * bh + bh / 2 + 1.2, { align: 'center', maxWidth: 55 }));
    y += 24;

    const ac = f.aircraft || {};
    const model = ac.model || {};
    const pilot = f.pilot || {};
    const tk = f.takeoff_at ? new Date(f.takeoff_at) : null;
    const ld = f.landing_at ? new Date(f.landing_at) : null;
    const hm = (d) => (d ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' }) : '');
    const cycles = (extra.cycles || []).filter((c) => c.aircraft_id === f.aircraft_id && (!tk || new Date(c.takeoff_at) <= tk)).length;
    const events = (extra.maintenance || []).filter((e) => e.aircraft_id === f.aircraft_id && (!tk || new Date(e.performed_at) <= tk));
    const major = events.find((e) => e.type !== 'menor');
    const minor = events.find((e) => e.type === 'menor');
    const hourOfDay = tk ? Number(tk.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Bogota' })) % 24 : null;
    const schedule = hourOfDay == null ? '' : hourOfDay >= 6 && hourOfDay < 18 ? 'Diurno' : 'Nocturno';
    const dur = empty ? '0 h' : f.total_time != null ? `${Number(f.total_time).toFixed(2)} h` : '';
    const status = ac.operational_status === 'disponible' || ac.operational_status === 'operativa' ? 'Activa' : ac.operational_status ? 'Inactiva' : '';

    section('AERONAVE');
    row([{ w: 55, label: 'Marca' }, { w: 55, label: 'Modelo' }, { w: 55, label: 'Fabricante' }, { w: 56, label: 'Número de serie' }, { w: 56, label: 'RUAS' }], [model.brand, model.model, model.brand, ac.serial_number, ac.ruas_number]);
    row([{ w: 55, label: 'Ciclos/Aterrizajes' }, { w: 55, label: 'Horas de inicio del UA' }, { w: 55, label: 'Estado actual de la aeronave' }, { w: 56, label: 'Tiempo total del UA' }, { w: 56, label: 'Horas TT motores' }], [empty ? 0 : cycles || '', '', status, empty ? '0 h' : ac.total_hours != null ? `${Number(ac.total_hours).toFixed(1)} h` : '', empty ? '0 h' : '']);

    section('OPERACIÓN');
    row([{ w: 92, label: 'Lugar de la operación' }, { w: 92, label: 'Tipo de operación' }, { w: 93, label: 'Tipo de condición visual' }], [f.location, f.mission_type, f.visual_condition]);
    row([{ w: 69, label: 'Horario' }, { w: 69, label: 'Hora de despegue / inicio op' }, { w: 69, label: 'Hora de aterrizaje / fin op' }, { w: 70, label: 'Tiempo total de la operación' }], [schedule, hm(tk), hm(ld), dur]);

    section('PILOTO UAS');
    row([{ w: 110, label: 'Nombre' }, { w: 60, label: 'Tipo de documento' }, { w: 60, label: 'Número de documento' }, { w: 47, label: 'CIPU' }], [pilot.full_name, pilot.document_type, pilot.document_number, pilot.license_number]);

    section('MANTENIMIENTO MAYOR');
    row([{ w: 69, label: 'Fecha del último mantenimiento' }, { w: 69, label: 'Nombre del proveedor de mantenimiento' }, { w: 69, label: 'Horas TT del UA' }, { w: 70, label: 'Fecha del próximo mantenimiento' }], [major ? fmtDate(major.performed_at) : '', major?.performer?.full_name, major?.performed_at_aircraft_hours != null ? `${major.performed_at_aircraft_hours} h` : '', '']);

    section('MANTENIMIENTO MENOR REALIZADO');
    row([{ w: 69, label: 'Fecha del último mantenimiento' }, { w: 138, label: 'Nombre Piloto UAS' }, { w: 70, label: 'CIPU' }], [minor ? fmtDate(minor.performed_at) : '', minor?.performer?.full_name, minor?.performer?.license_number]);

    section('OBSERVACIONES');
    doc.rect(L, y, W, 28);
    if (f.notes) {
      doc.setFontSize(8);
      doc.text(String(f.notes), L + 2, y + 5, { maxWidth: W - 4 });
    }
    y += 28;

    doc.setFontSize(6.5);
    doc.setTextColor(110);
    doc.text(`Periodo: ${periodLabel} · Generado el ${new Date().toLocaleString('es-CO')} · ${orgName || ''}`, L, y + 5);
    doc.setTextColor(0);
  });

  doc.save(`libro-de-vuelo-${slugify(orgName)}.pdf`);
}

function intervalLabel(t) {
  const parts = [];
  if (t.interval_cycles != null) parts.push(`${t.interval_cycles} ciclos`);
  if (t.interval_hours != null) parts.push(`${t.interval_hours} h`);
  if (t.interval_calendar_days != null) parts.push(`${t.interval_calendar_days} días`);
  return parts.join(' · ') || '—';
}

export async function generateMaintenanceReportPdf({ events, unexpected, programs }, { orgName, logoUrl, periodLabel, format }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, format, title: 'Mantenimiento', subtitle: periodLabel });
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

export async function generateFleetReportPdf(aircraft, { orgName, logoUrl, models = [], format }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, format, title: 'Flota', subtitle: 'Instantánea (sin rango de fechas)' });
  autoTable(doc, {
    startY,
    head: [['SERIE', 'MODELO', 'RUAS', 'PESO REAL', 'HORAS TOTALES', 'ESTADO', 'PROPIEDAD', 'REFERENCIA', 'FIRMWARE VIGENTE', 'FIRMWARE ANTERIOR', 'ACTUALIZADO']],
    body: (aircraft || []).map((a) => [
      a.serial_number || '—',
      a.model_label || '—',
      a.ruas_number || '—',
      a.actual_weight_kg != null ? `${a.actual_weight_kg} kg` : '—',
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
  // Ficha técnica por modelo (RAC 100 Apéndice 1, Parte B).
  for (const m of models) {
    const c = computeSpecCompleteness(m);
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 32, 44);
    doc.text(`FICHA TÉCNICA — ${m.brand} ${m.model}`, 10, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Apéndice 1 Parte B · ${c.filled} de ${c.total} atributos registrados`, 10, 21);
    autoTable(doc, {
      startY: 25,
      head: [['GRUPO', 'ATRIBUTO', 'VALOR']],
      body: SPEC_FIELDS.map((f) => [f.group, f.label, formatSpecValue(f, m[f.key])]),
      styles: TABLE_STYLES,
      headStyles: HEAD_STYLES,
      columnStyles: { 0: { cellWidth: 35 }, 1: { cellWidth: 75 } },
      margin: { left: 10, right: 10 },
    });
  }
  drawFooterNote(doc, 'Instantánea (sin rango de fechas)');
  doc.save(`flota-${slugify(orgName)}.pdf`);
}

export async function generateBatteryReportPdf({ batteries, components }, { orgName, logoUrl, format }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, format, title: 'Baterías y Componentes', subtitle: 'Instantánea (sin rango de fechas)' });
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

export async function generateCrewReportPdf(members, { orgName, logoUrl, format }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, format, title: 'Expediente de Tripulación', subtitle: 'Instantánea (sin rango de fechas)' });
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

export async function generateTrainingReportPdf({ evaluations, roster }, { orgName, logoUrl, typeLabel, format }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, format, title: 'Capacitación', subtitle: typeLabel });
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

export async function generateSupplierAuditReportPdf(rows, { orgName, logoUrl, scopeLabel, periodLabel, format }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, format, title: 'Auditoría de Proveedores', subtitle: `${scopeLabel} — ${periodLabel}` });
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
export async function generateDutyReportPdf(periods, { orgName, logoUrl, periodLabel, format }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, format, title: 'Tiempos de Servicio', subtitle: periodLabel });
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
export async function generateMissionsReportPdf(missions, { orgName, logoUrl, periodLabel, format }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, format, title: 'Programación y Autorizaciones', subtitle: periodLabel });
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
export async function generateEtaReportPdf(items, { orgName, logoUrl, format }) {
  const { doc, startY } = await baseDoc({ orgName, logoUrl, format, title: 'Equipo Tecnológico Asociado (ETA)', subtitle: 'Instantánea (sin rango de fechas)' });
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
