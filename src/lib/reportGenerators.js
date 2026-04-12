import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateMasterReport = (data, orgName) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // ESTILO CABECERA (Basado en la imagen)
    doc.setFillColor(0, 31, 63); // Navy Blue Profesional
    doc.rect(10, 10, 277, 20, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("FORMATO MASTER DE VUELO", 143, 22, { align: 'center' });
    
    doc.setFontSize(8);
    doc.text("VERSIÓN: 1.0", 260, 18);
    doc.text("ORIGINAL", 260, 25);

    // TABLA DE DATOS
    autoTable(doc, {
        startY: 30,
        head: [[
            'FECHA', 'No. DE VUELO', 'MARCA', 'MODELO', 'S/N AERONAVE', 
            'RUAS', 'LUGAR', 'TIPO DE OPERACIÓN', 'CONDICIÓN VISUAL', 
            'DESPEGUE', 'ATERRIZAJE', 'T.T TOTAL', 'PILOTO UAS', 'CIPU', 'OBSERVACIONES'
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
        styles: { fontSize: 6, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [0, 31, 63], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            0: { cellWidth: 15 }, // Fecha
            1: { cellWidth: 15 }, // Vuelo
            14: { cellWidth: 30 } // Observaciones
        },
        margin: { left: 10, right: 10 }
    });

    doc.save(`MASTER_VUELO_${orgName}_${new Date().toISOString().split('T')[0]}.pdf`);
};