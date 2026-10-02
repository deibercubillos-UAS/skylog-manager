// Skylog V2.0 — helpers de PDF compartidos por Reportes. Mismo patrón de
// encabezado (caja + logo + VERSIÓN/FECHA) que ya usan `missionDocs.js`
// (Programación) y `checklistDocs.js` (Listas de Chequeo) — aquí sí se
// extrae a un módulo común porque Reportes necesita el mismo helper 7
// veces; los dos archivos anteriores quedan con su propia copia (no se
// refactorizaron, fuera de alcance de este pedido — ver decisión 127).
export async function resolveLogo(logoUrl) {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('No se pudo leer el logo'));
      reader.readAsDataURL(blob);
    });
    const { width, height } = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = dataUrl;
    });
    const format = blob.type.includes('png') ? 'PNG' : blob.type.includes('webp') ? 'WEBP' : 'JPEG';
    return { dataUrl, format, width, height };
  } catch {
    return null;
  }
}

let cachedBitaflyLogo;
export async function fetchBitaflyLogo() {
  if (cachedBitaflyLogo !== undefined) return cachedBitaflyLogo;
  cachedBitaflyLogo = await resolveLogo('/logo.png');
  return cachedBitaflyLogo;
}

export function addLogo(doc, logo, x, y, w, h) {
  if (!logo?.dataUrl) return;
  try {
    let drawW = w,
      drawH = h,
      drawX = x,
      drawY = y;
    if (logo.width && logo.height) {
      const scale = Math.min(w / logo.width, h / logo.height);
      drawW = logo.width * scale;
      drawH = logo.height * scale;
      drawX = x + (w - drawW) / 2;
      drawY = y + (h - drawH) / 2;
    }
    doc.addImage(logo.dataUrl, logo.format || 'PNG', drawX, drawY, drawW, drawH);
  } catch {
    // logo inválido — se omite sin romper el PDF
  }
}

/** Dibuja la caja de encabezado estándar y devuelve el Y donde empieza el contenido. */
export function drawReportHeader(doc, { logo, orgName, title, subtitle }) {
  const reportDate = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });

  doc.setDrawColor(0);
  doc.setLineWidth(0.4);
  doc.rect(10, 10, 190, 22);
  doc.line(45, 10, 45, 32);
  doc.line(160, 10, 160, 32);
  doc.line(45, 21, 160, 21);

  addLogo(doc, logo, 12, 12, 30, 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(orgName ? orgName.toUpperCase() : 'BITAFLY UAS', 102.5, 17, { align: 'center' });
  doc.setFontSize(11);
  doc.text(title.toUpperCase(), 102.5, 27, { align: 'center' });
  if (subtitle) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 102.5, 31, { align: 'center' });
  }

  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.line(160, 15.5, 190, 15.5);
  doc.text(`VERSIÓN: 1.0`, 162, 13);
  doc.text(`FECHA: ${reportDate}`, 162, 19);

  return 40;
}

/** Nota de trazabilidad + numeración de página en cada hoja — al final, tras conocer el total. */
export function drawFooterNote(doc, periodLabel) {
  const downloadedAt = new Date().toLocaleString('es-CO');
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`Periodo: ${periodLabel} — Descargado el: ${downloadedAt} — página ${p}/${pageCount}`, 12, 290);
    doc.text('BitaFly · bitafly.com', 198, 290, { align: 'right' });
  }
}

export function slugify(text) {
  return (text || 'reporte')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}
