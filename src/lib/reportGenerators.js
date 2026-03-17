import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// 1. GENERADOR DE PDF
export const downloadPDF = (reportType, data, config) => {
  const doc = new jsPDF();
  const title = `REPORTE OFICIAL: ${reportType.toUpperCase()}`;
  
  // Encabezado
  doc.setFontSize(18);
  doc.setTextColor(26, 32, 44); // Color Navy
  doc.text("SkyLog Manager UAS", 14, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Periodo: ${config.dateFrom} a ${config.dateTo}`, 14, 30);
  doc.text(`Tipo: ${reportType}`, 14, 35);

  // Tabla de datos
  const tableColumn = Object.keys(data[0] || {});
  const tableRows = data.map(item => Object.values(item));

  doc.autoTable({
    head: [tableColumn],
    body: tableRows,
    startY: 45,
    theme: 'grid',
    headStyles: { fillStyle: [236, 91, 19] }, // Color Primary Naranja
  });

  doc.save(`SkyLog_${reportType}_${config.dateTo}.pdf`);
};

// 2. GENERADOR DE EXCEL
export const downloadExcel = (reportType, data) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
  XLSX.writeFile(workbook, `SkyLog_${reportType}.xlsx`);
};

// 3. GENERADOR DE CSV
export const downloadCSV = (reportType, data) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const csv = XLSX.utils.sheet_to_csv(worksheet);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `SkyLog_${reportType}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};