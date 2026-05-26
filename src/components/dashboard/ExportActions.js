'use client';

import React, { useState } from 'react';
import { toast } from '@/lib/toast';

export default function ExportActions({ data, reportName = "Bitafly-Report" }) {
  const [isExporting, setIsExporting] = useState(false);

  // Sin datos no hay nada que exportar
  if (!data?.length) {
    return (
      <div className="flex gap-2">
        <button disabled className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-sm cursor-not-allowed" title="Sin datos para exportar">
          <span className="material-symbols-outlined text-sm">table_view</span> Excel
        </button>
        <button disabled className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-lg text-sm cursor-not-allowed" title="Sin datos para exportar">
          <span className="material-symbols-outlined text-sm">picture_as_pdf</span> PDF
        </button>
      </div>
    );
  }

  // --- EXPORTAR A EXCEL (Dynamic Import) ---
  const exportToExcel = async () => {
    try {
      setIsExporting(true);
      
      // CARGA DINÁMICA: La librería xlsx solo se descarga aquí
      const { utils, writeFile } = await import('xlsx');
      
      const worksheet = utils.json_to_sheet(data);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Datos");
      
      writeFile(workbook, `${reportName}.xlsx`);
    } catch (error) {
      console.error("Error al exportar Excel:", error);
      toast.error("No se pudo generar el Excel");
    } finally {
      setIsExporting(false);
    }
  };

  // --- EXPORTAR A PDF (Dynamic Import) ---
  const exportToPDF = async () => {
    try {
      setIsExporting(true);

      // CARGA DINÁMICA: Estas dos librerías juntas pesan mucho, 
      // así que solo las traemos bajo demanda.
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();
      
      // Configuración estética del PDF (Estilo Bitafly)
      doc.setFontSize(18);
      doc.setTextColor(236, 91, 19); // Color Primary #ec5b13
      doc.text("Reporte Aeronáutico - Bitafly", 14, 22);
      
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 30);

      // Generar tabla automática
      autoTable(doc, {
        startY: 35,
        head: [Object.keys(data[0] || {})],
        body: data.map(obj => Object.values(obj)),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [26, 32, 44] } // Color Navy #1A202C
      });

      doc.save(`${reportName}.pdf`);
    } catch (error) {
      console.error("Error al exportar PDF:", error);
      toast.error("No se pudo generar el PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={exportToExcel}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-sm">table_view</span>
        {isExporting ? 'Procesando...' : 'Excel'}
      </button>

      <button
        onClick={exportToPDF}
        disabled={isExporting}
        className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg hover:bg-slate-800 transition-all text-sm disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
        {isExporting ? 'Procesando...' : 'PDF'}
      </button>
    </div>
  );
}