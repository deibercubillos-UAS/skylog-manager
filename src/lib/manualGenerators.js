/**
 * manualGenerators.js
 *
 * Generadores Word (.docx) para los capítulos del Manual de Operaciones RAC 100.
 * Usa la librería `docx` (importación dinámica desde los handlers para no afectar cold start).
 *
 * Función exportada:
 *   generateChapter5(org, pilots, aircraft) → Buffer (.docx)
 *
 * Capítulos pendientes (placeholder para fases futuras):
 *   generateOMOperaciones(org, ...) → OM - Operaciones
 *   generateOMSMS(org, smsReports, ...) → OM - SMS
 */

// ── Paleta de colores ─────────────────────────────────────────────────────
const ORANGE   = 'EC5B13'; // Bitafly brand
const DARK     = '1A202C'; // Texto principal
const GRAY_BG  = 'F7F7F7'; // Fondo filas alternas
const BORDER   = 'D1D5DB'; // Bordes de tabla
const HEADING2 = '2D3748'; // Subtítulo oscuro

// ── Helpers de formato ────────────────────────────────────────────────────

function fmtDate(d = new Date()) {
  if (typeof d === 'string') d = new Date(d);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtDateShort(d) {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Función auxiliar para crear texto con estilos inline
function styledRun(docx, text, opts = {}) {
  const { bold, italic, size, color, font } = opts;
  const props = {};
  if (bold)   props.bold = true;
  if (italic) props.italics = true;
  if (size)   props.size = size;
  if (color)  props.color = color;
  if (font)   props.font = font;
  return new docx.TextRun({ text, ...props });
}

// Párrafo de cuerpo estándar
function bodyPara(docx, runs, opts = {}) {
  return new docx.Paragraph({
    children: Array.isArray(runs) ? runs : [new docx.TextRun({ text: runs })],
    spacing: { after: 160, line: 276 },
    ...opts,
  });
}

// Párrafo de ítem de lista (numerado o con bullet)
function listItem(docx, text, level = 0) {
  return new docx.Paragraph({
    children: [new docx.TextRun({ text, size: 22 })],
    bullet: { level },
    spacing: { after: 80 },
  });
}

// Celda de tabla
function tc(docx, text, opts = {}) {
  const { bold = false, bg, width, align = docx.AlignmentType.LEFT, shading } = opts;
  return new docx.TableCell({
    children: [new docx.Paragraph({
      children: [new docx.TextRun({ text: String(text ?? '—'), bold, size: 20 })],
      alignment: align,
    })],
    shading: shading || (bg ? { fill: bg, type: docx.ShadingType.CLEAR } : undefined),
    width: width ? { size: width, type: docx.WidthType.DXA } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    borders: {
      top:    { style: docx.BorderStyle.SINGLE, size: 1, color: BORDER },
      bottom: { style: docx.BorderStyle.SINGLE, size: 1, color: BORDER },
      left:   { style: docx.BorderStyle.SINGLE, size: 1, color: BORDER },
      right:  { style: docx.BorderStyle.SINGLE, size: 1, color: BORDER },
    },
  });
}

// Fila de tabla de encabezado (fondo naranja, texto blanco)
function headerRow(docx, cells) {
  return new docx.TableRow({
    children: cells.map(c =>
      new docx.TableCell({
        children: [new docx.Paragraph({
          children: [new docx.TextRun({ text: c, bold: true, color: 'FFFFFF', size: 20 })],
          alignment: docx.AlignmentType.CENTER,
        })],
        shading: { fill: ORANGE, type: docx.ShadingType.CLEAR },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        borders: {
          top:    { style: docx.BorderStyle.SINGLE, size: 1, color: ORANGE },
          bottom: { style: docx.BorderStyle.SINGLE, size: 1, color: ORANGE },
          left:   { style: docx.BorderStyle.SINGLE, size: 1, color: ORANGE },
          right:  { style: docx.BorderStyle.SINGLE, size: 1, color: ORANGE },
        },
      })
    ),
    tableHeader: true,
  });
}

// Heading 1 (capítulo)
function h1(docx, text) {
  return new docx.Paragraph({
    children: [new docx.TextRun({ text, bold: true, size: 32, color: ORANGE })],
    heading: docx.HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: docx.BorderStyle.SINGLE, size: 6, color: ORANGE, space: 4 } },
  });
}

// Heading 2 (sección)
function h2(docx, text) {
  return new docx.Paragraph({
    children: [new docx.TextRun({ text, bold: true, size: 26, color: HEADING2 })],
    heading: docx.HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
  });
}

// Heading 3 (subsección)
function h3(docx, text) {
  return new docx.Paragraph({
    children: [new docx.TextRun({ text, bold: true, size: 22, color: HEADING2 })],
    heading: docx.HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
  });
}

// Separador visual
function divider(docx) {
  return new docx.Paragraph({
    children: [],
    border: { bottom: { style: docx.BorderStyle.SINGLE, size: 1, color: BORDER } },
    spacing: { before: 200, after: 200 },
  });
}

// Espacio en blanco
function spacer(docx) {
  return new docx.Paragraph({ children: [], spacing: { after: 200 } });
}

// ── CAPÍTULO 5 — Procedimientos Operacionales ────────────────────────────

export async function generateChapter5(org, pilots, aircraft) {
  const docx = await import('docx');

  const {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    AlignmentType, BorderStyle, ShadingType, WidthType,
    Header, Footer, PageNumber, HeadingLevel,
    ImageRun, ExternalHyperlink,
  } = docx;

  const today = new Date();
  const todayStr = fmtDate(today);
  const fileDate = today.toISOString().split('T')[0];

  const orgName  = org.company_name || 'Operador UAS';
  const orgNit   = org.tax_id       || '—';
  const orgTaxType = org.tax_id_type || 'NIT';
  const orgDan   = org.dan_number   || '—';
  const orgRep   = org.legal_rep    || '—';
  const orgAddr  = org.address      || '—';
  const orgPhone = org.phone        || '—';
  const orgEmail = org.operator_email || '—';

  // ── Logo (opcional) ──
  let logoImage = null;
  if (org.logo_url) {
    try {
      const res = await fetch(org.logo_url);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        // Detectar tipo de imagen por URL
        const ext = org.logo_url.split('.').pop().toLowerCase().split('?')[0];
        const imageType = ext === 'png' ? 'png' : ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : 'png';
        logoImage = new ImageRun({
          data: Buffer.from(buf),
          transformation: { width: 120, height: 60 },
          type: imageType,
        });
      }
    } catch {
      // Si falla el fetch del logo, continuar sin imagen
    }
  }

  // ── Header de todas las páginas (excepto portada) ──
  const pageHeader = new Header({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: orgName, bold: true, size: 18, color: ORANGE }),
          new TextRun({ text: `  |  ${orgTaxType}: ${orgNit}  |  DAN: ${orgDan}`, size: 16, color: '718096' }),
        ],
        alignment: AlignmentType.RIGHT,
        border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: ORANGE } },
        spacing: { after: 120 },
      }),
    ],
  });

  // ── Footer de todas las páginas ──
  const pageFooter = new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: `${orgName}  |  Manual de Operaciones — Capítulo 5  |  Página `, size: 16, color: '718096' }),
          new PageNumber(),
          new TextRun({ text: '  |  Versión 1.0 — Confidencial', size: 16, color: '718096' }),
        ],
        alignment: AlignmentType.CENTER,
        border: { top: { style: BorderStyle.SINGLE, size: 3, color: BORDER } },
        spacing: { before: 120 },
      }),
    ],
  });

  // ── PORTADA ──────────────────────────────────────────────────────────────
  const portada = [
    spacer(docx),
    spacer(docx),
    // Logo o nombre
    new Paragraph({
      children: logoImage
        ? [logoImage]
        : [new TextRun({ text: orgName, bold: true, size: 48, color: ORANGE })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'MANUAL DE OPERACIONES', bold: true, size: 52, color: DARK })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Capítulo 5 — Procedimientos Operacionales', bold: true, size: 32, color: ORANGE })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    divider(docx),
    spacer(docx),
    // Datos de la organización
    new Paragraph({
      children: [new TextRun({ text: 'OPERADOR UAS', bold: true, size: 18, color: '718096', allCaps: true })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: orgName, bold: true, size: 28 })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${orgTaxType}: ${orgNit}   ·   DAN: ${orgDan}`, size: 22, color: '4A5568' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: orgAddr, size: 20, color: '718096' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `${orgPhone}   ·   ${orgEmail}`, size: 20, color: '718096' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    divider(docx),
    spacer(docx),
    new Paragraph({
      children: [
        new TextRun({ text: 'Versión: ', bold: true, size: 22 }),
        new TextRun({ text: '1.0', size: 22 }),
        new TextRun({ text: '     Fecha de emisión: ', bold: true, size: 22 }),
        new TextRun({ text: todayStr, size: 22 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: 'Representante Legal: ', bold: true, size: 22 }),
        new TextRun({ text: orgRep, size: 22 }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
    }),
    new Paragraph({
      children: [new TextRun({ text: 'DOCUMENTO CONTROLADO — USO INTERNO', bold: true, size: 18, color: 'E53E3E', allCaps: true })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 200 },
    }),
  ];

  // ── CONTROL DE CAMBIOS ───────────────────────────────────────────────────
  const controlCambios = [
    new Paragraph({ children: [], pageBreakBefore: true }),
    h1(docx, 'Control de Cambios'),
    bodyPara(docx, 'Este documento registra el historial de revisiones y modificaciones al Capítulo 5 del Manual de Operaciones. Toda modificación debe ser aprobada por el Representante Legal o el Jefe de Pilotos antes de su distribución.'),
    spacer(docx),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        headerRow(docx, ['Versión', 'Fecha', 'Descripción del Cambio', 'Elaboró', 'Aprobó']),
        new TableRow({
          children: [
            tc(docx, '1.0'),
            tc(docx, todayStr),
            tc(docx, 'Emisión inicial del documento'),
            tc(docx, orgRep),
            tc(docx, ''),
          ],
        }),
        new TableRow({
          children: [tc(docx, ''), tc(docx, ''), tc(docx, ''), tc(docx, ''), tc(docx, '')],
        }),
        new TableRow({
          children: [tc(docx, ''), tc(docx, ''), tc(docx, ''), tc(docx, ''), tc(docx, '')],
        }),
      ],
    }),
  ];

  // ── SECCIÓN 5.1 — Generalidades ──────────────────────────────────────────
  const sec51 = [
    new Paragraph({ children: [], pageBreakBefore: true }),
    h1(docx, 'Capítulo 5 — Procedimientos Operacionales'),
    h2(docx, '5.1 Generalidades'),
    bodyPara(docx, `El presente capítulo establece los procedimientos operacionales obligatorios que debe seguir el personal de ${orgName} en todas las fases de las operaciones con sistemas de aeronaves no tripuladas (UAS), en cumplimiento de la Regulación Aeronáutica Colombiana RAC 100, expedida por la Unidad Administrativa Especial de Aeronáutica Civil (UAEAC).`),
    bodyPara(docx, `Estos procedimientos son de obligatorio cumplimiento para todos los pilotos remotos, observadores y personal de apoyo en tierra. El incumplimiento de cualquier procedimiento aquí establecido podrá dar lugar a medidas disciplinarias internas y/o sanciones por parte de la autoridad aeronáutica.`),
    bodyPara(docx, 'Marco normativo aplicable:'),
    listItem(docx, 'RAC 100 — Sistemas de Aeronaves No Tripuladas (UAS)'),
    listItem(docx, 'JARUS SORA v2.0 — Evaluación específica de riesgo operacional'),
    listItem(docx, 'Circulares operacionales UAEAC vigentes'),
    listItem(docx, 'Manual de vuelo del fabricante de cada aeronave de la flota'),
    spacer(docx),
    bodyPara(docx, `Los registros de cumplimiento de estos procedimientos se gestionan digitalmente a través de la plataforma Bitafly (bitafly.com), que actúa como sistema de gestión de operaciones UAS de la organización. Los formatos de referencia son:`),
    listItem(docx, 'F-OPS-001: Formato de Plan de Vuelo / Autorización de Operación'),
    listItem(docx, 'F-OPS-002: Bitácora Maestra de Vuelos'),
    listItem(docx, 'F-MNT-003: Registro Operacional de Baterías'),
    listItem(docx, 'VOR/MOR: Reporte Voluntario / Mandatorio de Ocurrencias'),
  ];

  // ── SECCIÓN 5.2 — Pre-Vuelo ──────────────────────────────────────────────
  const sec52 = [
    h2(docx, '5.2 Procedimiento Pre-Vuelo'),
    bodyPara(docx, 'Antes de iniciar cualquier operación, el Piloto Remoto a cargo (PIC) debe verificar y documentar el cumplimiento de todos los ítems de la presente sección. La omisión de cualquier verificación prohíbe el inicio de la operación.'),

    h3(docx, '5.2.1 Verificación Documental'),
    bodyPara(docx, 'Verificar que los siguientes documentos estén vigentes y disponibles en el sitio de operación (físico o digital):'),
    listItem(docx, 'Autorización de vuelo emitida por AeroCivil (F-OPS-001 aprobado) — verificar en Bitafly'),
    listItem(docx, 'Póliza de Responsabilidad Civil Extracontractual (RCE) vigente para la(s) aeronave(s) a operar'),
    listItem(docx, `Certificado médico del Piloto Remoto (CIPU) vigente`),
    listItem(docx, 'Licencia de piloto remoto (CIPU) vigente'),
    listItem(docx, 'Registro RUAS de la aeronave vigente'),
    listItem(docx, 'Análisis de riesgo SORA (cuando aplique por tipo de operación)'),

    h3(docx, '5.2.2 Inspección Física de la Aeronave'),
    bodyPara(docx, 'Realizar inspección visual completa de la aeronave antes de cada vuelo:'),
    listItem(docx, '1. Verificar integridad estructural del fuselaje — ausencia de grietas, deformaciones o daños'),
    listItem(docx, '2. Inspeccionar brazos y motores — fijación segura, sin holguras ni vibración anormal'),
    listItem(docx, '3. Verificar hélices — sin grietas, astillas, deformaciones ni desbalanceo; seguridad de fijación'),
    listItem(docx, '4. Inspeccionar tren de aterrizaje — integridad y funcionamiento correcto'),
    listItem(docx, '5. Verificar sistema de cámara/payload — fijación segura, funcionamiento correcto'),
    listItem(docx, '6. Inspeccionar conectores y cableado — ausencia de daños, oxidación o conexiones flojas'),
    listItem(docx, '7. Verificar estado de LEDs de navegación — funcionamiento correcto'),
    listItem(docx, '8. Comprobar firmware de la aeronave — versión actualizada según fabricante'),
    listItem(docx, '9. Verificar función de Return-to-Home (RTH) — configurado correctamente'),
    listItem(docx, '10. Comprobar sistema de failsafe — configurado y funcional'),
    listItem(docx, '11. Verificar geofence (si aplica) — zonas restringidas configuradas'),
    listItem(docx, '12. Calibrar brújula en el sitio de operación (si es necesario)'),
    listItem(docx, '13. Verificar que el número de satélites GPS sea suficiente (mínimo 10 antes del despegue)'),
    listItem(docx, '14. Confirmar que las horas de vuelo acumuladas no superan el umbral de mantenimiento'),
    listItem(docx, '15. Documentar cualquier anomalía encontrada — reportar en Bitafly antes de volar'),

    h3(docx, '5.2.3 Verificación de Baterías'),
    bodyPara(docx, 'Para cada batería a utilizar en la operación (registrar en F-MNT-003 de Bitafly):'),
    listItem(docx, 'Verificar nivel de carga — mínimo 95% antes del primer vuelo del día'),
    listItem(docx, 'Inspeccionar estado físico — sin hinchamiento, grietas, deformaciones ni daños visibles'),
    listItem(docx, 'Verificar número de ciclos acumulados — no superar el límite del fabricante'),
    listItem(docx, 'Confirmar temperatura de la batería — dentro del rango de operación del fabricante'),
    listItem(docx, 'Registrar número de serie de cada batería utilizada en el vuelo'),

    h3(docx, '5.2.4 Evaluación Meteorológica'),
    bodyPara(docx, 'Consultar condiciones meteorológicas actuales y pronóstico para el área de operación. La operación debe ser ABORTADA si alguno de los siguientes parámetros supera los límites:'),
    spacer(docx),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        headerRow(docx, ['Parámetro', 'Límite Operacional', 'Acción si se supera']),
        new TableRow({ children: [tc(docx, 'Velocidad del viento'), tc(docx, 'Según Manual Fabricante (típ. 10 m/s)'), tc(docx, 'Cancelar o posponer operación')] }),
        new TableRow({ children: [tc(docx, 'Visibilidad mínima'), tc(docx, '3 Millas Estatutarias (VMC)'), tc(docx, 'No operar — condición IMC')] }),
        new TableRow({ children: [tc(docx, 'Techo de nubes'), tc(docx, 'Mínimo 1,000 ft AGL'), tc(docx, 'No operar bajo techo de nubes')] }),
        new TableRow({ children: [tc(docx, 'Precipitación'), tc(docx, 'Ausencia total (salvo IP67+)'), tc(docx, 'Cancelar operación')] }),
        new TableRow({ children: [tc(docx, 'Temperatura ambiente'), tc(docx, 'Según Manual Fabricante'), tc(docx, 'Cancelar operación')] }),
        new TableRow({ children: [tc(docx, 'Tormenta eléctrica'), tc(docx, 'No operar en radio 15 km'), tc(docx, 'Cancelar inmediatamente')] }),
      ],
    }),
    spacer(docx),

    h3(docx, '5.2.5 Coordinación con el Espacio Aéreo'),
    listItem(docx, 'Verificar NOTAMs activos en el área de operación (www.aerocivil.gov.co)'),
    listItem(docx, 'Confirmar que la autorización de vuelo corresponde al área y fecha de operación'),
    listItem(docx, 'Verificar mapas de restricción UAS de AeroCivil (disponibles en módulo Seguridad de Bitafly)'),
    listItem(docx, 'Coordinar con ATC local si la operación se realiza en CTR o TMA de aeródromo'),
    listItem(docx, 'Establecer zona de operación claramente delimitada en tierra'),

    h3(docx, '5.2.6 Briefing del Equipo de Vuelo'),
    bodyPara(docx, 'El Piloto Remoto (PIC) debe realizar un briefing verbal con todo el equipo antes de iniciar la operación, cubriendo:'),
    listItem(docx, 'Objetivos de la misión y área de operación'),
    listItem(docx, 'Roles y responsabilidades de cada integrante'),
    listItem(docx, 'Procedimientos de emergencia específicos para la operación'),
    listItem(docx, 'Punto de aterrizaje de emergencia designado'),
    listItem(docx, 'Señales de comunicación no verbal acordadas'),
    listItem(docx, 'Zona de seguridad para personal en tierra'),
  ];

  // ── SECCIÓN 5.3 — En Vuelo ───────────────────────────────────────────────
  const sec53 = [
    h2(docx, '5.3 Procedimiento Durante el Vuelo'),

    h3(docx, '5.3.1 Monitoreo Continuo'),
    listItem(docx, 'Monitorear continuamente la telemetría: nivel de batería, señal GPS, señal de radio control, altitud'),
    listItem(docx, 'Aterrizar de forma planificada cuando el nivel de batería alcance el 30%'),
    listItem(docx, 'Aterrizar de emergencia cuando el nivel de batería alcance el 15%'),
    listItem(docx, 'Verificar continuamente que el número de satélites no disminuya por debajo de 8'),

    h3(docx, '5.3.2 Contacto Visual'),
    listItem(docx, 'VLOS: Mantener contacto visual directo y sin ayudas con la aeronave en todo momento'),
    listItem(docx, 'EVLOS: Coordinar con observadores posicionados para mantener visibilidad extendida'),
    listItem(docx, 'BVLOS: Operar únicamente con autorización expresa de AeroCivil y sistemas alternativos de detección'),
    listItem(docx, 'Nunca perder de vista la aeronave salvo autorización específica de AeroCivil'),

    h3(docx, '5.3.3 Distancias de Seguridad'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        headerRow(docx, ['Obstáculo / Zona', 'Distancia Mínima', 'Norma']),
        new TableRow({ children: [tc(docx, 'Personas no involucradas'), tc(docx, '30 metros en VLOS'), tc(docx, 'RAC 100.815')] }),
        new TableRow({ children: [tc(docx, 'Zonas urbanas / pobladas'), tc(docx, '150 metros sin autorización'), tc(docx, 'RAC 100.815')] }),
        new TableRow({ children: [tc(docx, 'Aeropuertos / Aeródromos'), tc(docx, '9 km sin coordinación ATC'), tc(docx, 'RAC 100.805')] }),
        new TableRow({ children: [tc(docx, 'Infraestructura crítica'), tc(docx, '300 metros'), tc(docx, 'RAC 100.805')] }),
        new TableRow({ children: [tc(docx, 'Altitud máxima AGL'), tc(docx, '400 pies (122 m) sin autorización'), tc(docx, 'RAC 100.805')] }),
      ],
    }),
    spacer(docx),

    h3(docx, '5.3.4 Comunicaciones'),
    listItem(docx, 'Mantener comunicación permanente entre PIC y observadores durante la operación'),
    listItem(docx, 'Usar canal de radio/app acordado en el briefing'),
    listItem(docx, 'Reportar cualquier anomalía inmediatamente al PIC'),
    listItem(docx, 'En caso de interferencia de comunicaciones: activar RTH y aterrizar de forma segura'),

    h3(docx, '5.3.5 Prohibiciones en Vuelo'),
    listItem(docx, 'No operar sobre multitudes o concentraciones de personas sin autorización expresa'),
    listItem(docx, 'No operar sobre vías de alta velocidad activas'),
    listItem(docx, 'No operar en condiciones de IMC (nubes, niebla, lluvia) sin equipamiento certificado'),
    listItem(docx, 'No operar bajo influencia de sustancias psicoactivas o medicamentos que afecten el juicio'),
    listItem(docx, 'No transferir los controles de la aeronave a personas no autorizadas'),
  ];

  // ── SECCIÓN 5.4 — Post-Vuelo ─────────────────────────────────────────────
  const sec54 = [
    h2(docx, '5.4 Procedimiento Post-Vuelo'),

    h3(docx, '5.4.1 Aterrizaje y Recuperación'),
    listItem(docx, 'Aterrizaje controlado en la zona designada previamente'),
    listItem(docx, 'Apagar motores completamente antes de acercarse a la aeronave'),
    listItem(docx, 'Esperar que las hélices detengan completamente su rotación'),
    listItem(docx, 'Retirar la batería antes de transportar la aeronave'),

    h3(docx, '5.4.2 Inspección Post-Vuelo'),
    bodyPara(docx, 'Realizar inspección visual completa tras cada vuelo:'),
    listItem(docx, '1. Verificar estado general del fuselaje — buscar impactos o daños nuevos'),
    listItem(docx, '2. Inspeccionar hélices — buscar astillas, grietas o deformaciones'),
    listItem(docx, '3. Verificar motores — temperatura normal, sin olores a quemado'),
    listItem(docx, '4. Inspeccionar batería(s) — hinchamiento, temperatura excesiva, daños visibles'),
    listItem(docx, '5. Verificar cámara/payload — daños o desalineación'),
    listItem(docx, '6. Revisar logs de vuelo en la app del fabricante — errores o advertencias'),
    listItem(docx, '7. Documentar cualquier anomalía encontrada en Bitafly (campo Notas o SMS)'),

    h3(docx, '5.4.3 Registro en Bitácora Digital'),
    bodyPara(docx, `Registrar el vuelo en la plataforma Bitafly (F-OPS-002) con los siguientes datos:`),
    listItem(docx, 'Fecha, hora de despegue y hora de aterrizaje'),
    listItem(docx, 'Serial de la aeronave y batería(s) utilizada(s)'),
    listItem(docx, 'Tipo de misión y ubicación de la operación'),
    listItem(docx, 'Nombre del Piloto Remoto (PIC)'),
    listItem(docx, 'Observaciones, incidentes o anomalías de la operación'),
    bodyPara(docx, 'El registro en la bitácora es obligatorio para efectos de auditoría ante AeroCivil (RAC 100 Subparte F).'),

    h3(docx, '5.4.4 Gestión de Baterías Post-Vuelo'),
    listItem(docx, 'Registrar ciclo de uso de cada batería en Bitafly (F-MNT-003)'),
    listItem(docx, 'Dejar enfriar las baterías antes de cargar (temperatura < 45°C)'),
    listItem(docx, 'Almacenar baterías al 40-60% de carga si no se usarán en las próximas 24 horas'),
    listItem(docx, 'Reportar baterías con comportamiento anormal para inspección técnica'),

    h3(docx, '5.4.5 Debrief del Equipo'),
    listItem(docx, 'Revisar el desempeño de la operación con todo el equipo'),
    listItem(docx, 'Identificar lecciones aprendidas y oportunidades de mejora'),
    listItem(docx, 'Reportar en Bitafly cualquier evento de seguridad (VOR/MOR) antes de terminar la jornada'),
  ];

  // ── SECCIÓN 5.5 — Emergencias ────────────────────────────────────────────
  const sec55 = [
    new Paragraph({ children: [], pageBreakBefore: true }),
    h2(docx, '5.5 Procedimientos de Emergencia'),
    bodyPara(docx, 'Ante cualquier emergencia, la prioridad es: 1) Seguridad de personas en tierra, 2) Seguridad de la aeronave, 3) Continuidad de la misión. Ninguna consideración comercial justifica comprometer la seguridad.'),

    h3(docx, '5.5.1 Pérdida de Enlace de Datos (Failsafe)'),
    listItem(docx, 'El sistema debe estar configurado para ejecutar Return-to-Home (RTH) automático'),
    listItem(docx, 'Verificar que el punto Home esté correctamente establecido antes de cada vuelo'),
    listItem(docx, 'Si el RTH automático no se activa: intentar recuperar enlace cambiando de canal/frecuencia'),
    listItem(docx, 'Si no se recupera el enlace en 30 segundos: despejar el área bajo la trayectoria de RTH'),
    listItem(docx, 'Reportar el evento en Bitafly (VOR) con descripción técnica'),

    h3(docx, '5.5.2 Falla de Batería en Vuelo'),
    listItem(docx, 'Alerta al 30%: planificar regreso inmediato al punto de aterrizaje'),
    listItem(docx, 'Alerta crítica al 15%: aterrizaje de emergencia en el punto más seguro disponible'),
    listItem(docx, 'Despejar el área de aterrizaje de emergencia inmediatamente'),
    listItem(docx, 'No intentar recuperar distancia si la batería está por debajo del 15%'),
    listItem(docx, 'Reportar el evento si la batería no cumplió la autonomía prevista'),

    h3(docx, '5.5.3 Condiciones Meteorológicas Adversas Sobrevenidas'),
    listItem(docx, 'Ante deterioro repentino del tiempo: aterrizaje inmediato — no completar la misión'),
    listItem(docx, 'Ante viento repentino superior al límite: aterrizaje inmediato a favor del viento'),
    listItem(docx, 'Ante tormenta eléctrica en desarrollo: aterrizaje inmediato y alejarse del equipo metálico'),
    listItem(docx, 'La misión puede ser reprogramada — no puede ser recuperada una aeronave perdida'),

    h3(docx, '5.5.4 Intrusión de Aeronave Tripulada'),
    listItem(docx, 'Al detectar aeronave tripulada en el área de operación: descender y aterrizar inmediatamente'),
    listItem(docx, 'Ceder siempre el espacio aéreo a aeronaves tripuladas (RAC 100.805)'),
    listItem(docx, 'No reanudar la operación hasta que la aeronave tripulada haya abandonado el área'),
    listItem(docx, 'Reportar el evento a AeroCivil si la intrusión fue en área restringida o CTR'),

    h3(docx, '5.5.5 Incidente o Accidente'),
    bodyPara(docx, 'Se considera ACCIDENTE todo evento que resulte en lesiones a personas o daños significativos a propiedad. Se considera INCIDENTE todo evento que no llegó a ser accidente pero pudo haberlo sido.'),
    listItem(docx, 'Paso 1: Asegurar la seguridad de las personas — prestar primeros auxilios si es necesario'),
    listItem(docx, 'Paso 2: Preservar la escena del accidente — no mover la aeronave'),
    listItem(docx, 'Paso 3: Notificar al Jefe de Pilotos / Responsable de SMS de la organización'),
    listItem(docx, 'Paso 4: Reportar en Bitafly mediante formato MOR (Mandatorio) dentro de las 24 horas'),
    listItem(docx, 'Paso 5: Notificar a AeroCivil según procedimiento RAC 100 Subparte G'),
    listItem(docx, 'Paso 6: No operar la aeronave involucrada hasta inspección técnica completa'),

    h3(docx, '5.5.6 Pérdida de la Aeronave'),
    listItem(docx, 'Activar telemetría de último registro GPS para localización'),
    listItem(docx, 'Reportar a AeroCivil dentro de las 24 horas siguientes'),
    listItem(docx, 'Registrar el evento en Bitafly (MOR)'),
    listItem(docx, 'Iniciar proceso de baja del RUAS ante AeroCivil si no es recuperada'),
  ];

  // ── SECCIÓN 5.6 — Limitaciones ───────────────────────────────────────────
  const sec56 = [
    h2(docx, '5.6 Limitaciones Operacionales'),
    bodyPara(docx, `Las siguientes limitaciones son de obligatorio cumplimiento para todas las operaciones de ${orgName}. Para operaciones que requieran superar estos límites, se deberá obtener autorización expresa de AeroCivil y realizar el análisis SORA correspondiente en la plataforma Bitafly.`),
    spacer(docx),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        headerRow(docx, ['Parámetro', 'Límite por defecto', 'Límite con autorización', 'Referencia normativa']),
        new TableRow({ children: [tc(docx, 'Altitud máxima AGL'), tc(docx, '400 pies (122 m)'), tc(docx, 'Según autorización ATC'), tc(docx, 'RAC 100.805')] }),
        new TableRow({ children: [tc(docx, 'Distancia a personas (VLOS)'), tc(docx, '30 metros'), tc(docx, 'Según análisis SORA'), tc(docx, 'RAC 100.815')] }),
        new TableRow({ children: [tc(docx, 'Operación nocturna'), tc(docx, 'Prohibida'), tc(docx, 'Con autorización específica'), tc(docx, 'RAC 100.810')] }),
        new TableRow({ children: [tc(docx, 'Operación sobre área urbana'), tc(docx, 'Restringida'), tc(docx, 'Con autorización + SORA'), tc(docx, 'RAC 100.815')] }),
        new TableRow({ children: [tc(docx, 'BVLOS'), tc(docx, 'Prohibido'), tc(docx, 'Con autorización específica'), tc(docx, 'RAC 100.820')] }),
        new TableRow({ children: [tc(docx, 'Vuelo autónomo'), tc(docx, 'Restringido'), tc(docx, 'Con autorización específica'), tc(docx, 'RAC 100.820')] }),
        new TableRow({ children: [tc(docx, 'Masa máxima al despegue'), tc(docx, 'Según certificado RUAS'), tc(docx, 'No aplica'), tc(docx, 'RAC 100.403')] }),
        new TableRow({ children: [tc(docx, 'Vuelo sobre espectadores'), tc(docx, 'Prohibido'), tc(docx, 'Con autorización + SORA'), tc(docx, 'RAC 100.815')] }),
      ],
    }),
    spacer(docx),
    bodyPara(docx, 'Para operaciones específicas, las limitaciones pueden ser ajustadas mediante el análisis SORA disponible en la plataforma Bitafly, conforme a la metodología JARUS v2.0. El nivel SAIL resultante determina los Objetivos Operacionales de Seguridad (OSO) aplicables.'),
  ];

  // ── ANEXO A — Flota ──────────────────────────────────────────────────────
  const aircraftRows = aircraft.length > 0
    ? aircraft.map((a, i) =>
        new TableRow({
          children: [
            tc(docx, a.brand || '—',       { bg: i % 2 === 0 ? 'FFFFFF' : GRAY_BG }),
            tc(docx, a.model || '—',       { bg: i % 2 === 0 ? 'FFFFFF' : GRAY_BG }),
            tc(docx, a.serial_number || '—', { bg: i % 2 === 0 ? 'FFFFFF' : GRAY_BG }),
            tc(docx, a.ruas || '—',        { bg: i % 2 === 0 ? 'FFFFFF' : GRAY_BG }),
            tc(docx, a.total_hours ? `${parseFloat(a.total_hours).toFixed(1)} h` : '0.0 h', { bg: i % 2 === 0 ? 'FFFFFF' : GRAY_BG }),
            tc(docx, a.status || 'Activo', { bg: i % 2 === 0 ? 'FFFFFF' : GRAY_BG }),
          ],
        })
      )
    : [new TableRow({ children: [tc(docx, 'Sin aeronaves registradas', { width: 9000 })] })];

  const annexA = [
    new Paragraph({ children: [], pageBreakBefore: true }),
    h1(docx, 'Anexo A — Flota Autorizada'),
    bodyPara(docx, `Inventario de aeronaves no tripuladas activas de ${orgName} al ${todayStr}. Esta tabla se genera automáticamente desde la plataforma Bitafly con los datos de la flota registrada.`),
    spacer(docx),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        headerRow(docx, ['Fabricante', 'Modelo', 'Número de Serie', 'Reg. RUAS', 'Horas T.T.', 'Estado']),
        ...aircraftRows,
      ],
    }),
    spacer(docx),
    bodyPara(docx, `Total de aeronaves registradas: ${aircraft.length}`),
  ];

  // ── ANEXO B — Personal ───────────────────────────────────────────────────
  const pilotRows = pilots.length > 0
    ? pilots.map((p, i) =>
        new TableRow({
          children: [
            tc(docx, p.name || '—',            { bg: i % 2 === 0 ? 'FFFFFF' : GRAY_BG }),
            tc(docx, p.license_number || p.id_number || '—', { bg: i % 2 === 0 ? 'FFFFFF' : GRAY_BG }),
            tc(docx, fmtDateShort(p.medical_expiry), { bg: i % 2 === 0 ? 'FFFFFF' : GRAY_BG }),
            tc(docx, p.pilot_role || 'Piloto Remoto', { bg: i % 2 === 0 ? 'FFFFFF' : GRAY_BG }),
            tc(docx, p.phone || '—',           { bg: i % 2 === 0 ? 'FFFFFF' : GRAY_BG }),
          ],
        })
      )
    : [new TableRow({ children: [tc(docx, 'Sin pilotos registrados', { width: 9000 })] })];

  const annexB = [
    new Paragraph({ children: [], pageBreakBefore: true }),
    h1(docx, 'Anexo B — Personal Autorizado'),
    bodyPara(docx, `Listado de pilotos remotos activos de ${orgName} al ${todayStr}. Esta tabla se genera automáticamente desde la plataforma Bitafly.`),
    spacer(docx),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        headerRow(docx, ['Nombre Completo', 'CIPU / Licencia', 'Médico Vence', 'Rol', 'Teléfono']),
        ...pilotRows,
      ],
    }),
    spacer(docx),
    bodyPara(docx, `Total de pilotos activos: ${pilots.length}`),
  ];

  // ── ANEXO C — Formatos de Referencia ────────────────────────────────────
  const annexC = [
    new Paragraph({ children: [], pageBreakBefore: true }),
    h1(docx, 'Anexo C — Formatos de Referencia'),
    bodyPara(docx, `Los siguientes formatos de control documental de ${orgName} se gestionan digitalmente a través de la plataforma Bitafly (bitafly.com). Los códigos son la nomenclatura interna adoptada por la organización (no son formatos oficiales impuestos por la AeroCivil) y su diligenciamiento es obligatorio para las operaciones de ${orgName}.`),
    spacer(docx),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        headerRow(docx, ['Código', 'Nombre del Formato', 'Módulo en Bitafly', 'Aplicación']),
        new TableRow({ children: [tc(docx, 'F-OPS-001'), tc(docx, 'Plan de Vuelo / Autorización de Operación'), tc(docx, 'Plan de Vuelo → Autorizar'), tc(docx, 'Cada operación')] }),
        new TableRow({ children: [tc(docx, 'F-OPS-002'), tc(docx, 'Bitácora Maestra de Vuelos'), tc(docx, 'Bitácora'), tc(docx, 'Post-vuelo obligatorio')] }),
        new TableRow({ children: [tc(docx, 'F-MNT-003'), tc(docx, 'Registro Operacional de Baterías'), tc(docx, 'Bitácora → Baterías'), tc(docx, 'Post-vuelo obligatorio')] }),
        new TableRow({ children: [tc(docx, 'VOR'), tc(docx, 'Reporte Voluntario de Ocurrencias'), tc(docx, 'Seguridad → VOR/MOR'), tc(docx, 'Eventos voluntarios')] }),
        new TableRow({ children: [tc(docx, 'MOR'), tc(docx, 'Reporte Mandatorio de Ocurrencias'), tc(docx, 'Seguridad → VOR/MOR'), tc(docx, 'Accidentes/incidentes')] }),
        new TableRow({ children: [tc(docx, 'SORA'), tc(docx, 'Análisis de Riesgo Operacional JARUS v2.0'), tc(docx, 'Seguridad → SORA'), tc(docx, 'Por tipo de operación')] }),
      ],
    }),
    spacer(docx),
    bodyPara(docx, 'Para acceder a los formatos digitales: https://bitafly.com/dashboard'),
  ];

  // ── CONSTRUIR DOCUMENTO ──────────────────────────────────────────────────
  const doc = new Document({
    creator: 'Bitafly — bitafly.com',
    title: `MO Cap5 — ${orgName} — v1.0`,
    description: 'Manual de Operaciones Capítulo 5 — Procedimientos Operacionales RAC 100',
    styles: {
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          run: { bold: true, size: 32, color: ORANGE },
          paragraph: { spacing: { before: 400, after: 200 } },
        },
      ],
    },
    sections: [
      {
        // Portada — sin header/footer
        properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
        children: portada,
      },
      {
        // Resto del documento — con header y footer
        properties: { page: { margin: { top: 1080, bottom: 1080, left: 1260, right: 1260 } } },
        headers: { default: pageHeader },
        footers: { default: pageFooter },
        children: [
          ...controlCambios,
          ...sec51,
          ...sec52,
          ...sec53,
          ...sec54,
          ...sec55,
          ...sec56,
          ...annexA,
          ...annexB,
          ...annexC,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

// ── Placeholders para fases futuras ──────────────────────────────────────

/**
 * OM - Operaciones
 * Capítulo completo de gestión de operaciones: planificación, ejecución,
 * coordinación con AeroCivil, gestión de autorizaciones.
 * PENDIENTE — Fase futura.
 */
export async function generateOMOperaciones(/* org, flights, authorizations */) {
  throw new Error('OM - Operaciones: pendiente de implementación en fase futura.');
}

/**
 * OM - SMS (Safety Management System)
 * Capítulo de gestión de seguridad operacional: política SMS, barreras,
 * reportes VOR/MOR, análisis SORA, indicadores de seguridad.
 * PENDIENTE — Fase futura.
 */
export async function generateOMSMS(/* org, smsReports, soraAssessments */) {
  throw new Error('OM - SMS: pendiente de implementación en fase futura.');
}
