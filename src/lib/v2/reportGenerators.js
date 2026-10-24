// Skylog V2.0 — Reportes: generadores de PDF, uno por formato. Todos se
// generan 100% client-side al momento de descargar (mismo criterio que
// v1: nunca se persiste el archivo) y usan `pdfCommon.js` para el
// encabezado/logo/nota de trazabilidad compartidos. Solo cubre datos
// 100% reales de V2 (flights/aircraft/batteries/mantenimiento/
// tripulación/capacitación/proveedores) — nada de SPI/GAP/manuales/VOR-MOR
// todavía, porque esas piezas no existen en V2 (documentado en la
// bitácora, no fabricado aquí).
import autoTable from 'jspdf-autotable';
import { HEAD_STYLES, resolveLogo, fetchBitaflyLogo, addLogo, drawReportHeader, drawFooterNote, slugify, dominantLogoColor, formPalette } from './pdfCommon';

const TABLE_STYLES = { fontSize: 7, cellPadding: 1.3, lineColor: [220, 220, 220], lineWidth: 0.1 };

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

// ── Formato por casillas (Libro de Vuelo y Libro de UAS) ─────────────────────────────────────────────────────────
// Hoja horizontal con encabezado (logo + NIT | título | código/versión/fecha) y secciones de casillas. Lo que el
// sistema no registra queda en blanco para diligenciarlo a mano.
const FORM_L = 10;
const FORM_W = 277;
function createFormKit(doc, { logo, nit, title, format, palette }) {
  const { accent, ink, tint, line } = palette;
  const today = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const kit = { y: 10 };
  doc.setDrawColor(...line);
  doc.setLineWidth(0.3);
  doc.setTextColor(...ink);

  kit.header = () => {
    const y = kit.y;
    doc.rect(FORM_L, y, 100, 24);
    doc.rect(FORM_L + 100, y, 120, 24);
    doc.setFillColor(...tint);
    const version = format?.version || '1.0';
    const boxes = format?.code ? [`CÓDIGO: ${format.code}`, `VERSIÓN: ${version}`, `FECHA: ${today}`] : [`VERSIÓN: ${version}`, `FECHA: ${today}`];
    const bh = 24 / boxes.length;
    boxes.forEach((_, i) => doc.rect(FORM_L + 220, y + i * bh, 57, bh, 'FD'));
    addLogo(doc, logo, FORM_L + 3, y + 2, 94, 17);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    if (nit) doc.text(nit, FORM_L + 50, y + 22.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, FORM_L + 160, y + 13.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    boxes.forEach((t, i) => doc.text(t, FORM_L + 248.5, y + i * bh + bh / 2 + 1.2, { align: 'center', maxWidth: 55 }));
    doc.setFillColor(...accent);
    doc.rect(FORM_L, y + 24, FORM_W, 1, 'F');
    kit.y += 25;
  };

  kit.section = (name) => {
    doc.setFillColor(...tint);
    doc.rect(FORM_L, kit.y, FORM_W, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...accent);
    doc.text(name, FORM_L + FORM_W / 2, kit.y + 4.3, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...ink);
    kit.y += 6;
  };

  // cols = [{ w, label }]; values = textos de la fila de abajo (0 se dibuja, vacío no).
  kit.row = (cols, values) => {
    const labelH = 6;
    const valueH = 6;
    let x = FORM_L;
    cols.forEach((c, i) => {
      doc.setFillColor(...tint);
      doc.rect(x, kit.y, c.w, labelH, 'FD');
      doc.rect(x, kit.y + labelH, c.w, valueH);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(c.label, x + c.w / 2, kit.y + labelH / 2 + 1.1, { align: 'center', maxWidth: c.w - 2 });
      const v = values[i];
      if (v !== undefined && v !== null && v !== '') doc.text(String(v), x + c.w / 2, kit.y + labelH + valueH / 2 + 1.2, { align: 'center', maxWidth: c.w - 2 });
      x += c.w;
    });
    kit.y += labelH + valueH;
  };

  kit.box = (text, h = 28) => {
    doc.rect(FORM_L, kit.y, FORM_W, h);
    if (text) {
      doc.setFontSize(8);
      doc.text(String(text), FORM_L + 2, kit.y + 5, { maxWidth: FORM_W - 4 });
    }
    kit.y += h;
  };

  // Fila de captura (solo casillas de valor) para llenar a mano.
  kit.valueRow = (widths, values, h = 8) => {
    let x = FORM_L;
    widths.forEach((w, i) => {
      doc.rect(x, kit.y, w, h);
      if (values[i] !== undefined && values[i] !== null && values[i] !== '') doc.text(String(values[i]), x + w / 2, kit.y + h / 2 + 1.2, { align: 'center', maxWidth: w - 2 });
      x += w;
    });
    kit.y += h;
  };

  kit.footnote = (text) => {
    doc.setFontSize(6.5);
    doc.setTextColor(110);
    doc.text(text, FORM_L, kit.y + 5);
    doc.setTextColor(...ink);
  };
  return kit;
}

const hoursLabel = (h, digits = 1) => (h != null && h !== '' ? `${Number(h).toFixed(digits)} h` : '');
const statusLabel = (st) => (st === 'disponible' || st === 'operativa' ? 'Activa' : st ? 'Inactiva' : '');

// Libro de Vuelo: un formato por vuelo (una hoja). Sin vuelos sale en blanco con los totales en 0 (con los datos de
// la aeronave si `extra.aircraft` viene).
export async function generateFlightLogPdf(flights, { orgName, logoUrl, periodLabel, format, extra = {} }) {
  const { jsPDF } = await import('jspdf');
  const logo = (await resolveLogo(logoUrl)) || (await fetchBitaflyLogo());
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const nit = extra.org?.nit ? `NIT: ${extra.org.nit}` : '';
  const fmt = format || extra.format;
  const empty = !flights || !flights.length;
  const list = empty ? [{}] : flights;
  const palette = formPalette(await dominantLogoColor(logo));

  list.slice().reverse().forEach((f, idx) => {
    if (idx > 0) doc.addPage();
    const kit = createFormKit(doc, { logo, nit, title: 'LIBRO DE VUELO', format: fmt, palette });
    kit.header();

    // Sin vuelos pero con una aeronave elegida: el formato sale con los datos de esa aeronave.
    const ac = f.aircraft || extra.aircraft || {};
    const acId = f.aircraft_id || extra.aircraft?.id;
    const model = ac.model || {};
    const pilot = f.pilot || {};
    const tk = f.takeoff_at ? new Date(f.takeoff_at) : null;
    const ld = f.landing_at ? new Date(f.landing_at) : null;
    const hm = (d) => (d ? d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Bogota' }) : '');
    const cycles = (extra.cycles || []).filter((c) => c.aircraft_id === acId && (!tk || new Date(c.takeoff_at) <= tk)).length;
    const events = (extra.maintenance || []).filter((e) => e.aircraft_id === acId && (!tk || new Date(e.performed_at) <= tk));
    const major = events.find((e) => e.type !== 'menor');
    const minor = events.find((e) => e.type === 'menor');
    const hourOfDay = tk ? Number(tk.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'America/Bogota' })) % 24 : null;
    const schedule = hourOfDay == null ? '' : hourOfDay >= 6 && hourOfDay < 18 ? 'Diurno' : 'Nocturno';
    const dur = empty ? '0 h' : hoursLabel(f.total_time, 2);

    kit.section('AERONAVE');
    kit.row([{ w: 55, label: 'Marca' }, { w: 55, label: 'Modelo' }, { w: 55, label: 'Fabricante' }, { w: 56, label: 'Número de serie' }, { w: 56, label: 'RUAS' }], [model.brand, model.model, model.brand, ac.serial_number, ac.ruas_number]);
    kit.row(
      [{ w: 55, label: 'Ciclos/Aterrizajes' }, { w: 55, label: 'Horas de inicio del UA' }, { w: 55, label: 'Estado actual de la aeronave' }, { w: 56, label: 'Tiempo total del UA' }, { w: 56, label: 'Horas TT motores' }],
      [empty && !acId ? 0 : cycles, '', statusLabel(ac.operational_status), hoursLabel(ac.total_hours) || (empty ? '0 h' : ''), empty ? '0 h' : '']
    );

    kit.section('OPERACIÓN');
    kit.row([{ w: 92, label: 'Lugar de la operación' }, { w: 92, label: 'Tipo de operación' }, { w: 93, label: 'Tipo de condición visual' }], [f.location, f.mission_type, f.visual_condition]);
    kit.row([{ w: 69, label: 'Horario' }, { w: 69, label: 'Hora de despegue / inicio op' }, { w: 69, label: 'Hora de aterrizaje / fin op' }, { w: 70, label: 'Tiempo total de la operación' }], [schedule, hm(tk), hm(ld), dur]);

    kit.section('PILOTO UAS');
    kit.row([{ w: 110, label: 'Nombre' }, { w: 60, label: 'Tipo de documento' }, { w: 60, label: 'Número de documento' }, { w: 47, label: 'CIPU' }], [pilot.full_name, pilot.document_type, pilot.document_number, pilot.license_number]);

    kit.section('MANTENIMIENTO MAYOR');
    kit.row([{ w: 69, label: 'Fecha del último mantenimiento' }, { w: 69, label: 'Nombre del proveedor de mantenimiento' }, { w: 69, label: 'Horas TT del UA' }, { w: 70, label: 'Fecha del próximo mantenimiento' }], [major ? fmtDate(major.performed_at) : '', major?.performer?.full_name, major?.performed_at_aircraft_hours != null ? `${major.performed_at_aircraft_hours} h` : '', '']);

    kit.section('MANTENIMIENTO MENOR REALIZADO');
    kit.row([{ w: 69, label: 'Fecha del último mantenimiento' }, { w: 138, label: 'Nombre Piloto UAS' }, { w: 70, label: 'CIPU' }], [minor ? fmtDate(minor.performed_at) : '', minor?.performer?.full_name, minor?.performer?.license_number]);

    kit.section('OBSERVACIONES');
    kit.box(f.notes);
    kit.footnote(`${periodLabel ? `Periodo: ${periodLabel} · ` : ''}Generado el ${new Date().toLocaleString('es-CO')} · Creado con BITAFLY`);
  });

  doc.save(`libro-de-vuelo-${slugify(orgName)}.pdf`);
}

// Bitácora de Vuelo del Piloto UAS (resumen): una hoja por piloto con sus horas totales, por aeronave y por línea de vista.
// `pilots` lo arma /api/reportes/bitacora-piloto. Sin pilotos sale una hoja en blanco con los totales en 0.
export async function generatePilotSummaryPdf(pilots, { orgName, logoUrl, periodLabel, format, org }) {
  const { jsPDF } = await import('jspdf');
  const logo = (await resolveLogo(logoUrl)) || (await fetchBitaflyLogo());
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const nit = org?.nit ? `NIT: ${org.nit}` : '';
  const list = pilots && pilots.length ? pilots : [{ person: {}, flights: 0, hours: 0, los: {}, aircraft: [] }];
  const palette = formPalette(await dominantLogoColor(logo));
  const h2 = (h) => hoursLabel(h || 0, 2);

  list.forEach((p, idx) => {
    if (idx > 0) doc.addPage();
    const kit = createFormKit(doc, { logo, nit, title: 'BITÁCORA DE VUELO DEL PILOTO UAS', format, palette });
    kit.header();
    const person = p.person || {};
    const docType = String(person.document_type || '').toUpperCase();
    const mark = (re) => (re.test(docType) ? 'X' : '');
    const los = p.los || {};

    kit.section('INFORMACIÓN DEL PILOTO UAS');
    kit.row(
      [{ w: 100, label: 'Nombre' }, { w: 25, label: 'CC' }, { w: 25, label: 'CE' }, { w: 30, label: 'PASAPORTE' }, { w: 50, label: 'Número de documento' }, { w: 47, label: 'CIPU' }],
      [person.full_name, mark(/^(CC|CEDULA|CÉDULA)/), mark(/^(CE|EXTRANJER)/), mark(/PASAPORTE|^PA$/), person.document_number, person.license_number]
    );

    kit.section('RESUMEN DE HORAS VOLADAS');
    kit.row(
      [{ w: 69, label: 'Horas totales voladas' }, { w: 69, label: 'Vuelos realizados' }, { w: 139, label: 'Periodo' }],
      [h2(p.hours), p.flights || 0, periodLabel || 'Todo el historial']
    );

    kit.section('HORAS POR TIPO DE VISIÓN');
    kit.row(
      [{ w: 69, label: 'VLOS (línea de vista visual)' }, { w: 69, label: 'EVLOS (línea de vista extendida)' }, { w: 69, label: 'BVLOS (más allá de la línea de vista)' }, { w: 70, label: 'Sin clasificar' }],
      [h2(los.VLOS), h2(los.EVLOS), h2(los.BVLOS), h2(los.other)]
    );

    kit.section('HORAS POR AERONAVE (UAS)');
    const body = (p.aircraft || []).map((a) => [a.serial, a.ruas || '', a.model || '', a.flights, h2(a.hours)]);
    autoTable(doc, {
      startY: kit.y,
      margin: { left: FORM_L, right: 297 - FORM_L - FORM_W, top: 10, bottom: 14 },
      head: [['Número de serie', 'RUAS', 'Marca y modelo', 'Vuelos', 'Horas voladas']],
      body: body.length ? body : [['', '', '', '0', '0.00 h']],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 1.8, lineColor: palette.line, lineWidth: 0.3, textColor: palette.ink },
      headStyles: { fillColor: palette.tint, textColor: palette.accent, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { halign: 'center' },
      foot: body.length ? [['', '', 'Total', p.flights || 0, h2(p.hours)]] : undefined,
      footStyles: { fillColor: palette.tint, textColor: palette.ink, fontStyle: 'bold', halign: 'center' },
    });
    const y = (doc.lastAutoTable?.finalY || kit.y) + 6;
    doc.setFontSize(6.5);
    doc.setTextColor(110);
    doc.text(`${periodLabel ? `Periodo: ${periodLabel} · ` : ''}Generado el ${new Date().toLocaleString('es-CO')} · Creado con BITAFLY`, FORM_L, Math.min(y, 205));
    doc.setTextColor(...palette.ink);
  });

  doc.save(`bitacora-de-vuelo-piloto-${slugify(orgName)}.pdf`);
}

// Libro de UAS: una hoja por aeronave con los totales acumulados (vuelos, horas, ciclos) y el estado de mantenimiento.
// `units` = [{ aircraft, flights: { count, hours, first, last }, major, minor }] — lo arma /api/reportes/uas.
export async function generateUasBookPdf(units, { orgName, logoUrl, format, org }) {
  const { jsPDF } = await import('jspdf');
  const logo = (await resolveLogo(logoUrl)) || (await fetchBitaflyLogo());
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const nit = org?.nit ? `NIT: ${org.nit}` : '';
  const list = units && units.length ? units : [{ aircraft: {}, flights: {}, major: null, minor: null }];

  const palette = formPalette(await dominantLogoColor(logo));
  list.forEach((u, idx) => {
    if (idx > 0) doc.addPage();
    const kit = createFormKit(doc, { logo, nit, title: 'LIBRO DE UAS', format, palette });
    kit.header();
    const ac = u.aircraft || {};
    const model = ac.model || {};
    const fl = u.flights || {};

    kit.section('AERONAVE');
    kit.row([{ w: 55, label: 'Marca' }, { w: 55, label: 'Modelo' }, { w: 55, label: 'Fabricante' }, { w: 56, label: 'Número de serie' }, { w: 56, label: 'RUAS' }], [model.brand, model.model, model.brand, ac.serial_number, ac.ruas_number]);
    kit.row(
      [{ w: 69, label: 'Estado actual de la aeronave' }, { w: 69, label: 'Horas de inicio del UA' }, { w: 69, label: 'Tiempo total del UA' }, { w: 70, label: 'Horas TT motores' }],
      [statusLabel(ac.operational_status), '', hoursLabel(ac.total_hours) || '0 h', '']
    );

    kit.section('TOTALES DE OPERACIÓN');
    kit.row(
      [{ w: 69, label: 'Vuelos registrados' }, { w: 69, label: 'Ciclos/Aterrizajes' }, { w: 69, label: 'Horas de vuelo registradas' }, { w: 70, label: 'Último vuelo' }],
      [fl.count || 0, fl.count || 0, hoursLabel(fl.hours, 2) || '0 h', fl.last ? fmtDate(fl.last) : '']
    );
    kit.row([{ w: 92, label: 'Primer vuelo registrado' }, { w: 92, label: 'Último piloto' }, { w: 93, label: 'Última condición visual' }], [fl.first ? fmtDate(fl.first) : '', fl.lastPilot, fl.lastCondition]);

    kit.section('MANTENIMIENTO MAYOR');
    kit.row(
      [{ w: 69, label: 'Fecha del último mantenimiento' }, { w: 69, label: 'Nombre del proveedor de mantenimiento' }, { w: 69, label: 'Horas TT del UA' }, { w: 70, label: 'Fecha del próximo mantenimiento' }],
      [u.major ? fmtDate(u.major.performed_at) : '', u.major?.performer?.full_name, u.major?.performed_at_aircraft_hours != null ? `${u.major.performed_at_aircraft_hours} h` : '', '']
    );

    kit.section('MANTENIMIENTO MENOR REALIZADO');
    kit.row([{ w: 69, label: 'Fecha del último mantenimiento' }, { w: 138, label: 'Nombre Piloto UAS' }, { w: 70, label: 'CIPU' }], [u.minor ? fmtDate(u.minor.performed_at) : '', u.minor?.performer?.full_name, u.minor?.performer?.license_number]);

    kit.section('OBSERVACIONES');
    kit.box('');
    kit.footnote(`Totales acumulados a la fecha · Generado el ${new Date().toLocaleString('es-CO')} · Creado con BITAFLY`);
  });

  doc.save(`libro-de-uas-${slugify(orgName)}.pdf`);
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

// Control de Baterías: una hoja por batería (serie, marca, modelo) con el estado vigente en la primera fila del registro
// de uso (ciclos y condición reales) y filas en blanco para anotar cada uso. Sin baterías sale una hoja en blanco.
export async function generateBatteryReportPdf({ batteries, org }, { orgName, logoUrl, format }) {
  const { jsPDF } = await import('jspdf');
  const logo = (await resolveLogo(logoUrl)) || (await fetchBitaflyLogo());
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const nit = org?.nit ? `NIT: ${org.nit}` : '';
  const palette = formPalette(await dominantLogoColor(logo));
  const list = batteries && batteries.length ? batteries : [{}];
  const today = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

  list.forEach((b, idx) => {
    if (idx > 0) doc.addPage();
    const kit = createFormKit(doc, { logo, nit, title: 'CONTROL DE BATERÍAS', format, palette });
    kit.header();
    kit.row([{ w: 40, label: 'BATERÍA' }, { w: 60, label: 'MARCA' }, { w: 70, label: 'MODELO' }, { w: 107, label: 'NÚMERO DE SERIE' }], [b.serial_number ? idx + 1 : '', b.brand, b.model, b.serial_number]);
    const cols = [{ w: 45, label: 'Fecha' }, { w: 40, label: 'Ciclos' }, { w: 40, label: 'Carga' }, { w: 45, label: 'Condición' }, { w: 60, label: 'Piloto UAS' }, { w: 47, label: 'CIPU' }];
    kit.row(cols, b.serial_number ? [today, b.cycles ?? '', '', b.health_status, '', ''] : []);
    for (let i = 0; i < 6; i += 1) kit.valueRow(cols.map((c) => c.w), []);
    kit.section('OBSERVACIONES');
    kit.box(b.status ? `Estado de la batería: ${b.status}` : '', 22);
    kit.footnote(`Estado a la fecha de descarga · Generado el ${new Date().toLocaleString('es-CO')} · Creado con BITAFLY`);
  });

  doc.save(`control-de-baterias-${slugify(orgName)}.pdf`);
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
