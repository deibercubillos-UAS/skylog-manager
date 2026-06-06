/**
 * flightPlanDocs.js — utilidades compartidas para planear vuelo:
 * tipos de geometría, resumen de zona y generación de PDF/KMZ.
 * Usado por FlightPlanner (piloto independiente) y BasicForm (Programación org).
 */
import {
  generateKML, downloadKMZ,
  fmtMetres, fmtArea,
  polygonAreaM2, polygonPerimeter, polylineLength,
} from '@/lib/kmlGenerator';

export const GEO_TYPES = [
  { key: 'polygon', label: 'Polígono',       icon: 'pentagon', hint: 'Área delimitada por vértices' },
  { key: 'linear',  label: 'Tramo Lineal',   icon: 'route',    hint: 'Ruta de inspección o transecto' },
  { key: 'circle',  label: 'Circunferencia', icon: 'circle',   hint: 'Zona circular con radio definido' },
];

export function getZoneSummary(geoType, points, radius) {
  if (!points?.length) return null;
  if (geoType === 'polygon' && points.length >= 3) return [
    { label: 'Vértices',  value: points.length },
    { label: 'Área',      value: fmtArea(polygonAreaM2(points)) },
    { label: 'Perímetro', value: fmtMetres(polygonPerimeter(points)) },
  ];
  if (geoType === 'linear' && points.length >= 2) return [
    { label: 'Puntos',   value: points.length },
    { label: 'Longitud', value: fmtMetres(polylineLength(points)) },
  ];
  if (geoType === 'circle' && points.length === 1) return [
    { label: 'Centro', value: `${points[0].lat.toFixed(5)}, ${points[0].lng.toFixed(5)}` },
    { label: 'Radio',  value: fmtMetres(radius) },
    { label: 'Área',   value: fmtArea(Math.PI * radius * radius) },
  ];
  return null;
}

// Descarga el KMZ de la operación
export async function downloadFlightKMZ({ geoType, zone, opName, altitude, flightDate, takeoffTime, notes }) {
  const name = (opName || '').trim() || 'Operación UAS';
  const desc = [
    `Fecha de vuelo: ${flightDate || '—'}`,
    `Hora de despegue: ${takeoffTime || '—'}`,
    `Altitud máxima AGL: ${altitude} m`,
    notes?.trim() ? `Observaciones: ${notes.trim()}` : null,
  ].filter(Boolean).join('\n');

  const kml = generateKML(geoType, zone?.points ?? null, zone?.radius ?? 500, name, altitude, desc);
  if (!kml) return;
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  await downloadKMZ(kml, `${slug}.kmz`);
}

// Genera y descarga el PDF del plan de vuelo
export async function generateFlightPlanPdf({ opName, flightDate, takeoffTime, altitude, notes, geoType, zone, summary, pilotInfo }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210; const M = 18;

  // Encabezado
  doc.setFillColor(26, 32, 44);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PLAN DE VUELO — BITAFLY', M, 13);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Plataforma de gestión de operaciones UAS · bitafly.com', M, 20);

  let y = 38;

  // Datos del piloto / operador
  doc.setFillColor(248, 246, 246);
  doc.roundedRect(M, y, W - M * 2, 28, 3, 3, 'F');
  doc.setTextColor(26, 32, 44);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ELABORADO POR', M + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  const pilotName = pilotInfo?.full_name || pilotInfo?.first_name || pilotInfo?.name || 'Piloto';
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(pilotName, M + 4, y + 14);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  const orgLine = pilotInfo?.orgName ? `${pilotInfo.orgName}${pilotInfo.orgNit ? ' · NIT ' + pilotInfo.orgNit : ''}` : '';
  if (orgLine) doc.text(orgLine, M + 4, y + 20);
  if (pilotInfo?.email) doc.text(`Correo: ${pilotInfo.email}`, M + 4, y + 26);
  const genDate = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setTextColor(100, 116, 139);
  doc.text(`Generado: ${genDate}`, W - M - 50, y + 6, { align: 'left' });

  y += 36;

  // Datos de la operación
  doc.setTextColor(26, 32, 44);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DATOS DE LA OPERACIÓN', M, y);
  doc.setDrawColor(234, 88, 12);
  doc.setLineWidth(0.6);
  doc.line(M, y + 2, W - M, y + 2);
  y += 8;

  const fields = [
    ['Nombre de la operación', opName || '—'],
    ['Fecha de vuelo', flightDate ? new Date(flightDate + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'],
    ['Hora de despegue', takeoffTime || '—'],
    ['Altitud máxima AGL', `${altitude} m${altitude > 120 ? '  ⚠ Requiere autorización RAC 100.32' : ''}`],
  ];
  doc.setFontSize(9);
  for (const [label, value] of fields) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(label + ':', M, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 32, 44);
    doc.text(String(value), M + 55, y);
    y += 7;
  }

  if (notes?.trim()) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Observaciones:', M, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 32, 44);
    const lines = doc.splitTextToSize(notes.trim(), W - M * 2);
    doc.text(lines, M, y);
    y += lines.length * 5 + 4;
  }

  // Zona de vuelo
  if (summary) {
    y += 4;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 32, 44);
    doc.text('ZONA DE VUELO', M, y);
    doc.setDrawColor(234, 88, 12);
    doc.setLineWidth(0.6);
    doc.line(M, y + 2, W - M, y + 2);
    y += 8;

    const geoLabel = GEO_TYPES.find(t => t.key === geoType)?.label || geoType;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('Tipo de zona:', M, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(26, 32, 44);
    doc.text(geoLabel, M + 55, y);
    y += 7;

    for (const s of summary) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text(s.label + ':', M, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 32, 44);
      doc.text(String(s.value), M + 55, y);
      y += 7;
    }

    if (zone?.points?.length) {
      y += 2;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('Coordenadas:', M, y);
      y += 6;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 32, 44);
      zone.points.slice(0, 20).forEach((pt, i) => {
        doc.text(`  ${i + 1}. Lat ${pt.lat.toFixed(6)}, Lng ${pt.lng.toFixed(6)}`, M, y);
        y += 5;
      });
      if (zone.points.length > 20) {
        doc.setTextColor(100, 116, 139);
        doc.text(`  … y ${zone.points.length - 20} punto(s) adicional(es)`, M, y);
        y += 5;
      }
    }
  }

  // Pie de página
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text('Este documento es de uso interno. Verifique el espacio aéreo en Aerocivil antes de operar.', M, 285);
  doc.text('BitaFly · bitafly.com', W - M, 285, { align: 'right' });

  const slug = (opName || 'plan-vuelo').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  doc.save(`${slug}-plan-vuelo.pdf`);
}
