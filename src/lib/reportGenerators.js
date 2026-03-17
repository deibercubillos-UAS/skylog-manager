import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// 1. GENERADOR DE PDF PROFESIONAL
export const downloadPDF = (reportType, data, config) => {
  const doc = jsPDF({ orientation: 'landscape' }); // Horizontal para que quepa todo
  
  // Encabezado con marca BitaFly
  doc.setFillColor(26, 32, 44); // Navy deep
  doc.rect(0, 0, 300, 30, 'F');
  
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text("BitaFly Manager - Reporte Oficial", 15, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(236, 91, 19); // Naranja primario
  doc.text(reportType.toUpperCase(), 240, 20);

  // Info del periodo
  doc.setTextColor(100);
  doc.setFontSize(10);
  doc.text(`Periodo de auditoría: ${config.dateFrom} a ${config.dateTo}`, 15, 40);

  // Estructurar Tabla
  const tableColumn = Object.keys(data[0] || {});
  const tableRows = data.map(item => Object.values(item));

  doc.autoTable({
    head: [tableColumn.map(c => c.replace('_', ' ').toUpperCase())],
    body: tableRows,
    startY: 45,
    theme: 'striped',
    headStyles: { fillColor: [236, 91, 19], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
  });

  doc.save(`BitaFly_Reporte_${reportType}_${new Date().getTime()}.pdf`);
};

// 2. GENERADOR DE EXCEL
export const downloadExcel = (reportType, data) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Registros");
  XLSX.writeFile(workbook, `BitaFly_${reportType}.xlsx`);
};

// 3. GENERADOR DE CSV
export const downloadCSV = (reportType, data) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `BitaFly_${reportType}.csv`);
  link.click();
};