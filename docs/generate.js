const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageNumber, Header, Footer, TableOfContents, LevelFormat,
  PageBreak, VerticalAlign,
} = require('docx');
const fs = require('fs');

// ─── Colors ───────────────────────────────────────────────────────────────────
const NAVY   = '1A202C';
const ORANGE = 'EC5B13';
const LGRAY  = 'F2F4F7';
const MGRAY  = 'E2E8F0';
const WHITE  = 'FFFFFF';

// ─── Borders ──────────────────────────────────────────────────────────────────
const BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = { top: NO_BORDER, bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sp = (before = 0, after = 0) => ({ spacing: { before, after } });

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    pageBreakBefore: true,
    children: [new TextRun({ text, font: 'Arial', size: 36, bold: true, color: NAVY })],
    ...sp(480, 240),
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    children: [new TextRun({ text, font: 'Arial', size: 28, bold: true, color: NAVY })],
    ...sp(360, 160),
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    children: [new TextRun({ text, font: 'Arial', size: 24, bold: true, color: ORANGE })],
    ...sp(280, 120),
  });
}
function h4(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_4,
    children: [new TextRun({ text, font: 'Arial', size: 22, bold: true, color: NAVY })],
    ...sp(200, 80),
  });
}
function p(text, opts = {}) {
  return new Paragraph({
    children: [new TextRun({ text, font: 'Arial', size: 22, ...opts })],
    ...sp(80, 80),
  });
}
function pMixed(runs) {
  return new Paragraph({
    children: runs.map(r =>
      typeof r === 'string'
        ? new TextRun({ text: r, font: 'Arial', size: 22 })
        : new TextRun({ font: 'Arial', size: 22, ...r })
    ),
    ...sp(80, 80),
  });
}
function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    children: [new TextRun({ text, font: 'Arial', size: 22 })],
    ...sp(60, 60),
  });
}
function bulletMixed(runs, level = 0) {
  return new Paragraph({
    numbering: { reference: 'bullets', level },
    children: runs.map(r =>
      typeof r === 'string'
        ? new TextRun({ text: r, font: 'Arial', size: 22 })
        : new TextRun({ font: 'Arial', size: 22, ...r })
    ),
    ...sp(60, 60),
  });
}
function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'numbered', level },
    children: [new TextRun({ text, font: 'Arial', size: 22 })],
    ...sp(60, 60),
  });
}
function blank() { return new Paragraph({ children: [new TextRun('')], ...sp(60, 60) }); }
function rule() {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: ORANGE } },
    children: [new TextRun('')],
    ...sp(200, 200),
  });
}

// ─── Table helpers ────────────────────────────────────────────────────────────
function headerCell(text, w) {
  return new TableCell({
    borders: BORDERS,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: NAVY, type: ShadingType.CLEAR },
    margins: { top: 120, bottom: 120, left: 160, right: 160 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      children: [new TextRun({ text, font: 'Arial', size: 20, bold: true, color: WHITE })],
      alignment: AlignmentType.LEFT,
    })],
  });
}
function dataCell(text, w, shade = false) {
  return new TableCell({
    borders: BORDERS,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: shade ? LGRAY : WHITE, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 160, right: 160 },
    children: [new Paragraph({
      children: [new TextRun({ text, font: 'Arial', size: 20 })],
    })],
  });
}
function dataCellMixed(runs, w, shade = false) {
  return new TableCell({
    borders: BORDERS,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: shade ? LGRAY : WHITE, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 160, right: 160 },
    children: [new Paragraph({
      children: runs.map(r =>
        typeof r === 'string'
          ? new TextRun({ text: r, font: 'Arial', size: 20 })
          : new TextRun({ font: 'Arial', size: 20, ...r })
      ),
    })],
  });
}

// ─── Reusable table builder ───────────────────────────────────────────────────
function makeTable(headers, rows, colWidths) {
  const total = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => headerCell(h, colWidths[i])),
      }),
      ...rows.map((row, ri) =>
        new TableRow({
          children: row.map((cell, ci) =>
            Array.isArray(cell)
              ? dataCellMixed(cell, colWidths[ci], ri % 2 === 0)
              : dataCell(cell, colWidths[ci], ri % 2 === 0)
          ),
        })
      ),
    ],
  });
}

// ─── Cover page ───────────────────────────────────────────────────────────────
function coverPage() {
  return [
    new Paragraph({ children: [new TextRun('')], spacing: { before: 2880 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'BITAFLY', font: 'Arial', size: 72, bold: true, color: ORANGE })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Manual de Operaciones y Control de Mantenimiento', font: 'Arial', size: 36, bold: true, color: NAVY })],
      spacing: { before: 240, after: 160 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Secciones de Cumplimiento RAC 100 / MAUT-5.0-22-011', font: 'Arial', size: 26, color: '64748B' })],
      spacing: { before: 0, after: 480 },
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ORANGE } },
      children: [new TextRun('')],
      spacing: { before: 0, after: 480 },
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Versión 1.0  |  Abril 2026', font: 'Arial', size: 22, color: '94A3B8' })],
      spacing: { before: 0, after: 160 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Emitido por: Bitafly SAS — Colombia', font: 'Arial', size: 22, color: '94A3B8' })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ─── Table for vuelos pre-vuelo (Plan Piloto) ─────────────────────────────────
function tablaPrevueloPiloto() {
  return makeTable(
    ['Campo', 'Referencia RAC 100', 'Descripción'],
    [
      ['Fecha de operación',                 'RAC 100.3.3(a)',        'Fecha calendario del vuelo (AAAA-MM-DD)'],
      ['Identificación de la misión',        'F-OPS-002',             'Código alfanumérico único asignado por el sistema'],
      ['Aeronave (matrícula / serial)',       'RAC 100.9.1(b)',        'Selección de la aeronave registrada'],
      ['Piloto en Comando',                  'RAC 100.9.1(c)',        'Nombre completo y número de licencia del PIC'],
      ['Lugar de operación',                 'RAC 100.9.1(d)',        'Coordenadas geográficas o descripción del área'],
      ['Tipo de operación',                  'MAUT-5.0-22-011 §4.2', 'Categoría: Visual (VLOS) / Extendida (EVLOS) / Más allá (BVLOS)'],
      ['Póliza de responsabilidad civil',    'RAC 100.3.3(f)',        'Número de póliza y fecha de vigencia'],
      ['Condiciones meteorológicas previstas','RAC 100.9.1(e)',       'Visibilidad, viento, cobertura de nubes'],
    ],
    [3000, 2000, 4360]
  );
}

function tablaMantenimiento() {
  return makeTable(
    ['Campo', 'Descripción'],
    [
      ['Fecha de intervención',             'Fecha de realización del mantenimiento'],
      ['Tipo',                              'Preventivo programado / Correctivo / Inspección post-evento'],
      ['Descripción del trabajo',           'Detalle de las tareas realizadas'],
      ['Componentes reemplazados',          'Lista de partes con número de parte si aplica'],
      ['Horas de aeronave al momento',      'Automático desde el sistema'],
      ['Técnico responsable',               'Nombre y número de licencia (si aplica)'],
      ['Próxima intervención programada',   'Fecha u horas para la siguiente revisión'],
    ],
    [3600, 5760]
  );
}

function tablaRolesEscuadrilla() {
  return makeTable(
    ['Rol', 'Permisos en módulo de bitácora'],
    [
      ['Administrador (Gerente General)', 'Creación, visualización y exportación de todos los registros'],
      ['Jefe de Pilotos',                 'Creación y visualización de registros operacionales'],
      ['Piloto',                          'Creación de registros propios y visualización de sus operaciones'],
    ],
    [3000, 6360]
  );
}

function tablaRolesFlota() {
  return makeTable(
    ['Rol', 'Permisos en módulo de bitácora'],
    [
      ['Administrador (Gerente General)', 'Acceso total: creación, edición, eliminación, exportación y auditoría'],
      ['Gerente SMS',                     'Consulta de todos los registros operacionales; gestión de reportes de cumplimiento'],
      ['Jefe de Pilotos',                 'Creación, asignación y supervisión de misiones; gestión de tripulación'],
      ['Piloto',                          'Creación de registros propios; visualización de misiones asignadas'],
    ],
    [3000, 6360]
  );
}

function tablaExpediente() {
  return makeTable(
    ['Documento', 'Control en la plataforma'],
    [
      ['Licencia de piloto (RPAS)',         'Número, fecha de expedición y vencimiento. Alerta 30 días antes del vencimiento'],
      ['Certificado médico aeronáutico',    'Fecha de expedición, clase y vencimiento. Alerta 30 días antes. Bloqueo al vencerse'],
      ['Historial de horas voladas',        'Acumulación automática desde los registros de vuelo. Desglose por aeronave y tipo de operación'],
      ['Capacitaciones y habilitaciones',   'Registro de cursos, fecha de realización y vigencia'],
    ],
    [3400, 5960]
  );
}

function tablaReportesFlota() {
  return makeTable(
    ['Formato', 'Descripción'],
    [
      ['F-OPS-001', 'Solicitud de autorización de vuelo ante AeroCivil'],
      ['F-OPS-002', 'Maestro de Vuelo (por período y por aeronave)'],
      ['F-MNT-003', 'Registro y control de baterías LiPo'],
      ['F-HUM-005', 'Bitácora individual de piloto'],
    ],
    [2000, 7360]
  );
}

function tablaGlosario() {
  return makeTable(
    ['Término', 'Definición'],
    [
      ['BVLOS',          'Beyond Visual Line of Sight — Operación más allá de la línea visual del piloto'],
      ['EVLOS',          'Extended Visual Line of Sight — Operación con línea visual extendida'],
      ['F-HUM-005',      'Formato de Bitácora Individual de Piloto según RAC 100'],
      ['F-MNT-003',      'Formato de Registro y Control de Mantenimiento de Baterías según RAC 100'],
      ['F-OPS-001',      'Formato de Solicitud de Autorización de Vuelo ante AeroCivil'],
      ['F-OPS-002',      'Formato Maestro de Vuelo según RAC 100'],
      ['ID-OPS',         'Identificador único de operación asignado por el sistema BITAFLY'],
      ['MAUT-5.0-22-011','Apéndice 11 del RAC 100 — Manual de Aeronavegabilidad UAS'],
      ['OSA',            'Observador de Sistemas de Aeronaves — Tripulante de apoyo visual'],
      ['PIC',            'Pilot in Command — Piloto en Comando'],
      ['RAC 100',        'Reglamento Aeronáutico Colombiano, Capítulo 100 — Sistemas UAS'],
      ['RBAC',           'Role-Based Access Control — Control de acceso basado en roles'],
      ['RLS',            'Row Level Security — Política de seguridad a nivel de fila en base de datos'],
      ['RPAS',           'Remotely Piloted Aircraft System — Sistema de Aeronave Pilotada a Distancia'],
      ['UAS',            'Unmanned Aircraft System — Sistema de Aeronave No Tripulada'],
      ['UAEAC',          'Unidad Administrativa Especial de Aeronáutica Civil de Colombia'],
      ['VLOS',           'Visual Line of Sight — Operación dentro de la línea visual del piloto'],
    ],
    [2000, 7360]
  );
}

// ─── Document ─────────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: 'bullets',
        levels: [{
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
      {
        reference: 'numbered',
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }],
      },
    ],
  },
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 22, color: '1E293B' } },
    },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: NAVY },
        paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: NAVY },
        paragraph: { spacing: { before: 360, after: 160 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: ORANGE },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 2 } },
      { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 22, bold: true, font: 'Arial', color: NAVY },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 3 } },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1260, bottom: 1440, left: 1260 },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: ORANGE } },
          children: [
            new TextRun({ text: 'BITAFLY  |  Manual de Operaciones y Control de Mantenimiento  |  RAC 100', font: 'Arial', size: 16, color: '94A3B8' }),
          ],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          border: { top: { style: BorderStyle.SINGLE, size: 4, color: MGRAY } },
          children: [
            new TextRun({ text: 'Versión 1.0  |  Abril 2026  |  Bitafly SAS — Colombia         Página ', font: 'Arial', size: 16, color: '94A3B8' }),
            new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 16, color: '94A3B8' }),
          ],
        })],
      }),
    },
    children: [
      // ── Portada ──
      ...coverPage(),

      // ── Tabla de Contenidos ──
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: 'Tabla de Contenidos', font: 'Arial', size: 36, bold: true, color: NAVY })] }),
      new TableOfContents('Tabla de Contenidos', { hyperlink: true, headingStyleRange: '1-4' }),
      new Paragraph({ children: [new PageBreak()] }),

      // ════════════════════════════════════════════════
      // INTRODUCCIÓN
      // ════════════════════════════════════════════════
      h1('INTRODUCCIÓN'),
      p('El presente documento describe el procedimiento operativo que los usuarios de la plataforma digital BITAFLY deben seguir para garantizar el cumplimiento de los requisitos de registro y control establecidos en el Reglamento Aeronáutico Colombiano RAC 100 y su Apéndice 11 (MAUT-5.0-22-011), emitido por la Unidad Administrativa Especial de Aeronáutica Civil (UAEAC).'),
      p('Las secciones aquí contenidas forman parte integrante del Manual de Operaciones (MO) y del Manual de Control de Mantenimiento (MCM) de la organización explotadora de Sistemas de Aeronaves No Tripuladas (UAS), y describen exclusivamente cómo el operador utiliza la plataforma web BITAFLY para dar cumplimiento a cada requisito documental exigido por la normativa vigente.'),
      p('Este documento se presenta en tres versiones según el plan de suscripción contratado, toda vez que las capacidades del sistema varían en función del nivel de habilitación.'),

      // ════════════════════════════════════════════════
      // PLAN PILOTO
      // ════════════════════════════════════════════════
      h1('PLAN PILOTO'),

      h2('1. Manual de Operaciones — Sección de Registros y Control de Vuelos'),

      h3('1.1 Alcance y aplicabilidad'),
      p('Esta sección aplica a operadores individuales autónomos que cuenten con una (1) aeronave UAS registrada bajo el Plan Piloto de BITAFLY. El presente procedimiento describe el uso de la plataforma para el registro digital de operaciones de vuelo, en cumplimiento del RAC 100, numeral 100.3.3 (Registros operacionales) y el formato F-OPS-002 (Maestro de Vuelo).'),

      h3('1.2 Registro de operación de vuelo'),
      h4('1.2.1 Fase de pre-vuelo'),
      pMixed([
        'Antes de cada operación, el piloto en comando (PIC) accederá a la plataforma BITAFLY mediante navegador web desde dispositivo móvil o computador, e iniciará el registro de la misión desde el módulo ',
        { text: 'Bitácora → Nueva Operación', bold: true },
        '. El sistema solicitará y validará los siguientes campos obligatorios:',
      ]),
      blank(),
      tablaPrevueloPiloto(),
      blank(),
      p('El sistema verificará automáticamente que la aeronave seleccionada no tenga alertas de mantenimiento vencidas antes de habilitar el registro. En caso de existir restricciones, el sistema mostrará una advertencia de aeronavegabilidad y bloqueará el inicio de la operación hasta que el operador confirme el estado de la aeronave.'),

      h4('1.2.2 Fase de operación (registro de tiempos)'),
      p('Una vez iniciado el vuelo, el PIC registrará en la plataforma los tiempos operacionales mediante los campos:'),
      bulletMixed([{ text: 'Hora de despegue (HH:MM):', bold: true }, ' Hora local en formato 24 horas del primer despegue de la jornada.']),
      bulletMixed([{ text: 'Hora de aterrizaje (HH:MM):', bold: true }, ' Hora local del último aterrizaje de la jornada.']),
      bulletMixed([{ text: 'Tiempo total de vuelo:', bold: true }, ' Calculado automáticamente por el sistema (aterrizaje menos despegue), expresado en horas decimales (ej. 1.5 h).']),
      bulletMixed([{ text: 'Tiempo de motor / propulsión:', bold: true }, ' Campo editable para registrar el tiempo total de operación del sistema de propulsión cuando difiera del tiempo de vuelo.']),
      bulletMixed([{ text: 'Número de ciclos de batería utilizados:', bold: true }, ' Cantidad de baterías empleadas en la jornada con identificación individual.']),

      h4('1.2.3 Fase de post-vuelo'),
      p('Al finalizar la operación, el PIC completará el registro con los siguientes datos:'),
      bulletMixed([{ text: 'Novedades técnicas:', bold: true }, ' Campo de texto libre para reportar cualquier anomalía observada durante el vuelo. La existencia de una novedad técnica activa automáticamente una alerta de revisión en el módulo de mantenimiento.']),
      bulletMixed([{ text: 'Estado de la aeronave al término:', bold: true }, ' Selección de: Operacional / Requiere inspección / Fuera de servicio.']),
      bulletMixed([{ text: 'Confirmación de regreso a base:', bold: true }, ' Registro de la hora de retorno del equipo al punto de almacenamiento.']),
      pMixed(['Al guardar el registro, el sistema asigna un ', { text: 'identificador único de operación (ID-OPS)', bold: true }, ' que no puede ser modificado posteriormente, garantizando la trazabilidad e integridad del registro.']),

      h3('1.3 Integridad y no repudio de los registros'),
      p('BITAFLY implementa los siguientes mecanismos para garantizar la integridad de los registros operacionales, conforme al principio de no alteración exigido por la UAEAC:'),
      bulletMixed([{ text: 'Marca de tiempo del servidor (timestamp):', bold: true }, ' Cada registro es fechado por el servidor en el momento de su creación, independientemente del reloj del dispositivo del usuario.']),
      bulletMixed([{ text: 'Registro de auditoría inmutable:', bold: true }, ' Cada modificación posterior al guardado inicial queda registrada en el log de auditoría con identificación del usuario, fecha, hora y campo modificado. Los registros originales no son eliminados.']),
      bulletMixed([{ text: 'Identificación de sesión autenticada:', bold: true }, ' Solo usuarios autenticados con credenciales válidas pueden crear o visualizar registros. El sistema registra el ID de usuario asociado a cada operación.']),
      bulletMixed([{ text: 'Exportación en PDF con formato oficial:', bold: true }, ' El sistema genera el reporte F-OPS-002 Maestro de Vuelo en formato PDF con numeración de página, código de formato, versión y fecha de generación, listo para presentar en inspección de la UAEAC.']),

      h3('1.4 Limitaciones del Plan Piloto'),
      p('Bajo este plan, el operador podrá registrar vuelos de manera ilimitada para una (1) aeronave y un (1) usuario. La generación del reporte F-OPS-002 en PDF está disponible en formato básico. Las autorizaciones de vuelo F-OPS-001 y los reportes de baterías F-MNT-003 no están disponibles en este nivel y requieren actualización de plan.'),

      rule(),

      h2('2. Manual de Control de Mantenimiento — Sección de Gestión'),

      h3('2.1 Alcance'),
      p('Esta sección describe el uso del módulo de Mantenimiento de BITAFLY por parte del operador individual, para el registro y control del estado de aeronavegabilidad de la aeronave UAS, en cumplimiento del RAC 100, numeral 100.11 y el formato F-MNT-003.'),

      h3('2.2 Hoja de Vida digital de la aeronave'),
      pMixed(['Cada aeronave registrada en BITAFLY cuenta con una ', { text: 'Hoja de Vida digital', bold: true }, ' accesible desde el módulo ', { text: 'Mi Flota → [Nombre de aeronave] → Historial', bold: true }, '. Esta hoja de vida contiene:']),
      bullet('Datos de identificación: Fabricante, modelo, número de serie, matrícula UAEAC, fecha de adquisición.'),
      bullet('Horas totales de vuelo acumuladas (calculadas automáticamente desde el primer registro).'),
      bullet('Número de ciclos totales (despegues/aterrizajes acumulados).'),
      bullet('Historial cronológico de intervenciones de mantenimiento.'),
      bullet('Estado actual de aeronavegabilidad.'),

      h3('2.3 Gestión del mantenimiento preventivo'),
      p('El sistema BITAFLY gestiona dos tipos de mantenimiento preventivo para el Plan Piloto:'),
      pMixed([{ text: 'Por horas de vuelo:', bold: true }, ' El operador configura el umbral de horas (por defecto 200 horas). Cuando la aeronave se aproxima al 90% del umbral, el sistema genera una alerta amarilla visible en el dashboard. Al alcanzar el 100%, se genera una alerta roja y el sistema impide el inicio de nuevos registros de vuelo hasta que se registre la intervención.']),
      pMixed([{ text: 'Por calendario:', bold: true }, ' El operador puede configurar intervalos de revisión en días (por defecto 180 días). El sistema calcula la próxima fecha de revisión y genera alertas con 30 días de anticipación.']),

      h3('2.4 Registro de intervención de mantenimiento'),
      pMixed(['Para registrar una intervención, el operador accede a ', { text: 'Mi Flota → Mantenimiento → Registrar intervención', bold: true }, ' y completa:']),
      blank(),
      tablaMantenimiento(),
      blank(),

      h3('2.5 Liberación a servicio (Return to Service)'),
      pMixed(['Una vez completado el registro de la intervención, el operador debe ejecutar el proceso de ', { text: 'Liberación a Servicio', bold: true }, ' dentro de la plataforma desde ', { text: 'Mantenimiento → Liberar aeronave', bold: true }, '. Este proceso requiere:']),
      numbered('Confirmación de que todas las tareas de mantenimiento fueron completadas.'),
      numbered('Selección del estado resultante: Aeronavegable / Aeronavegable con restricciones / No aeronavegable.'),
      numbered('Firma digital del responsable mediante reingreso de contraseña de la plataforma.'),
      p('Al confirmar la liberación, el sistema actualiza automáticamente el contador de horas, reinicia el intervalo de mantenimiento preventivo y registra la liberación en la Hoja de Vida digital con marca de tiempo inalterable. La aeronave queda habilitada para nuevos registros de vuelo.'),

      // ════════════════════════════════════════════════
      // PLAN ESCUADRILLA
      // ════════════════════════════════════════════════
      h1('PLAN ESCUADRILLA'),

      h2('1. Manual de Operaciones — Sección de Registros y Control de Vuelos'),

      h3('1.1 Alcance y aplicabilidad'),
      p('Esta sección aplica a empresas operadoras de UAS con hasta tres (3) aeronaves y cuatro (4) usuarios bajo el Plan Escuadrilla de BITAFLY. El procedimiento describe el uso multi-usuario de la plataforma para el registro colaborativo de operaciones, conforme al RAC 100, numeral 100.3.3, el formato F-OPS-002 y la generación del formato F-OPS-001 (Autorización de vuelo ante AeroCivil).'),

      h3('1.2 Gestión de usuarios y roles operacionales'),
      p('El Plan Escuadrilla habilita tres (3) roles operacionales con acceso diferenciado a los módulos de registro:'),
      blank(),
      tablaRolesEscuadrilla(),
      blank(),
      p('Cada usuario accede con credenciales individuales. El sistema registra la identidad del usuario que crea o modifica cada registro, garantizando la trazabilidad personal de la operación.'),

      h3('1.3 Registro de operación de vuelo'),
      h4('1.3.1 Fase de pre-vuelo'),
      pMixed(['El PIC o el Jefe de Pilotos iniciará el registro desde ', { text: 'Bitácora → Nueva Operación', bold: true }, '. Adicional a los campos del Plan Piloto, el Plan Escuadrilla habilita:']),
      bulletMixed([{ text: 'Selección de aeronave:', bold: true }, ' De la flota registrada (hasta 3 aeronaves). El sistema muestra el estado de aeronavegabilidad de cada aeronave antes de la selección.']),
      bulletMixed([{ text: 'Asignación de tripulación:', bold: true }, ' Selección del PIC y, si aplica, del Observador de Sistemas de Aeronaves (OSA) desde el directorio de tripulantes registrados.']),
      bulletMixed([{ text: 'Selección de baterías:', bold: true }, ' Identificación individual de cada batería LiPo que será utilizada en la operación, con visualización del número de ciclos acumulados.']),
      bulletMixed([{ text: 'Generación de autorización F-OPS-001:', bold: true }, ' El módulo Programación → Nueva Autorización permite generar el formato de solicitud con datos de la operación, coordenadas del área, número de póliza y datos de la tripulación, listo para radicar ante la UAEAC.']),

      h4('1.3.2 Fase de operación y registro de tiempos'),
      p('El registro de tiempos opera de forma idéntica al Plan Piloto. La plataforma permite, adicionalmente, el registro de múltiples despegues y aterrizajes dentro de una misma jornada operacional (ciclos), con acumulación automática del tiempo total de vuelo por aeronave y por piloto.'),

      h4('1.3.3 Fase de post-vuelo y cierre de misión'),
      p('Al concluir la operación, cualquier usuario con rol de Jefe de Pilotos o Administrador puede cerrar la misión, registrando:'),
      bullet('Novedades técnicas por aeronave.'),
      bullet('Estado de cada batería al término (Normal / Inflamada / Dañada).'),
      bullet('Condiciones meteorológicas reales observadas durante la operación.'),
      bullet('Observaciones generales de la misión.'),
      pMixed(['El cierre de misión consolida el registro y genera el ', { text: 'ID-OPS', bold: true }, ' definitivo. A partir de este momento, los campos principales son de solo lectura y cualquier adición queda registrada en el log de auditoría.']),

      h3('1.4 Autorizaciones de vuelo (F-OPS-001)'),
      pMixed(['Desde el módulo ', { text: 'Programación', bold: true }, ', el Administrador o Jefe de Pilotos puede crear, gestionar y archivar las solicitudes de autorización de vuelo. La plataforma almacena el historial de autorizaciones vinculado a cada misión, permitiendo su consulta en caso de verificación por parte de la UAEAC.']),

      h3('1.5 Integridad de registros'),
      p('Los mecanismos de integridad son idénticos a los descritos en el Plan Piloto (§1.3), con la adición del log de acceso multi-usuario: el sistema registra cada inicio de sesión, incluyendo dirección IP, dispositivo y hora, asociado a las acciones realizadas durante la sesión.'),

      h3('1.6 Reportes disponibles'),
      p('El Plan Escuadrilla habilita la exportación en PDF de:'),
      bulletMixed([{ text: 'F-OPS-002 Maestro de Vuelo', bold: true }, ' — con logo corporativo de la organización.']),
      bulletMixed([{ text: 'F-MNT-003 Registro de Baterías', bold: true }, ' — con historial de ciclos por batería.']),

      rule(),

      h2('2. Manual de Control de Mantenimiento — Sección de Gestión'),

      h3('2.1 Alcance'),
      p('Esta sección describe el uso del módulo de Mantenimiento por parte del Administrador y el Jefe de Pilotos para la gestión del mantenimiento preventivo y correctivo de la flota bajo el Plan Escuadrilla.'),

      h3('2.2 Hoja de Vida digital de la aeronave y sus componentes'),
      p('Cada aeronave de la flota cuenta con una Hoja de Vida digital que incluye, adicionalmente al Plan Piloto, el registro individual de componentes principales:'),
      bulletMixed([{ text: 'Motores (hasta 4 por aeronave):', bold: true }, ' Horas de operación individuales, fecha de instalación y número de serie.']),
      bulletMixed([{ text: 'Hélices:', bold: true }, ' Ciclos acumulados, fecha de instalación y condición (Normal / Reemplazada).']),
      bulletMixed([{ text: 'Sistema de control de vuelo (autopiloto/FC):', bold: true }, ' Versión de firmware y fecha de última actualización.']),
      bulletMixed([{ text: 'Baterías LiPo:', bold: true }, ' Ciclos acumulados por unidad, historial de incidentes y estado actual.']),
      p('La Hoja de Vida es consultable por todos los usuarios con rol de Administrador o Jefe de Pilotos, y es de solo lectura para los Pilotos.'),

      h3('2.3 Gestión del mantenimiento preventivo'),
      p('Además de los umbrales por horas y calendario disponibles en el Plan Piloto, el Plan Escuadrilla incorpora:'),
      pMixed([{ text: 'Mantenimiento por ciclos de componente:', bold: true }, ' El sistema controla de forma independiente los ciclos de cada componente registrado (ej. hélices, motores). Al superar el umbral configurado para un componente específico, el sistema genera una alerta vinculada a ese componente en particular, sin bloquear necesariamente toda la aeronave si los demás sistemas están dentro de los límites.']),
      pMixed([{ text: 'Alertas automáticas de baterías:', bold: true }, ' Cuando una batería supera el umbral de ciclos configurado (200 por defecto, ajustable por el Administrador), el sistema la marca como "Requiere revisión" y la excluye automáticamente de la lista de baterías disponibles para nuevas operaciones.']),

      h3('2.4 Reporte de fallas y mantenimiento correctivo'),
      pMixed(['Cuando el PIC registra una novedad técnica durante el post-vuelo, el sistema genera automáticamente un ', { text: 'ticket de mantenimiento correctivo', bold: true }, ' visible en el módulo ', { text: 'Mantenimiento → Pendientes', bold: true }, '. El Administrador o Jefe de Pilotos gestionará el ticket registrando:']),
      bullet('Diagnóstico técnico.'),
      bullet('Acción correctiva ejecutada.'),
      bullet('Componentes reemplazados con número de parte.'),
      bullet('Resultado: Resuelto / Pendiente segunda inspección.'),
      pMixed(['La aeronave permanece en estado ', { text: 'Requiere inspección', bold: true }, ' hasta que el ticket sea cerrado mediante el proceso de Liberación a Servicio.']),

      h3('2.5 Liberación a Servicio (Return to Service)'),
      pMixed(['El proceso de Liberación a Servicio en el Plan Escuadrilla requiere autorización del Administrador o Jefe de Pilotos desde ', { text: 'Mantenimiento → Liberar aeronave', bold: true }, '. El sistema genera un registro de liberación con:']),
      bullet('Identificación de quien autoriza la liberación (usuario autenticado).'),
      bullet('Fecha y hora de liberación (timestamp de servidor).'),
      bullet('Resumen de trabajos realizados.'),
      bullet('Próximos vencimientos de mantenimiento programados.'),
      p('Este registro queda incorporado de forma permanente en la Hoja de Vida digital de la aeronave y es exportable en el reporte F-MNT-003.'),

      // ════════════════════════════════════════════════
      // PLAN FLOTA
      // ════════════════════════════════════════════════
      h1('PLAN FLOTA'),

      h2('1. Manual de Operaciones — Sección de Registros y Control de Vuelos'),

      h3('1.1 Alcance y aplicabilidad'),
      p('Esta sección aplica a empresas operadoras de UAS con hasta quince (15) aeronaves y quince (15) usuarios bajo el Plan Flota de BITAFLY. El presente procedimiento describe el uso avanzado de la plataforma para el registro integral de operaciones con trazabilidad completa de flota, tripulación y documentación oficial, en cumplimiento del RAC 100, numerales 100.3.3, 100.9 y 100.11, así como los formatos F-OPS-001, F-OPS-002 y F-HUM-005.'),

      h3('1.2 Gestión de usuarios y roles operacionales'),
      p('El Plan Flota habilita los cinco (5) roles operacionales definidos en el RAC 100:'),
      blank(),
      tablaRolesFlota(),
      blank(),
      p('Cada acción en la plataforma queda vinculada al rol y usuario que la ejecuta, conforme al principio de responsabilidad individual establecido en el RAC 100.'),

      h3('1.3 Registro de operación de vuelo'),
      h4('1.3.1 Fase de pre-vuelo'),
      pMixed(['El Jefe de Pilotos o el PIC asignado inicia el registro desde ', { text: 'Bitácora → Nueva Operación', bold: true }, '. El Plan Flota incorpora, adicionalmente a los planes anteriores:']),
      bulletMixed([{ text: 'Planificación de misión con polígono de operación:', bold: true }, ' Definición del área geográfica mediante ingreso de coordenadas o descripción textual del polígono, conforme al formato F-OPS-001.']),
      bulletMixed([{ text: 'Asignación de tripulación completa:', bold: true }, ' Selección del PIC, OSA y personal de apoyo en tierra, con verificación automática de vigencia de certificados médicos y licencias. El sistema bloquea la asignación de un tripulante con certificado médico vencido.']),
      bulletMixed([{ text: 'Verificación de seguro de responsabilidad civil:', bold: true }, ' El sistema verifica que la fecha de vigencia de la póliza registrada sea posterior a la fecha de la operación. Si la póliza está vencida, bloquea la creación del registro de vuelo.']),
      bulletMixed([{ text: 'Lista de verificación pre-vuelo (checklist):', bold: true }, ' Checklists configurables por tipo de aeronave. El PIC debe completar y confirmar digitalmente cada ítem antes de que el sistema habilite el registro de tiempos.']),

      h4('1.3.2 Fase de operación y registro de tiempos'),
      p('Adicionalmente a los planes anteriores, el Plan Flota permite:'),
      bulletMixed([{ text: 'Registro de múltiples aeronaves en una misma misión:', bold: true }, ' Para operaciones con más de una aeronave simultánea, el sistema crea registros individuales vinculados a un mismo ID de misión.']),
      bulletMixed([{ text: 'Registro de vuelos con despegues múltiples:', bold: true }, ' Control detallado de cada despegue y aterrizaje dentro de la jornada, con acumulación individual por aeronave y por batería.']),
      bulletMixed([{ text: 'Registro de coordenadas de operación reales:', bold: true }, ' Posibilidad de ingresar las coordenadas efectivas del área de operación para contrastarlas con las autorizadas en el F-OPS-001.']),

      h4('1.3.3 Fase de post-vuelo y cierre de misión'),
      p('El cierre de misión en el Plan Flota incluye, adicionalmente:'),
      bulletMixed([{ text: 'Informe de cumplimiento de la misión:', bold: true }, ' El Jefe de Pilotos confirma que la operación se realizó dentro del área autorizada, sin exceder los límites de altura y con la tripulación asignada.']),
      bulletMixed([{ text: 'Reporte de condiciones reales vs. planificadas:', bold: true }, ' Registro de las condiciones meteorológicas reales observadas versus las previstas en la planificación.']),
      bulletMixed([{ text: 'Cierre de tickets de novedad técnica:', bold: true }, ' Si durante la misión se reportó alguna novedad técnica, el sistema requiere su vinculación a un ticket de mantenimiento antes de permitir el cierre definitivo.']),

      h3('1.4 Expediente digital de tripulante y control de certificados'),
      pMixed(['El Plan Flota incluye el módulo de ', { text: 'Tripulación → Expediente de tripulante', bold: true }, ', que gestiona de forma integral el archivo documental de cada piloto, conforme a los requisitos del RAC 100 para el formato F-HUM-005:']),
      blank(),
      tablaExpediente(),
      blank(),
      pMixed(['El sistema genera automáticamente el reporte ', { text: 'F-HUM-005 Bitácora de Piloto', bold: true }, ' con el historial de horas voladas por tripulante, disponible para exportación en PDF con logo corporativo.']),

      h3('1.5 Integridad y auditoría completa de registros'),
      p('El Plan Flota incorpora el módulo de Auditoría, que proporciona:'),
      bulletMixed([{ text: 'Log de auditoría completo:', bold: true }, ' Registro de cada acción realizada en la plataforma con identificación de usuario, fecha, hora y descripción del cambio.']),
      bulletMixed([{ text: 'Consulta histórica de versiones:', bold: true }, ' Posibilidad de visualizar el estado de cualquier registro en cualquier momento de su historia.']),
      bulletMixed([{ text: 'Exportación del log de auditoría:', bold: true }, ' El Administrador puede exportar el log completo en formato CSV o PDF para presentar ante la UAEAC en caso de inspección.']),
      bulletMixed([{ text: 'Control de acceso basado en roles (RBAC):', bold: true }, ' Cada permiso está controlado a nivel de base de datos mediante políticas de Row Level Security (RLS).']),

      h3('1.6 Reportes oficiales disponibles'),
      p('El Plan Flota habilita la exportación en PDF de la totalidad de los formatos oficiales RAC 100:'),
      blank(),
      tablaReportesFlota(),
      blank(),
      p('Todos los reportes incluyen: logo corporativo de la organización, código de formato, número de versión, fecha de generación y nombre del responsable de la exportación.'),

      rule(),

      h2('2. Manual de Control de Mantenimiento — Sección de Gestión'),

      h3('2.1 Alcance'),
      p('Esta sección describe el uso avanzado del módulo de Mantenimiento de BITAFLY por parte del Administrador, Jefe de Pilotos y Gerente SMS para la gestión integral del mantenimiento de flotas de hasta quince (15) aeronaves UAS.'),

      h3('2.2 Hoja de Vida digital avanzada'),
      p('La Hoja de Vida digital en el Plan Flota incorpora, adicionalmente:'),
      bulletMixed([{ text: 'Historial fotográfico:', bold: true }, ' Posibilidad de adjuntar imágenes de los componentes en cada intervención de mantenimiento.']),
      bulletMixed([{ text: 'Documentos técnicos adjuntos:', bold: true }, ' El técnico de mantenimiento puede cargar certificados de mantenimiento, órdenes de trabajo y hojas de datos de componentes instalados, vinculados permanentemente al registro de la intervención.']),
      bulletMixed([{ text: 'Trazabilidad de airworthiness directives (ADs):', bold: true }, ' Registro de las directivas de aeronavegabilidad aplicables a cada modelo de aeronave y seguimiento de su cumplimiento.']),
      bulletMixed([{ text: 'Estado consolidado de flota:', bold: true }, ' El Administrador y el Jefe de Pilotos pueden visualizar en el dashboard el estado de aeronavegabilidad de todas las aeronaves en tiempo real, con indicadores de color (verde / amarillo / rojo).']),

      h3('2.3 Programa de mantenimiento preventivo de flota'),
      p('El Plan Flota permite la configuración de un Programa de Mantenimiento independiente por cada aeronave y tipo de componente. El programa define:'),
      bullet('Intervalos de mantenimiento por horas de vuelo, número de ciclos y calendario (lo que ocurra primero).'),
      bullet('Tareas específicas a realizar en cada intervalo (ej. "Inspección visual de hélices cada 50 horas o 30 días").'),
      bullet('Responsable asignado para la ejecución de cada tipo de mantenimiento.'),
      pMixed(['El sistema genera un ', { text: 'Plan de Mantenimiento Mensual', bold: true }, ' consolidado para toda la flota, exportable en PDF, que permite al Jefe de Pilotos planificar la disponibilidad operacional de las aeronaves con anticipación.']),

      h3('2.4 Gestión de mantenimiento correctivo y reporte de fallas'),
      p('El proceso de mantenimiento correctivo en el Plan Flota incorpora:'),
      bulletMixed([{ text: 'Categorización de fallas:', bold: true }, ' Cada reporte de novedad técnica se clasifica por severidad (Menor / Mayor / Crítica) y por sistema afectado (Propulsión / Estructura / Navegación / Comunicaciones / Energía).']),
      bulletMixed([{ text: 'Asignación de responsable:', bold: true }, ' El Jefe de Pilotos asigna el ticket de mantenimiento correctivo a un técnico responsable dentro de la plataforma.']),
      bulletMixed([{ text: 'Seguimiento de estado:', bold: true }, ' El ticket avanza por los estados: Reportado → En diagnóstico → En reparación → Pendiente de verificación → Cerrado.']),
      bulletMixed([{ text: 'Vinculación a registro de vuelo:', bold: true }, ' El ticket correctivo queda vinculado permanentemente al registro de vuelo en el que se reportó la novedad, garantizando la trazabilidad completa del evento.']),

      h3('2.5 Liberación a Servicio (Return to Service) — Proceso completo'),
      p('El proceso de Liberación a Servicio en el Plan Flota es el más completo de la plataforma y contempla:'),
      pMixed([{ text: 'Paso 1 — Verificación de trabajos completados:', bold: true }, ' El sistema verifica que todos los tickets de mantenimiento correctivo abiertos asociados a la aeronave estén en estado "Cerrado" antes de habilitar la liberación.']),
      pMixed([{ text: 'Paso 2 — Verificación del programa de mantenimiento preventivo:', bold: true }, ' El sistema confirma que los contadores de horas, ciclos y calendario han sido reiniciados correctamente con base en la intervención registrada.']),
      pMixed([{ text: 'Paso 3 — Declaración de aeronavegabilidad:', bold: true }, ' El Administrador o Jefe de Pilotos confirma digitalmente, mediante reingreso de contraseña, la declaración de que la aeronave cumple con las condiciones de aeronavegabilidad exigidas por el RAC 100.']),
      pMixed([{ text: 'Paso 4 — Generación del certificado de liberación:', bold: true }, ' El sistema genera un registro de liberación a servicio que incluye: identificación de la aeronave, horas al momento de la liberación, descripción resumida de los trabajos realizados, identidad del responsable y timestamp de servidor.']),
      pMixed([{ text: 'Paso 5 — Habilitación operacional:', bold: true }, ' Solo tras completar los cuatro pasos anteriores, el sistema actualiza el estado de la aeronave a Aeronavegable y la habilita para nuevos registros de vuelo.']),

      // ════════════════════════════════════════════════
      // GLOSARIO
      // ════════════════════════════════════════════════
      h1('GLOSARIO DE TÉRMINOS'),
      blank(),
      tablaGlosario(),
      blank(),
      p('Fin del documento.', { color: '94A3B8', italics: true }),
    ],
  }],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('C:/Users/PC/Documents/skylog-manager/docs/Bitafly_MO_MCM_RAC100.docx', buffer);
  console.log('OK: Bitafly_MO_MCM_RAC100.docx generado correctamente.');
}).catch(err => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
