// Skylog V2.0 — Listas de Chequeo. Descarga de PDF imprimible — a pedido
// explícito del usuario: "quisiera poder imprimir las listas de chequeo
// para que tengan acceso si no hay internet, o como contingencia... deben
// contar con el encabezado, incluyendo nombre, version, nombre de la
// empresa y logo". Cada paso se dibuja con una casilla real (rect) para
// marcar a mano en papel — no un checklist de solo lectura.
//
// Misma plantilla de encabezado que `missionDocs.js` (caja con borde,
// logo a la izquierda, título centrado, VERSIÓN/FECHA a la derecha, nota
// de trazabilidad al pie) — pero a diferencia de ese archivo (escrito
// cuando `organizations` todavía no tenía `logo_url`), aquí SÍ se usa el
// logo real de la organización cuando existe (`api/organizacion/logo`, ya
// construido) — con el logo de BitaFly como respaldo honesto solo si la
// organización no ha subido el suyo.
function slugify(text) {
  return (text || 'lista-de-chequeo')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

async function urlToLogo(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
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
async function fetchBitaflyLogo() {
  if (cachedBitaflyLogo !== undefined) return cachedBitaflyLogo;
  cachedBitaflyLogo = await urlToLogo('/logo.png');
  return cachedBitaflyLogo;
}

// Inserta el logo dentro de la caja (x,y,w,h) preservando su relación de
// aspecto ("contain", centrado) — idéntico a addLogo() en missionDocs.js.
function addLogo(doc, logo, x, y, w, h) {
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

const PAGE_BOTTOM = 280;

function drawHeader(doc, logo, orgName, checklist) {
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
  doc.setFontSize(12);
  doc.text(checklist.name.toUpperCase(), 102.5, 28, { align: 'center' });

  doc.setFontSize(6.5);
  doc.line(160, 15.5, 190, 15.5);
  doc.text(`VERSIÓN: ${checklist.version || '1.0'}`, 162, 13);
  doc.text(`FECHA: ${reportDate}`, 162, 19);

  return 40;
}

export async function downloadChecklistPdf(checklist, { orgName, logoUrl } = {}) {
  const { jsPDF } = await import('jspdf');
  const logo = (await urlToLogo(logoUrl)) || (await fetchBitaflyLogo());
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawHeader(doc, logo, orgName, checklist);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 116, 139);
  doc.text(`Categoría: ${checklist.category}`, 12, y);
  y += 6;

  if (checklist.description?.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 32, 44);
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(checklist.description.trim(), 186);
    doc.text(lines, 12, y);
    y += lines.length * 5 + 4;
  }

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(26, 32, 44);
  doc.setFontSize(9);
  doc.text('PASOS A VERIFICAR', 12, y);
  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(0.6);
  doc.line(12, y + 2, 198, y + 2);
  y += 9;

  const steps = checklist.steps || [];
  doc.setFontSize(10);
  for (let i = 0; i < steps.length; i += 1) {
    const lines = doc.splitTextToSize(steps[i], 168);
    const blockHeight = Math.max(6, lines.length * 5.5);
    if (y + blockHeight > PAGE_BOTTOM) {
      doc.addPage();
      y = 20;
    }
    doc.setDrawColor(26, 32, 44);
    doc.setLineWidth(0.35);
    doc.rect(12, y - 3.8, 4.2, 4.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 32, 44);
    doc.text(lines, 20, y);
    y += blockHeight + 3;
  }

  if (steps.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Esta lista todavía no tiene pasos configurados.', 12, y);
    y += 6;
  }

  // Firma / evidencia de ejecución — para uso en papel.
  if (y + 24 > PAGE_BOTTOM) {
    doc.addPage();
    y = 20;
  }
  y += 6;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  doc.line(12, y, 90, y);
  doc.line(120, y, 198, y);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Nombre y firma de quien verifica', 12, y + 4);
  doc.text('Fecha y hora', 120, y + 4);

  const downloadedAt = new Date().toLocaleString('es-CO');
  const pageCount = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pageCount; p += 1) {
    doc.setPage(p);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`Descargado el: ${downloadedAt} — página ${p}/${pageCount}`, 12, 290);
    doc.text('BitaFly · bitafly.com', 198, 290, { align: 'right' });
  }

  doc.save(`${slugify(checklist.name)}-v${(checklist.version || '1.0').replace(/\s+/g, '')}.pdf`);
}
