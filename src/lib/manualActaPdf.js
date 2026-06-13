// Genera el "Acta de divulgación y constancia de lectura" de un manual en PDF.
// Evidencia documental para auditorías RAC 100 / SMS. Cliente-side (jsPDF).

import { fmtDateShort } from '@/lib/formatters';

const NAVY   = [26, 32, 44];
const ORANGE = [236, 91, 19];
const GREY   = [100, 116, 139];

function fmtDateTime(d) {
  if (!d) return '—';
  const p = (n) => String(n).padStart(2, '0');
  const dt = new Date(d);
  return `${fmtDateShort(d)} ${p(dt.getHours())}:${p(dt.getMinutes())}`;
}

function slug(s) {
  return String(s || 'acta')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'acta';
}

/**
 * @param {object} p
 * @param {object} p.manual   — { title, current_version, current_effective_date, category }
 * @param {object} p.data     — { version, read, total, members: [{name, role, acknowledged_at}] }
 * @param {string} p.orgName
 */
export async function generateAckActaPdf({ manual, data, orgName }) {
  const { jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 14;
  const now = new Date();

  // ── Encabezado ──────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 26, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('ACTA DE DIVULGACIÓN Y CONSTANCIA DE LECTURA', M, 12);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(253, 224, 204);
  doc.text('BitaFly · Plataforma de gestión de operaciones UAS · bitafly.com', M, 19);

  // ── Datos del manual ────────────────────────────────────────────
  let y = 36;
  const version = data?.version || manual?.current_version || '—';
  const rows = [
    ['Manual',            manual?.title || '—'],
    ['Versión vigente',   `v${version}`],
    ['Fecha de vigencia', fmtDateShort(manual?.current_effective_date)],
    ['Organización',      orgName || '—'],
    ['Generado',          fmtDateTime(now)],
  ];
  doc.setFontSize(9);
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...GREY);
    doc.text(`${label}:`, M, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...NAVY);
    doc.text(String(value), M + 38, y);
    y += 7;
  });

  // ── Resumen ─────────────────────────────────────────────────────
  const read = data?.read ?? 0;
  const total = data?.total ?? 0;
  const pct = total > 0 ? Math.round((read / total) * 100) : 0;
  y += 2;
  doc.setFillColor(248, 246, 246);
  doc.roundedRect(M, y, W - 2 * M, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...ORANGE);
  doc.text(`Lectura registrada: ${read}/${total} (${pct}%)`, M + 4, y + 8);
  y += 18;

  // ── Tabla de miembros ───────────────────────────────────────────
  const members = (data?.members || []).map((m, i) => [
    String(i + 1),
    m.name || '—',
    m.role || '—',
    m.acknowledged_at ? 'Leído' : 'Pendiente',
    m.acknowledged_at ? fmtDateShort(m.acknowledged_at) : '—',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Nombre', 'Rol', 'Estado', 'Fecha de lectura']],
    body: members.length ? members : [['—', 'Sin miembros en la organización', '', '', '']],
    margin: { left: M, right: M },
    styles: { fontSize: 9, cellPadding: 2.5, textColor: NAVY },
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      3: { cellWidth: 26, halign: 'center' },
      4: { cellWidth: 34, halign: 'center' },
    },
    // Marca en color el estado de cada fila
    didParseCell: (hook) => {
      if (hook.section === 'body' && hook.column.index === 3) {
        hook.cell.styles.fontStyle = 'bold';
        hook.cell.styles.textColor = hook.cell.raw === 'Leído' ? [22, 163, 74] : [217, 119, 6];
      }
    },
  });

  // ── Nota legal + numeración de páginas ──────────────────────────
  const note = 'Este documento certifica la divulgación del manual referenciado y el registro de lectura de los miembros de la organización en la plataforma BitaFly. Cada constancia corresponde a la confirmación individual realizada por el usuario sobre la versión vigente.';
  let endY = (doc.lastAutoTable?.finalY || y) + 8;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(...GREY);
  doc.text(doc.splitTextToSize(note, W - 2 * M), M, endY);

  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const H = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...GREY);
    doc.text(`BitaFly · bitafly.com`, M, H - 6);
    doc.text(`Página ${i} de ${pages}`, W - M, H - 6, { align: 'right' });
  }

  doc.save(`Acta_lectura_${slug(manual?.title)}_v${slug(version)}.pdf`);
}
