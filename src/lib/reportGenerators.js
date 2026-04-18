import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
// ASEGÚRESE QUE EL NOMBRE SEA EXACTAMENTE ESTE:

export const generateAeroForm100 = (data, org, profile) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // --- CONFIGURACIÓN DE ESTILO OFICIAL ---
    const drawOfficialHeader = (pageNum) => {
        doc.setDrawColor(0); doc.setLineWidth(0.5);
        doc.rect(10, 10, 190, 25); // Marco exterior
        doc.line(55, 10, 55, 35); doc.line(160, 10, 160, 35);
        
        // Espacio para Logo A
        doc.setFontSize(14); doc.setFont("helvetica", "bold");
        doc.text("A", 32.5, 22, { align: 'center' });
        doc.setFontSize(6);
        doc.text("AERONÁUTICA CIVIL", 32.5, 28, { align: 'center' });
        doc.text("UNIDAD ADMINISTRATIVA ESPECIAL", 32.5, 31, { align: 'center' });

        doc.setFontSize(8);
        doc.text("FORMATO", 107.5, 15, { align: 'center' });
        doc.setFontSize(9);
        doc.text("100- SOLICITUD DE AUTORIZACIÓN DE VUELO UAS", 107.5, 25, { align: 'center' });

        doc.setFontSize(7);
        doc.line(160, 18, 200, 18); doc.line(160, 26, 200, 26);
        doc.text(`Clave: MAUT-5.0-12-056`, 162, 15);
        doc.text(`Versión: 01`, 162, 23);
        doc.text(`Fecha de aprobación: 07/11/2023`, 162, 31);
        doc.text(`Página: ${pageNum} de 7`, 180, 285);
    };

    // --- PÁGINA 1: DATOS SOLICITANTE Y OPERACIÓN ---
    drawOfficialHeader(1);

    autoTable(doc, {
        startY: 35,
        head: [['1. DATOS DEL SOLICITANTE', '']],
        body: [
            ['NOMBRE COMPLETO:', profile?.full_name?.toUpperCase() || ''],
            ['TIPO DOCUMENTO:', 'CEDULA DE CIUDADANIA'],
            ['NÚMERO DOCUMENTO:', profile?.id_number || ''],
            ['CORREO ELECTRÓNICO:', profile?.email || ''],
            ['NÚMERO DE CONTACTO:', profile?.phone || ''],
            ['DIRECCIÓN DE RESIDENCIA:', profile?.address || '']
        ],
        theme: 'grid', styles: { fontSize: 7, cellPadding: 1, lineColor: 0, textColor: 0 },
        headStyles: { fillColor: [230, 230, 230], fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold' } }
    });

    // Sección 3: Operación (X)
    const op = data.tipo_operacion;
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 2,
        head: [['3. TIPO DE OPERACION AEREA', '', 'TIPO DE OPERACION AEREA', '']],
        body: [
            ['SIMPLE CAPTURA DE IMÁGENES', op.simple_captura?'X':'', 'VIGILANCIA Y SEGURIDAD', op.vigilancia_seguridad?'X':''],
            ['MEDIOS DE COMUNICACIÓN', op.medios_comunicacion?'X':'', 'ASPERSIÓN', op.aspersion?'X':''],
            ['DISPERSIÓN', op.dispersion?'X':'', 'ENJAMBRE', op.enjambre?'X':''],
            ['CARGA (DELIVERY)', op.carga_delivery?'X':'', 'INSTRUCCIÓN', op.instruccion?'X':''],
        ],
        theme: 'grid', styles: { fontSize: 6, halign: 'center' },
        headStyles: { fillColor: [230, 230, 230], textColor: 0 },
        columnStyles: { 0: { halign: 'left' }, 2: { halign: 'left' } }
    });

    // Sección 4: Información Operación
    autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 2,
        head: [['4. INFORMACIÓN DE LA OPERACIÓN AÉREA', '']],
        body: [
            ['EMPRESA CONTRATANTE:', data.empresa_contratante?.toUpperCase()],
            ['FECHA INICIO:', data.fecha_inicio, 'HORARIO INICIO (UTC):', data.hora_inicio],
            ['FECHA FINALIZACIÓN:', data.fecha_fin, 'HORARIO FIN (UTC):', data.hora_fin],
            ['PESO BRUTO MAX (KG):', data.peso_maximo, 'MUNICIPIO/DEPTO:', `${data.municipality} / ${data.department}`]
        ],
        theme: 'grid', styles: { fontSize: 7 },
        headStyles: { fillColor: [230, 230, 230], textColor: 0 }
    });

    // --- PÁGINA 2: AERONAVES ---
    doc.addPage(); drawOfficialHeader(2);
    autoTable(doc, {
        startY: 35,
        head: [['7. AERONAVE(S) NO TRIPULADA(S) UAS', 'MODELO', 'S/N', 'PÓLIZA RCE']],
        body: data.aeronaves.map(a => [a.brand?.toUpperCase(), a.model, a.serial_number, a.policy || '---']),
        theme: 'grid', styles: { fontSize: 7 },
        headStyles: { fillColor: [230, 230, 230], textColor: 0 }
    });

    // --- PÁGINA 3: COORDENADAS ---
    doc.addPage(); drawOfficialHeader(3);
    doc.setFontSize(8); doc.text("11. COORDENADAS DE LA OPERACIÓN AÉREA (WGS-84)", 10, 40);
    autoTable(doc, {
        startY: 45,
        head: [['ITEM', 'LATITUD (N/S)', 'LONGITUD (W)', 'ALTURA (FT)']],
        body: data.points.map((p, i) => {
            const toGMS = (dec) => {
                const d = Math.abs(dec);
                const deg = Math.floor(d);
                const min = Math.floor((d - deg) * 60);
                const sec = Math.round((d - deg - min / 60) * 3600);
                return `${deg}°${min}'${sec}"`;
            };
            return [i+1, `${toGMS(p.lat)}${p.lat>=0?'N':'S'}`, `${toGMS(p.lng)}W`, data.altitude || '400'];
        }),
        theme: 'grid', styles: { fontSize: 7, halign: 'center' },
        headStyles: { fillColor: [0, 0, 0], textColor: 255 }
    });

    // --- PÁGINA 7: FIRMAS ---
    doc.addPage(); drawOfficialHeader(7);
    doc.line(30, 200, 100, 200);
    doc.setFontSize(8);
    doc.text("14. FIRMA DE JEFE DE PILOTOS O QUIEN HAGA SUS VECES", 65, 205, { align: 'center' });
    doc.text(profile?.full_name?.toUpperCase() || '', 65, 210, { align: 'center' });

    doc.save(`F100_UAEAC_${org?.company_name?.replace(/\s+/g, '_')}.pdf`);
};