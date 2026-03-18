import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // Importación directa de la función
import * as XLSX from 'xlsx';

// 1. GENERADOR DE PDF PROFESIONAL
export const downloadPDF = (reportType, data, config, lastMaintenance = null) => {
  try {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // --- Header Estético Navy ---
    doc.setFillColor(26, 32, 44); 
    doc.rect(0, 0, 297, 25, 'F');
    
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("BitaFly Manager - Reporte Oficial", 15, 16);
    
    doc.setFontSize(9);
    doc.setTextColor(236, 91, 19); // Naranja BitaFly
    doc.text(`CATEGORÍA: ${reportType.toUpperCase()}`, 240, 16);

    // --- Información de Auditoría ---
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(8);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 15, 32);
    doc.text(`Filtros: ${config.dateFrom} al ${config.dateTo}`, 15, 36);

    if (lastMaintenance) {
      doc.setFont(undefined, 'bold');
      doc.text(`Último Mantenimiento: ${lastMaintenance.maintenance_date}`, 190, 32);
      doc.setFont(undefined, 'normal');
    }

    // --- Preparación de Columnas y Filas ---
    if (!data || data.length === 0) {
        alert("No hay datos para incluir en el PDF");
        return;
    }

    const headers = [Object.keys(data[0])];
    const body = data.map(item => Object.values(item));

    // --- GENERACIÓN DE LA TABLA (USANDO LA FUNCIÓN DIRECTA) ---
    autoTable(doc, {
      head: headers,
      body: body,
      startY: 42,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2 },
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
      doc.text(`BitaFly Aviation - Página ${i} de ${pageCount}`, 15, 202);
    }

    doc.save(`BitaFly_Reporte_${reportType}.pdf`);
    return true;

  } catch (err) {
    console.error("Error crítico en PDF:", err);
    alert("Falla en el motor de PDF: " + err.message);
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