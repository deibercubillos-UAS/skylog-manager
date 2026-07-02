import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { docPath } from '@/lib/docUrl';

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
    const { orgName, logoUrl, version, reportDate, formCode } = config;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25); 

    doc.line(65, 10, 65, 35);   
    doc.line(225, 10, 225, 35); 
    doc.line(65, 22.5, 225, 22.5); 
    
    if (logoUrl) {
        try { doc.addImage(logoUrl, 'PNG', 15, 12, 45, 20); } catch (e) {
            doc.setFontSize(7); doc.text("S/L", 40, 23, { align: 'center' });
        }
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 145, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text("FORMATO MASTER DE VUELO", 145, 30, { align: 'center' });

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

    const finalY = safeAutoTableY(doc, 80) + 25;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA JEFE DE PILOTOS", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA GERENTE GENERAL", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode || 'F-OPS-002'}_VUELO_${orgName}.pdf`);
};

// --- 2. GENERADOR: REGISTRO OPERACIONAL DE BATERÍAS ---
export const generateBatteryReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logoUrl, version, reportDate, formCode } = config;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25); 
    doc.line(65, 10, 65, 35);
    doc.line(225, 10, 225, 35);
    doc.line(65, 22.5, 225, 22.5);

    if (logoUrl) { try { doc.addImage(logoUrl, 'PNG', 15, 12, 45, 20); } catch (e) {} }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 145, 18, { align: 'center' });
    doc.setFontSize(14);
    doc.text("REGISTRO OPERACIONAL DE BATERÍAS", 145, 30, { align: 'center' });

    doc.setFontSize(7);
    doc.line(225, 18, 287, 18);
    doc.line(225, 26, 287, 26);
    doc.text(`VERSIÓN: ${version}`, 227, 15);
    doc.text(`FECHA: ${reportDate}`, 227, 23);
    doc.text(`FORMATO: ${formCode}`, 227, 31);

    autoTable(doc, {
        startY: 40,
        head: [['S/N BATERÍA', 'MARCA', 'DRON USADO', 'CICLOS ACUM.', 'VUELO ID', 'UBICACIÓN', 'CONDICIÓN']],
        body: (data || []).map(f => [
            f.battery?.serial_number || 'N/A', f.battery?.brand || 'N/A', f.aircraft?.model || 'N/A',
            f.battery?.cycles || '0', f.mission_id || 'N/A', f.location || 'N/A', f.visual_condition || 'VMC'
        ]),
        styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.2 },
        margin: { left: 10, right: 10 }
    });

    const finalY = safeAutoTableY(doc, 80) + 30;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA JEFE DE PILOTOS", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA GERENTE GENERAL", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode}_ENERGIA_${orgName}.pdf`);
};

// --- 3. GENERADOR: BITÁCORA DE EXPERIENCIA DE PILOTO ---
export const generatePilotReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logoUrl, version, reportDate, formCode } = config;
    const pilotName = data[0]?.pilots?.name || "N/A";
    const pilotCIPU = data[0]?.pilots?.license_number || "---";

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25); 
    doc.line(65, 10, 65, 35);
    doc.line(225, 10, 225, 35);
    doc.line(65, 22.5, 225, 22.5);

    if (logoUrl) { try { doc.addImage(logoUrl, 'PNG', 15, 12, 45, 20); } catch (e) {} }

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

    const finalY = safeAutoTableY(doc, 80) + 25;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA DEL PILOTO", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA JEFE DE PILOTOS / CERTIFICADOR", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode}_PILOTO_${(pilotName || 'PILOTO').replace(/\s+/g, '_')}.pdf`);
};

// --- GENERADOR: REPORTE DE MANTENIMIENTO (todas las aeronaves o una sola) ---
export const generateMaintenanceReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logoUrl, version, reportDate, formCode, aircraftLabel } = config;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25);
    doc.line(65, 10, 65, 35);
    doc.line(225, 10, 225, 35);
    doc.line(65, 22.5, 225, 22.5);

    if (logoUrl) { try { doc.addImage(logoUrl, 'PNG', 15, 12, 45, 20); } catch (e) {} }

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

    const finalY = safeAutoTableY(doc, 80) + 25;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA TÉCNICO / MANTENIMIENTO", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA GERENTE GENERAL", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode || 'F-MNT'}_MANTENIMIENTO_${orgName}.pdf`);
};

// --- GENERADOR: REPORTE DE FLOTA (inventario, sin rango de fechas) ---
export const generateFleetReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logoUrl, version, reportDate, formCode } = config;

    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25);
    doc.line(65, 10, 65, 35);
    doc.line(225, 10, 225, 35);
    doc.line(65, 22.5, 225, 22.5);

    if (logoUrl) { try { doc.addImage(logoUrl, 'PNG', 15, 12, 45, 20); } catch (e) {} }

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

    const finalY = safeAutoTableY(doc, 80) + 25;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA JEFE DE PILOTOS", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA GERENTE GENERAL", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode || 'F-FLT'}_FLOTA_${orgName}.pdf`);
};

// --- 4. NUEVO GENERADOR: EXPEDIENTE TÉCNICO DE TRIPULANTE (PORTRAIT) ---
export const generatePilotDossier = (pilot, config) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const { orgName, logoUrl, reportDate } = config;

    // --- 1. CABECERA TÉCNICA (PORTRAIT) ---
    doc.setDrawColor(0); doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 25); 
    doc.line(50, 10, 50, 35); doc.line(160, 10, 160, 35);

    if (logoUrl) { try { doc.addImage(logoUrl, 'PNG', 15, 12, 30, 20); } catch (e) {} }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10); doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 105, 18, { align: 'center' });
    doc.setFontSize(12); doc.text("EXPEDIENTE TÉCNICO DE TRIPULANTE", 105, 28, { align: 'center' });
    doc.setFontSize(8); doc.text("VERSIÓN: 1.0", 162, 18); doc.text(`EMISIÓN: ${reportDate}`, 162, 28);

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

    // --- SECCIÓN DE FIRMAS (Ajustada de posición) ---
    const signY = 265;
    doc.setDrawColor(0);
    doc.setFontSize(8);
    doc.line(20, signY, 80, signY);
    doc.text("FIRMA DEL PILOTO", 50, signY + 5, { align: 'center' });
    
    doc.line(130, signY, 190, signY);
    doc.text("FIRMA JEFE DE PILOTOS", 160, signY + 5, { align: 'center' });

    doc.save(`EXPEDIENTE_${(pilot?.name || 'PILOTO').replace(/\s+/g, '_')}.pdf`);
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