// Skylog V2.0 — SMS-I: MSMS como documento vivo. Genera el Manual del
// Sistema de Gestión de Seguridad Operacional 100% desde la configuración
// real ya capturada en SMS-A/riesgos/indicadores/SMS-F/SMS-B — nunca texto
// de relleno. Devuelve un Blob (no descarga directo, como los generadores
// de Reportes) porque el destino es publicarlo como versión en Manuales
// (decisión 135), que ya da versionado + acuses de lectura gratis.
// Ver 40-sms.md §5.9 sub-frente SMS-I.
import autoTable from 'jspdf-autotable';
import { resolveLogo, fetchBitaflyLogo, drawReportHeader, drawFooterNote } from './pdfCommon';

const TABLE_STYLES = { fontSize: 8, cellPadding: 1.6, lineColor: [220, 220, 220], lineWidth: 0.1 };
const HEAD_STYLES = { fillColor: [26, 32, 44], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' };

function fmtDate(d) {
  if (!d) return '—';
  return new Date(`${d}T00:00:00`).toLocaleDateString('es-CO');
}

function sectionTitle(doc, y, number, title) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(26, 32, 44);
  doc.text(`${number}. ${title}`, 12, y);
  doc.setDrawColor(236, 91, 19);
  doc.setLineWidth(0.6);
  doc.line(12, y + 1.5, 198, y + 1.5);
  return y + 8;
}

function paragraph(doc, y, text) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const lines = doc.splitTextToSize(text || 'Sin información configurada todavía.', 186);
  doc.text(lines, 12, y);
  return y + lines.length * 4.2 + 4;
}

/**
 * `data` ya viene agregado por el caller (una sola llamada por pieza, sin
 * lógica de agregación aquí): { policy, designation, objectives, hazards,
 * barriers, riskMatrixConfigured, indicators, trainingSessions }.
 */
export async function generateMsmsDocumentBlob(data, { orgName, logoUrl } = {}) {
  const { jsPDF } = await import('jspdf');
  const logo = (await resolveLogo(logoUrl)) || (await fetchBitaflyLogo());
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let y = drawReportHeader(doc, { logo, orgName, title: 'MSMS', subtitle: 'Manual del Sistema de Gestión de Seguridad Operacional' });

  y = sectionTitle(doc, y + 4, 1, 'Política y objetivos de seguridad operacional');
  if (data.policy) {
    y = paragraph(doc, y, `Alcance: ${data.policy.scope || '—'}. Vigente desde ${fmtDate(data.policy.effective_date)}.${data.policy.signed_at ? ' Firmada.' : ' Sin firmar.'}`);
    y = paragraph(doc, y, data.policy.policy_text);
  } else {
    y = paragraph(doc, y, null);
  }

  y = sectionTitle(doc, y + 2, 2, 'Designación del Gerente de Seguridad Operacional');
  y = paragraph(doc, y, data.designation ? `Designado: ${data.designation.people?.full_name || '—'}, vigente desde ${new Date(data.designation.created_at).toLocaleDateString('es-CO')}.` : null);

  y = sectionTitle(doc, y + 2, 3, 'Objetivos de seguridad operacional (Balanced Scorecard)');
  if (data.objectives?.length) {
    autoTable(doc, {
      startY: y,
      head: [['OBJETIVO', 'META', 'INDICADORES VINCULADOS']],
      body: data.objectives.map((o) => [o.title, o.target_value != null ? `${o.target_value} ${o.target_unit || ''}` : '—', o.indicators?.map((i) => i.name).join(', ') || 'Sin vincular']),
      styles: TABLE_STYLES,
      headStyles: HEAD_STYLES,
      margin: { left: 12, right: 12 },
    });
    y = doc.lastAutoTable.finalY + 6;
  } else {
    y = paragraph(doc, y, null);
  }

  if (y > 230) {
    doc.addPage();
    y = 15;
  }
  y = sectionTitle(doc, y, 4, 'Gestión del riesgo');
  y = paragraph(
    doc,
    y,
    `Matriz de riesgo interna: ${data.riskMatrixConfigured ? 'configurada.' : 'sin configurar todavía.'} Catálogo de peligros: ${data.hazards.length} registrado(s). Barreras/controles: ${data.barriers.length} registrada(s).`
  );
  if (data.hazards.length) {
    autoTable(doc, {
      startY: y,
      head: [['PELIGRO', 'ORIGEN', 'TIPO DE OPERACIÓN']],
      body: data.hazards.slice(0, 30).map((h) => [h.description, h.source || '—', h.mission_type || '—']),
      styles: TABLE_STYLES,
      headStyles: HEAD_STYLES,
      margin: { left: 12, right: 12 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }
  if (data.barriers.length) {
    if (y > 250) {
      doc.addPage();
      y = 15;
    }
    autoTable(doc, {
      startY: y,
      head: [['BARRERA / CONTROL', 'CATEGORÍA']],
      body: data.barriers.slice(0, 30).map((b) => [b.description, b.category || '—']),
      styles: TABLE_STYLES,
      headStyles: HEAD_STYLES,
      margin: { left: 12, right: 12 },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  doc.addPage();
  y = 15;
  y = sectionTitle(doc, y, 5, 'Indicadores de Desempeño en Seguridad Operacional (SPI)');
  if (data.indicators?.length) {
    autoTable(doc, {
      startY: y,
      head: [['INDICADOR', 'ORIGEN']],
      body: data.indicators.map((i) => [i.name, i.is_official ? 'Oficial UAS' : 'Propio']),
      styles: TABLE_STYLES,
      headStyles: HEAD_STYLES,
      margin: { left: 12, right: 12 },
    });
    y = doc.lastAutoTable.finalY + 6;
  } else {
    y = paragraph(doc, y, null);
  }

  y = sectionTitle(doc, y + 2, 6, 'Capacitación SMS');
  if (data.trainingSessions?.length) {
    autoTable(doc, {
      startY: y,
      head: [['TEMA', 'RECURRENCIA', 'PRÓXIMA OCURRENCIA']],
      body: data.trainingSessions.map((s) => [s.topic, s.recurrence, s.nextOccurrence ? fmtDate(s.nextOccurrence) : '—']),
      styles: TABLE_STYLES,
      headStyles: HEAD_STYLES,
      margin: { left: 12, right: 12 },
    });
  } else {
    paragraph(doc, y, null);
  }

  drawFooterNote(doc, `Generado automáticamente desde la configuración vigente del SMS`);
  return doc.output('blob');
}
