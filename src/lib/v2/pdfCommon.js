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
    if (blob.type.includes('svg')) {
      // jsPDF no dibuja SVG: se rasteriza a PNG.
      const w = width || 400;
      const h = height || 200;
      const canvas = document.createElement('canvas');
      canvas.width = w * 2;
      canvas.height = h * 2;
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = dataUrl;
      });
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      return { dataUrl: canvas.toDataURL('image/png'), format: 'PNG', width: w, height: h };
    }
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
export function drawReportHeader(doc, { logo, orgName, title, subtitle, format }) {
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
  const version = format?.version || '1.0';
  if (format?.code) {
    // Tres filas: código, versión y fecha (la organización define el código en su manual de operaciones).
    doc.line(160, 17.3, 200, 17.3);
    doc.line(160, 24.6, 200, 24.6);
    doc.text(`CÓDIGO: ${format.code}`, 162, 14.4);
    doc.text(`VERSIÓN: ${version}`, 162, 21.7);
    doc.text(`FECHA: ${reportDate}`, 162, 29);
  } else {
    doc.line(160, 21, 200, 21);
    doc.text(`VERSIÓN: ${version}`, 162, 16.5);
    doc.text(`FECHA: ${reportDate}`, 162, 27);
  }

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
