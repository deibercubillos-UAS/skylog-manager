// Skylog V2.0 — Listas de Chequeo. Descarga de PDF imprimible para diligenciar a mano (opción B cuando no hay
// internet o como contingencia). Cada paso lleva casillas Sí / No / N/A y arriba van los datos de la operación
// (fecha, piloto, aeronave, misión) para completar a mano. Acepta una lista o varias en un solo PDF.
// Encabezado y paleta: los mismos de los demás reportes (logo y color de la organización).
import { resolveLogo, fetchBitaflyLogo, drawReportHeader, formPalette, slugify } from './pdfCommon';

const PAGE_BOTTOM = 276;
const LEFT = 10;
const WIDTH = 190;
const COL_YES = 150;
const COL_W = 16.6; // Sí · No · N/A

function drawInfoFields(doc, y, palette) {
  const fields = [['Fecha', 40], ['Piloto', 62], ['Aeronave', 45], ['Misión', 43]];
  let x = LEFT;
  doc.setDrawColor(...palette.line);
  doc.setLineWidth(0.3);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...palette.accent);
  fields.forEach(([label, w]) => {
    doc.text(label, x + 1, y);
    doc.line(x, y + 7, x + w - 3, y + 7);
    x += w;
  });
  doc.setTextColor(...palette.ink);
  return y + 13;
}

function drawTableHead(doc, y, palette) {
  doc.setFillColor(...palette.tint);
  doc.setDrawColor(...palette.line);
  doc.rect(LEFT, y, WIDTH, 7, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...palette.accent);
  doc.text('PASO A VERIFICAR', LEFT + 2, y + 4.8);
  ['SÍ', 'NO', 'N/A'].forEach((t, i) => doc.text(t, COL_YES + COL_W * i + COL_W / 2, y + 4.8, { align: 'center' }));
  doc.setTextColor(...palette.ink);
  return y + 7;
}

function drawChecklist(doc, logo, orgName, list, { first, palette }) {
  if (!first) doc.addPage();
  let y = drawReportHeader(doc, { logo, orgName, title: list.name, subtitle: list.category || '', format: { version: list.version || '1.0' } }) + 2;
  if (list.description?.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const lines = doc.splitTextToSize(list.description.trim(), WIDTH);
    doc.text(lines, LEFT, y + 3);
    y += lines.length * 4 + 4;
  }
  y = drawInfoFields(doc, y + 2, palette);
  y = drawTableHead(doc, y, palette);

  const steps = list.steps || [];
  doc.setFontSize(9.5);
  steps.forEach((text, i) => {
    const lines = doc.splitTextToSize(`${i + 1}. ${text}`, COL_YES - LEFT - 4);
    const h = Math.max(9, lines.length * 4.6 + 4);
    if (y + h > PAGE_BOTTOM) {
      doc.addPage();
      y = drawTableHead(doc, 15, palette);
    }
    doc.setDrawColor(...palette.line);
    doc.setLineWidth(0.3);
    doc.rect(LEFT, y, WIDTH, h);
    doc.line(COL_YES, y, COL_YES, y + h);
    doc.line(COL_YES + COL_W, y, COL_YES + COL_W, y + h);
    doc.line(COL_YES + COL_W * 2, y, COL_YES + COL_W * 2, y + h);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...palette.ink);
    doc.text(lines, LEFT + 2, y + 5.6);
    for (let c = 0; c < 3; c += 1) doc.rect(COL_YES + COL_W * c + COL_W / 2 - 2.5, y + h / 2 - 2.5, 5, 5);
    y += h;
  });

  if (steps.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.text('Esta lista todavía no tiene pasos configurados.', LEFT + 2, y + 6);
    y += 10;
  }

  // Observaciones + firma para uso en papel.
  if (y + 40 > PAGE_BOTTOM) {
    doc.addPage();
    y = 20;
  }
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...palette.accent);
  doc.text('OBSERVACIONES', LEFT, y);
  doc.setDrawColor(...palette.line);
  doc.rect(LEFT, y + 2, WIDTH, 18);
  y += 30;
  doc.line(LEFT, y, LEFT + 78, y);
  doc.line(LEFT + 112, y, LEFT + WIDTH, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Nombre y firma de quien verifica', LEFT, y + 4);
  doc.text('Fecha y hora', LEFT + 112, y + 4);
  doc.setTextColor(0);
}

/** Descarga una lista de chequeo (objeto) o varias (arreglo) en un solo PDF para llenar a mano. */
export async function downloadChecklistPdf(checklists, { orgName, logoUrl, fileName } = {}) {
  const lists = (Array.isArray(checklists) ? checklists : [checklists]).filter(Boolean);
  if (!lists.length) throw new Error('No hay listas de chequeo para descargar');
  const { jsPDF } = await import('jspdf');
  const logo = (await resolveLogo(logoUrl)) || (await fetchBitaflyLogo());
  const palette = logo?.palette || formPalette(null);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  lists.forEach((list, i) => drawChecklist(doc, logo, orgName, list, { first: i === 0, palette }));
  const pages = doc.internal.getNumberOfPages();
  const printed = new Date().toLocaleString('es-CO');
  for (let p = 1; p <= pages; p += 1) {
    doc.setPage(p);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`Formato para diligenciar a mano · Descargado el ${printed} · Creado con BITAFLY · página ${p}/${pages}`, 12, 290);
  }
  const name = fileName || (lists.length === 1 ? `${slugify(lists[0].name)}-v${String(lists[0].version || '1.0').replace(/\s+/g, '')}` : `listas-de-chequeo-${slugify(orgName)}`);
  doc.save(`${name}.pdf`);
}
