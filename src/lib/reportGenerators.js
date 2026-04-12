import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateMasterReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logoUrl, version, reportDate, formCode } = config;

    // 1. CABECERA TÉCNICA (Marco Blanco)
    doc.setDrawColor(0);
    doc.setLineWidth(0.4);
    doc.rect(10, 10, 277, 25); // Marco exterior

    // Divisores verticales
    doc.line(65, 10, 65, 35);  // Tras el logo
    doc.line(225, 10, 225, 35); // Antes del control

    // LADO IZQUIERDO: Logo Corporativo
    if (logoUrl) {
        try {
            doc.addImage(logoUrl, 'PNG', 15, 12, 45, 20);
        } catch (e) {
            doc.setFontSize(7);
            doc.text("IMAGEN NO DISPONIBLE", 40, 23, { align: 'center' });
        }
    }

    // CENTRO: Título del Documento
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("FORMATO MASTER DE VUELO", 145, 25, { align: 'center' });

    // LADO DERECHO: Control Documental (3 Filas)
    doc.setFontSize(7);
    doc.line(225, 18, 287, 18); // Divisor fila 1-2
    doc.line(225, 26, 287, 26); // Divisor fila 2-3
    
    doc.text(`VERSIÓN: ${version || '1.0'}`, 227, 15);
    doc.text(`FECHA: ${reportDate || '---'}`, 227, 23);
    doc.text(`FORMATO: ${formCode || 'N/A'}`, 227, 31); // SUSTITUYE A ORIGINAL

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

    doc.save(`${formCode || 'MASTER'}_VUELO_${orgName}.pdf`);
};