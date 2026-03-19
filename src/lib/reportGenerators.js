import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// 1. GENERADOR DE PDF PROFESIONAL CON TOTALES
export const downloadPDF = (reportType, data, config) => {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Calcular sumatoria total de tiempo (HH:MM)
    const totalMinutes = data.reduce((acc, row) => {
      const [h, m] = row.DURACION.split(':').map(Number);
      return acc + (h * 60 + m);
    }, 0);
    const totalTimeFormatted = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

    // --- Header Estético BitaFly ---
    doc.setFillColor(26, 32, 44); // Navy Deep
    doc.rect(0, 0, 297, 25, 'F');
    
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("BitaFly Manager - Reporte Operativo", 15, 16);
    
    doc.setFontSize(9);
    doc.setTextColor(236, 91, 19); 
    doc.text(`TIPO: ${reportType.toUpperCase()}`, 240, 16);

    // --- Información de Auditoría ---
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 15, 32);
    doc.text(`Filtros: ${config.dateFrom} al ${config.dateTo}`, 15, 36);

    const headers = [Object.keys(data[0])];
    const body = data.map(item => Object.values(item));

    // --- GENERACIÓN DE LA TABLA CON FILA DE TOTAL ---
    autoTable(doc, {
      head: headers,
      body: body,
      startY: 42,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [236, 91, 19], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      // FILA DE TOTAL AL FINAL DEL PDF
      foot: [['', '', '', '', '', 'TOTAL ACUMULADO:', totalTimeFormatted]],
      footStyles: { fillColor: [26, 32, 44], textColor: [255, 255, 255], fontStyle: 'bold' },
      margin: { left: 15, right: 15 }
    });

    doc.save(`BitaFly_${reportType}_Oficial.pdf`);
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