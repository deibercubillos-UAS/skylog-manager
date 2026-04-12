import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateMasterReport = (data, config) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const { orgName, logoUrl, version, reportDate } = config;

    // 1. CABECERA ESTRUCTURADA (Simulando la imagen del cliente)
    // Dibujar el marco exterior de la cabecera
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 277, 25); // Marco principal

    // Líneas divisoras
    doc.line(60, 10, 60, 35);  // Divisor Logo
    doc.line(230, 10, 230, 35); // Divisor Control

    // LADO IZQUIERDO: Logo
    if (logoUrl) {
        try {
            doc.addImage(logoUrl, 'PNG', 15, 12, 40, 20);
        } catch (e) {
            doc.setFontSize(8);
            doc.text("LOGO", 35, 23, { align: 'center' });
        }
    }

    // CENTRO: Título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("FORMATO MASTER DE VUELO", 145, 25, { align: 'center' });

    // LADO DERECHO: Control de Versiones
    doc.setFontSize(8);
    doc.line(230, 18, 287, 18); // Línea horizontal interna
    doc.line(230, 26, 287, 26); // Segunda línea horizontal
    
    doc.text(`VERSIÓN: ${version || '1.0'}`, 232, 15);
    doc.text(`FECHA: ${reportDate || 'N/A'}`, 232, 23);
    doc.text("ORIGINAL", 232, 31);

    // 2. TABLA DE REGISTROS
    autoTable(doc, {
        startY: 40,
        head: [[
            'FECHA', 'VUELO', 'MARCA', 'MODELO', 'S/N', 
            'RUAS', 'LUGAR', 'TIPO OP', 'VISUAL', 
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
        styles: { 
            fontSize: 6, 
            cellPadding: 1, 
            lineColor: [150, 150, 150], 
            lineWidth: 0.1,
            valign: 'middle'
        },
        headStyles: { 
            fillColor: [240, 240, 240], 
            textColor: [0, 0, 0], 
            fontStyle: 'bold', 
            halign: 'center',
            lineWidth: 0.2
        },
        margin: { left: 10, right: 10 }
    });

    doc.save(`MASTER_VUELO_${orgName}_V${version}.pdf`);
};