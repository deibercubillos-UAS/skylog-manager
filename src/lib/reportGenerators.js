import jsPDF from 'jsPDF';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// 1. GENERADOR DE PDF PROFESIONAL CON TOTALES (Vuelos y Horas)
export const downloadPDF = (reportType, data, config) => {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // --- Header Estético BitaFly ---
    doc.setFillColor(26, 32, 44); 
    doc.rect(0, 0, 297, 25, 'F');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("BitaFly Manager - Reporte Oficial", 15, 16);
    
    doc.setFontSize(9);
    doc.setTextColor(236, 91, 19); 
    doc.text(`CATEGORÍA: ${reportType.toUpperCase()}`, 240, 16);

    // --- Info de Auditoría ---
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 15, 32);
    doc.text(`Periodo: ${config.dateFrom} al ${config.dateTo}`, 15, 36);

    const headers = [Object.keys(data[0] || {})];
    const body = data.map(item => Object.values(item));

    // --- LÓGICA DE TOTALES (Vuelos + Duración) ---
    let footerRows = [];
    if (data.length > 0 && data[0].DURACION) {
      // 1. Contar vuelos
      const totalCount = data.length;

      // 2. Sumar minutos
      const totalMinutes = data.reduce((acc, row) => {
        if (row.DURACION && row.DURACION.includes(':')) {
          const [h, m] = row.DURACION.split(':').map(Number);
          return acc + (h * 60 + (m || 0));
        }
        return acc;
      }, 0);

      const totalTime = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
      
      // Creamos la fila de totales adaptada al ancho
      footerRows = [['', '', '', 'RESUMEN TOTAL:', `Cantidad: ${totalCount} registros`, 'Tiempo Acumulado:', totalTime]];
    }

    autoTable(doc, {
      head: headers,
      body: body,
      foot: footerRows.length > 0 ? footerRows : null,
      startY: 42,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [236, 91, 19], textColor: [255, 255, 255] },
      footStyles: { fillColor: [26, 32, 44], textColor: [255, 255, 255], fontStyle: 'bold' },
      margin: { left: 15, right: 15 }
    });

    doc.save(`BitaFly_Reporte_${reportType}.pdf`);
    return true;
  } catch (err) {
    console.error("Error PDF:", err);
    alert("Falla en PDF: " + err.message);
    return false;
  }
};

// 2. GENERADOR DE EXCEL
export const downloadExcel = (reportType, data) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, `BitaFly_${reportType}.xlsx`);
};

// 3. GENERADOR DE CSV
export const downloadCSV = (reportType, data) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `BitaFly_${reportType}.csv`);
  link.click();
};