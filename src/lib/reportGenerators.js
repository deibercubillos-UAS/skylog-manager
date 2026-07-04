import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { docPath } from '@/lib/docUrl';
import { computeRate, computeYearStats, suggestedTarget, DEFENSE_TYPE_LABELS, ACTION_STATUS_LABELS, MONTH_LABELS } from '@/lib/safetyIndicatorStats';

const cleanText = (val) => val ? String(val).toUpperCase() : '';

// Link de apertura segura (absoluto) para incrustar en el PDF — resuelve a una
// signed URL fresca vía /api/documents/open. Bucket `documents` privado.
const docLink = (stored) => {
  const p = docPath(stored);
  if (!p) return '';
  const origin = (typeof window !== 'undefined' && window.location?.origin)
    || process.env.NEXT_PUBLIC_SITE_URL || 'https://bitafly.com';
  return `${origin}/api/documents/open?path=${encodeURIComponent(p)}`;
};

// Devuelve doc.lastAutoTable.finalY de forma segura (evita crash con datos vacíos o tabla no renderizada)
const safeAutoTableY = (doc, fallback = 40) => doc.lastAutoTable?.finalY ?? fallback;

// Inserta el logo ya resuelto — `logo` es { dataUrl, format, width, height } (ver
// fetchLogoDataUrl en lib/docUrl.js), NUNCA la URL/path crudo: jsPDF.addImage() no
// puede descargar una URL remota, necesita los bytes ya cargados como base64.
// Ajusta el logo dentro de la caja (x,y,w,h) preservando su relación de aspecto
// ("contain", centrado) — pasarle w/h directo a addImage lo estira y deforma.
const addLogo = (doc, logo, x, y, w, h) => {
    if (!logo?.dataUrl) return;
    try {
        let drawW = w, drawH = h, drawX = x, drawY = y;
        if (logo.width && logo.height) {
            const scale = Math.min(w / logo.width, h / logo.height);
            drawW = logo.width * scale;
            drawH = logo.height * scale;
            drawX = x + (w - drawW) / 2;
            drawY = y + (h - drawH) / 2;
        }
        doc.addImage(logo.dataUrl, logo.format || 'PNG', drawX, drawY, drawW, drawH);
    } catch (e) { /* logo inválido — se omite sin romper el PDF */ }
};

// Nota de trazabilidad exigida en todos los formatos: lapso de la información
// mostrada + fecha/hora real de descarga, justo antes del bloque de firmas.
const addFooterNote = (doc, startY, { rangeLabel, downloadedAt } = {}) => {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`Periodo de la información: ${rangeLabel || 'N/A'}`, 12, startY);
    doc.text(`Descargado el: ${downloadedAt || '---'}`, 12, startY + 4);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
};

const toGMS = (dec) => {
    const d = Math.abs(dec);
    const deg = Math.floor(d);
    const min = Math.floor((d - deg) * 60);
    const sec = Math.round((d - deg - min / 60) * 3600);
    return `${deg}°${min}'${sec}"`;
};

// --- 1. GENERADOR: FORMATO MASTER DE VUELO ---
export const generateMasterReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logo, version, reportDate, formCode, aircraftLabel, rangeLabel, downloadedAt } = config;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25);

    doc.line(65, 10, 65, 35);
    doc.line(225, 10, 225, 35);
    doc.line(65, 22.5, 225, 22.5);

    addLogo(doc, logo, 15, 12, 45, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 145, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text("LIBRO DE VUELO", 145, 27, { align: 'center' });
    doc.setFontSize(8);
    doc.text(aircraftLabel ? `AERONAVE(S): ${aircraftLabel.toUpperCase()}` : "TODAS LAS AERONAVES", 145, 33, { align: 'center' });

    doc.setFontSize(7);
    doc.line(225, 18, 287, 18);
    doc.line(225, 26, 287, 26);
    doc.text(`VERSIÓN: ${version || '1.0'}`, 227, 15);
    doc.text(`FECHA: ${reportDate || '---'}`, 227, 23);
    doc.text(`FORMATO: ${formCode || 'N/A'}`, 227, 31);

    autoTable(doc, {
        startY: 40,
        head: [['FECHA', 'VUELO', 'MARCA', 'MODELO', 'S/N', 'RUAS', 'LUGAR', 'TIPO OP', 'VISUAL', 'DEP', 'ARR', 'TOTAL', 'PILOTO', 'CIPU']],
        body: (data || []).map(f => [
            f.flight_date, f.mission_id, f.aircraft?.brand, f.aircraft?.model, f.aircraft?.serial_number,
            f.aircraft?.ruas, f.location, f.mission_type, f.visual_condition, f.takeoff_time,
            f.landing_time, f.aircraft?.total_hours?.toFixed(2), f.pilots?.name, f.pilots?.license_number
        ]),
        styles: { fontSize: 5.5, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.2 },
        margin: { left: 10, right: 10 }
    });

    const noteY = safeAutoTableY(doc, 80) + 10;
    addFooterNote(doc, noteY, { rangeLabel, downloadedAt });
    const finalY = noteY + 12;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA JEFE DE PILOTOS", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA GERENTE GENERAL", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode || 'F-OPS-002'}_LIBRO_VUELO_${orgName}.pdf`);
};

// --- 2. GENERADOR: REGISTRO OPERACIONAL DE BATERÍAS (snapshot por batería) ---
export const generateBatteryReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logo, version, reportDate, formCode, cutoffDate, rangeLabel, downloadedAt } = config;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25);
    doc.line(65, 10, 65, 35);
    doc.line(225, 10, 225, 35);
    doc.line(65, 22.5, 225, 22.5);

    addLogo(doc, logo, 15, 12, 45, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 145, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text("REGISTRO OPERACIONAL DE BATERÍAS", 145, 27, { align: 'center' });
    doc.setFontSize(8);
    doc.text(`CORTE AL: ${cutoffDate || reportDate || '---'}`, 145, 33, { align: 'center' });

    doc.setFontSize(7);
    doc.line(225, 18, 287, 18);
    doc.line(225, 26, 287, 26);
    doc.text(`VERSIÓN: ${version}`, 227, 15);
    doc.text(`FECHA: ${reportDate}`, 227, 23);
    doc.text(`FORMATO: ${formCode}`, 227, 31);

    autoTable(doc, {
        startY: 40,
        head: [['S/N BATERÍA', 'MARCA', 'CICLOS TOTALES (CORTE)', 'ÚLTIMA AERONAVE USADA', 'SALUD', 'ESTADO']],
        body: (data || []).map(b => [
            b.serial_number || 'N/A',
            b.brand || 'N/A',
            b.cycles_as_of ?? 0,
            b.last_aircraft || 'Sin uso registrado',
            b.health_status != null ? `${b.health_status}%` : 'N/A',
            b.status || 'Operativo',
        ]),
        styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.2 },
        margin: { left: 10, right: 10 }
    });

    const noteY = safeAutoTableY(doc, 80) + 12;
    addFooterNote(doc, noteY, { rangeLabel, downloadedAt });
    const finalY = noteY + 15;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA JEFE DE PILOTOS", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA GERENTE GENERAL", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode}_ENERGIA_${orgName}.pdf`);
};

// --- 3. GENERADOR: BITÁCORA DE EXPERIENCIA DE PILOTO ---
export const generatePilotReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logo, version, reportDate, formCode, rangeLabel, downloadedAt } = config;
    const pilotName = data[0]?.pilots?.name || "N/A";
    const pilotCIPU = data[0]?.pilots?.license_number || "---";

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25);
    doc.line(65, 10, 65, 35);
    doc.line(225, 10, 225, 35);
    doc.line(65, 22.5, 225, 22.5);

    addLogo(doc, logo, 15, 12, 45, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`PILOTO: ${pilotName.toUpperCase()} | CIPU: ${pilotCIPU}`, 145, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text("BITÁCORA DE EXPERIENCIA DE VUELO", 145, 30, { align: 'center' });

    doc.setFontSize(7);
    doc.line(225, 18, 287, 18);
    doc.line(225, 26, 287, 26);
    doc.text(`VERSIÓN: ${version}`, 227, 15);
    doc.text(`FECHA: ${reportDate}`, 227, 23);
    doc.text(`FORMATO: ${formCode}`, 227, 31);

    let totalAcumulado = 0;
    autoTable(doc, {
        startY: 40,
        head: [['FECHA', 'MISIÓN ID', 'MODELO UAS', 'S/N EQUIPO', 'UBICACIÓN', 'DEP', 'ARR', 'DURACIÓN (H)', 'OBSERVACIONES']],
        body: (data || []).map(f => {
            totalAcumulado += parseFloat(f.total_time || 0);
            return [
                f.flight_date, f.mission_id, f.aircraft?.model || 'N/A', f.aircraft?.serial_number || 'N/A', 
                f.location, f.takeoff_time, f.landing_time, f.total_time?.toFixed(2) || '0.00', f.notes || ''
            ];
        }),
        foot: [['', '', '', '', '', '', 'TOTAL PERIODO:', totalAcumulado.toFixed(2) + ' H', '']],
        styles: { fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { left: 10, right: 10 }
    });

    const noteY = safeAutoTableY(doc, 80) + 10;
    addFooterNote(doc, noteY, { rangeLabel, downloadedAt });
    const finalY = noteY + 12;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA DEL PILOTO", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA JEFE DE PILOTOS / CERTIFICADOR", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode}_PILOTO_${(pilotName || 'PILOTO').replace(/\s+/g, '_')}.pdf`);
};

// --- GENERADOR: REPORTE DE MANTENIMIENTO (todas las aeronaves o una sola) ---
export const generateMaintenanceReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logo, version, reportDate, formCode, aircraftLabel, rangeLabel, downloadedAt } = config;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25);
    doc.line(65, 10, 65, 35);
    doc.line(225, 10, 225, 35);
    doc.line(65, 22.5, 225, 22.5);

    addLogo(doc, logo, 15, 12, 45, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 145, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text("REPORTE DE MANTENIMIENTO", 145, 27, { align: 'center' });
    doc.setFontSize(8);
    doc.text(aircraftLabel ? `AERONAVE: ${aircraftLabel.toUpperCase()}` : "TODAS LAS AERONAVES", 145, 33, { align: 'center' });

    doc.setFontSize(7);
    doc.line(225, 18, 287, 18);
    doc.line(225, 26, 287, 26);
    doc.text(`VERSIÓN: ${version || '1.0'}`, 227, 15);
    doc.text(`FECHA: ${reportDate || '---'}`, 227, 23);
    doc.text(`FORMATO: ${formCode || 'N/A'}`, 227, 31);

    autoTable(doc, {
        startY: 40,
        head: [['FECHA', 'AERONAVE', 'SERIE', 'TIPO', 'TÉCNICO', 'HORAS SERVICIO', 'DESCRIPCIÓN']],
        body: (data || []).map(m => [
            m.maintenance_date || m.created_at?.slice(0, 10), m.aircraft?.model || 'N/A', m.aircraft?.serial_number || 'N/A',
            m.maintenance_type, m.technician_name, m.hours_at_service != null ? Number(m.hours_at_service).toFixed(2) : '0.00', m.description || ''
        ]),
        styles: { fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.2 },
        margin: { left: 10, right: 10 }
    });

    const noteY = safeAutoTableY(doc, 80) + 10;
    addFooterNote(doc, noteY, { rangeLabel, downloadedAt });
    const finalY = noteY + 12;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA TÉCNICO / MANTENIMIENTO", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA GERENTE GENERAL", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode || 'F-MNT'}_MANTENIMIENTO_${orgName}.pdf`);
};

// --- GENERADOR: REPORTE DE FLOTA (inventario, sin rango de fechas) ---
export const generateFleetReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logo, version, reportDate, formCode, rangeLabel, downloadedAt } = config;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25);
    doc.line(65, 10, 65, 35);
    doc.line(225, 10, 225, 35);
    doc.line(65, 22.5, 225, 22.5);

    addLogo(doc, logo, 15, 12, 45, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 145, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text("REPORTE DE FLOTA", 145, 30, { align: 'center' });

    doc.setFontSize(7);
    doc.line(225, 18, 287, 18);
    doc.line(225, 26, 287, 26);
    doc.text(`VERSIÓN: ${version || '1.0'}`, 227, 15);
    doc.text(`FECHA: ${reportDate || '---'}`, 227, 23);
    doc.text(`FORMATO: ${formCode || 'N/A'}`, 227, 31);

    autoTable(doc, {
        startY: 40,
        head: [['MARCA', 'MODELO', 'SERIE', 'RUAS', 'MTOW', 'HORAS TOTALES', 'ÚLT. MANTENIMIENTO', 'ESTADO']],
        body: (data || []).map(a => [
            a.brand || 'N/A', a.model, a.serial_number, a.ruas || 'N/A', a.mtow ? `${a.mtow} kg` : 'N/A',
            a.total_hours != null ? Number(a.total_hours).toFixed(2) : '0.00',
            a.last_maintenance_date || 'SIN REGISTRO',
            a.status === 'Baja' ? 'BAJA' : a.operational_status === 'en_mantenimiento' ? 'EN MANTENIMIENTO' : 'DISPONIBLE'
        ]),
        styles: { fontSize: 7.5, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.2 },
        margin: { left: 10, right: 10 }
    });

    const noteY = safeAutoTableY(doc, 80) + 10;
    addFooterNote(doc, noteY, { rangeLabel, downloadedAt });
    const finalY = noteY + 12;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA JEFE DE PILOTOS", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA GERENTE GENERAL", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode || 'F-FLT'}_FLOTA_${orgName}.pdf`);
};

// --- 4. NUEVO GENERADOR: EXPEDIENTE TÉCNICO DE TRIPULANTE (PORTRAIT) ---
export const generatePilotDossier = (pilot, config) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const { orgName, logo, version, reportDate, rangeLabel, downloadedAt } = config;

    // --- 1. CABECERA TÉCNICA (PORTRAIT) ---
    doc.setDrawColor(0); doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 25);
    doc.line(50, 10, 50, 35); doc.line(160, 10, 160, 35);

    addLogo(doc, logo, 15, 12, 30, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10); doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 105, 18, { align: 'center' });
    doc.setFontSize(12); doc.text("EXPEDIENTE TÉCNICO DE TRIPULANTE", 105, 28, { align: 'center' });
    doc.setFontSize(8); doc.text(`VERSIÓN: ${version || '1.0'}`, 162, 18); doc.text(`EMISIÓN: ${reportDate}`, 162, 28);

    // --- 2. BLOQUE DE IDENTIDAD ---
    autoTable(doc, {
        startY: 40,
        head: [['01. INFORMACIÓN PERSONAL Y DE IDENTIDAD', '']],
        body: [
            ['Nombre Completo:', pilot.name || 'N/A'],
            ['Número de Identificación:', pilot.id_number || 'N/A'],
            ['Correo Electrónico:', pilot.email || 'N/A'],
            ['Teléfono Móvil:', pilot.phone || 'N/A']
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [26, 32, 44], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    });

    // --- 3. BLOQUE AERONÁUTICO ---
    autoTable(doc, {
        startY: safeAutoTableY(doc, 40) + 5,
        head: [['02. CREDENCIALES Y CALIFICACIONES AEROCIVIL', '']],
        body: [
            ['Cargo Operativo:', pilot.pilot_role || 'Piloto'],
            ['Número CIPU (Registro):', pilot.license_number || 'PENDIENTE'],
            ['Fecha Vencimiento Médico:', pilot.medical_expiry || 'NO REGISTRADO']
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [236, 91, 19], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    });

    // --- 4. BLOQUE DE DOCUMENTACIÓN (ANEXOS PARA IMPRESIÓN) ---
    // Usamos una tabla para que los links y etiquetas nunca se encimen
    autoTable(doc, {
        startY: safeAutoTableY(doc, 40) + 5,
        head: [['03. ANEXOS DIGITALES', 'ESTADO', 'VÍNCULO DE VERIFICACIÓN']],
        body: [
            ['Cédula de Ciudadanía', pilot.id_doc_url ? 'CARGADO' : 'PENDIENTE', pilot.id_doc_url ? ' ' : '---'],
            ['Diploma Curso Piloto', pilot.pilot_course_url ? 'CARGADO' : 'PENDIENTE', pilot.pilot_course_url ? ' ' : '---'],
            ['Certificado Examen Teórico', pilot.theoretical_exam_url ? 'CARGADO' : 'PENDIENTE', pilot.theoretical_exam_url ? ' ' : '---'],
            ['Certificado Médico Vigente', pilot.medical_cert_url ? 'CARGADO' : 'PENDIENTE', pilot.medical_cert_url ? ' ' : '---']
        ],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [100, 100, 100], textColor: [255, 255, 255], fontStyle: 'bold' },
        didDrawCell: (data) => {
            // Lógica para hacer los links clickeables solo en la columna 2
            if (data.section === 'body' && data.column.index === 2) {
                let stored = '';
                if (data.row.index === 0) stored = pilot.id_doc_url;
                if (data.row.index === 1) stored = pilot.pilot_course_url;
                if (data.row.index === 2) stored = pilot.theoretical_exam_url;
                if (data.row.index === 3) stored = pilot.medical_cert_url;

                const url = docLink(stored);
                if (url) {
                    doc.setTextColor(0, 0, 255);
                    doc.textWithLink("VER DOCUMENTO", data.cell.x + 3, data.cell.y + 6, { url: url });
                }
            }
        }
    });

   // --- 5. CONTACTO DE EMERGENCIA ---
    autoTable(doc, {
        startY: safeAutoTableY(doc, 40) + 5,
        head: [['04. CONTACTO EN CASO DE EMERGENCIA', '']],
        body: [
            ['Nombre de Contacto:', pilot.emergency_contact_name || 'N/A'],
            ['Teléfono de Contacto:', pilot.emergency_contact_phone || 'N/A']
        ],
        theme: 'plain',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [185, 28, 28], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
    });

    // --- 6. RESUMEN DE EXPERIENCIA (NUEVO) ---
    autoTable(doc, {
        startY: safeAutoTableY(doc, 40) + 5,
        head: [['05. EXPERIENCIA DE VUELO ACUMULADA', '']],
        body: [
            ['Horas Totales Certificadas (en Bitafly):', (pilot.total_hours_accumulated || 0).toFixed(2) + ' Horas']
        ],
        theme: 'plain',
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [0, 80, 158], textColor: [255, 255, 255], fontStyle: 'bold' }, // Color azul aviación
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70 } }
    });

    // --- 7. EVALUACIONES DE CAPACITACIÓN (NUEVO) ---
    const trainingEvals = pilot.training_evaluations || [];
    if (trainingEvals.length > 0) {
        autoTable(doc, {
            startY: safeAutoTableY(doc, 40) + 5,
            head: [['06. EVALUACIONES DE CAPACITACIÓN', 'FECHA', 'RESULTADO']],
            body: trainingEvals.map(e => [
                e.type === 'operaciones' ? 'Operaciones' : 'Mantenimiento',
                e.evaluation_date || '—',
                e.result === 'aprobado' ? 'APROBADO' : 'NO APROBADO',
            ]),
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2.5 },
            headStyles: { fillColor: [22, 101, 52], textColor: [255, 255, 255], fontStyle: 'bold' },
        });
    }

    // --- NOTA DE TRAZABILIDAD + SECCIÓN DE FIRMAS (Ajustada de posición) ---
    const signY = 265;
    addFooterNote(doc, signY - 11, { rangeLabel, downloadedAt });
    doc.setDrawColor(0);
    doc.setFontSize(8);
    doc.line(20, signY, 80, signY);
    doc.text("FIRMA DEL PILOTO", 50, signY + 5, { align: 'center' });
    
    doc.line(130, signY, 190, signY);
    doc.text("FIRMA JEFE DE PILOTOS", 160, signY + 5, { align: 'center' });

    doc.save(`EXPEDIENTE_${(pilot?.name || 'PILOTO').replace(/\s+/g, '_')}.pdf`);
};

// --- GENERADOR: CRONOGRAMA DE CAPACITACIÓN (Operaciones / Mantenimiento) ---
const TRAINING_TYPE_LABEL = { operaciones: 'OPERACIONES', mantenimiento: 'MANTENIMIENTO' };

export const generateTrainingScheduleReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logo, version, reportDate, formCode, trainingType, rangeLabel, downloadedAt } = config;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25);
    doc.line(65, 10, 65, 35);
    doc.line(225, 10, 225, 35);
    doc.line(65, 22.5, 225, 22.5);

    addLogo(doc, logo, 15, 12, 45, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 145, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text("CRONOGRAMA DE CAPACITACIÓN", 145, 27, { align: 'center' });
    doc.setFontSize(8);
    doc.text(TRAINING_TYPE_LABEL[trainingType] || 'N/A', 145, 33, { align: 'center' });

    doc.setFontSize(7);
    doc.line(225, 18, 287, 18);
    doc.line(225, 26, 287, 26);
    doc.text(`VERSIÓN: ${version || '1.0'}`, 227, 15);
    doc.text(`FECHA: ${reportDate || '---'}`, 227, 23);
    doc.text(`FORMATO: ${formCode || 'N/A'}`, 227, 31);

    autoTable(doc, {
        startY: 40,
        head: [['FECHA PROGRAMADA', 'TEMA', 'RECURRENCIA', 'OBSERVACIONES']],
        body: (data || []).map(s => [s.date, s.topic, s.recurrence, s.notes || '']),
        styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.2 },
        margin: { left: 10, right: 10 }
    });

    const scheduleNoteY = safeAutoTableY(doc, 80) + 10;
    addFooterNote(doc, scheduleNoteY, { rangeLabel, downloadedAt });
    const scheduleFinalY = scheduleNoteY + 12;
    doc.line(30, scheduleFinalY, 110, scheduleFinalY);
    doc.text("FIRMA JEFE DE PILOTOS", 70, scheduleFinalY + 5, { align: 'center' });
    doc.line(187, scheduleFinalY, 267, scheduleFinalY);
    doc.text("FIRMA GERENTE GENERAL", 227, scheduleFinalY + 5, { align: 'center' });

    doc.save(`${formCode || 'F-CAP'}_CRONOGRAMA_${trainingType?.toUpperCase() || ''}_${orgName}.pdf`);
};

// --- GENERADOR: EVALUACIÓN DE CAPACITACIÓN (Operaciones / Mantenimiento) ---

export const generateTrainingReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logo, version, reportDate, formCode, trainingType, rangeLabel, downloadedAt } = config;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25);
    doc.line(65, 10, 65, 35);
    doc.line(225, 10, 225, 35);
    doc.line(65, 22.5, 225, 22.5);

    addLogo(doc, logo, 15, 12, 45, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 145, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text("EVALUACIÓN INTERNA DE CAPACITACIÓN", 145, 27, { align: 'center' });
    doc.setFontSize(8);
    doc.text(TRAINING_TYPE_LABEL[trainingType] || 'N/A', 145, 33, { align: 'center' });

    doc.setFontSize(7);
    doc.line(225, 18, 287, 18);
    doc.line(225, 26, 287, 26);
    doc.text(`VERSIÓN: ${version || '1.0'}`, 227, 15);
    doc.text(`FECHA: ${reportDate || '---'}`, 227, 23);
    doc.text(`FORMATO: ${formCode || 'N/A'}`, 227, 31);

    autoTable(doc, {
        startY: 40,
        head: [['TRIPULANTE', 'CIPU', 'FECHA', 'RESULTADO', 'EVALUADOR', 'OBSERVACIONES']],
        body: (data || []).map(e => [
            e.pilot?.name || 'N/A',
            e.pilot?.license_number || '—',
            e.evaluation_date || '—',
            e.result === 'aprobado' ? 'APROBADO' : 'NO APROBADO',
            e.evaluator_name || '—',
            e.notes || '',
        ]),
        styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.2 },
        margin: { left: 10, right: 10 }
    });

    const noteY = safeAutoTableY(doc, 80) + 10;
    addFooterNote(doc, noteY, { rangeLabel, downloadedAt });
    const finalY = noteY + 12;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA JEFE DE PILOTOS", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA GERENTE GENERAL", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode || 'F-CAP'}_CAPACITACION_${trainingType?.toUpperCase() || ''}_${orgName}.pdf`);
};

// --- GENERADOR: CRONOGRAMA DE CAPACITACIÓN SMS (todo el personal) ---

export const generateSmsTrainingScheduleReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logo, version, reportDate, formCode, rangeLabel, downloadedAt } = config;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25);
    doc.line(65, 10, 65, 35);
    doc.line(225, 10, 225, 35);
    doc.line(65, 22.5, 225, 22.5);

    addLogo(doc, logo, 15, 12, 45, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 145, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text("CRONOGRAMA DE CAPACITACIÓN SMS", 145, 27, { align: 'center' });
    doc.setFontSize(8);
    doc.text("Instrucción y educación SMS — dirigido a todo el personal", 145, 33, { align: 'center' });

    doc.setFontSize(7);
    doc.line(225, 18, 287, 18);
    doc.line(225, 26, 287, 26);
    doc.text(`VERSIÓN: ${version || '1.0'}`, 227, 15);
    doc.text(`FECHA: ${reportDate || '---'}`, 227, 23);
    doc.text(`FORMATO: ${formCode || 'N/A'}`, 227, 31);

    autoTable(doc, {
        startY: 40,
        head: [['FECHA PROGRAMADA', 'TEMA', 'RECURRENCIA', 'OBSERVACIONES']],
        body: (data || []).map(s => [s.date, s.topic, s.recurrence, s.notes || '']),
        styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.2 },
        margin: { left: 10, right: 10 }
    });

    const noteY = safeAutoTableY(doc, 80) + 10;
    addFooterNote(doc, noteY, { rangeLabel, downloadedAt });
    const finalY = noteY + 12;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA GERENTE SMS", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA GERENTE GENERAL", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode || 'F-SMS'}_CRONOGRAMA_CAPACITACION_SMS_${orgName}.pdf`);
};

// --- GENERADOR: AUTOEVALUACIÓN GAP DEL SMS (Apéndice 1 — 100 preguntas) ---

export const generateGapReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logo, version, reportDate, formCode, rangeLabel, downloadedAt } = config;
    const { assessment, rows } = data || {};

    const answered = (rows || []).filter(r => r.response?.response);
    const siCount = answered.filter(r => r.response?.response === 'si').length;
    const pct = answered.length ? Math.round((siCount / answered.length) * 100) : null;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25);
    doc.line(65, 10, 65, 35);
    doc.line(225, 10, 225, 35);
    doc.line(65, 22.5, 225, 22.5);

    addLogo(doc, logo, 15, 12, 45, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 145, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text("AUTOEVALUACIÓN GAP DEL SMS", 145, 27, { align: 'center' });
    doc.setFontSize(8);
    const subtitle = assessment
        ? `${assessment.title || 'Autoevaluación'} · ${assessment.assessment_date || ''}${pct !== null ? ` · Cumplimiento: ${pct}%` : ''}`
        : 'Sin autoevaluaciones registradas';
    doc.text(subtitle, 145, 33, { align: 'center' });

    doc.setFontSize(7);
    doc.line(225, 18, 287, 18);
    doc.line(225, 26, 287, 26);
    doc.text(`VERSIÓN: ${version || '1.0'}`, 227, 15);
    doc.text(`FECHA: ${reportDate || '---'}`, 227, 23);
    doc.text(`FORMATO: ${formCode || 'N/A'}`, 227, 31);

    autoTable(doc, {
        startY: 40,
        head: [['#', 'COMPONENTE', 'ELEMENTO', 'PREGUNTA', 'RESP.', 'RESPONSABLE', 'ESTADO']],
        body: (rows || []).map(q => [
            q.order_index,
            `${q.component_number}. ${q.component_name}`,
            `${q.element_number} ${q.element_name}`,
            q.question_text,
            q.response?.response === 'si' ? 'SÍ' : q.response?.response === 'no' ? 'NO' : 'Sin responder',
            q.response?.response === 'no' ? (q.response?.responsible || '—') : '—',
            q.response?.response === 'no' ? (ACTION_STATUS_LABELS[q.response?.status] || '—') : '—',
        ]),
        styles: { fontSize: 6, cellPadding: 1.2, lineColor: [0, 0, 0], lineWidth: 0.1, overflow: 'linebreak' },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.2 },
        columnStyles: { 0: { cellWidth: 7 }, 3: { cellWidth: 110 } },
        margin: { left: 10, right: 10 }
    });

    const noteY = safeAutoTableY(doc, 80) + 10;
    addFooterNote(doc, noteY, { rangeLabel, downloadedAt });
    const finalY = noteY + 12;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA GERENTE SMS", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA GERENTE GENERAL", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode || 'F-SMS'}_GAP_SMS_${orgName}.pdf`);
};

// --- GENERADOR: TABLERO CONSOLIDADO DE ACCIONES CORRECTIVAS ---

export const generateCorrectiveActionsReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logo, version, reportDate, formCode, rangeLabel, downloadedAt } = config;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25);
    doc.line(65, 10, 65, 35);
    doc.line(225, 10, 225, 35);
    doc.line(65, 22.5, 225, 22.5);

    addLogo(doc, logo, 15, 12, 45, 20);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 145, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text("ACCIONES CORRECTIVAS DEL SMS", 145, 27, { align: 'center' });
    doc.setFontSize(8);
    doc.text("Consolidado: casos SMS/VOR/MOR, planes de acción SPI y hallazgos GAP", 145, 33, { align: 'center' });

    doc.setFontSize(7);
    doc.line(225, 18, 287, 18);
    doc.line(225, 26, 287, 26);
    doc.text(`VERSIÓN: ${version || '1.0'}`, 227, 15);
    doc.text(`FECHA: ${reportDate || '---'}`, 227, 23);
    doc.text(`FORMATO: ${formCode || 'N/A'}`, 227, 31);

    autoTable(doc, {
        startY: 40,
        head: [['FUENTE', 'ACCIÓN / HALLAZGO', 'CONTEXTO', 'RESPONSABLE', 'VENCIMIENTO', 'ESTADO']],
        body: (data || []).map(a => [
            a.source, a.title, a.context, a.responsible || '—', a.due_date || '—', a.status,
        ]),
        styles: { fontSize: 7.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, overflow: 'linebreak' },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.2 },
        columnStyles: { 1: { cellWidth: 90 }, 2: { cellWidth: 70 } },
        margin: { left: 10, right: 10 }
    });

    const noteY = safeAutoTableY(doc, 80) + 10;
    addFooterNote(doc, noteY, { rangeLabel, downloadedAt });
    const finalY = noteY + 12;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA GERENTE SMS", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA GERENTE GENERAL", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode || 'F-SMS'}_ACCIONES_CORRECTIVAS_${orgName}.pdf`);
};

// --- GENERADOR: FORMATO 100 UAEAC (SOLICITUD DE AUTORIZACIÓN) ---

export const generateExcelF100 = async (data, profile, org, pilots) => {
    try {
        // 1. Carga de plantilla
        const response = await fetch('/templates/formato_100_template.xlsx');
        if (!response.ok) throw new Error("No se encontró la plantilla en public/templates/formato_100_template.xlsx");
        
        const arrayBuffer = await response.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.worksheets[0]; 
        
        if (!worksheet) {
            throw new Error("El archivo Excel no contiene hojas de trabajo válidas.");
        } // Usar la primera hoja

    // Función auxiliar para forzar Mayúsculas y evitar errores de nulos
        const cleanText = (val) => val ? String(val).toUpperCase() : '';

    // --- SECCIÓN 1: DATOS DEL SOLICITANTE (Ejemplo de celdas) ---
    // Ajuste las coordenadas (C12, C13, etc) según su Excel real
    worksheet.getCell('V7').value = profile?.full_name?.toUpperCase();
    worksheet.getCell('V8').value = cleanText(org?.tax_id_type || 'NIT'); // Tomado de la organización
    worksheet.getCell('V9').value = cleanText(org?.tax_id); 
    worksheet.getCell('V10').value = cleanText(org?.operator_email); // Correo Org
    worksheet.getCell('V11').value = cleanText(org?.phone);          // Teléfono Org
    worksheet.getCell('V12').value = cleanText(org?.address); 
  

    // --- SECCIÓN 2: JEFE DE PILOTOS UAS (Búsqueda Automática) ---
        const chief = pilots?.find(p => p.pilot_role?.includes('Jefe'));
        if (chief) {
            worksheet.getCell('W15').value = cleanText(chief.name);
            worksheet.getCell('W16').value = cleanText(chief.id_number);
            worksheet.getCell('W17').value = cleanText(chief.phone);
        }

    // --- SECCIÓN 3: TIPO DE OPERACIÓN (Marcación de X) ---
    const op = data.tipo_operacion || {};
    if (op.simple_captura) worksheet.getCell('S19').value = 'X';
    if (op.vigilancia_seguridad) worksheet.getCell('AO19').value = 'X';
    if (op.medios_comunicacion) worksheet.getCell('S20').value = 'X';
    if (op.aspersion) worksheet.getCell('AO20').value = 'X';
    if (op.dispersion) worksheet.getCell('S21').value = 'X';
    if (op.enjambre) worksheet.getCell('AO21').value = 'X';
    if (op.carga_delivery) worksheet.getCell('S22').value = 'X';
    if (op.instruccion) worksheet.getCell('AO22').value = 'X';
    if (op.misiones_publicas) worksheet.getCell('S23').value = 'X';

    // --- SECCIÓN 4: INFORMACIÓN OPERACIÓN ---
    worksheet.getCell('W25').value = data.empresa_contratante?.toUpperCase();
    worksheet.getCell('M26').value = data.fecha_inicio;
    worksheet.getCell('AI26').value = data.hora_inicio;
    worksheet.getCell('M27').value = data.fecha_fin;
    worksheet.getCell('AI27').value = data.hora_fin;
    worksheet.getCell('W29').value = data.peso_maximo;
    worksheet.getCell('M28').value = data.otros_detalles;
    worksheet.getCell('M30').value = data.municipality;
    worksheet.getCell('AI30').value = data.department;

    // --- SECCIÓN 5: TIPO DE CONTACTO VISUAL CON LA UA (Marcación de X) ---
    const cv = data.contacto_visual || {};
    if (cv.vlos) worksheet.getCell('S32').value = 'X';
    if (cv.evlos) worksheet.getCell('AN32').value = 'X';
    if (cv.bvlos) worksheet.getCell('S33').value = 'X';

    // --- SECCIÓN 6: VUELO ESPECIAL (Marcación de X) ---
    const ve = data.vuelos_especiales || {};
    if (ve.nocturno) worksheet.getCell('S35').value = 'X';
    if (ve.urbana) worksheet.getCell('AN35').value = 'X';
    if (ve.autonomo) worksheet.getCell('S36').value = 'X';
    if (ve.demostracion) worksheet.getCell('AN36').value = 'X';
    if (ve.cautiva) worksheet.getCell('S37').value = 'X';
    if (ve.recreativo) worksheet.getCell('AN37').value = 'X';
    worksheet.getCell('B38').value = "JUSTIFICACIÓN: " + cleanText(data.justificacion_especial);

    // --- SECCIÓN 7: AERONAVES (Mapeo de tabla) ---
    // Cada aeronave ocupa un bloque de 5 filas
    (data.aeronaves || []).forEach((a, index) => {
        if (!a?.id) return; // Saltar slots vacíos
        const rowOffset = 43 + (index * 5);
        worksheet.getCell(`M${rowOffset}`).value       = cleanText(a.brand);
        worksheet.getCell(`AI${rowOffset}`).value      = cleanText(a.model);
        worksheet.getCell(`AI${rowOffset + 1}`).value  = cleanText(a.serial_number);

        // Datos de la póliza de seguro RCE
        worksheet.getCell(`M${rowOffset + 2}`).value   = cleanText(a.insurer);
        worksheet.getCell(`AI${rowOffset + 2}`).value  = cleanText(a.policy);
        worksheet.getCell(`M${rowOffset + 3}`).value   = cleanText(a.start_date);
        worksheet.getCell(`AI${rowOffset + 3}`).value  = cleanText(a.end_date);
    });

        // --- SECCIÓN 8: EQUIPOS TECNOLÓGICOS (PAYLOADS) ---
    // El formato F100 reserva 3 slots de equipos entre las aeronaves y los pilotos
    data.equipos?.forEach((eq, index) => {
        if (!eq?.id) return; // Saltar slots vacíos
        const row = 58 + (index * 3); // Cada equipo ocupa 3 filas en el F100
        worksheet.getCell(`M${row}`).value     = cleanText(eq.brand);
        worksheet.getCell(`AI${row}`).value    = cleanText(eq.model);
        worksheet.getCell(`M${row + 1}`).value = cleanText(eq.type);
        worksheet.getCell(`AI${row + 1}`).value = cleanText(eq.serial_number);
    });

    // --- SECCIÓN 9: PILOTO(S) UAS ---
        (data.pilotos_solicitud || []).forEach((p, index) => {
            const row = 67 + (index * 4); // Piloto 1 en fila 51, Piloto 2 en 55...
            worksheet.getCell(`W${row}`).value = cleanText(p.name);
            worksheet.getCell(`W${row + 1}`).value = cleanText(p.id_number);
            worksheet.getCell(`W${row + 2}`).value = cleanText(p.phone);
        });

        // --- SECCIÓN 10: OBSERVADOR(ES) UA ---
    (data.observadores || []).forEach((obs, index) => {
        const row = 79 + (index * 4); // Observador 1 en fila 63, Observador 2 en 67...
        worksheet.getCell(`W${row}`).value = cleanText(obs.name);
        worksheet.getCell(`W${row + 1}`).value = cleanText(obs.id_number);
        worksheet.getCell(`W${row + 2}`).value = cleanText(obs.phone);
    });

    // --- SECCIÓN 11: COORDENADAS DINÁMICAS (LÓGICA POR GEOMETRÍA) ---
    // Definimos las filas de encabezado según el tipo de geometría
    let headerRow, dataStartRow;

    const meters = data.altitude_meters || '0';
    const feet = data.altitude_feet || '0';
    const gName = cleanText(data.geo_name);

    if (data.geo_type === 'linear') {
        headerRow = 96;      // Fila del encabezado de Tramo Lineal
        dataStartRow = 96;   // Fila donde empiezan los puntos
        // Inyectar Nombre y Altura Dual en el encabezado de Línea
        worksheet.getCell(`L${headerRow}`).value = gName;
        worksheet.getCell(`AL${headerRow}`).value = meters;
        worksheet.getCell(`AO${headerRow}`).value = feet;
    } 
    else if (data.geo_type === 'circle') {
        headerRow = 105;      // Fila del encabezado de Circunferencia
        dataStartRow = 105;   // Fila del punto central
        // Inyectar Nombre y Altura Dual en el encabezado de Círculo
        worksheet.getCell(`O${headerRow}`).value = gName;
        worksheet.getCell(`AL${headerRow}`).value = meters;
        worksheet.getCell(`AO${headerRow}`).value = feet;
    } 
    else {
        headerRow = 87;      // Fila del encabezado de Polígono
        dataStartRow = 87;   // Fila donde empiezan los puntos
        // Inyectar Nombre y Altura Dual en el encabezado de Polígono
        worksheet.getCell(`O${headerRow}`).value = gName;
        worksheet.getCell(`AL${headerRow}`).value = meters;
        worksheet.getCell(`AO${headerRow}`).value = feet;
    }

    let startRow = 88; // Fila base para Polígono
        
        if (data.geo_type === 'linear') {
            startRow = 98; // Salta a la tabla de Tramo Lineal
            worksheet.getCell('H98').value = "TRAMO OPERATIVO PRINCIPAL"; 
        } else if (data.geo_type === 'circle') {
            startRow = 107; // Salta a la tabla de Circunferencia
            worksheet.getCell('H107').value = "RADIO DE OPERACIÓN: " + data.radius + " METROS";
        } else {
            worksheet.getCell('H88').value = "POLÍGONO DE OPERACIÓN";
        }

        // Inyección de puntos en la tabla correspondiente
        (data.points || []).forEach((p, i) => {
            const currentRow = startRow + i;
            if (i < 5) { // El formato estándar tiene 5 slots por tabla
                worksheet.getCell(`H${currentRow}`).value = `${toGMS(p.lat)}${p.lat >= 0 ? 'N' : 'S'}`;
                worksheet.getCell(`AK${currentRow}`).value = `${toGMS(p.lng)}W`;
            }
        });

        // --- SECCIÓN 12: DOCUMENTOS DIGITALES REQUERIDOS (Marcación de X) ---
        const docs = data.docs_adjuntos;

        // Columna Izquierda (Celdas estimadas según formato estándar UAEAC)
        if (docs.poliza_rce) worksheet.getCell('S110').value = 'X';
        if (docs.analisis_riesgos) worksheet.getCell('S111').value = 'X';
        if (docs.contrato_instalacion) worksheet.getCell('S112').value = 'X';

        // Columna Derecha
        if (docs.archivo_kmz) worksheet.getCell('AN110').value = 'X';
        if (docs.acta_cdm) worksheet.getCell('AN111').value = 'X';
        if (docs.declaracion_carga) worksheet.getCell('AN112').value = 'X';

        // --- SECCIÓN 14: FIRMA DE RESPONSABILIDAD ---
        // Inyectamos el nombre del Jefe de Pilotos o Representante en el área de firma
        const signer = pilots?.find(p => p.pilot_role?.includes('Jefe')) || profile;
        worksheet.getCell('B112').value = "FIRMA: " + cleanText(signer?.full_name || signer?.name);

         // --- SECCIÓN 14: FIRMA (Metadata de pie de página) ---
        worksheet.getCell('B114').value = cleanText(chief?.name || profile?.full_name);

    const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const fileName = data.mission_id ? `${data.mission_id}.xlsx` : `F100_OFICIAL_${cleanText(org?.company_name)}.xlsx`;
        saveAs(blob, fileName);

    } catch (error) {
        console.error("Error en generateExcelF100:", error);
        alert("Falla técnica: " + error.message);
    }
};

// --- GENERADOR: REPORTE OPERACIONAL MENSUAL UAS (CIRCULAR AEROCIVIL) ---
// Radicado 2026351070026944 — 8 columnas exactas exigidas por la Dirección de
// Operaciones de Navegación Aérea / Grupo Gestión Operacional UAS. Ver CLAUDE.md
// "Reporte Operacional Mensual UAS (AeroCivil)".

// "Condición de vuelo" (DIURNO/NOCTURNO/MIXTO) no existe como dato guardado —
// AeroCivil la define por hora del día, mientras BitaFly guarda VMC/IMC/NIGHT
// (reglas de vuelo). Se deriva de las horas reales de despegue/aterrizaje con una
// convención horaria fija (06:00–18:00 = diurno) — no es orto/ocaso real por
// ubicación (exigiría una llamada externa por vuelo), así que se documenta como
// convención, no como precisión astronómica real.
function deriveFlightCondition(takeoffTime, landingTime) {
    if (!takeoffTime) return '';
    const toMinutes = (t) => {
        const [h, m] = String(t).split(':').map(Number);
        return h * 60 + (m || 0);
    };
    const DAY_START = 6 * 60, DAY_END = 18 * 60;
    const isDay = (mins) => mins >= DAY_START && mins < DAY_END;

    const takeoffMin = toMinutes(takeoffTime);
    const takeoffIsDay = isDay(takeoffMin);
    if (!landingTime) return takeoffIsDay ? 'DIURNO' : 'NOCTURNO';

    const landingMin = toMinutes(landingTime);
    const landingIsDay = isDay(landingMin);
    return takeoffIsDay === landingIsDay ? (takeoffIsDay ? 'DIURNO' : 'NOCTURNO') : 'MIXTO';
}

// total_time viene en horas decimales (ej. 0.75) — AeroCivil lo pide en HH:MM.
function formatFlightDuration(totalTimeHours) {
    if (totalTimeHours == null) return '00:00';
    const totalMinutes = Math.round(Number(totalTimeHours) * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const generateAerocivilMonthlyExcel = async (rows, month) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte UAS');

    const headers = [
        'ID AUTORIZACIÓN', 'NOMBRE EMPRESA', 'FECHA DE VUELO', 'TIEMPO DE VUELO',
        'RUAS', 'TIPO DE LINEA DE VISTA', 'TIPO DE OPERACIÓN EJECUTADA', 'CONDICION DE VUELO',
    ];
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    worksheet.columns = headers.map(h => ({ width: Math.max(18, h.length + 2) }));

    rows.forEach(r => {
        worksheet.addRow([
            r.aerocivil_auth_number || '',
            r.company_name || '',
            r.flight_date ? String(r.flight_date).slice(0, 10) : '',
            formatFlightDuration(r.total_time),
            r.ruas || '',
            r.line_of_sight || '',
            r.mission_type || '',
            deriveFlightCondition(r.takeoff_time, r.landing_time),
        ]);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Reporte_UAS_AeroCivil_${month}.xlsx`);
};

// --- GENERADOR: INDICADORES DE DESEMPEÑO EN SEGURIDAD OPERACIONAL (SPI) ---
// Reporte anual descargable (mismo espíritu que el Excel oficial
// MAUT-1.0-12-002) — Fase 8 del plan de mejora SMS, resuelve el pendiente
// documentado como "Fase 3b". Una hoja "Resumen" + una hoja por indicador
// con sus datos mensuales, estadísticas (línea base = año anterior al
// reportado) y planes de acción vigentes.

// Nombres de hoja de Excel: máx. 31 caracteres, sin [ ] : * ? / \, únicos.
function safeSheetName(name, used) {
    let base = String(name || 'Indicador').replace(/[[\]:*?/\\]/g, '').slice(0, 28).trim() || 'Indicador';
    let candidate = base;
    let i = 2;
    while (used.has(candidate)) {
        candidate = `${base.slice(0, 25)} (${i})`;
        i += 1;
    }
    used.add(candidate);
    return candidate;
}

const DENOMINATOR_LABELS = {
    ciclos_vuelo: 'Ciclos de vuelo', horas_vuelo: 'Horas de vuelo',
    horas_hombre: 'Horas-hombre', operaciones: 'Número de operaciones',
};

export const generateSpiReport = async (data, config) => {
    const { indicators } = data || {};
    const { year, orgName, formCode, version, reportDate, downloadedAt } = config || {};
    const workbook = new ExcelJS.Workbook();
    const usedNames = new Set();

    const summary = workbook.addWorksheet('Resumen');
    summary.addRow([orgName || 'BitaFly UAS']);
    summary.getRow(1).font = { bold: true, size: 13 };
    summary.addRow([`Formato: ${formCode || 'N/A'} · Versión: ${version || '1.0'} · Fecha: ${reportDate || '---'}`]);
    summary.addRow([`Año reportado: ${year} · Descargado el: ${downloadedAt || '---'}`]);
    summary.addRow([]);

    const summaryHeaders = ['INDICADOR', 'DENOMINADOR', `TASA PROMEDIO ${year - 1} (línea base)`, `ALERTA 1 (${year - 1})`, 'META SUGERIDA', 'MESES EN ALERTA'];
    summary.addRow(summaryHeaders);
    summary.getRow(summary.rowCount).font = { bold: true };
    summary.columns = summaryHeaders.map(h => ({ width: Math.max(20, h.length + 2) }));

    (indicators || []).forEach(ind => {
        const baseline = computeYearStats(ind.monthly || [], year - 1);
        const target = baseline ? suggestedTarget(baseline.avg, ind.expected_improvement_pct) : null;
        const yearRows = (ind.monthly || []).filter(m => m.period.startsWith(String(year)));
        const monthsInAlert = baseline
            ? yearRows.filter(m => computeRate(m.event_count, m.denominator_value) > baseline.alert1).length
            : 0;

        summary.addRow([
            ind.name,
            DENOMINATOR_LABELS[ind.denominator_unit] || ind.denominator_unit,
            baseline ? baseline.avg.toFixed(4) : 'Sin línea base',
            baseline ? baseline.alert1.toFixed(4) : '—',
            target !== null ? target.toFixed(4) : '—',
            baseline ? monthsInAlert : '—',
        ]);

        const sheet = workbook.addWorksheet(safeSheetName(ind.name, usedNames));
        sheet.addRow([ind.name]);
        sheet.getRow(1).font = { bold: true, size: 13 };
        sheet.addRow([`Denominador: ${DENOMINATOR_LABELS[ind.denominator_unit] || ind.denominator_unit}`, `Mejora esperada: ${Math.round((ind.expected_improvement_pct || 0) * 100)}%`]);
        sheet.addRow([]);

        const monthlyHeaders = ['MES', 'VALOR DENOMINADOR', 'N° EVENTOS', 'TASA (por 1000)'];
        sheet.addRow(monthlyHeaders);
        sheet.getRow(sheet.rowCount).font = { bold: true };
        MONTH_LABELS.forEach((label, i) => {
            const period = `${year}-${String(i + 1).padStart(2, '0')}`;
            const row = yearRows.find(m => m.period === period);
            sheet.addRow([
                `${label} ${year}`,
                row ? row.denominator_value : '—',
                row ? row.event_count : '—',
                row ? computeRate(row.event_count, row.denominator_value).toFixed(4) : '—',
            ]);
        });
        sheet.addRow([]);

        sheet.addRow([`Estadísticas (línea base ${year - 1})`]);
        sheet.getRow(sheet.rowCount).font = { bold: true };
        if (baseline) {
            sheet.addRow(['Promedio', baseline.avg.toFixed(4)]);
            sheet.addRow(['Desviación estándar', baseline.stdDev.toFixed(4)]);
            sheet.addRow(['Alerta 1 (prom. + 1 D.E.)', baseline.alert1.toFixed(4)]);
            sheet.addRow(['Alerta 2 (prom. + 2 D.E.)', baseline.alert2.toFixed(4)]);
            sheet.addRow(['Alerta 3 (prom. + 3 D.E.)', baseline.alert3.toFixed(4)]);
            sheet.addRow(['Meta sugerida', target !== null ? target.toFixed(4) : '—']);
        } else {
            sheet.addRow([`Sin línea base — el año ${year - 1} no tiene los 12 meses completos.`]);
        }
        sheet.addRow([]);

        const actions = ind.actions || [];
        sheet.addRow(['Planes de acción vigentes']);
        sheet.getRow(sheet.rowCount).font = { bold: true };
        const actionHeaders = ['DEFENSA', 'CAUSA RAÍZ', 'DESENCADENANTE', 'PLAN DE ACCIÓN', 'DOCUMENTO', 'DÍAS EJECUCIÓN', 'ESTADO'];
        sheet.addRow(actionHeaders);
        sheet.getRow(sheet.rowCount).font = { bold: true };
        if (actions.length === 0) {
            sheet.addRow(['Sin planes de acción registrados.']);
        } else {
            actions.forEach(a => {
                sheet.addRow([
                    DEFENSE_TYPE_LABELS[a.defense_type] || a.defense_type || '—',
                    a.root_cause || '—',
                    a.trigger_factor || '—',
                    a.action_plan,
                    a.document_ref || '—',
                    a.execution_days ?? '—',
                    ACTION_STATUS_LABELS[a.status] || a.status,
                ]);
            });
        }
        sheet.columns = actionHeaders.map(h => ({ width: Math.max(16, h.length + 2) }));
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `Indicadores_SPI_${year}.xlsx`);
};