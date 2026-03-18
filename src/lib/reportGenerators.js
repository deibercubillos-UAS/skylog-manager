import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// 1. GENERADOR DE PDF (CORREGIDO)
export const downloadPDF = (reportType, data, config, lastMaintenance = null) => {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // --- Header Estético ---
    doc.setFillColor(26, 32, 44); // Navy Deep
    doc.rect(0, 0, 297, 25, 'F');
    
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("BitaFly Manager - Reporte Oficial", 15, 16);
    
    doc.setFontSize(9);
    doc.setTextColor(236, 91, 19); // Orange
    doc.text(`CATEGORÍA: ${reportType.toUpperCase()}`, 240, 16);

    // --- Información de Auditoría ---
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, 15, 32);
    doc.text(`Rango de consulta: ${config.dateFrom} hasta ${config.dateTo}`, 15, 36);

    if (lastMaintenance) {
      doc.setFont(undefined, 'bold');
      doc.text(`Último Mantenimiento detectado: ${lastMaintenance.maintenance_date}`, 200, 32);
      doc.setFont(undefined, 'normal');
    }

    // --- Preparación de Datos (Asegurar que sean solo Texto) ---
    if (!data || data.length === 0) throw new Error("No hay datos para procesar");

    const headers = [Object.keys(data[0]).map(h => h.replace('_', ' ').toUpperCase())];
    const body = data.map(obj => Object.values(obj).map(val => val === null || val === undefined ? '' : String(val)));

    // --- Generación de Tabla ---
    doc.autoTable({
      head: headers,
      body: body,
      startY: 42,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [236, 91, 19], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 15, right: 15 }
    });

    // --- Pie de página ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`BitaFly Aviation Systems - Página ${i} de ${pageCount}`, 15, 205);
    }

    doc.save(`BitaFly_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
    return true;
  } catch (err) {
    console.error("Error Generador PDF:", err);
    alert("Error al generar PDF: " + err.message);
    return false;
  }
};

// 2. EXCEL & CSV (Se mantienen pero optimizados para limpiar objetos)
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