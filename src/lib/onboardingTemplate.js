/**
 * onboardingTemplate.js
 *
 * Genera el workbook Excel de configuración inicial (Onboarding Express).
 * 9 hojas guiadas + hoja oculta _LISTAS con rangos nombrados para dropdowns.
 *
 * Uso (server-side):
 *   const { generateOnboardingTemplate } = await import('@/lib/onboardingTemplate');
 *   const buffer = await generateOnboardingTemplate();
 *   // → Buffer con el .xlsx listo para descargar
 */

import { MISSION_TYPES, LINE_OF_SIGHT_TYPES } from '@/lib/missionTypes';

// ── Paleta de colores ─────────────────────────────────────────────────────
const C_ORANGE   = 'EC5B13';
const C_DARK     = '1A202C';
const C_WHITE    = 'FFFFFF';
const C_REQUIRED = 'FFFBEB'; // amarillo muy suave — celda requerida
const C_HEADER_BG = 'EC5B13';
const C_ALT_ROW  = 'F9FAFB';
const C_BORDER   = 'E5E7EB';
const C_GUIDE    = 'EFF6FF'; // azul muy suave — filas de ejemplo

// ── Listas para dropdowns ─────────────────────────────────────────────────
// `tipos_mision` y `lineas_vista` se importan de lib/missionTypes.js — fuente
// única compartida con Programación (BasicForm) y Despacho (logbook/new).
// Antes tenían una lista propia desincronizada (categorías libres viejas,
// pre-2026-07-04) que ya no coincidía con el vocabulario oficial exigido por
// la circular de AeroCivil para el reporte mensual — corregido para que la
// bitácora importada por Excel clasifique igual que el resto de la app.
const LISTAS = {
  roles_piloto:     ['Piloto', 'Jefe de Pilotos', 'Gerente SMS', 'Observador'],
  fabricantes:      ['DJI', 'Autel', 'Freefly', 'Parrot', 'AgEagle', 'Wingtra', 'senseFly', 'Otro'],
  estados_aeronave: ['Operativo', 'Mantenimiento', 'Baja'],
  tipos_mision:     MISSION_TYPES,
  lineas_vista:     LINE_OF_SIGHT_TYPES,
  condicion_visual: ['VMC', 'IMC', 'NIGHT'],
  tipos_doc:        ['NIT', 'CC', 'CE'],
  si_no:            ['SI', 'NO'],
};

// ── Helpers de estilo ─────────────────────────────────────────────────────

function headerStyle(wb) {
  return {
    font:      { bold: true, color: { argb: 'FF' + C_WHITE }, size: 11 },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_HEADER_BG } },
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    border: {
      top:    { style: 'thin', color: { argb: 'FF' + C_ORANGE } },
      bottom: { style: 'thin', color: { argb: 'FF' + C_ORANGE } },
      left:   { style: 'thin', color: { argb: 'FF' + C_ORANGE } },
      right:  { style: 'thin', color: { argb: 'FF' + C_ORANGE } },
    },
  };
}

function requiredHeaderStyle() {
  return {
    font:      { bold: true, color: { argb: 'FF' + C_WHITE }, size: 11 },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCC4400' } }, // naranja más oscuro
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    border: {
      top:    { style: 'thin', color: { argb: 'FFCC4400' } },
      bottom: { style: 'thin', color: { argb: 'FFCC4400' } },
      left:   { style: 'thin', color: { argb: 'FFCC4400' } },
      right:  { style: 'thin', color: { argb: 'FFCC4400' } },
    },
  };
}

function dataStyle(altRow = false) {
  const bg = altRow ? C_ALT_ROW : C_WHITE;
  return {
    font:      { size: 10, color: { argb: 'FF' + C_DARK } },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } },
    alignment: { vertical: 'middle', horizontal: 'left', wrapText: false },
    border: {
      top:    { style: 'hair', color: { argb: 'FF' + C_BORDER } },
      bottom: { style: 'hair', color: { argb: 'FF' + C_BORDER } },
      left:   { style: 'hair', color: { argb: 'FF' + C_BORDER } },
      right:  { style: 'hair', color: { argb: 'FF' + C_BORDER } },
    },
  };
}

function guideStyle() {
  return {
    font:      { size: 10, color: { argb: 'FF718096' }, italic: true },
    fill:      { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_GUIDE } },
    alignment: { vertical: 'middle', horizontal: 'left' },
    border: {
      top:    { style: 'hair', color: { argb: 'FFBFDBFE' } },
      bottom: { style: 'hair', color: { argb: 'FFBFDBFE' } },
      left:   { style: 'hair', color: { argb: 'FFBFDBFE' } },
      right:  { style: 'hair', color: { argb: 'FFBFDBFE' } },
    },
  };
}

// Aplica estilo a rango de celdas
function styleRange(ws, rowStart, rowEnd, colStart, colEnd, style) {
  for (let r = rowStart; r <= rowEnd; r++) {
    for (let c = colStart; c <= colEnd; c++) {
      const cell = ws.getCell(r, c);
      Object.assign(cell, style);
      if (style.font)      cell.font      = style.font;
      if (style.fill)      cell.fill      = style.fill;
      if (style.alignment) cell.alignment = style.alignment;
      if (style.border)    cell.border    = style.border;
    }
  }
}

// Crea una hoja de datos con cabecera naranja.
// Si `realRows` trae datos existentes de la org, se escriben como datos reales
// (estilo blanco) y se omiten las filas de ejemplo. Si no, se muestran los
// ejemplos en azul suave.
function setupDataSheet(ws, columns, exampleRows = [], realRows = null) {
  ws.views = [{ state: 'frozen', ySplit: 1 }];
  ws.properties.defaultRowHeight = 22;

  // Fila de encabezados
  const headerRow = ws.getRow(1);
  headerRow.height = 28;
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.required ? `${col.header} *` : col.header;
    Object.assign(cell, col.required ? requiredHeaderStyle() : headerStyle());
    ws.getColumn(i + 1).width = col.width || 20;
  });

  const usingReal = Array.isArray(realRows) && realRows.length > 0;
  const dataRows  = usingReal ? realRows : exampleRows;

  // Filas de datos: reales (blanco) o ejemplos (azul suave)
  dataRows.forEach((row, ri) => {
    const wsRow = ws.getRow(ri + 2);
    wsRow.height = 20;
    columns.forEach((col, ci) => {
      const cell = wsRow.getCell(ci + 1);
      cell.value = row[ci] !== undefined ? row[ci] : '';
      const st = usingReal ? dataStyle((ri + 2) % 2 === 0) : guideStyle();
      cell.font      = st.font;
      cell.fill      = st.fill;
      cell.alignment = st.alignment;
      cell.border    = st.border;
      if (col.numFmt)  cell.numFmt  = col.numFmt;
    });
  });

  // Filas vacías para llenado (20 filas)
  const startEmpty = dataRows.length + 2;
  for (let r = startEmpty; r < startEmpty + 20; r++) {
    const wsRow = ws.getRow(r);
    wsRow.height = 20;
    columns.forEach((col, ci) => {
      const cell = wsRow.getCell(ci + 1);
      cell.value = '';
      const st = dataStyle(r % 2 === 0);
      cell.font      = st.font;
      cell.fill      = st.fill;
      cell.alignment = st.alignment;
      cell.border    = st.border;
      if (col.numFmt)  cell.numFmt  = col.numFmt;
    });
  }

  return startEmpty + 20 - 1;
}

// Agrega dropdown a una columna en un rango de filas
function addDropdown(ws, colIndex, rowStart, rowEnd, listFormula) {
  for (let r = rowStart; r <= rowEnd; r++) {
    ws.getCell(r, colIndex).dataValidation = {
      type:         'list',
      allowBlank:   true,
      formulae:     [listFormula],
      showErrorMessage: true,
      errorTitle:   'Valor inválido',
      error:        'Selecciona una opción de la lista desplegable.',
    };
  }
}

// ── HOJA _LISTAS ──────────────────────────────────────────────────────────
function buildListasSheet(wb) {
  const ws = wb.addWorksheet('_LISTAS');
  ws.state = 'veryHidden';

  let col = 1;
  Object.entries(LISTAS).forEach(([key, values]) => {
    // Cabecera
    const hCell = ws.getCell(1, col);
    hCell.value = key;
    hCell.font  = { bold: true, size: 10 };

    // Valores
    values.forEach((v, i) => {
      ws.getCell(i + 2, col).value = v;
    });

    // Rango nombrado: _LISTAS!$A$2:$A$N
    const colLetter = ws.getColumn(col).letter;
    const rangeName = key;
    wb.definedNames.add(`_LISTAS!$${colLetter}$2:$${colLetter}$${values.length + 1}`, rangeName);

    col++;
  });
}

// ── HOJA BIENVENIDA ───────────────────────────────────────────────────────
function buildBienvenidaSheet(wb) {
  const ws = wb.addWorksheet('🏠 Bienvenida');
  ws.properties.defaultRowHeight = 20;

  // Fondo oscuro en todo
  ws.views = [{ showGridLines: false }];

  // Fusionar celdas para el header
  ws.mergeCells('A1:J1');
  ws.mergeCells('A2:J2');
  ws.mergeCells('A3:J3');
  ws.mergeCells('A4:J4');
  ws.mergeCells('A5:J5');

  // Título
  const titleCell = ws.getCell('A1');
  titleCell.value = 'BITAFLY — CONFIGURACIÓN INICIAL';
  titleCell.font  = { bold: true, size: 20, color: { argb: 'FF' + C_WHITE } };
  titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_ORANGE } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 42;

  // Subtítulo
  const subCell = ws.getCell('A2');
  subCell.value = 'Plantilla de Configuración Inicial — Onboarding Express';
  subCell.font  = { size: 13, color: { argb: 'FFFFFFFF' }, italic: true };
  subCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCC4400' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 28;

  // Espacio
  ws.getRow(3).height = 10;
  ws.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK } };

  // Instrucción principal
  const instrCell = ws.getCell('A4');
  instrCell.value = '¿Cómo usar esta plantilla?';
  instrCell.font  = { bold: true, size: 14, color: { argb: 'FF' + C_ORANGE } };
  instrCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK } };
  instrCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 2 };
  ws.getRow(4).height = 30;

  ws.getRow(5).height = 8;
  ws.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK } };

  // Pasos
  const pasos = [
    ['📋  PASO 1', 'Llena cada hoja con la información de tu organización. Las filas en azul claro son ejemplos — puedes borrarlas.'],
    ['💾  PASO 2', 'Guarda el archivo Excel cuando hayas terminado de llenarlo.'],
    ['⬆️  PASO 3', 'En Bitafly, ve a Ajustes → Inicio Rápido y sube este archivo. La plataforma importará todo automáticamente.'],
    ['✅  LISTO',  'Tu organización quedará configurada con toda la información ingresada: flota, tripulación, baterías, pólizas y más.'],
  ];

  let row = 6;
  pasos.forEach(([paso, desc], i) => {
    ws.mergeCells(`A${row}:B${row}`);
    ws.mergeCells(`C${row}:J${row}`);
    ws.getRow(row).height = 26;

    const pasoCell = ws.getCell(`A${row}`);
    pasoCell.value     = paso;
    pasoCell.font      = { bold: true, size: 11, color: { argb: 'FF' + C_ORANGE } };
    pasoCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3748' } };
    pasoCell.alignment = { horizontal: 'center', vertical: 'middle' };

    const descCell = ws.getCell(`C${row}`);
    descCell.value     = desc;
    descCell.font      = { size: 11, color: { argb: 'FFE2E8F0' } };
    descCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FF2D3748' : 'FF374151' } };
    descCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    row++;
  });

  // Espacio
  ws.mergeCells(`A${row}:J${row}`);
  ws.getRow(row).height = 16;
  ws.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK } };
  row++;

  // Nota importante
  ws.mergeCells(`A${row}:J${row}`);
  ws.getRow(row).height = 24;
  const notaCell = ws.getCell(`A${row}`);
  notaCell.value     = '⚠️  Los campos marcados con * son obligatorios. Las filas en azul claro son de ejemplo — debes borrarlas o reemplazarlas.';
  notaCell.font      = { bold: true, size: 10, color: { argb: 'FFFFD700' } };
  notaCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF744210' } };
  notaCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 2 };
  row++;

  // Espacio
  ws.mergeCells(`A${row}:J${row}`);
  ws.getRow(row).height = 16;
  ws.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_DARK } };
  row++;

  // Tabla de contenidos
  ws.mergeCells(`A${row}:J${row}`);
  ws.getRow(row).height = 26;
  const tocTitle = ws.getCell(`A${row}`);
  tocTitle.value     = 'CONTENIDO DE ESTE ARCHIVO';
  tocTitle.font      = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
  tocTitle.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + C_ORANGE } };
  tocTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  row++;

  const hojas = [
    ['🏢 Organización',          'Datos generales de tu empresa: razón social, NIT, DAN, representante legal.'],
    ['👥 Tripulación',           'Pilotos y personal: CIPU, vencimiento médico, roles y contactos de emergencia.'],
    ['✈️ Flota',                 'Aeronaves registradas: fabricante, modelo, serial, RUAS y horas acumuladas.'],
    ['🔋 Baterías',              'Inventario de baterías: serial, marca, ciclos y aeronave asignada.'],
    ['🛠️ Tech y Payloads',       'Cámaras, sensores, módulos RTK y demás equipo técnico de tu operación.'],
    ['📋 Pólizas RCE',           'Pólizas de Responsabilidad Civil Extracontractual vigentes.'],
    ['🚨 Contactos Emergencia',  'Personas clave a contactar ante un incidente operacional.'],
    ['📒 Bitácora de Vuelos',    'Historial de vuelos previos (opcional): fecha, aeronave, piloto, duración.'],
  ];

  hojas.forEach(([nombre, desc], i) => {
    ws.mergeCells(`A${row}:C${row}`);
    ws.mergeCells(`D${row}:J${row}`);
    ws.getRow(row).height = 22;

    const nameCell = ws.getCell(`A${row}`);
    nameCell.value     = nombre;
    nameCell.font      = { bold: true, size: 10, color: { argb: 'FF' + C_ORANGE } };
    nameCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FF2D3748' : 'FF374151' } };
    nameCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 2 };

    const descCell2 = ws.getCell(`D${row}`);
    descCell2.value     = desc;
    descCell2.font      = { size: 10, color: { argb: 'FFA0AEC0' } };
    descCell2.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FF2D3748' : 'FF374151' } };
    descCell2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    row++;
  });

  // Ancho de columnas
  for (let c = 1; c <= 10; c++) {
    ws.getColumn(c).width = c <= 2 ? 18 : 14;
  }

  // Proteger la hoja (solo lectura)
  ws.protect('bitafly-onboarding', {
    selectLockedCells:   true,
    selectUnlockedCells: false,
    formatCells:         false,
    formatColumns:       false,
    formatRows:          false,
    insertColumns:       false,
    insertRows:          false,
    deleteColumns:       false,
    deleteRows:          false,
    sort:                false,
    autoFilter:          false,
  });
}

// Convierte una fecha de la BD (string 'YYYY-MM-DD' o Date) a Date para Excel
function toExcelDate(v) {
  if (!v) return '';
  if (v instanceof Date) return isNaN(v.getTime()) ? '' : v;
  const s = String(v).slice(0, 10);
  const d = new Date(s + 'T00:00:00Z');
  return isNaN(d.getTime()) ? '' : d;
}

// ── HOJA ORGANIZACIÓN ─────────────────────────────────────────────────────
function buildOrgSheet(wb, org = null) {
  const ws = wb.addWorksheet('🏢 Organización');

  const columns = [
    { header: 'Razón Social',           required: true,  width: 30 },
    { header: 'Tipo Documento',         required: false, width: 16 },
    { header: 'Número Documento',       required: false, width: 20 },
    { header: 'N° Explotador DAN',      required: false, width: 22 },
    { header: 'N° Operador UAS',        required: false, width: 22 },
    { header: 'Vigencia Registro',      required: false, width: 20, numFmt: 'DD/MM/YYYY' },
    { header: 'Representante Legal',    required: false, width: 28 },
    { header: 'Email Corporativo',      required: false, width: 28 },
    { header: 'Teléfono',               required: false, width: 18 },
    { header: 'Dirección',              required: false, width: 34 },
    { header: 'Prefijo Misiones',       required: false, width: 18 },
  ];

  const example = [[
    'Empresa Drones Colombia SAS', 'NIT', '900123456-7', 'DAN-2024-001', 'OP-2024-0456',
    new Date('2025-12-31'), 'Carlos Gómez Pérez', 'ops@dronesco.com', '+57 1 234 5678',
    'Cra 7 #45-89, Bogotá D.C.', 'EDC',
  ]];
  const real = org ? [[
    org.company_name || '', org.tax_id_type || '', org.tax_id || '',
    org.dan_number || '', org.operator_number || '', toExcelDate(org.registration_expiry),
    org.legal_rep || '', org.operator_email || '',
    org.phone || '', org.address || '', org.flight_prefix || '',
  ]] : null;
  setupDataSheet(ws, columns, example, real);

  // Dropdown Tipo Documento (col 2, filas 2-22)
  addDropdown(ws, 2, 2, 22, 'tipos_doc');

  // Nota en la hoja
  ws.getCell('A24').value = '* Solo se procesa la primera fila de datos.';
  ws.getCell('A24').font  = { size: 9, color: { argb: 'FF718096' }, italic: true };
}

// ── HOJA TRIPULACIÓN ──────────────────────────────────────────────────────
function buildTripulacionSheet(wb, pilots = null) {
  const ws = wb.addWorksheet('👥 Tripulación');

  const columns = [
    { header: 'Nombre Completo',                  required: true,  width: 28 },
    { header: 'Número Cédula / Pasaporte',        required: true,  width: 26 },
    { header: 'CIPU / N° Licencia',               required: false, width: 22 },
    { header: 'Vencimiento Médico',               required: false, width: 22, numFmt: 'DD/MM/YYYY' },
    { header: 'Rol',                              required: false, width: 20 },
    { header: 'Teléfono',                         required: false, width: 18 },
    { header: 'Email',                            required: false, width: 28 },
    { header: 'Contacto Emergencia — Nombre',     required: false, width: 28 },
    { header: 'Contacto Emergencia — Teléfono',   required: false, width: 26 },
  ];

  const example = [
    ['Juan Carlos Rodríguez', '1012345678', 'CIPU-2024-0001', new Date('2025-08-15'), 'Jefe de Pilotos', '+57 300 123 4567', 'juan@dronesco.com', 'María Rodríguez', '+57 311 987 6543'],
    ['Laura Martínez Suárez', '52876543',   'CIPU-2024-0002', new Date('2025-03-20'), 'Piloto',          '+57 315 456 7890', 'laura@dronesco.com', 'Pedro Martínez',  '+57 320 111 2233'],
  ];
  const real = (pilots && pilots.length) ? pilots.map(p => [
    p.name || '', p.id_number || '', p.license_number || '',
    toExcelDate(p.medical_expiry), p.pilot_role || '', p.phone || '',
    p.email || '', p.emergency_contact_name || '', p.emergency_contact_phone || '',
  ]) : null;
  const lastRow = setupDataSheet(ws, columns, example, real);

  addDropdown(ws, 5, 2, lastRow, 'roles_piloto');
}

// ── HOJA FLOTA ────────────────────────────────────────────────────────────
function buildFlotaSheet(wb, aircraft = null) {
  const ws = wb.addWorksheet('✈️ Flota');

  const columns = [
    { header: 'Fabricante',         required: true,  width: 18 },
    { header: 'Modelo',             required: true,  width: 22 },
    { header: 'Serial / S/N',       required: true,  width: 24 },
    { header: 'Registro RUAS',      required: false, width: 22 },
    { header: 'Horas Acumuladas',   required: false, width: 20, numFmt: '0.0' },
    { header: 'Estado',             required: false, width: 18 },
  ];

  const example = [
    ['DJI',  'Matrice 300 RTK', 'SN1234567890ABC', 'RUAS-2024-0001', 120.5, 'Operativo'],
    ['DJI',  'Phantom 4 RTK',   'SN9876543210XYZ', 'RUAS-2024-0002',  45.0, 'Operativo'],
    ['Autel', 'EVO II Pro',      'SNAUTEL00112233', '',                12.3, 'Mantenimiento'],
  ];
  const real = (aircraft && aircraft.length) ? aircraft.map(a => [
    a.brand || '', a.model || '', a.serial_number || '',
    a.ruas || '', a.total_hours ?? 0, a.status || 'Operativo',
  ]) : null;
  const lastRow = setupDataSheet(ws, columns, example, real);

  addDropdown(ws, 1, 2, lastRow, 'fabricantes');
  addDropdown(ws, 6, 2, lastRow, 'estados_aeronave');

  // Nota
  ws.getCell('A28').value = '* "Mantenimiento" bloquea la aeronave para despacho en la plataforma hasta que se marque "Operativo" desde Flota. "Baja" es solo informativo.';
  ws.getCell('A28').font  = { size: 9, color: { argb: 'FF718096' }, italic: true };
}

// ── HOJA BATERÍAS ─────────────────────────────────────────────────────────
function buildBateriasSheet(wb, batteries = null) {
  const ws = wb.addWorksheet('🔋 Baterías');

  const columns = [
    { header: 'Serial / S/N',               required: true,  width: 26 },
    { header: 'Marca',                      required: false, width: 18 },
    { header: 'Ciclos Acumulados',          required: false, width: 20, numFmt: '0' },
    { header: 'Serial Aeronave Asignada',   required: false, width: 28 },
  ];

  const example = [
    ['BAT001-M300-SERIE1', 'DJI', 85,  'SN1234567890ABC'],
    ['BAT002-M300-SERIE2', 'DJI', 92,  'SN1234567890ABC'],
    ['BAT003-P4R-SERIE1',  'DJI', 120, 'SN9876543210XYZ'],
  ];
  const real = (batteries && batteries.length) ? batteries.map(b => [
    b.serial_number || '', b.brand || '', b.cycles ?? 0, b._aircraft_serial || '',
  ]) : null;
  setupDataSheet(ws, columns, example, real);

  // Nota
  ws.getCell('A28').value = '* "Serial Aeronave Asignada" es solo referencia visual — las baterías de Bitafly son intercambiables entre aeronaves y no se guarda una asignación fija. La "última aeronave usada" se calcula sola con cada vuelo importado.';
  ws.getCell('A28').font  = { size: 9, color: { argb: 'FF718096' }, italic: true };
}

// ── HOJA TECH / PAYLOADS ──────────────────────────────────────────────────
function buildTechSheet(wb, techItems = null) {
  const ws = wb.addWorksheet('🛠️ Tech y Payloads');

  const columns = [
    { header: 'Categoría',      required: false, width: 24 },
    { header: 'Fabricante',     required: false, width: 20 },
    { header: 'Modelo',         required: false, width: 24 },
    { header: 'Serial / S/N',   required: true,  width: 26 },
  ];

  const example = [
    ['Cámara multiespectral', 'MicaSense', 'RedEdge-P',    'MSSN00112233'],
    ['Módulo RTK',            'DJI',        'D-RTK 2',      'RTKSN00998877'],
    ['Radio / Enlace',        'DJI',        'Ocusync 3',    'RADIOSN0011'],
  ];
  const real = (techItems && techItems.length) ? techItems.map(t => [
    t.category || '', t.brand || '', t.model || '', t.serial_number || '',
  ]) : null;
  setupDataSheet(ws, columns, example, real);

  // Nota
  ws.getCell('A28').value = '* Registra aquí cámaras, sensores, módulos RTK, radios u otro equipo técnico/payload de tu operación (distinto de las aeronaves y baterías).';
  ws.getCell('A28').font  = { size: 9, color: { argb: 'FF718096' }, italic: true };
}

// ── HOJA PÓLIZAS RCE ──────────────────────────────────────────────────────
function buildPolizasSheet(wb, policies = null) {
  const ws = wb.addWorksheet('📋 Pólizas RCE');

  const columns = [
    { header: 'Aseguradora',                          required: true,  width: 26 },
    { header: 'Número de Póliza',                     required: true,  width: 24 },
    { header: 'Fecha Inicio',                         required: true,  width: 18, numFmt: 'DD/MM/YYYY' },
    { header: 'Fecha Fin',                            required: true,  width: 18, numFmt: 'DD/MM/YYYY' },
    { header: 'Serial Aeronave (o escribe FLOTA)',    required: false, width: 34 },
  ];

  const example = [
    ['Seguros Bolívar', 'POL-2024-001234', new Date('2024-01-01'), new Date('2024-12-31'), 'SN1234567890ABC'],
    ['Allianz',         'POL-2024-005678', new Date('2024-03-01'), new Date('2025-02-28'), 'FLOTA'],
  ];
  const real = (policies && policies.length) ? policies.map(p => [
    p.insurance_company || '', p.policy_number || '',
    toExcelDate(p.start_date), toExcelDate(p.end_date),
    p._aircraft_serial || 'FLOTA',
  ]) : null;
  setupDataSheet(ws, columns, example, real);

  // Nota
  ws.getCell('A28').value = '* Escribe "FLOTA" en la última columna si la póliza cubre toda la flota (no solo una aeronave).';
  ws.getCell('A28').font  = { size: 9, color: { argb: 'FF718096' }, italic: true };
}

// ── HOJA CONTACTOS DE EMERGENCIA ──────────────────────────────────────────
function buildContactosSheet(wb, contacts = null) {
  const ws = wb.addWorksheet('🚨 Contactos Emergencia');

  const columns = [
    { header: 'Nombre Completo',  required: true,  width: 28 },
    { header: 'Cargo / Rol',      required: false, width: 24 },
    { header: 'Teléfono',         required: true,  width: 20 },
    { header: 'Email',            required: false, width: 28 },
    { header: 'Notas',            required: false, width: 40 },
  ];

  const example = [
    ['Carlos Gómez Pérez',   'Gerente General',       '+57 1 234 5678',   'carlos@dronesco.com',  'Disponible 24/7'],
    ['Sandra López Vargas',  'Coordinadora de Operaciones', '+57 310 999 8877', 'sandra@dronesco.com', 'Lunes a viernes'],
    ['Defensa Civil Local',  'Apoyo externo',         '+57 1 800 111 444', '',                    'Solo emergencias mayores'],
  ];
  const real = (contacts && contacts.length) ? contacts.map(c => [
    c.name || '', c.role || '', c.phone || '', c.email || '', c.notes || '',
  ]) : null;
  setupDataSheet(ws, columns, example, real);
}

// ── HOJA BITÁCORA ─────────────────────────────────────────────────────────
function buildBitacoraSheet(wb) {
  const ws = wb.addWorksheet('📒 Bitácora de Vuelos');

  const columns = [
    { header: 'Fecha',                    required: true,  width: 16, numFmt: 'DD/MM/YYYY' },
    { header: 'Fabricante + Modelo',      required: false, width: 24 },
    { header: 'Serial Aeronave',          required: true,  width: 24 },
    { header: 'Tipo de Misión',           required: false, width: 42 },
    { header: 'Línea de Vista',           required: false, width: 16 },
    { header: 'Hora Despegue (HH:MM)',    required: false, width: 22 },
    { header: 'Hora Aterrizaje (HH:MM)',  required: false, width: 22 },
    { header: 'Condición Visual',         required: false, width: 18 },
    { header: 'Ubicación / Municipio',    required: false, width: 30 },
    { header: 'Nombre Piloto',            required: false, width: 28 },
    { header: 'Notas / Observaciones',    required: false, width: 36 },
    { header: 'Incidente (SI/NO)',        required: false, width: 20 },
  ];

  const example = [
    [new Date('2024-10-15'), 'DJI Matrice 300 RTK', 'SN1234567890ABC', 'Captura imágenes/datos', 'VLOS', '08:30', '09:45', 'VMC', 'Zipaquirá, Cundinamarca',      'Juan Carlos Rodríguez', 'Inspección torres eléctricas sector norte', 'NO'],
    [new Date('2024-10-16'), 'DJI Phantom 4 RTK',   'SN9876543210XYZ', 'Captura imágenes/datos', 'VLOS', '14:00', '15:20', 'VMC', 'Fusagasugá, Cundinamarca',     'Laura Martínez Suárez', 'Levantamiento topográfico finca La Esmeralda', 'NO'],
    [new Date('2024-10-18'), 'DJI Matrice 300 RTK', 'SN1234567890ABC', 'Aspersión',              'VLOS', '07:00', '08:30', 'VMC', 'Girardot, Cundinamarca',       'Juan Carlos Rodríguez', '', 'NO'],
  ];
  const lastRow = setupDataSheet(ws, columns, example);

  // Dropdowns
  addDropdown(ws, 4,  2, lastRow, 'tipos_mision');
  addDropdown(ws, 5,  2, lastRow, 'lineas_vista');
  addDropdown(ws, 8,  2, lastRow, 'condicion_visual');
  addDropdown(ws, 12, 2, lastRow, 'si_no');

  // Nota
  ws.getCell('A28').value = '* En "Serial Aeronave" usa el mismo S/N de la hoja ✈️ Flota. En "Nombre Piloto" usa el nombre exacto de la hoja 👥 Tripulación.';
  ws.getCell('A28').font  = { size: 9, color: { argb: 'FF718096' }, italic: true };
  ws.getCell('A29').value = '* La columna "Fabricante + Modelo" es solo referencia visual — no se importa. La plataforma usa el Serial para identificar la aeronave.';
  ws.getCell('A29').font  = { size: 9, color: { argb: 'FF718096' }, italic: true };
  ws.getCell('A30').value = '* "Tipo de Misión" y "Línea de Vista" usan las mismas categorías oficiales exigidas por AeroCivil para el reporte mensual — elige de la lista desplegable.';
  ws.getCell('A30').font  = { size: 9, color: { argb: 'FF718096' }, italic: true };
  ws.getCell('A31').value = '* Esta hoja es opcional. Si no tienes historial previo, puedes dejarla vacía (o solo borrar las filas de ejemplo).';
  ws.getCell('A31').font  = { size: 9, color: { argb: 'FF718096' }, italic: true };
}

// ── FUNCIÓN PRINCIPAL ─────────────────────────────────────────────────────

/**
 * @param {object} [data] datos actuales de la org para pre-llenar la plantilla.
 *   { org, pilots, aircraft, batteries, techItems, policies, contacts }
 *   Si se omite, se genera la plantilla en blanco con ejemplos.
 */
export async function generateOnboardingTemplate(data = {}) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();

  wb.creator  = 'Bitafly — bitafly.com';
  wb.lastModifiedBy = 'Bitafly';
  wb.created  = new Date();
  wb.modified = new Date();
  wb.properties.date1904 = false;

  // Orden de creación = orden de las pestañas en Excel
  buildListasSheet(wb);                       // Oculta — listas para dropdowns
  buildBienvenidaSheet(wb);                   // Hoja 1
  buildOrgSheet(wb, data.org);                // Hoja 2
  buildTripulacionSheet(wb, data.pilots);     // Hoja 3
  buildFlotaSheet(wb, data.aircraft);         // Hoja 4
  buildBateriasSheet(wb, data.batteries);     // Hoja 5
  buildTechSheet(wb, data.techItems);         // Hoja 6
  buildPolizasSheet(wb, data.policies);       // Hoja 7
  buildContactosSheet(wb, data.contacts);     // Hoja 8
  buildBitacoraSheet(wb);                     // Hoja 9 (historial — no se pre-llena)

  // La primera hoja activa al abrir debe ser Bienvenida
  wb.views = [{ activeTab: 1 }]; // índice 1 = segunda hoja (índice 0 es _LISTAS oculta)

  return wb.xlsx.writeBuffer();
}
