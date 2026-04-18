import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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
        body: data.map(f => [
            f.flight_date, f.mission_id, f.aircraft?.brand, f.aircraft?.model, f.aircraft?.serial_number, 
            f.aircraft?.ruas, f.location, f.mission_type, f.visual_condition, f.takeoff_time, 
            f.landing_time, f.aircraft?.total_hours?.toFixed(2), f.pilots?.name, f.pilots?.license_number
        ]),
        styles: { fontSize: 5.5, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.2 },
        margin: { left: 10, right: 10 }
    });

    const finalY = doc.lastAutoTable.finalY + 25;
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
        body: data.map(f => [
            f.battery?.serial_number || 'N/A', f.battery?.brand || 'N/A', f.aircraft?.model || 'N/A', 
            f.battery?.cycles || '0', f.mission_id || 'N/A', f.location || 'N/A', f.visual_condition || 'VMC'
        ]),
        styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.2 },
        margin: { left: 10, right: 10 }
    });

    const finalY = doc.lastAutoTable.finalY + 30;
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
        body: data.map(f => {
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

    const finalY = doc.lastAutoTable.finalY + 25;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA DEL PILOTO", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA JEFE DE PILOTOS / CERTIFICADOR", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode}_PILOTO_${pilotName.replace(' ', '_')}.pdf`);
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
        startY: doc.lastAutoTable.finalY + 5,
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
        startY: doc.lastAutoTable.finalY + 5,
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
                let url = '';
                if (data.row.index === 0) url = pilot.id_doc_url;
                if (data.row.index === 1) url = pilot.pilot_course_url;
                if (data.row.index === 2) url = pilot.theoretical_exam_url;
                if (data.row.index === 3) url = pilot.medical_cert_url;
                
                if (url) {
                    doc.setTextColor(0, 0, 255);
                    doc.textWithLink("VER DOCUMENTO", data.cell.x + 3, data.cell.y + 6, { url: url });
                }
            }
        }
    });

   // --- 5. CONTACTO DE EMERGENCIA ---
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 5,
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
        startY: doc.lastAutoTable.finalY + 5,
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

    doc.save(`EXPEDIENTE_${pilot.name.replace(/\s+/g, '_')}.pdf`);
};

// --- GENERADOR: FORMATO 100 UAEAC (SOLICITUD DE AUTORIZACIÓN) ---

export const generateExcelF100 = async (data, profile) => {
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
    worksheet.getCell('V9').value = profile?.id_number;
    worksheet.getCell('V10').value = profile?.email;
    worksheet.getCell('V11').value = profile?.phone;
    worksheet.getCell('V12').value = profile?.address;

    // --- SECCIÓN 2: JEFE DE PILOTOS UAS (Búsqueda Automática) ---
        const chiefPilot = pilots?.find(p => p.pilot_role === 'Jefe de Pilotos');
        if (chiefPilot) {
            worksheet.getCell('V14').value = cleanText(chiefPilot.name);
            worksheet.getCell('V15').value = cleanText(chiefPilot.id_number);
            worksheet.getCell('V16').value = cleanText(chiefPilot.phone);
        }

    // --- SECCIÓN 3: TIPO DE OPERACIÓN (Marcación de X) ---
    // Aquí ponemos la 'X' solo en las celdas que el usuario marcó
    const op = data.tipo_operacion;
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
    // Aquí ponemos la 'X' solo en las celdas que el usuario marcó
    const cv = data.contacto_visual;
    if (cv.VLOS) worksheet.getCell('S35').value = 'X';
    if (cv.EVLOS) worksheet.getCell('AN32').value = 'X';
    if (cv.BVLOS) worksheet.getCell('S36').value = 'X';

    // --- SECCIÓN 6: VUELO ESPECIAL (Marcación de X) ---
    // Aquí ponemos la 'X' solo en las celdas que el usuario marcó
    const ve = data.vuelos_especiales;
    if (ve.nocturno) worksheet.getCell('S35').value = 'X';
    if (ve.urbana) worksheet.getCell('AN35').value = 'X';
    if (ve.autonomo) worksheet.getCell('S36').value = 'X';
    if (ve.demostracion) worksheet.getCell('AN36').value = 'X';
    if (ve.cautiva) worksheet.getCell('S37').value = 'X';
    if (ve.recreativo) worksheet.getCell('AN37').value = 'X';
    worksheet.getCell('B38').value = data.justificacion_especial;

    // --- SECCIÓN 7: AERONAVES (Mapeo de tabla) ---
    // Suponiendo que la tabla de aeronaves empieza en la fila 40
    data.aeronaves.forEach((a, index) => {
        const rowOffset = 43 + (index * 4); // Ajustar según diseño del Excel
        worksheet.getCell(`M${rowOffset}`).value = a.brand;
        worksheet.getCell(`AI${rowOffset}`).value = a.model;
        worksheet.getCell(`AI${rowOffset + 1}`).value = a.serial_number;
    });

    // --- SECCIÓN 11: COORDENADAS ---
        data.points.forEach((p, index) => {
            const row = 89 + index; // Asumiendo que la tabla de coordenadas empieza en 100
            const toGMS = (dec) => {
                const d = Math.abs(dec);
                const deg = Math.floor(d);
                const min = Math.floor((d - deg) * 60);
                const sec = Math.round((d - deg - min / 60) * 3600);
                return `${deg}°${min}'${sec}"`;
            };
            worksheet.getCell(`H${row}`).value = `${toGMS(p.lat)}${p.lat >= 0 ? 'N' : 'S'}`;
            worksheet.getCell(`AK${row}`).value = `${toGMS(p.lng)}W`;
        });

    const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        saveAs(blob, `F100_UAEAC_${profile?.full_name?.replace(/\s+/g, '_')}.xlsx`);

    } catch (error) {
        console.error("Error en generateExcelF100:", error);
        alert("Falla técnica: " + error.message);
    }
};