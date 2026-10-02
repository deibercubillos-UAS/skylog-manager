// Skylog V2.0 — Programación. Descarga de PDF/KMZ de una misión programada.
//
// El PDF sigue la MISMA plantilla que los formatos de Reportes de v1
// (`src/lib/reportGenerators.js`): caja con borde superior, logo a la
// izquierda, título centrado, VERSIÓN/FECHA a la derecha, y nota de
// trazabilidad ("Descargado el...") al pie — mismo `addLogo()` (preserva
// relación de aspecto) copiado tal cual, no reinventado.
//
// No reutiliza flightPlanDocs.js#generateFlightPlanPdf porque ese generador
// asume un campo "Altitud máxima AGL" que `missions` no tiene todavía (V2 no
// captura altitud al programar) — mostrarlo habría fabricado un dato
// regulatorio que no se capturó. Sí reutiliza GEO_TYPES/getZoneSummary/
// generateKML/downloadKMZ (mismas utilidades, mismo vocabulario de
// geometría) para no duplicar esa lógica.
//
// Logo: las organizaciones de V2 (tabla `organizations` de este esquema
// mínimo) todavía no tienen columna `logo_url` — no hay logo propio que
// resolver. Se usa el logo de BitaFly (`/logo.png`, el mismo del nav) como
// membrete, honesto con lo que existe hoy.
import { GEO_TYPES, getZoneSummary } from '@/lib/flightPlanDocs';
import { generateKML, downloadKMZ } from '@/lib/kmlGenerator';

function slugify(text) {
  return (text || 'mision')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// Mismo patrón que fetchLogoDataUrl (lib/docUrl.js) — descarga y convierte a
// data URL base64 embebible, con dimensiones naturales para no deformar el
// logo al dibujarlo. Solo se resuelve una vez por sesión de navegador.
let cachedBitaflyLogo;
async function fetchBitaflyLogo() {
  if (cachedBitaflyLogo !== undefined) return cachedBitaflyLogo;
  try {
    const res = await fetch('/logo.png');
    if (!res.ok) throw new Error('logo no disponible');
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
    cachedBitaflyLogo = { dataUrl, format: 'PNG', width, height };
  } catch {
    cachedBitaflyLogo = null;
  }
  return cachedBitaflyLogo;
}

// Inserta el logo dentro de la caja (x,y,w,h) preservando su relación de
// aspecto ("contain", centrado) — idéntico a addLogo() en reportGenerators.js.
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

export async function downloadMissionPdf(mission, { orgName } = {}) {
  const { jsPDF } = await import('jspdf');
  const logo = await fetchBitaflyLogo();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const reportDate = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const downloadedAt = new Date().toLocaleString('es-CO');

  // ── Cabecera: misma caja con borde que los formatos de Reportes ──────────
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
  doc.text('MISIÓN PROGRAMADA', 102.5, 28, { align: 'center' });

  doc.setFontSize(6.5);
  doc.line(160, 15.5, 190, 15.5);
  doc.text(`VERSIÓN: 1.0`, 162, 13);
  doc.text(`FECHA: ${reportDate}`, 162, 19);

  let y = 40;

  // ── Estado ────────────────────────────────────────────────────────────
  const statusLabel = mission.status === 'cancelada' ? 'CANCELADA' : 'PROGRAMADA';
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(mission.status === 'cancelada' ? 180 : 22, mission.status === 'cancelada' ? 40 : 120, mission.status === 'cancelada' ? 40 : 60);
  doc.text(`ESTADO: ${statusLabel}`, 12, y);
  doc.setTextColor(0, 0, 0);
  y += 8;

  // ── Datos de la misión ────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DE LA MISIÓN', 12, y);
  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(0.6);
  doc.line(12, y + 2, 198, y + 2);
  y += 8;

  const scheduled = new Date(mission.scheduled_at);
  const fields = [
    ['Nombre de la misión', mission.name || '—'],
    ['PIC asignado', mission.pic?.full_name || '—'],
    ['Fecha programada', scheduled.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })],
    ['Hora programada', `${String(scheduled.getHours()).padStart(2, '0')}:${String(scheduled.getMinutes()).padStart(2, '0')}`],
    ['Zona de operación', mission.zone || '—'],
  ];
  doc.setFontSize(9);
  for (const [label, value] of fields) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(label + ':', 12, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 32, 44);
    const lines = doc.splitTextToSize(String(value), 198 - 12 - 55);
    doc.text(lines, 67, y);
    y += 7 * Math.max(1, lines.length);
  }

  if (mission.notes?.trim()) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Notas:', 12, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 32, 44);
    const lines = doc.splitTextToSize(mission.notes.trim(), 186);
    doc.text(lines, 12, y);
    y += lines.length * 5 + 4;
  }

  // ── Geometría de la zona (si se marcó en mapa o se cargó un KMZ) ────────
  if (mission.zone_geo?.points?.length) {
    const { geoType, points, radius } = mission.zone_geo;
    const summary = getZoneSummary(geoType, points, radius);
    y += 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 32, 44);
    doc.text('GEOMETRÍA DE LA ZONA', 12, y);
    doc.setDrawColor(234, 88, 12);
    doc.setLineWidth(0.6);
    doc.line(12, y + 2, 198, y + 2);
    y += 8;

    const geoLabel = GEO_TYPES.find((t) => t.key === geoType)?.label || geoType;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Tipo de zona:', 12, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 32, 44);
    doc.text(geoLabel, 67, y);
    y += 7;

    for (const s of summary || []) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(s.label + ':', 12, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 32, 44);
      doc.text(String(s.value), 67, y);
      y += 7;
    }

    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Coordenadas:', 12, y);
    y += 6;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 32, 44);
    points.slice(0, 20).forEach((pt, i) => {
      doc.text(`  ${i + 1}. Lat ${pt.lat.toFixed(6)}, Lng ${pt.lng.toFixed(6)}`, 12, y);
      y += 5;
    });
    if (points.length > 20) {
      doc.setTextColor(100, 116, 139);
      doc.text(`  … y ${points.length - 20} punto(s) adicional(es)`, 12, y);
      y += 5;
    }
  }

  // ── Nota de trazabilidad — misma convención que Reportes ────────────────
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  doc.text(`Descargado el: ${downloadedAt}`, 12, 285);
  doc.text('BitaFly · bitafly.com', 198, 285, { align: 'right' });

  doc.save(`${slugify(mission.name)}.pdf`);
}

export async function downloadMissionKmz(mission) {
  if (!mission.zone_geo?.points?.length) return;
  const { geoType, points, radius } = mission.zone_geo;
  const desc = [
    `PIC: ${mission.pic?.full_name || '—'}`,
    `Fecha programada: ${new Date(mission.scheduled_at).toLocaleString('es-CO')}`,
    mission.notes?.trim() ? `Notas: ${mission.notes.trim()}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const kml = generateKML(geoType, points, radius ?? 500, mission.name || 'Misión UAS', 120, desc);
  if (!kml) return;
  await downloadKMZ(kml, `${slugify(mission.name)}.kmz`);
}
