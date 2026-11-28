// Skylog V2.0 — SMS: PDF de «Objetivos y Política» (sección Objetivos SMS).
// 100% client-side al descargar (mismo criterio que Reportes, nunca se
// persiste) y usa el encabezado/logo/nota compartidos de `pdfCommon.js`.
// Imprime la política vigente (alcance, texto, compromisos) y la tabla de
// objetivos con sus KPI vinculados.
import autoTable from 'jspdf-autotable';
import { HEAD_STYLES, resolveLogo, fetchBitaflyLogo, drawReportHeader, drawFooterNote, slugify } from './pdfCommon';

const TABLE_STYLES = { fontSize: 8, cellPadding: 1.6, lineColor: [220, 220, 220], lineWidth: 0.1 };
const MONTH = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const LEFT = 10;
const RIGHT = 200;
const WIDTH = RIGHT - LEFT;
const BOTTOM = 282; // deja aire para la nota de pie

function fmtDate(d) {
  if (!d) return '—';
  return new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Descarga el PDF de objetivos y política de la organización. */
export async function downloadObjetivosPoliticasPdf({ orgName, nit, logoUrl, policy, objectives } = {}) {
  const { jsPDF } = await import('jspdf');
  const logo = (await resolveLogo(logoUrl)) || (await fetchBitaflyLogo());
  const headerName = nit ? `${orgName || ''} · NIT ${nit}`.trim() : orgName;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawReportHeader(doc, { logo, orgName: headerName, title: 'Objetivos y Política SMS', subtitle: 'Sistema de Gestión de Seguridad Operacional' });
  y += 6;

  const ensure = (needed) => {
    if (y + needed > BOTTOM) {
      doc.addPage();
      y = 20;
    }
  };
  const sectionTitle = (text) => {
    ensure(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 32, 44);
    doc.text(text, LEFT, y);
    y += 2;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(LEFT, y, RIGHT, y);
    y += 5;
  };

  // ── Política ───────────────────────────────────────────────
  sectionTitle('POLÍTICA DE SEGURIDAD OPERACIONAL');
  if (!policy) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('La organización no ha publicado todavía una política de seguridad operacional.', LEFT, y);
    y += 8;
  } else {
    const estado = policy.signed_at ? `Firmada · vigente desde ${fmtDate(policy.effective_date)}` : `Sin firmar · ${fmtDate(policy.effective_date)}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(estado, LEFT, y);
    y += 6;

    const field = (label, value) => {
      if (!value) return;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(label.toUpperCase(), LEFT, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      const lines = doc.splitTextToSize(String(value), WIDTH);
      lines.forEach((ln) => {
        ensure(5);
        doc.text(ln, LEFT, y);
        y += 5;
      });
      y += 2;
    };
    field('Alcance', policy.scope);
    field('Texto de la política', policy.policy_text);

    const commitments = (policy.commitments || []).filter(Boolean);
    if (commitments.length) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      ensure(6);
      doc.text('COMPROMISOS', LEFT, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      commitments.forEach((c) => {
        const lines = doc.splitTextToSize(`•  ${c}`, WIDTH - 4);
        lines.forEach((ln, i) => {
          ensure(5);
          doc.text(ln, LEFT + (i === 0 ? 0 : 4), y);
          y += 5;
        });
      });
      y += 2;
    }
  }

  y += 4;

  // ── Objetivos ──────────────────────────────────────────────
  sectionTitle('OBJETIVOS DE SEGURIDAD OPERACIONAL');
  const list = objectives || [];
  if (!list.length) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('No hay objetivos SMS declarados todavía.', LEFT, y);
    y += 6;
  } else {
    autoTable(doc, {
      startY: y,
      head: [['OBJETIVO', 'MÉTRICA', 'META', 'KPI QUE LO MIDEN']],
      body: list.map((o) => [
        o.title || '—',
        o.metric_description || '—',
        o.target_value != null ? `${o.target_value} ${o.target_unit || ''}`.trim() : '—',
        (o.indicators || []).length
          ? o.indicators.map((ind) => (ind.latest ? `${ind.name} (${ind.latest.rate} · ${MONTH[ind.latest.month]} ${ind.latest.year})` : ind.name)).join('\n')
          : 'Sin KPI vinculado',
      ]),
      styles: TABLE_STYLES,
      headStyles: HEAD_STYLES,
      columnStyles: { 0: { cellWidth: 55 }, 2: { cellWidth: 28 } },
      margin: { left: LEFT, right: 10 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  drawFooterNote(doc, 'Instantánea (sin rango de fechas)');
  doc.save(`objetivos-y-politica-sms-${slugify(orgName)}.pdf`);
}
