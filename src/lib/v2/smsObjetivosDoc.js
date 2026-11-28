// Skylog V2.0 — SMS: PDFs de la sección Objetivos SMS, por separado:
// `downloadPoliticaPdf` (política vigente) y `downloadObjetivosPdf` (tabla de
// objetivos con sus KPI). Ambos 100% client-side al descargar (mismo criterio
// que Reportes, nunca se persiste) y usan el encabezado/logo/nota compartidos
// de `pdfCommon.js`.
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

async function startDoc({ orgName, nit, logoUrl, title, subtitle }) {
  const { jsPDF } = await import('jspdf');
  const logo = (await resolveLogo(logoUrl)) || (await fetchBitaflyLogo());
  const headerName = nit ? `${orgName || ''} · NIT ${nit}`.trim() : orgName;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const startY = drawReportHeader(doc, { logo, orgName: headerName, title, subtitle });
  return { doc, startY };
}

/** Descarga solo la política de seguridad operacional vigente. */
export async function downloadPoliticaPdf({ orgName, nit, logoUrl, policy } = {}) {
  const { doc, startY } = await startDoc({ orgName, nit, logoUrl, title: 'Política de Seguridad Operacional', subtitle: 'Sistema de Gestión de Seguridad Operacional' });
  let y = startY + 6;

  const ensure = (needed) => {
    if (y + needed > BOTTOM) {
      doc.addPage();
      y = 20;
    }
  };

  if (!policy) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('La organización no ha publicado todavía una política de seguridad operacional.', LEFT, y);
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
      ensure(6);
      doc.text(label.toUpperCase(), LEFT, y);
      y += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.splitTextToSize(String(value), WIDTH).forEach((ln) => {
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
        doc.splitTextToSize(`•  ${c}`, WIDTH - 4).forEach((ln, i) => {
          ensure(5);
          doc.text(ln, LEFT + (i === 0 ? 0 : 4), y);
          y += 5;
        });
      });
    }
  }

  drawFooterNote(doc, 'Instantánea (sin rango de fechas)');
  doc.save(`politica-sms-${slugify(orgName)}.pdf`);
}

/** Descarga solo los objetivos de seguridad operacional con sus KPI. */
export async function downloadObjetivosPdf({ orgName, nit, logoUrl, objectives } = {}) {
  const { doc, startY } = await startDoc({ orgName, nit, logoUrl, title: 'Objetivos de Seguridad Operacional', subtitle: 'Balanced Scorecard — objetivos y KPI que los miden' });
  const list = objectives || [];

  if (!list.length) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('No hay objetivos SMS declarados todavía.', LEFT, startY + 6);
  } else {
    autoTable(doc, {
      startY: startY + 4,
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
  }

  drawFooterNote(doc, 'Instantánea (sin rango de fechas)');
  doc.save(`objetivos-sms-${slugify(orgName)}.pdf`);
}
