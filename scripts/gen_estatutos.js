const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, Header, Footer, LevelFormat, ExternalHyperlink,
} = require('docx');
const fs = require('fs');

// ── helpers ──────────────────────────────────────────────────────────────────

const BLUE   = '1A3A6B';
const GOLD   = 'C8952A';
const GRAY5  = 'F2F4F8';
const GRAY20 = 'D0D5E0';
const BLACK  = '1A1A1A';
const PAGE_W = 11906; // A4
const MARGIN = 1440;  // 1 inch
const CONTENT_W = PAGE_W - MARGIN * 2; // 9026

function para(children, opts = {}) {
  return new Paragraph({ children, ...opts });
}

function run(text, opts = {}) {
  return new TextRun({ text, font: 'Arial', size: 22, color: BLACK, ...opts });
}

function boldRun(text, opts = {}) {
  return run(text, { bold: true, ...opts });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [
      new TextRun({
        text,
        font: 'Arial',
        size: 26,
        bold: true,
        color: 'FFFFFF',
        allCaps: true,
      }),
    ],
    shading: { fill: BLUE, type: ShadingType.CLEAR },
    indent: { left: 120, right: 120 },
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 80 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 4, color: GOLD, space: 4 },
    },
    children: [
      new TextRun({
        text,
        font: 'Arial',
        size: 24,
        bold: true,
        color: BLUE,
      }),
    ],
  });
}

function hr() {
  return new Paragraph({
    spacing: { before: 160, after: 160 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 2, color: GRAY20, space: 1 },
    },
    children: [],
  });
}

function bullet(text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: 560, hanging: 280 },
    children: [run('• ', { bold: true }), run(text)],
  });
}

function numbered(n, text) {
  return new Paragraph({
    spacing: { before: 40, after: 40 },
    indent: { left: 560, hanging: 280 },
    children: [boldRun(`${n}. `), run(text)],
  });
}

function bodyPara(children, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60 },
    children,
    ...opts,
  });
}

function twoColTable(rows, colWidths) {
  const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: GRAY20 };
  const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: colWidths || [CONTENT_W / 2, CONTENT_W / 2],
    rows: rows.map((row, ri) =>
      new TableRow({
        children: row.map((cell, ci) =>
          new TableCell({
            borders,
            width: { size: colWidths ? colWidths[ci] : CONTENT_W / 2, type: WidthType.DXA },
            shading: { fill: ri === 0 ? BLUE : (ri % 2 === 0 ? GRAY5 : 'FFFFFF'), type: ShadingType.CLEAR },
            margins: { top: 80, bottom: 80, left: 120, right: 120 },
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: cell,
                    font: 'Arial',
                    size: 20,
                    bold: ri === 0,
                    color: ri === 0 ? 'FFFFFF' : BLACK,
                  }),
                ],
              }),
            ],
          })
        ),
      })
    ),
  });
}

// ── content ──────────────────────────────────────────────────────────────────

const sections = [
  // ── TITLE PAGE ──
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 2000, after: 200 },
    children: [
      new TextRun({ text: 'ESTATUTOS SOCIALES', font: 'Arial', size: 52, bold: true, color: BLUE }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 160 },
    children: [
      new TextRun({ text: 'BITAFLY S.A.S.', font: 'Arial', size: 44, bold: true, color: GOLD }),
    ],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 120 },
    children: [run('Sociedad por Acciones Simplificada', { size: 26, color: '555555' })],
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 120 },
    children: [run('Ley 1258 de 2008 · Madrid, Cundinamarca, Colombia', { size: 22, color: '777777' })],
  }),
  new Paragraph({ spacing: { before: 400 }, children: [] }),

  // Warning box
  new Paragraph({
    shading: { fill: 'FFF8E1', type: ShadingType.CLEAR },
    border: {
      left: { style: BorderStyle.SINGLE, size: 12, color: GOLD },
    },
    spacing: { before: 80, after: 80 },
    indent: { left: 240, right: 240 },
    children: [
      new TextRun({ text: '⚠ DOCUMENTO DE REFERENCIA INTERNO — ', font: 'Arial', size: 18, bold: true, color: 'B7770D' }),
      new TextRun({ text: 'Debe ser revisado y protocolizado ante notario por un abogado antes de su registro en Cámara de Comercio.', font: 'Arial', size: 18, color: '5C4400' }),
    ],
  }),

  // Page break after cover
  new Paragraph({ pageBreakBefore: true, children: [] }),

  // ── CAP I ──
  h1('Capítulo I — Disposiciones Generales'),

  h2('Artículo 1. Nombre o Razón Social'),
  bodyPara([
    run('La sociedad se denominará '),
    boldRun('BITAFLY S.A.S.'),
    run(', Sociedad por Acciones Simplificada, constituida conforme a la '),
    boldRun('Ley 1258 de 2008'),
    run(' y las normas que la modifiquen o complementen.'),
  ]),

  h2('Artículo 2. Domicilio'),
  bodyPara([
    run('El domicilio principal de la sociedad es el municipio de '),
    boldRun('Madrid, Cundinamarca'),
    run(', República de Colombia. La Asamblea de Accionistas o el Representante Legal podrán establecer sucursales, agencias u oficinas en cualquier lugar del territorio nacional o en el exterior.'),
  ]),

  h2('Artículo 3. Término de Duración'),
  bodyPara([
    run('La sociedad tendrá una duración '),
    boldRun('indefinida'),
    run(', contada a partir de la fecha de su inscripción en el registro mercantil de la Cámara de Comercio competente.'),
  ]),

  h2('Artículo 4. Objeto Social'),
  bodyPara([
    run('La sociedad tendrá como objeto principal el '),
    boldRun('desarrollo, comercialización y operación de plataformas de software como servicio (SaaS)'),
    run(' para la gestión de operaciones con sistemas de aeronaves no tripuladas (UAS/Drones), incluyendo:'),
  ]),
  bullet('Desarrollo y licenciamiento de software aeronáutico para operadores UAS.'),
  bullet('Prestación de servicios de consultoría en cumplimiento normativo RAC 100 (UAEAC / AeroCivil).'),
  bullet('Desarrollo de herramientas de bitácora digital, mantenimiento de flota, SMS aeronáutico, autorizaciones de vuelo y análisis de riesgo SORA.'),
  bullet('Comercialización de suscripciones y planes de acceso a plataformas digitales.'),
  bullet('Prestación de servicios de capacitación y formación en gestión de operaciones con drones.'),
  bullet('Cualquier otra actividad comercial, industrial o de servicios lícita, complementaria o relacionada con el objeto principal.'),

  // ── CAP II ──
  h1('Capítulo II — Capital Social y Acciones'),

  h2('Artículo 5. Capital Autorizado'),
  bodyPara([
    run('El capital autorizado de la sociedad es de '),
    boldRun('TRESCIENTOS MILLONES DE PESOS COLOMBIANOS ($300.000.000 COP)'),
    run(', dividido en '),
    boldRun('1.000 acciones ordinarias'),
    run(' de valor nominal de '),
    boldRun('TRESCIENTOS MIL PESOS COLOMBIANOS ($300.000 COP)'),
    run(' cada una.'),
  ]),

  h2('Artículo 6. Capital Suscrito y Pagado'),
  bodyPara([
    run('Al momento de la constitución, el capital suscrito y pagado es de '),
    boldRun('SESENTA MILLONES DE PESOS COLOMBIANOS ($60.000.000 COP)'),
    run(', representado en '),
    boldRun('200 acciones ordinarias'),
    run(' de $300.000 COP cada una, suscritas y pagadas en su totalidad por los accionistas fundadores.'),
  ]),
  bodyPara([
    run('Las '),
    boldRun('800 acciones restantes'),
    run(' del capital autorizado quedan en reserva para futuras rondas de capitalización, emisión de acciones a nuevos inversionistas, planes de compensación en acciones u otras operaciones que apruebe la Asamblea de Accionistas.'),
  ]),

  h2('Artículo 7. Clases de Acciones'),
  bodyPara([
    run('Inicialmente la sociedad emite únicamente '),
    boldRun('acciones ordinarias'),
    run('. La Asamblea de Accionistas podrá, mediante reforma estatutaria, crear acciones con dividendo preferencial y sin derecho a voto, acciones privilegiadas, acciones con dividendo fijo o acciones de pago, de conformidad con la Ley 1258 de 2008.'),
  ]),

  h2('Artículo 8. Registro de Acciones y Libro de Accionistas'),
  bodyPara([
    run('La sociedad llevará un '),
    boldRun('Libro de Registro de Accionistas'),
    run(' en el que se inscribirán el nombre, identificación, número de acciones y fecha de adquisición de cada accionista. Ninguna transferencia de acciones será oponible a la sociedad ni a terceros sin su previa inscripción en dicho libro.'),
  ]),

  h2('Artículo 9. Negociación de Acciones'),
  bodyPara([run('Las acciones son libremente negociables, salvo las siguientes restricciones acordadas por los accionistas fundadores para proteger la estabilidad de la compañía:')]),
  bodyPara([boldRun('9.1. Derecho de preferencia: '), run('Cuando un accionista desee enajenar la totalidad o parte de sus acciones, deberá ofrecerlas primero a los demás accionistas de manera proporcional a su participación, mediante comunicación escrita al Representante Legal con precio, condiciones y plazo de la oferta. Los demás accionistas tendrán '), boldRun('30 días calendario'), run(' para ejercer su derecho.')]),
  bodyPara([boldRun('9.2. Aprobación de nuevos accionistas: '), run('La transferencia de acciones a terceros que no sean accionistas actuales requerirá aprobación previa de la Asamblea de Accionistas con mayoría del 51% del capital.')]),
  bodyPara([boldRun('9.3. Lock-up fundadores: '), run('Los accionistas con más del 10% del capital no podrán enajenar sus acciones durante los primeros '), boldRun('24 meses'), run(' contados desde la constitución de la sociedad, salvo autorización unánime de la Asamblea.')]),

  h2('Artículo 10. Valoración de Acciones en Transferencia Forzosa'),
  bodyPara([run('En caso de muerte, embargo judicial o liquidación patrimonial de un accionista, el precio de las acciones para efectos del derecho de preferencia se determinará por acuerdo entre las partes o, en su defecto, por un '), boldRun('perito avaluador'), run(' designado de común acuerdo o por la Superintendencia de Sociedades.')]),

  // ── CAP III ──
  h1('Capítulo III — Órganos de Administración'),

  h2('Artículo 11. Órganos de Dirección'),
  bodyPara([run('La dirección, administración y representación de la sociedad estará a cargo de:')]),
  numbered(1, 'La Asamblea General de Accionistas (órgano máximo)'),
  numbered(2, 'El Representante Legal (gerente general)'),
  bodyPara([run('La sociedad '), boldRun('no tendrá Junta Directiva obligatoria'), run(', conforme permite la Ley 1258 de 2008 para las SAS. La Asamblea podrá crearla voluntariamente cuando lo considere necesario.')]),

  h2('Artículo 12. Asamblea General de Accionistas'),
  bodyPara([boldRun('12.1. Composición: '), run('La Asamblea estará integrada por todos los accionistas inscritos en el Libro de Registro o sus representantes o mandatarios.')]),
  bodyPara([boldRun('12.2. Reuniones ordinarias: '), run('Se realizarán '), boldRun('una vez al año'), run(', dentro de los tres primeros meses del año, para examinar la situación de la sociedad, aprobar los estados financieros, disponer de las utilidades y adoptar las demás decisiones de su competencia.')]),
  bodyPara([boldRun('12.3. Reuniones extraordinarias: '), run('Podrán convocarse en cualquier momento por el Representante Legal, por accionistas que representen al menos el 20% del capital, o de oficio por la Superintendencia de Sociedades.')]),
  bodyPara([boldRun('12.4. Convocatoria: '), run('Mediante comunicación escrita (correo electrónico válido) dirigida a cada accionista con mínimo '), boldRun('5 días hábiles'), run(' de anticipación para reuniones ordinarias y '), boldRun('3 días hábiles'), run(' para extraordinarias.')]),
  bodyPara([boldRun('12.5. Quórum deliberatorio: '), run('La Asamblea podrá deliberar con cualquier número plural de accionistas que represente al menos el '), boldRun('51% del capital suscrito'), run('.')]),
  bodyPara([boldRun('12.6. Reuniones de segunda convocatoria: '), run('Si no hay quórum en la primera convocatoria, se citará nuevamente y la reunión se celebrará con cualquier número de accionistas presentes.')]),
  bodyPara([boldRun('12.7. Decisiones ordinarias: '), run('Se adoptarán con el voto favorable de accionistas que representen más del '), boldRun('50% del capital presente'), run('.')]),
  bodyPara([boldRun('12.8. Decisiones que requieren mayoría calificada (70% del capital total):')]),
  bullet('Reforma de estatutos'),
  bullet('Emisión de nuevas acciones o creación de nuevas clases'),
  bullet('Transformación, fusión, escisión o disolución'),
  bullet('Enajenación de activos que representen más del 50% del activo total'),
  bullet('Constitución de gravámenes sobre activos esenciales del negocio'),
  bodyPara([boldRun('12.9. Decisiones unánimes:')]),
  bullet('Supresión del derecho de preferencia en negociación de acciones'),
  bullet('Modificación del período de lock-up de fundadores'),
  bodyPara([boldRun('12.10. Reuniones no presenciales: '), run('Válidas por videoconferencia, comunicación simultánea o cualquier medio tecnológico que permita la deliberación. El acta deberá ser firmada por el Representante Legal y el secretario de la reunión.')]),

  h2('Artículo 13. Funciones de la Asamblea'),
  bodyPara([run('Son funciones de la Asamblea General de Accionistas:')]),
  ...[
    'Aprobar los estados financieros de fin de ejercicio.',
    'Disponer de las utilidades del ejercicio, aprobar dividendos y reservas.',
    'Elegir y remover al Representante Legal y fijar su remuneración.',
    'Reformar los estatutos sociales.',
    'Ordenar las acciones legales contra administradores o revisores fiscales.',
    'Aprobar la emisión de nuevas acciones y su precio de suscripción.',
    'Aprobar la disolución anticipada y la liquidación de la sociedad.',
    'Aprobar operaciones de fusión, escisión o transformación.',
    'Aprobar la constitución de filiales o subsidiarias.',
    'Las demás que señale la ley o estos estatutos.',
  ].map((t, i) => numbered(i + 1, t)),

  h2('Artículo 14. Representante Legal'),
  bodyPara([boldRun('14.1. Designación: '), run('La sociedad tendrá un '), boldRun('Representante Legal Principal'), run(' elegido por la Asamblea de Accionistas por períodos de '), boldRun('2 años'), run(', reelegible indefinidamente. Podrá designarse un suplente.')]),
  bodyPara([boldRun('14.2. Representante Legal actual: '), run('Al momento de la constitución se designa como Representante Legal Principal a '), boldRun('NATALIA MARCELA RODRÍGUEZ'), run(', identificada con cédula de ciudadanía N° ____________, quien ejercerá el cargo con las facultades y limitaciones establecidas en los presentes estatutos.')]),
  bodyPara([boldRun('14.3. Funciones y facultades: '), run('El Representante Legal es el administrador de la sociedad y tiene las siguientes facultades:')]),
  bullet('Representar judicial y extrajudicialmente a la sociedad.'),
  bullet('Celebrar contratos y obligaciones en nombre de la sociedad hasta por el monto que apruebe la Asamblea (monto inicial: $50.000.000 COP por operación).'),
  bullet('Contratar y remover al personal de la sociedad.'),
  bullet('Dirigir y controlar las operaciones del negocio.'),
  bullet('Convocar a reuniones de la Asamblea de Accionistas.'),
  bullet('Presentar informes de gestión a la Asamblea.'),
  bullet('Abrir y manejar cuentas bancarias.'),
  bullet('Ejecutar las decisiones de la Asamblea.'),
  bodyPara([boldRun('14.4. Actos que requieren autorización de la Asamblea:')]),
  bullet('Contratación de créditos superiores a $50.000.000 COP.'),
  bullet('Enajenación de activos estratégicos o de alto valor.'),
  bullet('Constitución de gravámenes o hipotecas sobre bienes sociales.'),
  bullet('Celebración de contratos de asociación o joint venture.'),
  bullet('Apertura de sucursales en el exterior.'),

  // ── CAP IV ──
  h1('Capítulo IV — Distribución de Utilidades'),

  h2('Artículo 15. Ejercicio Social'),
  bodyPara([run('El ejercicio social comprende el período del '), boldRun('1 de enero al 31 de diciembre'), run(' de cada año. Al cierre del ejercicio, el Representante Legal presentará a la Asamblea los estados financieros auditados o certificados según corresponda.')]),

  h2('Artículo 16. Reservas y Distribución'),
  bodyPara([boldRun('16.1. Reserva legal: '), run('Se constituirá una reserva legal equivalente al '), boldRun('10%'), run(' de las utilidades líquidas de cada ejercicio, hasta alcanzar el 50% del capital suscrito.')]),
  bodyPara([boldRun('16.2. Reservas estatutarias: '), run('La Asamblea podrá crear reservas adicionales para reinversión en tecnología, expansión o contingencias, con mayoría del 51%.')]),
  bodyPara([boldRun('16.3. Dividendos: '), run('Las utilidades restantes se distribuirán como dividendos a prorrata de las acciones suscritas, en la fecha y forma que determine la Asamblea. Los dividendos no reclamados en 5 años prescriben a favor de la sociedad.')]),
  bodyPara([boldRun('16.4. Dividendos en acciones: '), run('La Asamblea podrá decretar dividendos en acciones liberadas del capital autorizado no emitido.')]),

  // ── CAP V ──
  h1('Capítulo V — Disolución y Liquidación'),

  h2('Artículo 17. Causales de Disolución'),
  bodyPara([run('La sociedad se disolverá por:')]),
  numbered(1, 'Decisión de la Asamblea de Accionistas con mayoría calificada del 70%.'),
  numbered(2, 'Vencimiento del término de duración (no aplica — duración indefinida).'),
  numbered(3, 'Imposibilidad de desarrollar el objeto social.'),
  numbered(4, 'Iniciación de liquidación judicial.'),
  numbered(5, 'Las demás causales previstas en la ley.'),

  h2('Artículo 18. Liquidación'),
  bodyPara([run('Disuelta la sociedad, se procederá a su liquidación conforme a la ley. El liquidador podrá ser el Representante Legal salvo que la Asamblea designe uno diferente. Una vez pagadas las deudas sociales, el remanente se distribuirá entre los accionistas a prorrata de sus acciones.')]),

  // ── CAP VI ──
  h1('Capítulo VI — Resolución de Conflictos'),

  h2('Artículo 19. Mecanismos de Resolución de Conflictos'),
  bodyPara([run('Los conflictos entre accionistas o entre accionistas y la sociedad se resolverán mediante el siguiente orden:')]),
  numbered(1, 'Negociación directa: Las partes intentarán resolver el conflicto en un plazo de 15 días hábiles.'),
  numbered(2, 'Mediación: Si no hay acuerdo, se acudirá a un mediador designado por el Centro de Arbitraje y Conciliación de la Cámara de Comercio de Bogotá.'),
  numbered(3, 'Arbitraje: Si la mediación fracasa, se someterá a arbitraje ante el Centro de Arbitraje y Conciliación de la Cámara de Comercio de Bogotá, con un árbitro único, en derecho, con sede en Bogotá.'),

  // ── CAP VII ──
  h1('Capítulo VII — Disposiciones Finales'),

  h2('Artículo 20. Derecho de Arrastre — Drag-Along'),
  bodyPara([boldRun('20.1. Activación: '), run('Si accionistas que representen el '), boldRun('70% o más del capital suscrito'), run(' reciben una oferta de compra en firme de un tercero de buena fe por la totalidad o control de la sociedad, podrán exigir a los demás accionistas ("accionistas arrastrados") que vendan sus acciones al mismo adquirente, en las mismas condiciones económicas (precio por acción, forma y plazo de pago).')]),
  bodyPara([boldRun('20.2. Procedimiento:')]),
  bullet('Los accionistas mayoritarios notificarán por escrito a los demás con mínimo 20 días hábiles de anticipación, adjuntando los términos de la oferta.'),
  bullet('Los accionistas arrastrados podrán objetar únicamente si demuestran que el precio ofrecido es inferior al valor patrimonial determinado por perito independiente, en cuyo caso se abrirá un período de 10 días hábiles para renegociar.'),
  bullet('Si no hay objeción válida o no se llega a acuerdo, la venta procede en los términos originales.'),
  bodyPara([boldRun('20.3. Protecciones del accionista arrastrado:')]),
  bullet('El precio no podrá ser inferior al valor nominal de las acciones.'),
  bullet('Las condiciones económicas deben ser idénticas para todos los accionistas (mismo precio por acción, misma moneda, mismo plazo).'),
  bullet('No se podrá imponer al accionista arrastrado responsabilidades, garantías o indemnizaciones más allá de la representación de título limpio sobre sus propias acciones.'),
  bullet('Los accionistas arrastrados recibirán el mismo tipo de contraprestación (efectivo, acciones del adquirente u otro instrumento).'),
  bodyPara([
    new TextRun({ text: 'Nota de balance: ', font: 'Arial', size: 20, bold: true, italics: true, color: '555555' }),
    new TextRun({ text: 'El umbral del 70% evita que minorías bloqueen una venta beneficiosa para la compañía, pero impide que accionistas con mayoría simple (51%) fuercen una salida sin consenso amplio.', font: 'Arial', size: 20, italics: true, color: '555555' }),
  ]),

  h2('Artículo 21. Derecho de Acompañamiento — Tag-Along'),
  bodyPara([boldRun('21.1. Alcance: '), run('Si uno o más accionistas ("accionistas vendedores") desean transferir acciones a un tercero en una operación que represente el '), boldRun('20% o más del capital suscrito'), run(', los demás accionistas tendrán derecho a vender proporcionalmente sus acciones al mismo adquirente, en las mismas condiciones.')]),
  bodyPara([boldRun('21.2. Procedimiento:')]),
  bullet('El accionista vendedor notificará por escrito a los demás con 15 días hábiles de anticipación, indicando identidad del comprador, precio, condiciones y número de acciones a vender.'),
  bullet('Cada accionista tendrá 10 días hábiles para manifestar su intención de acompañar la venta, indicando el número de acciones que desea vender.'),
  bullet('Si el comprador no desea adquirir el total de acciones ofrecidas (propias + acompañamiento), el número se reducirá proporcionalmente entre todos los participantes, incluido el vendedor original.'),
  bullet('Si el vendedor no acepta la reducción, la operación no podrá realizarse sin el consentimiento de los accionistas que ejercieron el tag-along.'),
  bodyPara([boldRun('21.3. Excepciones: '), run('No aplica tag-along en:')]),
  bullet('Transferencias entre accionistas existentes de la sociedad.'),
  bullet('Transferencias a vehículos de propiedad del mismo accionista (holding, fiducia irrevocable o similar), siempre que se mantenga el control efectivo.'),
  bullet('Donaciones a familiares en primer grado de consanguinidad.'),
  bodyPara([
    new TextRun({ text: 'Nota de balance: ', font: 'Arial', size: 20, bold: true, italics: true, color: '555555' }),
    new TextRun({ text: 'Protege a los accionistas minoritarios (incluidos inversionistas con pequeñas participaciones) de quedar atrapados con un nuevo socio mayoritario que no eligieron, sin obligar al comprador a adquirir más de lo que desea.', font: 'Arial', size: 20, italics: true, color: '555555' }),
  ]),

  h2('Artículo 22. Protección Antidilución'),
  bodyPara([boldRun('22.1. Derechos pro-rata en nuevas emisiones: '), run('Antes de emitir nuevas acciones a terceros, la sociedad ofrecerá a los accionistas existentes el derecho a suscribir nuevas acciones en proporción a su participación actual, al mismo precio y en las mismas condiciones de la nueva emisión, con un plazo mínimo de '), boldRun('15 días hábiles'), run(' para ejercerlo.')]),
  bodyPara([boldRun('22.2. Antidilución por precio — Promedio Ponderado (Broad-based Weighted Average): '), run('Si la sociedad emite nuevas acciones a un precio inferior al precio pagado por un inversionista en una ronda previa, dicho inversionista recibirá acciones adicionales o un ajuste en el precio de conversión calculado mediante la fórmula:')]),
  new Paragraph({
    shading: { fill: GRAY5, type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 8, color: BLUE } },
    indent: { left: 360, right: 360 },
    spacing: { before: 80, after: 80 },
    children: [
      new TextRun({ text: 'Precio ajustado = Precio original × (Acciones previas + Acciones al precio nuevo)', font: 'Courier New', size: 18, color: BLACK }),
      new TextRun({ text: '\t\t\t\t\t  ────────────────────────────────────────────', font: 'Courier New', size: 18, color: BLACK, break: 1 }),
      new TextRun({ text: '\t\t\t\t\t  (Acciones previas + Acciones nuevas emitidas)', font: 'Courier New', size: 18, color: BLACK, break: 1 }),
    ],
  }),
  bodyPara([run('Este mecanismo es '), boldRun('más equilibrado que el ratchet completo (full ratchet)'), run(', pues toma en cuenta el volumen de la nueva emisión y no castiga a la compañía por rondas menores o instrumentos de deuda convertible.')]),
  bodyPara([boldRun('22.3. Excepciones a la antidilución: '), run('No se activa antidilución por:')]),
  bullet('Emisión de acciones por planes de compensación a empleados aprobados por la Asamblea (máximo 10% del capital autorizado).'),
  bullet('Conversión de instrumentos de deuda ya pactados.'),
  bullet('Acciones emitidas como contraprestación en fusiones o adquisiciones aprobadas por la Asamblea.'),
  bullet('Acciones emitidas a proveedores estratégicos con aprobación del 70% de la Asamblea.'),

  h2('Artículo 23. Derechos de Información'),
  bodyPara([boldRun('23.1. Información periódica: '), run('Los accionistas que posean individualmente el '), boldRun('5% o más'), run(' del capital suscrito tendrán derecho a recibir:')]),
  bullet('Mensualmente: Reporte de métricas operativas clave (usuarios activos, MRR, churn) en los primeros 10 días del mes siguiente.'),
  bullet('Trimestralmente: Estados financieros (P&G, balance, flujo de caja) sin auditar, dentro de los 30 días siguientes al cierre del trimestre.'),
  bullet('Anualmente: Estados financieros auditados o certificados, junto con informe de gestión del Representante Legal.'),
  bodyPara([boldRun('23.2. Información extraordinaria: '), run('Ante eventos materiales (pérdida >20% del capital, demandas superiores a $100M COP, cambios regulatorios críticos o cambios en el equipo directivo), el Representante Legal notificará a todos los accionistas dentro de las '), boldRun('48 horas'), run(' siguientes al conocimiento del evento.')]),
  bodyPara([boldRun('23.3. Derecho de inspección: '), run('Accionistas con 5% o más podrán inspeccionar los libros contables y registros societarios con previo aviso de 5 días hábiles, en días y horas hábiles de la sociedad, sin interrumpir la operación.')]),

  h2('Artículo 24. Derechos de Veto'),
  bodyPara([run('Los siguientes actos requerirán, adicionalmente a las mayorías del Artículo 12, la aprobación expresa de accionistas que representen el '), boldRun('80% del capital'), run(':')]),
  numbered(1, 'Cambio sustancial del objeto social que abandone el negocio de software aeronáutico o plataformas SaaS.'),
  numbered(2, 'Fusión, absorción o escisión que implique pérdida del control por parte de los accionistas actuales.'),
  numbered(3, 'Venta de la propiedad intelectual principal de la compañía (plataforma Bitafly, marca, código fuente).'),
  numbered(4, 'Emisión de instrumentos de deuda que superen el 200% del capital suscrito.'),
  numbered(5, 'Creación de acciones con derechos superiores a las acciones ordinarias existentes, salvo acuerdo previo en acuerdo de accionistas.'),
  bodyPara([
    new TextRun({ text: 'Nota de balance: ', font: 'Arial', size: 20, bold: true, italics: true, color: '555555' }),
    new TextRun({ text: 'El umbral del 80% (no unanimidad) permite que decisiones estructurales avancen con consenso amplio sin que un accionista individual con participación pequeña tenga poder de bloqueo absoluto.', font: 'Arial', size: 20, italics: true, color: '555555' }),
  ]),

  h2('Artículo 25. Acuerdo de Accionistas'),
  bodyPara([run('Los accionistas podrán celebrar acuerdos parasociales complementarios a estos estatutos sobre materias no previstas o para profundizar los mecanismos aquí establecidos. Dichos acuerdos deberán depositarse en la sociedad y ser oponibles a esta cuando sean notificados formalmente al Representante Legal.')]),
  bodyPara([run('El Acuerdo de Accionistas prevalecerá sobre los estatutos en las materias que regule, salvo en lo que contravenga la Ley 1258 de 2008.')]),

  h2('Artículo 26. Disposiciones No Previstas'),
  bodyPara([run('Para todo lo no previsto en los presentes estatutos, se aplicará la '), boldRun('Ley 1258 de 2008'), run(' (SAS), el Código de Comercio y las demás normas mercantiles vigentes en Colombia.')]),

  // ── DATOS DE CONSTITUCIÓN ──
  new Paragraph({ pageBreakBefore: true, children: [] }),
  h1('Datos de Constitución'),
  new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }),

  twoColTable([
    ['Campo', 'Dato'],
    ['Razón social', 'BITAFLY S.A.S.'],
    ['NIT', 'Por asignar (DIAN)'],
    ['Domicilio', 'Madrid, Cundinamarca'],
    ['Capital autorizado', '$300.000.000 COP (1.000 acciones)'],
    ['Capital suscrito y pagado', '$60.000.000 COP (200 acciones a $300.000 c/u)'],
    ['Valor nominal acción', '$300.000 COP'],
    ['Representante Legal', 'Natalia Marcela Rodríguez'],
    ['C.C. Representante Legal', '_______________'],
    ['Duración', 'Indefinida'],
    ['Ley aplicable', 'Ley 1258 de 2008'],
  ], [3200, 5826]),

  // ── FIRMAS ──
  h1('Firmas de Constitución'),
  bodyPara([
    run('En constancia de lo anterior, los accionistas fundadores suscriben los presentes estatutos en la ciudad de Madrid, Cundinamarca, el día ___ de _____________ de 2026.'),
  ]),
  new Paragraph({ spacing: { before: 120, after: 0 }, children: [] }),

  twoColTable([
    ['Accionista', 'C.C.', 'N° Acciones', '% Capital', 'Firma'],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
    ['', '', '', '', ''],
  ], [2500, 1500, 1500, 1500, 2026]),

  new Paragraph({ spacing: { before: 280 }, children: [] }),
  bodyPara([boldRun('Representante Legal designada:')]),
  bodyPara([run('Natalia Marcela Rodríguez')]),
  bodyPara([run('C.C. _______________')]),
  new Paragraph({
    spacing: { before: 200 },
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: GRAY20 } },
    children: [],
  }),
  bodyPara([run('_________________________________')]),
  bodyPara([boldRun('Natalia Marcela Rodríguez'), run(' — Representante Legal')]),

  // ── NOTA LEGAL ──
  new Paragraph({ spacing: { before: 280 }, children: [] }),
  new Paragraph({
    shading: { fill: 'FFF8E1', type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: GOLD } },
    spacing: { before: 80, after: 80 },
    indent: { left: 240, right: 240 },
    children: [
      new TextRun({ text: 'NOTA LEGAL: ', font: 'Arial', size: 18, bold: true, color: 'B7770D' }),
      new TextRun({ text: 'Este documento es un borrador de referencia elaborado con fines internos. Para su validez legal debe ser elevado a escritura pública o documento privado autenticado, firmado por todos los accionistas ante notario, e inscrito en el Registro Mercantil de la Cámara de Comercio de Facatativá (jurisdicción de Madrid, Cundinamarca) o mediante el procedimiento de constitución en línea de la Ventanilla Única Empresarial (VUE). Se recomienda revisión por abogado especializado en derecho societario.', font: 'Arial', size: 18, color: '5C4400' }),
    ],
  }),
];

// ── BUILD DOC ─────────────────────────────────────────────────────────────────

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 22, color: BLACK } },
    },
    paragraphStyles: [
      {
        id: 'Heading1',
        name: 'Heading 1',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 26, bold: true, font: 'Arial', color: 'FFFFFF' },
        paragraph: { spacing: { before: 360, after: 120 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2',
        name: 'Heading 2',
        basedOn: 'Normal',
        next: 'Normal',
        quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: BLUE },
        paragraph: { spacing: { before: 280, after: 80 }, outlineLevel: 1 },
      },
    ],
  },
  sections: [
    {
      properties: {
        page: {
          size: { width: PAGE_W, height: 16838 }, // A4
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: GRAY20 } },
              children: [
                new TextRun({ text: 'ESTATUTOS SOCIALES — BITAFLY S.A.S.', font: 'Arial', size: 18, color: '888888' }),
              ],
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 2, color: GRAY20 } },
              children: [
                new TextRun({ text: 'Página ', font: 'Arial', size: 18, color: '888888' }),
                new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: '888888' }),
                new TextRun({ text: ' de ', font: 'Arial', size: 18, color: '888888' }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 18, color: '888888' }),
                new TextRun({ text: '  ·  Documento de referencia interno  ·  Ley 1258 de 2008', font: 'Arial', size: 18, color: 'AAAAAA' }),
              ],
            }),
          ],
        }),
      },
      children: sections,
    },
  ],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('docs/estatutos-bitafly-sas.docx', buffer);
  console.log('✓ docs/estatutos-bitafly-sas.docx generado correctamente');
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
