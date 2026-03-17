import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

export const downloadPDF = (reportType, data, config, lastMaintenance = null) => {
  const doc = new jsPDF({ orientation: 'landscape' });
  
  // Header Navy
  doc.setFillColor(26, 32, 44);
  doc.rect(0, 0, 300, 30, 'F');
  
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text("BitaFly Manager - Reporte Técnico", 15, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(236, 91, 19);
  doc.text(reportType.toUpperCase(), 240, 20);

  // Información General
  doc.setTextColor(100);
  doc.text(`Generado: ${new Date().toLocaleDateString()}`, 15, 38);
  doc.text(`Rango: ${config.dateFrom} a ${config.dateTo}`, 15, 43);

  // Si hay datos de último mantenimiento para reporte de flota
  if (lastMaintenance) {
    doc.setFillColor(248, 246, 246);
    doc.rect(180, 35, 100, 15, 'F');
    doc.setTextColor(26, 32, 44);
    doc.setFont(undefined, 'bold');
    doc.text(`Último Mantenimiento: ${lastMaintenance.maintenance_date}`, 185, 42);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    doc.text(`Tarea: ${lastMaintenance.maintenance_type}`, 185, 47);
  }

  const tableColumn = Object.keys(data[0] || {}).map(c => c.replace('_', ' ').toUpperCase());
  const tableRows = data.map(item => Object.values(item));

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: lastMaintenance ? 55 : 50,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [236, 91, 19] },
  });

  doc.save(`BitaFly_${reportType}_${new Date().getTime()}.pdf`);
};

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