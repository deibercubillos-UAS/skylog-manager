// Skylog V2.0 — SMS: PDF de la lista de asistencia en línea de un avance de
// control. 100% client-side al descargar; usa el encabezado/logo/nota
// compartidos de `pdfCommon.js`.
import autoTable from 'jspdf-autotable';
import { HEAD_STYLES, resolveLogo, fetchBitaflyLogo, drawReportHeader, drawFooterNote, slugify } from './pdfCommon';

const TABLE_STYLES = { fontSize: 9, cellPadding: 2, lineColor: [220, 220, 220], lineWidth: 0.1 };

export async function downloadAttendancePdf({ orgName, nit, logoUrl, subtitle, attendees } = {}) {
  const { jsPDF } = await import('jspdf');
  const logo = (await resolveLogo(logoUrl)) || (await fetchBitaflyLogo());
  const headerName = nit ? `${orgName || ''} · NIT ${nit}`.trim() : orgName;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = drawReportHeader(doc, { logo, orgName: headerName, title: 'Lista de Asistencia', subtitle });

  const list = attendees || [];
  if (!list.length) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('No hay asistentes registrados.', 10, startY + 6);
  } else {
    autoTable(doc, {
      startY: startY + 4,
      head: [['#', 'NOMBRE', 'DOCUMENTO', 'CARGO', 'FIRMA']],
      body: list.map((a, i) => [String(i + 1), a.full_name || '—', a.document || '—', a.role || '—', '']),
      styles: TABLE_STYLES,
      headStyles: HEAD_STYLES,
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 4: { cellWidth: 45 } },
      margin: { left: 10, right: 10 },
    });
  }

  drawFooterNote(doc, 'Instantánea (sin rango de fechas)');
  doc.save(`lista-asistencia-${slugify(orgName)}.pdf`);
}
