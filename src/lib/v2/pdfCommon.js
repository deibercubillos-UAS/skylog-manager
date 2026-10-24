// Skylog V2.0 — helpers de PDF compartidos por Reportes. Mismo patrón de
// encabezado (caja + logo + VERSIÓN/FECHA) que ya usan `missionDocs.js`
// (Programación) y `checklistDocs.js` (Listas de Chequeo) — aquí sí se
// extrae a un módulo común porque Reportes necesita el mismo helper 7
// veces; los dos archivos anteriores quedan con su propia copia (no se
// refactorizaron, fuera de alcance de este pedido — ver decisión 127).
export async function resolveLogo(logoUrl) {
  if (!logoUrl) return null;
  try {
    // Primero directo (sin caché: el <img> del sidebar pudo dejarla guardada sin cabeceras CORS); si falla, por el servidor.
    let res = await fetch(logoUrl, { cache: 'no-store' }).catch(() => null);
    if ((!res || !res.ok) && /^https?:/.test(logoUrl)) res = await fetch(`/api/organizacion/logo/image?url=${encodeURIComponent(logoUrl)}`).catch(() => null);
    if (!res || !res.ok) return null;
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

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  const d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return [h, s, l];
}

function hslToRgb([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((v) => Math.round((v + m) * 255));
}

/** Color dominante del logo (ignora fondo transparente, blancos y grises); null si no hay uno claro. */
export async function dominantLogoColor(logo) {
  if (!logo?.dataUrl || typeof document === 'undefined') return null;
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = logo.dataUrl;
    });
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const buckets = new Map();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const [h, s, l] = rgbToHsl([data[i], data[i + 1], data[i + 2]]);
      if (l > 0.92 || l < 0.08 || s < 0.25) continue;
      const key = Math.round(h / 20) % 18;
      const b = buckets.get(key) || { w: 0, h: 0, s: 0 };
      b.w += s;
      b.h += h * s;
      b.s += s * s;
      buckets.set(key, b);
    }
    let best = null;
    buckets.forEach((b) => {
      if (!best || b.w > best.w) best = b;
    });
    if (!best) return null;
    return { h: best.h / best.w, s: best.s / best.w };
  } catch {
    return null;
  }
}

/** Paleta sobria para formatos impresos a partir del color de la organización (o gris pizarra si no hay). */
export function formPalette(brand) {
  if (!brand) return { accent: [71, 85, 105], ink: [30, 41, 59], tint: [241, 245, 249], line: [203, 213, 225] };
  const h = brand.h;
  const s = Math.min(brand.s, 0.55);
  return {
    accent: hslToRgb([h, s, 0.38]),
    ink: hslToRgb([h, Math.min(s, 0.4), 0.18]),
    tint: hslToRgb([h, Math.min(s, 0.45), 0.95]),
    line: hslToRgb([h, Math.min(s, 0.2), 0.75]),
  };
}
