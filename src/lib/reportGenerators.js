import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateMasterReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logoUrl, version, reportDate, formCode } = config;

    // --- 1. CABECERA TÉCNICA ESTRUCTURADA ---
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25); // Marco Exterior

    // Divisores Verticales Principales
    doc.line(65, 10, 65, 35);   // Límite Logo
    doc.line(225, 10, 225, 35); // Límite Control Documental

    // LADO IZQUIERDO: Logo Corporativo
    if (logoUrl) {
        try {
            doc.addImage(logoUrl, 'PNG', 15, 12, 45, 20);
        } catch (e) {
            doc.setFontSize(7);
            doc.text("IMAGEN NO DISPONIBLE", 40, 23, { align: 'center' });
        }
    }

    // CENTRO: DIVISIÓN EN DOS (Empresa + Título)
    doc.line(65, 22.5, 225, 22.5); // Línea Horizontal Divisoria Central
    
    doc.setFont("helvetica", "bold");
    
    // Fila Superior: Nombre de la Empresa
    doc.setFontSize(11);
    doc.text(orgName ? orgName.toUpperCase() : "BITAFLY UAS", 145, 18, { align: 'center' });
    
    // Fila Inferior: Título del Formato
    doc.setFontSize(14);
    doc.text("FORMATO MASTER DE VUELO", 145, 30, { align: 'center' });

    // LADO DERECHO: Control Documental
    doc.setFontSize(7);
    doc.line(225, 18, 287, 18); // Divisor fila 1-2
    doc.line(225, 26, 287, 26); // Divisor fila 2-3
    
    doc.text(`VERSIÓN: ${version || '1.0'}`, 227, 15);
    doc.text(`FECHA: ${reportDate || '---'}`, 227, 23);
    doc.text(`FORMATO: ${formCode || 'N/A'}`, 227, 31);

    // 2. TABLA DE REGISTROS (Ajustada para mayor legibilidad)
    autoTable(doc, {
        startY: 40,
        head: [[
            'FECHA', 'VUELO', 'MARCA', 'MODELO', 'S/N', 
            'RUAS', 'LUGAR', 'TIPO OPERACIÓN', 'CONDICIÓN', 
            'DESPEGUE', 'LANDING', 'T.T TOTAL', 'PILOTO UAS', 'CIPU', 'OBS'
        ]],
        body: data.map(f => [
            f.flight_date,
            f.mission_id,
            f.aircraft?.brand,
            f.aircraft?.model,
            f.aircraft?.serial_number,
            f.aircraft?.ruas,
            f.location,
            f.mission_type,
            f.visual_condition,
            f.takeoff_time,
            f.landing_time,
            f.aircraft?.total_hours?.toFixed(2),
            f.pilots?.name,
            f.pilots?.license_number,
            f.notes || ''
        ]),
        styles: { fontSize: 5.5, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.2 },
        margin: { left: 10, right: 10 }
    });

    // --- 3. BLOQUE DE FIRMAS Y RESPONSABILIDAD ---
    const finalY = doc.lastAutoTable.finalY + 25; // Espacio tras la tabla
    const pageHeight = doc.internal.pageSize.height;

    // Verificar si las firmas caben en la página actual, si no, crear una nueva
    if (finalY + 30 > pageHeight) {
        doc.addPage();
        doc.setPage(doc.internal.getNumberOfPages());
    }

    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");

    // FIRMA 1: JEFE DE PILOTOS (Izquierda)
    doc.line(30, finalY, 110, finalY); // Línea
    doc.text("FIRMA JEFE DE PILOTOS", 70, finalY + 5, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.text("Responsable de Operaciones UAS", 70, finalY + 9, { align: 'center' });

    // FIRMA 2: GERENTE GENERAL (Derecha)
    doc.setFont("helvetica", "bold");
    doc.line(187, finalY, 267, finalY); // Línea
    doc.text("FIRMA GERENTE GENERAL", 227, finalY + 5, { align: 'center' });
    doc.setFont("helvetica", "normal");
    doc.text("Representante Legal", 227, finalY + 9, { align: 'center' });

    // --- 4. NUMERACIÓN DE PÁGINAS ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text(`Página ${i} de ${totalPages} - BitaFly Aviation Manager`, 148, 200, { align: 'center' });
    }

    doc.save(`${formCode || 'F-OPS-002'}_VUELO_${orgName}.pdf`);
};

export const generateBatteryReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logoUrl, version, reportDate, formCode } = config;

    // --- 1. CABECERA TÉCNICA ---
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

    // --- 2. TABLA TÉCNICA DE ENERGÍA ---
    autoTable(doc, {
        startY: 40,
        head: [['S/N BATERÍA', 'MARCA', 'DRON USADO', 'CICLOS ACUM.', 'VUELO ID', 'UBICACIÓN', 'CONDICIÓN']],
        body: data.map(f => [
            f.battery?.serial_number || 'N/A',
            f.battery?.brand || 'N/A',
            f.aircraft?.model || 'N/A',
            f.battery?.cycles || '0',
            f.mission_id || 'N/A',
            f.location || 'N/A',
            f.visual_condition || 'VMC'
        ]),
        styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center', lineWidth: 0.2 },
        margin: { left: 10, right: 10 }
    });

    // --- 3. FIRMAS (Reutilizando lógica) ---
    const finalY = doc.lastAutoTable.finalY + 30;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA JEFE DE PILOTOS", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA GERENTE GENERAL", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode}_ENERGIA_${orgName}.pdf`);
};

export const generatePilotReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logoUrl, version, reportDate, formCode } = config;
    const pilotName = data[0]?.pilots?.name || "N/A";
    const pilotCIPU = data[0]?.pilots?.license_number || "---";

    // --- 1. CABECERA TÉCNICA ---
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

    // --- 2. TABLA DE EXPERIENCIA ---
    let totalAcumulado = 0;
    autoTable(doc, {
        startY: 40,
        head: [['FECHA', 'MISIÓN ID', 'MODELO UAS', 'S/N EQUIPO', 'UBICACIÓN', 'DEP', 'ARR', 'DURACIÓN (H)', 'OBSERVACIONES']],
        body: data.map(f => {
            totalAcumulado += parseFloat(f.total_time || 0);
            return [
                f.flight_date,
                f.mission_id,
                f.aircraft?.model || 'N/A',
                f.aircraft?.serial_number || 'N/A',
                f.location,
                f.takeoff_time,
                f.landing_time,
                f.total_time?.toFixed(2) || '0.00',
                f.notes || ''
            ];
        }),
        foot: [['', '', '', '', '', '', 'TOTAL PERIODO:', totalAcumulado.toFixed(2) + ' H', '']],
        styles: { fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', halign: 'center' },
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { left: 10, right: 10 }
    });

    // --- 3. FIRMAS ---
    const finalY = doc.lastAutoTable.finalY + 25;
    doc.line(30, finalY, 110, finalY);
    doc.text("FIRMA DEL PILOTO", 70, finalY + 5, { align: 'center' });
    doc.line(187, finalY, 267, finalY);
    doc.text("FIRMA JEFE DE PILOTOS / CERTIFICADOR", 227, finalY + 5, { align: 'center' });

    doc.save(`${formCode}_PILOTO_${pilotName.replace(' ', '_')}.pdf`);
};