import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const downloadPDF = (reportType, data, config) => {
  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // --- 1. Cálculo del Total (HH:MM) ---
    let totalTimeFormatted = "0h 0m";
    let hasDuration = false;

    if (data.length > 0) {
      // Buscamos si existe alguna columna que contenga el tiempo (DURACION o DURACIÓN)
      const durationKey = Object.keys(data[0]).find(k => k.toUpperCase().includes('DURACION') || k.toUpperCase().includes('DURACIÓN'));
      
      if (durationKey) {
        hasDuration = true;
        const totalMinutes = data.reduce((acc, row) => {
          const timeVal = row[durationKey];
          if (timeVal && typeof timeVal === 'string' && timeVal.includes(':')) {
            const [h, m] = timeVal.split(':').map(Number);
            return acc + (h * 60 + (m || 0));
          }
          return acc;
        }, 0);
        totalTimeFormatted = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
      }
    }

    // --- 2. Diseño del Header ---
    doc.setFillColor(26, 32, 44); 
    doc.rect(0, 0, 297, 25, 'F');
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("BitaFly Manager - Reporte Oficial", 15, 16);
    
    doc.setFontSize(9);
    doc.setTextColor(236, 91, 19); 
    doc.text(`REPORTE: ${reportType.toUpperCase()}`, 240, 16);

    doc.setTextColor(100);
    doc.setFontSize(8);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 15, 32);
    doc.text(`Rango: ${config.dateFrom} al ${config.dateTo}`, 15, 36);

    // --- 3. Preparación Dinámica de la Tabla ---
    const headers = [Object.keys(data[0] || {})];
    const body = data.map(item => Object.values(item));

    // Crear fila de pie de página dinámica que coincida con el número de columnas
    let footerRows = null;
    if (data.length > 0 && hasDuration) {
      const colCount = headers[0].length;
      const footerArray = new Array(colCount).fill('');
      
      // Colocamos el texto y el valor en las últimas dos columnas disponibles
      footerArray[colCount - 2] = 'TOTAL ACUMULADO:';
      footerArray[colCount - 1] = totalTimeFormatted;
      footerRows = [footerArray];
    }

    // --- 4. Generar Tabla ---
    autoTable(doc, {
      head: headers,
      body: body,
      foot: footerRows,
      startY: 42,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: [236, 91, 19], textColor: [255, 255, 255], fontStyle: 'bold' },
      footStyles: { fillColor: [26, 32, 44], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      margin: { left: 15, right: 15 }
    });

    doc.save(`BitaFly_${reportType}_${new Date().getTime()}.pdf`);
    return true;

  } catch (err) {
    console.error("Error PDF:", err);
    alert("Falla en PDF: " + err.message);
    return false;
  }
};

// ... Funciones Excel y CSV se mantienen igual ...
export const downloadExcel = (reportType, data) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
  XLSX.writeFile(workbook, `BitaFly_${reportType}.xlsx`);
};

export const downloadCSV = (reportType, data) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.setAttribute("download", `BitaFly_${reportType}.csv`);
  link.click();
};