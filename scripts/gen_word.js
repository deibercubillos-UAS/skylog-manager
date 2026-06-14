// Genera: docs/Bitafly_Pitch_Inversionistas.docx
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType, AlignmentType,
  BorderStyle, ShadingType, VerticalAlign, PageBreak,
  Spacing, TableLayoutType, convertInchesToTwip,
} = require('docx');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'docs', 'Bitafly_Pitch_Inversionistas.docx');

// ─── Helpers ───────────────────────────────────────────────────────────────
const NAVY  = '1A2744';
const BLUE  = '1E3A5F';
const SKY   = '2D7DD2';
const GREEN = '1B7A4A';
const GOLD  = 'B8860B';
const GRAY  = 'F2F4F7';
const WHITE = 'FFFFFF';

function h1(text) {
  return new Paragraph({
    text, heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    run: { color: NAVY, bold: true, size: 36 },
    shading: { type: ShadingType.CLEAR, fill: GRAY },
  });
}

function h2(text) {
  return new Paragraph({
    text, heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 120 },
    children: [new TextRun({ text, bold: true, size: 28, color: BLUE })],
  });
}

function h3(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 24, color: SKY })],
    spacing: { before: 200, after: 80 },
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, size: opts.size || 22, color: opts.color || '000000', bold: opts.bold || false, italics: opts.italic || false })],
    spacing: { before: opts.spaceBefore || 60, after: opts.spaceAfter || 60 },
    alignment: opts.align || AlignmentType.LEFT,
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    children: [new TextRun({ text, size: 22 })],
    spacing: { before: 40, after: 40 },
  });
}

function highlightBox(text, bgColor = GRAY) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: [
      new TableCell({
        shading: { type: ShadingType.CLEAR, fill: bgColor },
        margins: { top: 200, bottom: 200, left: 200, right: 200 },
        children: [new Paragraph({
          children: [new TextRun({ text, size: 24, bold: true, color: NAVY })],
          alignment: AlignmentType.CENTER,
        })],
      })
    ]})],
    margins: { top: 200, bottom: 200 },
  });
}

function tableRow(cells, isHeader = false) {
  return new TableRow({
    tableHeader: isHeader,
    children: cells.map((c, i) => new TableCell({
      shading: isHeader ? { type: ShadingType.CLEAR, fill: NAVY } : (i % 2 === 0 && !isHeader ? { type: ShadingType.CLEAR, fill: GRAY } : undefined),
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 100, bottom: 100, left: 120, right: 120 },
      children: [new Paragraph({
        children: [new TextRun({
          text: c,
          size: isHeader ? 22 : 21,
          bold: isHeader,
          color: isHeader ? WHITE : NAVY,
        })],
        alignment: AlignmentType.LEFT,
      })],
    })),
  });
}

function dataTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    rows: [
      tableRow(headers, true),
      ...rows.map(r => tableRow(r, false)),
    ],
    margins: { top: 200, bottom: 200 },
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function divider() {
  return new Paragraph({
    border: { bottom: { color: SKY, style: BorderStyle.SINGLE, size: 6 } },
    spacing: { before: 200, after: 200 },
    text: '',
  });
}

// ─── Contenido ─────────────────────────────────────────────────────────────
const sections = [];

// ══════════════════════════════════════════════════════════════════════════════
// PORTADA
// ══════════════════════════════════════════════════════════════════════════════
const portada = [
  new Paragraph({ spacing: { before: 1400 } }),
  new Paragraph({
    children: [new TextRun({ text: 'BITAFLY', size: 72, bold: true, color: NAVY })],
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Oportunidad de Inversión', size: 40, color: SKY, bold: true })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 100 },
  }),
  new Paragraph({
    children: [new TextRun({ text: 'Plataforma SaaS para operadores de drones en Colombia', size: 26, color: BLUE, italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 80 },
  }),
  new Paragraph({ spacing: { before: 400 } }),
  new Paragraph({
    children: [new TextRun({ text: 'Cumplimiento RAC 100 · AeroCivil · UAEAC', size: 22, color: '666666' })],
    alignment: AlignmentType.CENTER,
  }),
  new Paragraph({ spacing: { before: 200 } }),
  new Paragraph({
    children: [new TextRun({ text: 'Junio 2026', size: 22, color: '999999', italics: true })],
    alignment: AlignmentType.CENTER,
  }),
  pageBreak(),
];

// ══════════════════════════════════════════════════════════════════════════════
// 1. GLOSARIO
// ══════════════════════════════════════════════════════════════════════════════
const glosario = [
  h1('📖 Glosario de Términos'),
  p('Este documento usa lenguaje financiero y técnico estándar. Aquí explicamos cada abreviación en términos simples para que cualquier inversionista pueda entender el modelo con claridad.', { italic: true }),
  new Paragraph({ spacing: { before: 200 } }),

  h3('Términos Financieros SaaS'),
  dataTable(
    ['Abreviación', 'Nombre completo', 'Qué significa en términos simples'],
    [
      ['MRR', 'Monthly Recurring Revenue', 'Cuánto dinero entra fijo cada mes por suscripciones activas. Es el "sueldo mensual" del negocio.'],
      ['ARR', 'Annual Recurring Revenue', 'El MRR multiplicado por 12. Muestra el ingreso anualizado si nada cambia. Usado para valorar empresas SaaS.'],
      ['ARPU', 'Average Revenue Per User', 'Cuánto paga en promedio cada cliente al mes. Si tienes 10 clientes y cobras $919.000, el ARPU es $91.900.'],
      ['EBITDA', 'Earnings Before Interest, Taxes, Depreciation & Amortization', 'Utilidad operativa bruta: lo que queda del ingreso después de pagar costos operativos, ANTES de impuestos y deudas. Es el indicador de salud del negocio.'],
      ['LTV', 'Lifetime Value', 'Cuánto dinero en total genera un cliente durante toda su relación con la empresa. Si paga $91.900/mes y dura 25 meses → LTV = $1.950.000 COP.'],
      ['CAC', 'Customer Acquisition Cost', 'Cuánto cuesta conseguir un cliente nuevo (publicidad + tiempo + herramientas dividido entre clientes obtenidos). Meta: que LTV sea al menos 3× el CAC.'],
      ['LTV/CAC', 'Ratio LTV sobre CAC', 'Cuántas veces se recupera lo invertido en conseguir un cliente. Un ratio de 5× significa que por cada $1 gastado en adquirir clientes, se generan $5 de valor. Sano si es >3×.'],
      ['Churn', 'Churn Rate / Tasa de cancelación', 'Porcentaje de clientes que cancelan su suscripción cada mes. 4% mensual = pierdes 4 de cada 100 clientes por mes. Meta: mantener bajo (<5%).'],
      ['Payback', 'Período de recuperación del CAC', 'Cuántos meses tarda un cliente en "pagar" lo que costó conseguirlo. 5 meses = en 5 meses ya recuperaste el costo de adquisición. Muy bueno si es <12 meses.'],
      ['TIR / IRR', 'Tasa Interna de Retorno', 'La tasa de rentabilidad anualizada de una inversión. TIR 82% anual significa que tu dinero crece al 82% por año, como si fuera un CDT con ese rendimiento.'],
      ['Margen bruto', 'Gross Margin', 'Porcentaje del ingreso que queda después de pagar los costos directos del servicio (servidores, APIs, etc.). 85% significa que de cada $100 cobrados, $85 son utilidad bruta.'],
    ]
  ),

  new Paragraph({ spacing: { before: 300 } }),
  h3('Valoración y Capital'),
  dataTable(
    ['Término', 'Explicación simple'],
    [
      ['Pre-money', 'Valor de la empresa ANTES de recibir la inversión. Es el precio al que se calculan las acciones antes de que entre el inversionista.'],
      ['Post-money', 'Valor DESPUÉS de recibir la inversión = Pre-money + monto invertido. Ej: pre-money $400M + inversión $5M = post-money $405M.'],
      ['Dilución', 'Al emitir acciones nuevas para el inversionista, el fundador tiene un porcentaje menor. Ej: si el fundador tenía 100% de 1.000 acciones y emite 12 nuevas → ahora tiene 1.000/1.012 = 98.8%.'],
      ['Acción', 'Una unidad de propiedad de la empresa. 1.000 acciones totales = cada acción representa el 0.1% de la compañía.'],
      ['Múltiplo de retorno (×)', 'Cuántas veces recuperas tu inversión. 20× sobre $5M = recibes $100M al salir. No es el rendimiento anual, sino el total acumulado.'],
      ['Exit / Salida', 'Evento en el que el inversionista convierte sus acciones en dinero: venta de la empresa, fusión, compra por un fondo, o IPO (bolsa de valores).'],
      ['Valoración ARR×', 'Método para valorar empresas SaaS: ARR (ingresos anualizados) multiplicado por un factor (3×–6× típico en LatAm). Ej: ARR $2.949M × 4× = empresa vale $11.800M COP.'],
    ]
  ),

  new Paragraph({ spacing: { before: 300 } }),
  h3('Términos de Mercado y Regulación'),
  dataTable(
    ['Abreviación', 'Significado', 'Contexto'],
    [
      ['TAM', 'Total Addressable Market', 'Mercado total disponible. Todos los operadores de drones comerciales en Colombia (~6.000 en 2026).'],
      ['SAM', 'Serviceable Addressable Market', 'La porción del mercado que realmente puede usar tu producto. Los que necesitan cumplimiento RAC 100 activo (~3.600).'],
      ['SOM', 'Serviceable Obtainable Market', 'Lo que puedes capturar de forma realista dado tu presupuesto y equipo. Año 1: ~148 clientes (4% del SAM).'],
      ['SaaS', 'Software as a Service', 'Modelo de negocio: software que se paga por suscripción mensual/anual, no se compra una sola vez. Alta escalabilidad y márgenes.'],
      ['RAC 100', 'Reglamento Aeronáutico Colombiano 100', 'La norma legal colombiana que regula el uso comercial de drones. Es OBLIGATORIO para operar legalmente. Bitafly gestiona todo el cumplimiento.'],
      ['UAEAC', 'Unidad Administrativa Especial de Aeronáutica Civil', 'La entidad del Estado colombiano que regula la aviación (incluidos drones). Reportes, autorizaciones y bitácoras deben cumplirle a esta entidad.'],
      ['UAS', 'Unmanned Aerial System', 'Sistema de aeronave no tripulada = dron completo (aeronave + control + batería).'],
      ['AeroCivil', 'Aeronáutica Civil de Colombia', 'Nombre coloquial de la UAEAC. Los pilotos de drones comerciales deben registrarse y reportar ante esta entidad.'],
      ['COP', 'Peso Colombiano', 'Moneda colombiana. Todos los valores en este documento están en COP salvo que diga "USD".'],
      ['TRM', 'Tasa Representativa del Mercado', 'El tipo de cambio oficial COP/USD. En este modelo se usa $4.100 COP por 1 USD.'],
      ['CPC', 'Costo Por Clic', 'Cuánto cuesta en publicidad digital (Google Ads) cada vez que alguien hace clic en tu anuncio. En el nicho drones Colombia: ~$2.500 COP/clic.'],
    ]
  ),
  pageBreak(),
];

// ══════════════════════════════════════════════════════════════════════════════
// 2. RESUMEN EJECUTIVO
// ══════════════════════════════════════════════════════════════════════════════
const resumen = [
  h1('🚀 Por Qué Bitafly'),
  h2('El problema que resuelve'),
  p('En Colombia operan más de 6.000 empresas con drones comerciales. Desde 2022, la UAEAC (AeroCivil) exige cumplimiento estricto del RAC 100: bitácoras digitales, planes de vuelo, gestión de mantenimiento, reportes de seguridad y autorizaciones de espacio aéreo.'),
  p('Hoy, la mayoría lo hace en Excel, papel o herramientas extranjeras (Airdata, DroneDeploy) que NO están adaptadas al marco legal colombiano. El riesgo: multas, suspensión de operaciones, accidentes sin respaldo documental.'),
  new Paragraph({ spacing: { before: 200 } }),

  h2('La solución'),
  p('Bitafly es la primera plataforma SaaS colombiana de gestión integral de operaciones con drones, 100% alineada con el RAC 100. Todo en un solo lugar:'),
  bullet('✅ Bitácora digital de vuelos con sincronización automática DJI'),
  bullet('✅ Gestión de flota, baterías y mantenimiento preventivo'),
  bullet('✅ Planes de vuelo y mapas con descarga KMZ/PDF para AeroCivil'),
  bullet('✅ Sistema de Gestión de Seguridad (SMS aeronáutico)'),
  bullet('✅ Evaluación SORA para vuelos en espacio aéreo controlado'),
  bullet('✅ Reportes de auditoría listos para inspección'),
  new Paragraph({ spacing: { before: 200 } }),

  h2('Ventaja competitiva (Moat)'),
  dataTable(
    ['Dimensión', 'Bitafly', 'Competidores internacionales'],
    [
      ['Marco legal', 'RAC 100 nativo, terminología UAEAC', 'CAA (UK), FAA (EE.UU.), sin RAC 100'],
      ['Idioma y soporte', 'Español colombiano, UTC-5', 'Inglés, sin soporte local'],
      ['Moneda y pagos', 'COP, ePayco (Colombia)', 'USD, tarjetas internacionales'],
      ['Integración DJI', 'Sync automática de vuelos DJI', 'Parcial o manual'],
      ['Precio', '$19.900–$249.900 COP/mes', '$15–$50 USD/mes (~$62.000–$205.000 COP)'],
    ]
  ),
  pageBreak(),
];

// ══════════════════════════════════════════════════════════════════════════════
// 3. PITCH DE INVERSIÓN MÍNIMA $5M
// ══════════════════════════════════════════════════════════════════════════════

// Cálculos clave
const PREMONEY   = 400_000_000;  // COP
const SHARES     = 1000;
const PRICE_SHR  = PREMONEY / SHARES; // 400.000
const INV        = 5_000_000;
const NEW_SHR    = INV / PRICE_SHR;   // 12.5
const TOTAL_SHR  = SHARES + NEW_SHR;  // 1012.5
const PCT        = (NEW_SHR / TOTAL_SHR * 100).toFixed(2); // ~1.23%
const POSTMONEY  = PREMONEY + INV;

// Retorno Year 5
const ARR5   = 2_949_000_000;
const MULT   = 4;
const VAL5   = ARR5 * MULT;  // 11.796B
const STAKE5 = VAL5 * (NEW_SHR / TOTAL_SHR);
const ROI_X  = (STAKE5 / INV).toFixed(1);

// Retorno Year 3
const ARR3   = 1_033_000_000;
const VAL3   = ARR3 * MULT;
const STAKE3 = VAL3 * (NEW_SHR / TOTAL_SHR);
const ROI3_X = (STAKE3 / INV).toFixed(1);

function formatCOP(n) {
  return '$' + Math.round(n).toLocaleString('es-CO') + ' COP';
}

const pitchInversion = [
  h1('💰 La Oportunidad de Inversión'),
  h2('Inversión mínima: $5.000.000 COP'),
  p('Con una inversión de $5.000.000 COP te conviertes en copropietario de Bitafly desde el día 1, con una participación real en el crecimiento de la empresa.', { bold: true }),
  new Paragraph({ spacing: { before: 200 } }),

  highlightBox('¿Cuántas acciones recibes con $5.000.000 COP?', 'D6E8F9'),
  new Paragraph({ spacing: { before: 100 } }),

  dataTable(
    ['Concepto', 'Valor'],
    [
      ['Valoración pre-money de Bitafly', formatCOP(PREMONEY)],
      ['Total de acciones emitidas', `${SHARES} acciones`],
      ['Precio por acción', formatCOP(PRICE_SHR)],
      ['Tu inversión', formatCOP(INV)],
      ['Acciones que recibes', `${NEW_SHR} acciones (≈ 12 o 13 según negociación)`],
      ['Tu participación en la empresa', `${PCT}% de Bitafly`],
      ['Valoración post-money', formatCOP(POSTMONEY)],
    ]
  ),
  new Paragraph({ spacing: { before: 200 } }),

  p('📌 Nota: Con $5.000.000 COP obtienes 12,5 acciones. En la práctica se puede negociar emitir 12 acciones ($4.800.000) o 13 acciones ($5.200.000) para mantener números enteros.', { italic: true, color: '666666' }),
  new Paragraph({ spacing: { before: 300 } }),

  h2('⏱️ ¿Cuándo y cómo recuperas tu inversión?'),
  p('A diferencia de un préstamo, en equity no hay cuotas mensuales. El retorno llega cuando la empresa se vende, fusiona, o se hace una ronda de inversión a mayor valoración. Aquí el calendario proyectado:'),
  new Paragraph({ spacing: { before: 200 } }),

  dataTable(
    ['Hito', 'Cuándo', 'Qué significa para ti'],
    [
      ['EBITDA positivo', 'Mes 10 (10 meses desde hoy)', 'La empresa ya genera utilidades. El valor de tus acciones sube porque el negocio es rentable.'],
      ['Valoración ~$2.000M COP', 'Año 2 (~18 meses)', `Tu participación (${PCT}%) vale ~${formatCOP(2_000_000_000 * NEW_SHR / TOTAL_SHR)} → retorno ~${(2_000_000_000 * NEW_SHR / TOTAL_SHR / INV).toFixed(1)}×`],
      ['Valoración ~$4.100M COP', 'Año 3', `Tu participación vale ~${formatCOP(VAL3 * NEW_SHR / TOTAL_SHR)} → retorno ~${ROI3_X}×`],
      ['Valoración ~$11.800M COP', 'Año 5', `Tu participación vale ~${formatCOP(STAKE5)} → retorno ~${ROI_X}×`],
      ['Evento de salida (exit)', 'Año 3–7', 'Venta a fondo de inversión, empresa grande, o IPO → conviertes acciones en dinero efectivo.'],
    ]
  ),
  new Paragraph({ spacing: { before: 200 } }),

  highlightBox(`Proyección: $5.000.000 COP invertidos hoy → ~${formatCOP(STAKE5)} en Año 5 (~${ROI_X}× tu dinero en 5 años)`, 'D4EDDA'),
  new Paragraph({ spacing: { before: 300 } }),

  h2('📊 Comparación con otras inversiones'),
  dataTable(
    ['Inversión', 'Retorno anual típico', '$5M COP en 5 años (aprox.)', 'Riesgo'],
    [
      ['CDT banco colombiano', '~10% anual', '~$8.000.000 COP', 'Muy bajo'],
      ['Finca raíz Colombia', '~12% anual', '~$8.800.000 COP', 'Bajo–Medio'],
      ['Acciones bolsa Colombia', '~15% anual', '~$10.000.000 COP', 'Medio'],
      ['Startup SaaS (este caso)', '~82% TIR proyectada', `~${formatCOP(STAKE5)}`, 'Alto — mayor potencial'],
    ]
  ),
  p('* Los retornos de Bitafly son proyecciones basadas en supuestos explícitos, no garantías. El riesgo es mayor, pero también el potencial de retorno.', { italic: true, color: '666666', size: 20 }),
  pageBreak(),
];

// ══════════════════════════════════════════════════════════════════════════════
// 4. PROYECCIÓN Y MÉTRICAS
// ══════════════════════════════════════════════════════════════════════════════
const proyeccion = [
  h1('📈 Proyección Financiera'),
  h2('Año 1 — Resumen mensual'),
  dataTable(
    ['Mes', 'Clientes activos', 'Ingresos MRR', 'EBITDA mensual', 'Estado'],
    [
      ['Mes 1',  '2',   '$183.800',    '−$2.026.000', '📉 Inversión'],
      ['Mes 2',  '5',   '$459.500',    '−$1.751.000', '📉 Inversión'],
      ['Mes 3',  '10',  '$919.000',    '−$1.701.000', '📉 Inversión'],
      ['Mes 4',  '16',  '$1.470.400',  '−$1.560.000', '📉 Inversión'],
      ['Mes 5',  '25',  '$2.297.500',  '−$1.143.000', '📉 Inversión'],
      ['Mes 6',  '36',  '$3.308.400',  '−$542.000',   '📉 Inversión'],
      ['Mes 7',  '48',  '$4.411.200',  '−$3.349.000', '📉 +Equipo'],
      ['Mes 8',  '63',  '$5.789.700',  '−$2.380.000', '📉 +Equipo'],
      ['Mes 9',  '81',  '$7.443.900',  '−$1.136.000', '⚡ Cerca'],
      ['Mes 10', '101', '$9.281.900',  '+$292.000',   '✅ POSITIVO'],
      ['Mes 11', '123', '$11.303.700', '+$1.904.000',  '✅ POSITIVO'],
      ['Mes 12', '148', '$13.601.200', '+$3.381.000',  '✅ POSITIVO'],
    ]
  ),
  p('→ EBITDA mensual positivo desde el Mes 10. Pérdida acumulada Año 1: ~$10M COP (inversión en crecimiento).', { bold: true, color: GREEN }),
  new Paragraph({ spacing: { before: 200 } }),

  h2('Proyección a 5 años'),
  dataTable(
    ['Año', 'Clientes', 'ARPU/mes', 'Ingreso anual', 'Margen EBITDA', 'EBITDA'],
    [
      ['Año 1', '148',   '$91.900',  '~$60M COP',     '−17%', '−$10M COP'],
      ['Año 2', '420',   '$96.500',  '~$324M COP',    '+10%', '+$32M COP'],
      ['Año 3', '850',   '$101.300', '~$772M COP',    '+20%', '+$154M COP'],
      ['Año 4', '1.450', '$106.400', '~$1.468M COP',  '+28%', '+$411M COP'],
      ['Año 5', '2.200', '$111.700', '~$2.446M COP',  '+32%', '+$784M COP'],
    ]
  ),
  new Paragraph({ spacing: { before: 300 } }),

  h2('Métricas SaaS clave'),
  dataTable(
    ['Métrica', 'Valor Bitafly', 'Referencia "buena"', 'Estado'],
    [
      ['Margen bruto',        '~85%',        '>75%',        '✅ Excelente'],
      ['LTV / CAC',           '~4,9×',       '>3×',         '✅ Saludable'],
      ['Payback del CAC',     '~5 meses',    '<12 meses',   '✅ Muy bueno'],
      ['Churn mensual',       '4%',          '<5%',         '✅ Aceptable'],
      ['Meses a EBITDA+',     '10 meses',    '<18 meses',   '✅ Rápido'],
      ['LTV por cliente',     '$1.950.000',  '>3× CAC',     '✅ Sólido'],
    ]
  ),
  pageBreak(),
];

// ══════════════════════════════════════════════════════════════════════════════
// 5. USO DEL CAPITAL Y PRÓXIMOS PASOS
// ══════════════════════════════════════════════════════════════════════════════
const capital = [
  h1('🎯 Uso del Capital y Próximos Pasos'),
  h2('¿En qué se invierte el dinero?'),
  p('El capital levantado se destina 100% a crecer, no a pagar deudas. El producto ya está terminado y opera sin problemas. El dinero acelera la captura de mercado:'),
  new Paragraph({ spacing: { before: 200 } }),
  dataTable(
    ['Destino', 'Monto (caso $180M COP)', '% del total', 'Impacto esperado'],
    [
      ['Marketing digital (Google Ads, SEO, contenido)', '~$110M COP', '61%', 'Pasar de $400 a $2.500 USD/mes. Meta: 148 clientes en Año 1.'],
      ['Equipo (2–3 personas desde Mes 7)',              '~$50M COP',  '28%', 'Soporte al cliente, ventas, ops. Hoy solo el fundador.'],
      ['Infraestructura + reserva operativa',            '~$20M COP',  '11%', 'Servidores, herramientas, imprevistos.'],
    ]
  ),
  new Paragraph({ spacing: { before: 300 } }),

  h2('Hoja de ruta 2026–2027'),
  dataTable(
    ['Trimestre', 'Hito'],
    [
      ['Q3 2026', 'Cerrar ronda semilla. Escalar marketing. Llegar a 50 clientes.'],
      ['Q4 2026', 'Contratar equipo (2 personas). Integración app Android (APK nativo). 100+ clientes.'],
      ['Q1 2027', 'EBITDA mensual sostenido. Expansión a Perú o Ecuador. 200+ clientes.'],
      ['Q2 2027', 'Lanzamiento iOS. Ronda Serie A opcional (~$800M–$1.200M COP valoración).'],
    ]
  ),
  new Paragraph({ spacing: { before: 300 } }),

  h2('Resumen final para el inversionista'),
  bullet('✅ Producto terminado y funcionando — no es una idea, es una empresa operativa.'),
  bullet('✅ Mercado regulado = cliente cautivo. RAC 100 obliga a cumplir. Bitafly hace la diferencia.'),
  bullet('✅ Sin competidor local con cobertura completa. Ventana de oportunidad abierta.'),
  bullet('✅ Métricas SaaS sanas desde el diseño: margen 85%, LTV/CAC ~5×, payback ~5 meses.'),
  bullet('✅ EBITDA positivo en Mes 10. La empresa no necesita inversión para sobrevivir — la inversión es para dominar el mercado más rápido.'),
  bullet(`✅ $5.000.000 COP hoy → ~${formatCOP(STAKE5)} en Año 5 (proyección, ~${ROI_X}× retorno).`),
  new Paragraph({ spacing: { before: 300 } }),

  p('Para más información o para agendar reunión:', { bold: true }),
  p('📧 deibercubillos@gmail.com', { color: SKY }),
  p('🌐 bitafly.com', { color: SKY }),
  p('📊 Excel con modelo financiero completo disponible bajo solicitud.', { italic: true, color: '666666' }),
];

// ─── Ensamblar documento ───────────────────────────────────────────────────
const doc = new Document({
  title: 'Bitafly — Pitch de Inversión',
  creator: 'Bitafly',
  description: 'Oportunidad de inversión en Bitafly — SaaS drones Colombia',
  styles: {
    default: {
      document: { run: { font: 'Calibri', size: 22 } },
    },
  },
  sections: [{
    children: [
      ...portada,
      ...glosario,
      ...resumen,
      ...pitchInversion,
      ...proyeccion,
      ...capital,
    ],
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log(`✅ Word guardado: ${OUT}`);
}).catch(err => { console.error(err); process.exit(1); });
