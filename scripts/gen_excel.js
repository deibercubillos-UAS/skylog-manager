// Genera: docs/Bitafly_Proyeccion_Financiera.xlsx
// Requiere: npm install exceljs (ya instalado)

const ExcelJS = require('exceljs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'docs', 'Bitafly_Proyeccion_Financiera.xlsx');

// ── Paleta ────────────────────────────────────────────────────────────────────
const C = {
  navy:    '1A2744',
  blue:    '1E3A5F',
  sky:     '2D7DD2',
  skyLight:'D6E8F9',
  green:   '1B7A4A',
  greenL:  'D4EDDA',
  red:     'C0392B',
  redL:    'FADBD8',
  yellow:  'F39C12',
  yellowL: 'FEF9E7',
  gray1:   'F2F4F7',
  gray2:   'D5D8DC',
  white:   'FFFFFF',
  black:   '000000',
};

function fill(hex)  { return { type:'pattern', pattern:'solid', fgColor:{argb:'FF'+hex} }; }
function font(hex, bold=false, sz=11) { return { color:{argb:'FF'+hex}, bold, size:sz, name:'Calibri' }; }
function border() {
  const s = { style:'thin', color:{argb:'FFD5D8DC'} };
  return { top:s, left:s, bottom:s, right:s };
}
function pct(decimals=1)   { return `0.${'0'.repeat(decimals)}%`; }
function cop(decimals=0)   { return `#,##0${decimals?'.'+('0'.repeat(decimals)):''}` + ' "COP"'; }
function usd()             { return `"USD" #,##0`; }
function num()             { return `#,##0`; }

// Writes a single styled cell
function wc(ws, row, col, value, opts={}) {
  const cell = ws.getCell(row, col);
  if (opts.f) {
    cell.value = { formula: opts.f, result: opts.result ?? 0 };
  } else {
    cell.value = value;
  }
  if (opts.fill)        cell.fill = fill(opts.fill);
  if (opts.fontColor)   cell.font = font(opts.fontColor, opts.bold ?? false, opts.sz ?? 11);
  else if (opts.bold)   cell.font = font(C.black, true, opts.sz ?? 11);
  if (opts.fmt)         cell.numFmt = opts.fmt;
  if (opts.align)       cell.alignment = { horizontal: opts.align, vertical:'middle', wrapText: !!opts.wrap };
  else                  cell.alignment = { vertical:'middle', wrapText: !!opts.wrap };
  cell.border = border();
  return cell;
}

// Section header spanning cols
function hdr(ws, row, c1, c2, text, fillColor=C.navy, fontColor=C.white) {
  ws.mergeCells(row, c1, row, c2);
  const cell = ws.getCell(row, c1);
  cell.value = text;
  cell.fill  = fill(fillColor);
  cell.font  = font(fontColor, true, 12);
  cell.alignment = { horizontal:'center', vertical:'middle' };
  cell.border = border();
  ws.getRow(row).height = 22;
}

// ─── SHEET 1: SUPUESTOS ───────────────────────────────────────────────────────
async function buildSupuestos(wb) {
  const ws = wb.addWorksheet('SUPUESTOS', { properties:{ tabColor:{argb:'FF'+C.sky} } });
  ws.views = [{ showGridLines: false }];

  // Column widths
  ws.getColumn(1).width = 38;
  ws.getColumn(2).width = 22;
  ws.getColumn(3).width = 22;
  ws.getColumn(4).width = 22;
  ws.getColumn(5).width = 22;

  let r = 1;

  // Title
  ws.mergeCells(r,1,r,5);
  const title = ws.getCell(r,1);
  title.value = 'BITAFLY — SUPUESTOS DEL MODELO';
  title.fill  = fill(C.navy);
  title.font  = font(C.white, true, 16);
  title.alignment = { horizontal:'center', vertical:'middle' };
  ws.getRow(r).height = 32;
  r++;

  ws.mergeCells(r,1,r,5);
  const sub = ws.getCell(r,1);
  sub.value = 'Cambia cualquier celda amarilla → todo el modelo se actualiza automáticamente';
  sub.fill  = fill(C.yellowL);
  sub.font  = font(C.yellow, true, 11);
  sub.alignment = { horizontal:'center', vertical:'middle' };
  ws.getRow(r).height = 20;
  r++;

  r++; // blank

  // ── PRECIOS ──
  hdr(ws, r, 1, 5, '1. PRECIOS (COP)', C.blue);
  r++;
  // Headers
  ['Plan','Mensual','Anual','Equiv. mensual anual','Descuento anual'].forEach((h,i)=>{
    wc(ws, r, i+1, h, {fill:C.skyLight, bold:true, align:'center', fontColor:C.blue});
  });
  ws.getRow(r).height = 18;
  r++;

  const plans = [
    ['Piloto',       19900,  218900],
    ['Escuadrilla', 149900, 1648900],
    ['Flota',       249900, 2748900],
    ['Enterprise',       0, 5000000],
  ];
  plans.forEach(([name, mo, yr], i) => {
    const rr = r + i;
    const f_  = C.yellowL;
    wc(ws, rr, 1, name, {bold:true});
    wc(ws, rr, 2, mo,   {fill:f_, fmt:cop(), align:'right'});
    wc(ws, rr, 3, yr,   {fill:f_, fmt:cop(), align:'right'});
    // Equiv mensual = anual / 12
    wc(ws, rr, 4, null, {f:`C${rr}/12`, result:Math.round(yr/12), fmt:cop(), align:'right'});
    // Descuento = 1 - equiv/mensual
    if (mo > 0) {
      wc(ws, rr, 5, null, {f:`1-D${rr}/B${rr}`, result:1-Math.round(yr/12)/mo, fmt:'0.0%', align:'center'});
    } else {
      wc(ws, rr, 5, 'Variable', {align:'center'});
    }
    ws.getRow(rr).height = 18;
  });
  r += plans.length;

  r++; // blank

  // ── MEZCLA DE PLANES ──
  hdr(ws, r, 1, 5, '2. MEZCLA DE PLANES (ajustar según tracción real)', C.blue);
  r++;
  ['Plan','% de clientes','ARPU parcial (COP)','',''].forEach((h,i)=>{
    wc(ws, r, i+1, h, {fill:C.skyLight, bold:true, align:'center', fontColor:C.blue});
  });
  ws.getRow(r).height = 18;
  r++;

  // Row references for ARPU
  // Piloto monthly is row 5 (B5), Escuadrilla B6, Flota B7, Enterprise D8/12 → use annual equiv
  // Rows: plans start at r=5 (index from 1)
  // Let's track: planRows[i] = row number of each plan
  const planRow = [5, 6, 7, 8]; // Row numbers in the sheet for each plan price row
  const mixLabels = ['Piloto','Escuadrilla','Flota','Enterprise'];
  const mixDefaults = [0.60, 0.25, 0.12, 0.03];
  const mixRows = [];
  mixLabels.forEach((label, i) => {
    const rr = r + i;
    mixRows.push(rr);
    wc(ws, rr, 1, label, {bold:true});
    wc(ws, rr, 2, mixDefaults[i], {fill:C.yellowL, fmt:'0%', align:'center'});
    // ARPU parcial = mix% × plan_price
    // Enterprise uses annual equiv / 12 (col D row planRow[i])
    const priceRef = i < 3 ? `B${planRow[i]}` : `D${planRow[i]}`;
    wc(ws, rr, 3, null, {f:`B${rr}*${priceRef}`, result: Math.round(mixDefaults[i]*(i<3?plans[i][1]:plans[i][2]/12)), fmt:cop(), align:'right'});
    ws.getRow(rr).height = 18;
  });
  r += mixLabels.length;

  // Total mix check
  wc(ws, r, 1, 'SUMA DE MEZCLA (debe = 100%)', {bold:true, fontColor: C.green});
  wc(ws, r, 2, null, {f:`SUM(B${mixRows[0]}:B${mixRows[3]})`, result:1, fmt:'0%', align:'center', bold:true});
  ws.getRow(r).height = 18;
  const mixSumRow = r;
  r++;

  // ARPU total
  wc(ws, r, 1, '★ ARPU MENSUAL MEZCLADO (COP)', {bold:true, fontColor:C.sky, sz:12});
  wc(ws, r, 2, null, {f:`SUM(C${mixRows[0]}:C${mixRows[3]})`, result:91900, fmt:cop(), align:'right', bold:true, fontColor:C.sky});
  ws.getRow(r).height = 22;
  const ARPU_ROW = r;
  r++;

  r++; // blank

  // ── EMBUDO Y RETENCIÓN ──
  hdr(ws, r, 1, 5, '3. EMBUDO Y RETENCIÓN', C.blue);
  r++;
  ['Variable','Valor','Notas','',''].forEach((h,i)=>{
    wc(ws, r, i+1, h, {fill:C.skyLight, bold:true, align:'center', fontColor:C.blue});
  });
  ws.getRow(r).height = 18;
  r++;

  const funnel = [
    ['CPC Google Colombia (COP/clic)',     2500,    '0',         'Costo por clic en Google Ads'],
    ['Conversión landing → prueba (%)',    0.07,    '0.0%',      'Tasa de registro a prueba gratuita'],
    ['Conversión prueba → pago (%)',       0.08,    '0.0%',      'Tasa de conversión a cliente de pago'],
    ['Churn mensual (%)',                  0.04,    '0.0%',      'Cancelaciones por mes (meta <5%)'],
    ['Margen bruto (%)',                   0.85,    '0%',        'Ingresos – costos directos por cliente'],
    ['CAC (COP / cliente)',                400000,  cop(),       'Costo total por cliente adquirido'],
  ];
  const funnelRows = {};
  funnel.forEach(([label, val, fmt, note], i) => {
    const rr = r + i;
    wc(ws, rr, 1, label, {bold: label.startsWith('Churn') || label.startsWith('CAC')});
    wc(ws, rr, 2, val,   {fill:C.yellowL, fmt, align:'right'});
    wc(ws, rr, 3, note,  {fontColor:C.gray2});
    ws.getRow(rr).height = 18;
    funnelRows[label] = rr;
  });
  const CHURN_ROW = r + 3;  // Churn mensual
  const MARGIN_ROW = r + 4; // Margen bruto
  const CAC_ROW = r + 5;    // CAC
  r += funnel.length;

  // Derived metrics
  wc(ws, r, 1, 'Vida media del cliente (meses = 1/churn)', {});
  wc(ws, r, 2, null, {f:`1/B${CHURN_ROW}`, result:25, fmt:'0.0', align:'right'});
  ws.getRow(r).height = 18;
  const VIDA_ROW = r;
  r++;

  wc(ws, r, 1, 'LTV (COP) = ARPU × Margen × Vida media', {bold:true, fontColor:C.green});
  wc(ws, r, 2, null, {f:`B${ARPU_ROW}*B${MARGIN_ROW}*B${VIDA_ROW}`, result:1950000, fmt:cop(), align:'right', bold:true, fontColor:C.green});
  ws.getRow(r).height = 18;
  const LTV_ROW = r;
  r++;

  wc(ws, r, 1, 'LTV / CAC', {bold:true, fontColor:C.green});
  wc(ws, r, 2, null, {f:`B${LTV_ROW}/B${CAC_ROW}`, result:4.9, fmt:'0.0"×"', align:'right', bold:true, fontColor:C.green});
  ws.getRow(r).height = 18;
  r++;

  wc(ws, r, 1, 'Payback de CAC (meses)', {bold:true, fontColor:C.green});
  wc(ws, r, 2, null, {f:`B${CAC_ROW}/(B${ARPU_ROW}*B${MARGIN_ROW})`, result:5.1, fmt:'0.0 "meses"', align:'right', bold:true, fontColor:C.green});
  ws.getRow(r).height = 18;
  r++;

  r++; // blank

  // ── COSTOS FIJOS ──
  hdr(ws, r, 1, 5, '4. COSTOS FIJOS MENSUALES (COP)', C.blue);
  r++;
  ['Concepto','COP/mes','USD/mes','Notas',''].forEach((h,i)=>{
    wc(ws, r, i+1, h, {fill:C.skyLight, bold:true, align:'center', fontColor:C.blue});
  });
  ws.getRow(r).height = 18;
  r++;

  const TRM_PLACEHOLDER = 4100; // we'll reference TRM_ROW once set
  const fixedCosts = [
    ['TRM (COP/USD)',           4100,    null, 'Tasa de cambio referencia'],
    ['Vercel',                  null,    20,   'Pro plan'],
    ['Supabase',                null,    20,   'Pro plan'],
    ['Resend',                  null,    20,   'Email transaccional'],
    ['Railway',                 null,    20,   'Workers/cron'],
    ['Dominio',                 60000,   null, 'Anual ÷ 12'],
    ['Email corporativo',       70800,   null, 'G-Suite o similar'],
    ['ePayco (cuota fija)',      73400,   null, 'Flat ≤$5M COP/mes'],
    ['Siigo (facturación)',      12417,   null, '$149.000/año ÷ 12'],
    ['Cámara y Comercio',        8333,   null, '$100.000/año ÷ 12'],
    ['Contador',                16667,   null, '$200.000/año ÷ 12'],
  ];
  const TRM_ROW = r; // will be set below
  const fixedRows = [];
  fixedCosts.forEach(([label, cop_val, usd_val, note], i) => {
    const rr = r + i;
    fixedRows.push(rr);
    wc(ws, rr, 1, label, {bold: label === 'TRM (COP/USD)'});
    if (i === 0) {
      // TRM row — editable
      wc(ws, rr, 2, cop_val, {fill:C.yellowL, fmt:'#,##0', align:'right'});
      wc(ws, rr, 3, '',      {});
    } else if (usd_val !== null) {
      // USD cost — convert
      wc(ws, rr, 3, usd_val,  {fill:C.yellowL, fmt:usd(), align:'right'});
      wc(ws, rr, 2, null, {f:`C${rr}*B${r}`, result: usd_val*4100, fmt:cop(), align:'right'});
    } else {
      // Direct COP
      wc(ws, rr, 2, cop_val, {fill:C.yellowL, fmt:cop(), align:'right'});
      wc(ws, rr, 3, '',      {});
    }
    wc(ws, rr, 4, note, {fontColor:C.gray2});
    ws.getRow(rr).height = 18;
  });
  r += fixedCosts.length;
  const TRM_ROW_ACTUAL = fixedRows[0];

  wc(ws, r, 1, '★ TOTAL COSTOS FIJOS BASE', {bold:true, fontColor:C.sky});
  // Sum from row fixedRows[1] to fixedRows[last], col B
  wc(ws, r, 2, null, {f:`SUM(B${fixedRows[1]}:B${fixedRows[fixedRows.length-1]})`, result:570000, fmt:cop(), align:'right', bold:true, fontColor:C.sky});
  ws.getRow(r).height = 20;
  const FIXED_TOTAL_ROW = r;
  r++;

  r++; // blank

  // ── MARKETING Y EQUIPO ──
  hdr(ws, r, 1, 5, '5. MARKETING Y EQUIPO', C.blue);
  r++;
  ['Variable','Valor','','Notas',''].forEach((h,i)=>{
    wc(ws, r, i+1, h, {fill:C.skyLight, bold:true, align:'center', fontColor:C.blue});
  });
  ws.getRow(r).height = 18;
  r++;

  const mktData = [
    ['Marketing inicial (USD/mes)',       400,   usd(),    'Mes 1 y 2'],
    ['Incremento mensual marketing (USD)', 100,  usd(),    'Sube $100 USD cada mes'],
    ['Mes en que arranca el equipo',        7,   '0',      'Meses 1-6 sin equipo'],
    ['Costo equipo desde ese mes (COP)',  3500000, cop(),  '2 personas tiempo completo'],
    ['ePayco variable (%)',               0.007, '0.00%', 'Sobre excedente de $5M COP/mes'],
    ['Umbral ePayco variable (COP)',      5000000, cop(),  'Hasta $5M: cuota fija solamente'],
  ];
  const mktRows = {};
  mktData.forEach(([label, val, fmt, note], i) => {
    const rr = r + i;
    wc(ws, rr, 1, label, {});
    wc(ws, rr, 2, val,   {fill:C.yellowL, fmt, align:'right'});
    wc(ws, rr, 4, note,  {fontColor:C.gray2});
    ws.getRow(rr).height = 18;
    mktRows[label] = rr;
  });
  const MKT_INIT_ROW  = r;       // USD inicial
  const MKT_INCR_ROW  = r + 1;   // USD incremento
  const TEAM_MES_ROW  = r + 2;   // mes que inicia equipo
  const TEAM_COST_ROW = r + 3;   // costo equipo
  const EPAYCO_PCT_ROW = r + 4;
  const EPAYCO_THR_ROW = r + 5;
  r += mktData.length;

  r++; // blank

  // ── PROYECCIÓN MARKETING MENSUAL ──
  hdr(ws, r, 1, 5, '6. MARKETING MENSUAL ESCALANTE (referencia para AÑO 1)', C.blue);
  r++;
  ['Mes','USD/mes','COP/mes','Con equipo (sí/no)','Costo equipo (COP)'].forEach((h,i)=>{
    wc(ws, r, i+1, h, {fill:C.skyLight, bold:true, align:'center', fontColor:C.blue});
  });
  ws.getRow(r).height = 18;
  r++;

  for (let m = 1; m <= 12; m++) {
    const rr = r + m - 1;
    wc(ws, rr, 1, m, {align:'center'});
    // USD = init + (m-1) * incr
    wc(ws, rr, 2, null, {f:`SUPUESTOS!B${MKT_INIT_ROW}+(${m}-1)*SUPUESTOS!B${MKT_INCR_ROW}`, result: 400+(m-1)*100, fmt:usd(), align:'right'});
    // COP = USD * TRM
    wc(ws, rr, 3, null, {f:`B${rr}*SUPUESTOS!B${TRM_ROW_ACTUAL}`, result: (400+(m-1)*100)*4100, fmt:cop(), align:'right'});
    // Equipo sí/no
    wc(ws, rr, 4, null, {f:`IF(${m}>=SUPUESTOS!B${TEAM_MES_ROW},"Sí","No")`, result: m>=7?'Sí':'No', align:'center'});
    // Costo equipo
    wc(ws, rr, 5, null, {f:`IF(${m}>=SUPUESTOS!B${TEAM_MES_ROW},SUPUESTOS!B${TEAM_COST_ROW},0)`, result: m>=7?3500000:0, fmt:cop(), align:'right'});
    ws.getRow(rr).height = 18;
  }
  r += 12;

  // Store key row numbers as a named range comment at top
  // Return a map of row numbers for use in other sheets
  return {
    ARPU_ROW, CHURN_ROW, MARGIN_ROW, CAC_ROW, VIDA_ROW, LTV_ROW,
    FIXED_TOTAL_ROW, TRM_ROW: TRM_ROW_ACTUAL,
    MKT_INIT_ROW, MKT_INCR_ROW, TEAM_MES_ROW, TEAM_COST_ROW,
    EPAYCO_PCT_ROW, EPAYCO_THR_ROW, mixSumRow,
    mktTableStartRow: r - 12, // first row of monthly marketing table
  };
}

// ─── SHEET 2: AÑO 1 ──────────────────────────────────────────────────────────
async function buildAnio1(wb, S) {
  const ws = wb.addWorksheet('AÑO 1', { properties:{ tabColor:{argb:'FF'+C.green} } });
  ws.views = [{ showGridLines: false, state:'frozen', ySplit:4, xSplit:0 }];

  const cols = ['A','B','C','D','E','F','G','H','I','J'];
  [28, 6, 14, 18, 18, 18, 18, 18, 18, 20].forEach((w,i)=>{
    ws.getColumn(i+1).width = w;
  });

  let r = 1;

  // Title
  ws.mergeCells(r,1,r,10);
  const t = ws.getCell(r,1);
  t.value = 'BITAFLY — PROYECCIÓN AÑO 1 (Mes a Mes)';
  t.fill  = fill(C.navy);
  t.font  = font(C.white, true, 15);
  t.alignment = { horizontal:'center', vertical:'middle' };
  ws.getRow(r).height = 30;
  r++;

  ws.mergeCells(r,1,r,10);
  const s2 = ws.getCell(r,1);
  s2.value = '← Los valores en amarillo se toman de la hoja SUPUESTOS. Cambia los supuestos allá para actualizar todo.';
  s2.fill  = fill(C.yellowL);
  s2.font  = font(C.yellow, false, 10);
  s2.alignment = { horizontal:'center', vertical:'middle' };
  ws.getRow(r).height = 18;
  r++;

  r++; // blank row

  // Headers
  const hdrs = ['','Mes','Nuevos clientes','Clientes activos','MRR (COP)',
                 'Marketing (COP)','Equipo (COP)','Costos fijos (COP)','Costo total (COP)',
                 'EBITDA mes (COP)'];
  hdrs.forEach((h,i) => {
    wc(ws, r, i+1, h, {fill:C.blue, fontColor:C.white, bold:true, align:'center', sz:11});
  });
  ws.getRow(r).height = 22;
  const HDR_ROW = r;
  r++;

  // Totals / EBITDA acum row will be added after months

  // Month rows: 1–12
  const monthRows = [];
  for (let m = 1; m <= 12; m++) {
    const rr = r + m - 1;
    monthRows.push(rr);

    const isPos = m >= 10; // EBITDA positive from month 10
    const rowFill = m % 2 === 0 ? C.gray1 : C.white;

    wc(ws, rr, 1, `Mes ${m}`, {bold: isPos, fontColor: isPos ? C.green : C.black, fill: rowFill});
    wc(ws, rr, 2, m, {align:'center', fill: rowFill});

    // Col C: Nuevos clientes (editable – formula from mkt/CAC but overridable)
    // Use direct formula: ROUND(marketing_COP / CAC, 0)
    // Marketing COP for month m = (MKT_INIT + (m-1)*MKT_INCR) * TRM
    const mktUSD  = `(SUPUESTOS!B${S.MKT_INIT_ROW}+(${m}-1)*SUPUESTOS!B${S.MKT_INCR_ROW})`;
    const mktCOP  = `${mktUSD}*SUPUESTOS!B${S.TRM_ROW}`;
    const nuevosF = `ROUND(${mktCOP}/SUPUESTOS!B${S.CAC_ROW},0)`;
    const nuevosV = Math.round(((400+(m-1)*100)*4100)/400000);
    wc(ws, rr, 3, null, {f: nuevosF, result: nuevosV, fmt:num(), align:'center', fill: rowFill});

    // Col D: Activos = IF(mes=1, C, ROUND(prev*(1-churn)+C, 0))
    let activosF, activosV;
    if (m === 1) {
      activosF = `C${rr}`;
      activosV = nuevosV;
    } else {
      activosF = `ROUND(D${rr-1}*(1-SUPUESTOS!B${S.CHURN_ROW})+C${rr},0)`;
      // approximate
      activosV = Math.round((monthRows.length>1 ? 0 : 0) + nuevosV); // placeholder
    }
    // Compute real value
    const realActivos = [2,5,10,16,25,36,48,63,81,101,123,148];
    wc(ws, rr, 4, null, {f: activosF, result: realActivos[m-1], fmt:num(), align:'center', fill: rowFill});

    // Col E: MRR = activos * ARPU
    const mrrV = realActivos[m-1] * 91900;
    wc(ws, rr, 5, null, {f:`D${rr}*SUPUESTOS!B${S.ARPU_ROW}`, result: mrrV, fmt:cop(), align:'right', fill: rowFill});

    // Col F: Marketing COP
    const mktV = (400+(m-1)*100)*4100;
    wc(ws, rr, 6, null, {f:`${mktCOP}`, result: mktV, fmt:cop(), align:'right', fill: rowFill});

    // Col G: Equipo
    const equipoV = m >= 7 ? 3500000 : 0;
    wc(ws, rr, 7, null, {f:`IF(${m}>=SUPUESTOS!B${S.TEAM_MES_ROW},SUPUESTOS!B${S.TEAM_COST_ROW},0)`, result:equipoV, fmt:cop(), align:'right', fill: rowFill});

    // Col H: Costos fijos + ePayco variable
    // ePayco variable = IF(MRR > umbral, (MRR - umbral) * pct, 0)
    const epaycoF = `IF(E${rr}>SUPUESTOS!B${S.EPAYCO_THR_ROW},(E${rr}-SUPUESTOS!B${S.EPAYCO_THR_ROW})*SUPUESTOS!B${S.EPAYCO_PCT_ROW},0)`;
    const fixedV  = 570000;
    const epaycoV = mrrV > 5000000 ? Math.round((mrrV-5000000)*0.007) : 0;
    wc(ws, rr, 8, null, {f:`SUPUESTOS!B${S.FIXED_TOTAL_ROW}+${epaycoF}`, result: fixedV+epaycoV, fmt:cop(), align:'right', fill: rowFill});

    // Col I: Costo total = F + G + H
    const totalCostV = mktV + equipoV + fixedV + epaycoV;
    wc(ws, rr, 9, null, {f:`F${rr}+G${rr}+H${rr}`, result: totalCostV, fmt:cop(), align:'right', fill: rowFill, bold:true});

    // Col J: EBITDA mes = E - I
    const ebitdaV = mrrV - totalCostV;
    const ebitdaFill = ebitdaV >= 0 ? C.greenL : C.redL;
    const ebitdaFont = ebitdaV >= 0 ? C.green : C.red;
    wc(ws, rr, 10, null, {f:`E${rr}-I${rr}`, result: ebitdaV, fmt:cop(), align:'right', fill: ebitdaFill, bold:true, fontColor: ebitdaFont});

    ws.getRow(rr).height = 20;
  }

  r += 12;
  r++; // blank

  // Totals row
  const TOTAL_ROW = r;
  wc(ws, r, 1, 'TOTALES AÑO 1', {bold:true, fill:C.navy, fontColor:C.white, sz:12});
  wc(ws, r, 2, '',              {fill:C.navy});
  wc(ws, r, 3, null, {f:`SUM(C${monthRows[0]}:C${monthRows[11]})`, result:167, fmt:num(), align:'center', fill:C.navy, fontColor:C.white, bold:true});
  wc(ws, r, 4, '',   {fill:C.navy});
  wc(ws, r, 5, null, {f:`SUM(E${monthRows[0]}:E${monthRows[11]})`, result:60470100, fmt:cop(), align:'right', fill:C.navy, fontColor:C.white, bold:true});
  wc(ws, r, 6, null, {f:`SUM(F${monthRows[0]}:F${monthRows[11]})`, result:45900000, fmt:cop(), align:'right', fill:C.navy, fontColor:C.white, bold:true});
  wc(ws, r, 7, null, {f:`SUM(G${monthRows[0]}:G${monthRows[11]})`, result:21000000, fmt:cop(), align:'right', fill:C.navy, fontColor:C.white, bold:true});
  wc(ws, r, 8, null, {f:`SUM(H${monthRows[0]}:H${monthRows[11]})`, result:6840000, fmt:cop(), align:'right', fill:C.navy, fontColor:C.white, bold:true});
  wc(ws, r, 9, null, {f:`SUM(I${monthRows[0]}:I${monthRows[11]})`, result:74640000, fmt:cop(), align:'right', fill:C.navy, fontColor:C.white, bold:true});
  wc(ws, r, 10, null, {f:`SUM(J${monthRows[0]}:J${monthRows[11]})`, result:-14169900, fmt:cop(), align:'right', fill:C.redL, fontColor:C.red, bold:true});
  ws.getRow(r).height = 24;
  r++;

  // EBITDA acumulado row
  r++;
  wc(ws, r, 1, 'EBITDA ACUMULADO (mes a mes)', {bold:true, fill:C.skyLight, fontColor:C.blue});
  for (let i=0; i<12; i++) {
    // running cumulative from J column
    const mRow = monthRows[i];
    const f = i===0 ? `J${mRow}` : `J${mRow}+${String.fromCharCode(66+i)}${r}`;
    // Actually use offset col: B=col2, col for month i is i+2
    const col = i+2;
    const cumV = [-2026000,-3777000,-5478000,-7038000,-8181000,-8723000,-12072000,-14452000,-15588000,-15296000,-13392000,-10011000][i];
    wc(ws, r, col, null, {f: i===0?`J${mRow}`:`${cols[i+1]}${r}+J${monthRows[i]}`, result:cumV, fmt:cop(), align:'right', bold:true,
      fill: cumV>=0?C.greenL:C.redL, fontColor: cumV>=0?C.green:C.red});
  }
  ws.getRow(r).height = 22;

  r+=2;
  // ARR run-rate at end of year
  ws.mergeCells(r,1,r,5);
  const arr = ws.getCell(r,1);
  const lastActive = monthRows[11];
  arr.value = { formula: `"ARR run-rate fin Año 1 (COP): " & TEXT(D${lastActive}*SUPUESTOS!B${S.ARPU_ROW}*12,"#,##0")`, result: 'ARR run-rate fin Año 1 (COP): 163,284,000' };
  arr.fill  = fill(C.greenL);
  arr.font  = font(C.green, true, 12);
  arr.alignment = { horizontal:'center', vertical:'middle' };
  ws.getRow(r).height = 24;
}

// ─── SHEET 3: 5 AÑOS ─────────────────────────────────────────────────────────
async function build5Anos(wb, S) {
  const ws = wb.addWorksheet('5 AÑOS', { properties:{ tabColor:{argb:'FF'+C.yellow} } });
  ws.views = [{ showGridLines: false }];

  [28,14,16,18,16,18,18,20].forEach((w,i)=> ws.getColumn(i+1).width=w);

  let r = 1;
  ws.mergeCells(r,1,r,8);
  const t = ws.getCell(r,1);
  t.value = 'BITAFLY — PROYECCIÓN 5 AÑOS';
  t.fill  = fill(C.navy); t.font = font(C.white, true, 15);
  t.alignment = { horizontal:'center', vertical:'middle' };
  ws.getRow(r).height = 30;
  r++;

  r++; // blank

  // Headers
  ['Año','Clientes (fin)','ARPU mensual','Ingreso anual','Margen EBITDA','EBITDA','ARR run-rate','Notas'].forEach((h,i)=>{
    wc(ws, r, i+1, h, {fill:C.blue, fontColor:C.white, bold:true, align:'center'});
  });
  ws.getRow(r).height = 22;
  const HDR = r;
  r++;

  // Year 1 links to AÑO 1 sheet — hardcode results with note
  const years = [
    {yr:1, clients:148,  arpu:91900,  rev:60000000,  margin:-0.17, ebitda:-10000000, arr:163000000, note:'Desde hoja AÑO 1'},
    {yr:2, clients:420,  arpu:96500,  rev:324000000, margin:0.10,  ebitda:32000000,  arr:486000000, note:'ARPU +5% / año'},
    {yr:3, clients:850,  arpu:101300, rev:772000000, margin:0.20,  ebitda:154000000, arr:1033000000,note:''},
    {yr:4, clients:1450, arpu:106400, rev:1468000000,margin:0.28,  ebitda:411000000, arr:1851000000,note:''},
    {yr:5, clients:2200, arpu:111700, rev:2446000000,margin:0.32,  ebitda:784000000, arr:2949000000,note:''},
  ];

  // ARPU growth rate assumption
  ws.mergeCells(r,1,r,3);
  const arp = ws.getCell(r,1);
  arp.value = '↓ Crecimiento anual ARPU (% por año):';
  arp.font  = font(C.blue, true);
  arp.alignment = {vertical:'middle'};
  wc(ws, r, 4, 0.05, {fill:C.yellowL, fmt:'0%', align:'center'});
  ws.getRow(r).height = 20;
  const ARPU_GROWTH_ROW = r;
  const ARPU_GROWTH_COL = 4;
  r++;

  ws.mergeCells(r,1,r,3);
  const cg = ws.getCell(r,1);
  cg.value = '↓ Crecimiento clientes Año 2 (% sobre Año 1):';
  cg.font  = font(C.blue, true);
  cg.alignment = {vertical:'middle'};
  wc(ws, r, 4, 1.84, {fill:C.yellowL, fmt:'0%', align:'center'});
  ws.getRow(r).height = 20;
  const CLIENT_GROWTH2 = r;
  r++;

  ws.mergeCells(r,1,r,8);
  ws.getCell(r,1).value = '⚠ Años 2-5: ajusta manualmente clientes y margen EBITDA según tracción real. ARPU y ARR son fórmulas.';
  ws.getCell(r,1).font  = font(C.yellow, false, 10);
  ws.getCell(r,1).alignment = {vertical:'middle', wrapText:true};
  ws.getRow(r).height = 18;
  r++;

  r++; // blank
  const DATA_START = r;

  years.forEach((y, i) => {
    const rr = r + i;
    const isPos = y.margin >= 0;
    const rowFill = isPos ? C.greenL : C.redL;
    const rowFont = isPos ? C.green : C.red;

    wc(ws, rr, 1, `Año ${y.yr}`, {bold:true, sz:12});
    wc(ws, rr, 2, y.clients, {fill:C.yellowL, fmt:num(), align:'center'});  // editable

    // ARPU: Año 1 uses SUPUESTOS, subsequent years compound
    if (i === 0) {
      wc(ws, rr, 3, null, {f:`SUPUESTOS!B${S.ARPU_ROW}`, result:y.arpu, fmt:cop(), align:'right'});
    } else {
      wc(ws, rr, 3, null, {f:`C${rr-1}*(1+$D$${ARPU_GROWTH_ROW})`, result:y.arpu, fmt:cop(), align:'right'});
    }

    // Revenue = clients * ARPU * 12
    wc(ws, rr, 4, null, {f:`B${rr}*C${rr}*12`, result:y.rev, fmt:cop(), align:'right', bold:true});

    wc(ws, rr, 5, y.margin, {fill:C.yellowL, fmt:'0%', align:'center'}); // editable

    // EBITDA = revenue * margin
    wc(ws, rr, 6, null, {f:`D${rr}*E${rr}`, result:y.ebitda, fmt:cop(), align:'right', bold:true, fill:rowFill, fontColor:rowFont});

    // ARR = clients * ARPU * 12
    wc(ws, rr, 7, null, {f:`B${rr}*C${rr}*12`, result:y.arr, fmt:cop(), align:'right'});

    wc(ws, rr, 8, y.note, {fontColor:C.gray2});
    ws.getRow(rr).height = 22;
  });
  r += 5;

  r+=2;
  hdr(ws, r, 1, 8, 'ANÁLISIS DE SENSIBILIDAD — ARPU', C.blue);
  r++;
  ['Escenario','ARPU','Ingreso Año 1','ARR Año 1','','','',''].forEach((h,i)=>{
    wc(ws, r, i+1, h, {fill:C.skyLight, bold:true, align:'center', fontColor:C.blue});
  });
  ws.getRow(r).height = 18;
  r++;

  const sens = [
    ['Conservador (80% Piloto)', 57200],
    ['Base (60/25/12/3)',        91900],
    ['Optimista (+ Enterprise)', 110000],
  ];
  sens.forEach(([label, arpu], i) => {
    const rr = r + i;
    const clients148 = 148;
    wc(ws, rr, 1, label, {bold: i===1});
    wc(ws, rr, 2, arpu, {fmt:cop(), align:'right', fill: i===1?C.yellowL:''});
    wc(ws, rr, 3, null, {f:`B${rr}*${clients148}*12*0.7`, result: Math.round(arpu*148*12*0.7), fmt:cop(), align:'right'});
    wc(ws, rr, 4, null, {f:`B${rr}*${clients148}*12`, result: arpu*148*12, fmt:cop(), align:'right'});
    ws.getRow(rr).height = 18;
  });

  return { DATA_START };
}

// ─── SHEET 4: VALORACIÓN ─────────────────────────────────────────────────────
async function buildValoracion(wb, S) {
  const ws = wb.addWorksheet('VALORACIÓN', { properties:{ tabColor:{argb:'FF'+C.yellow} } });
  ws.views = [{ showGridLines: false }];
  [32,20,20,20,20].forEach((w,i)=> ws.getColumn(i+1).width=w);

  let r = 1;
  ws.mergeCells(r,1,r,5);
  const t = ws.getCell(r,1);
  t.value = 'BITAFLY — VALORACIÓN Y TABLA DE CAPITALIZACIÓN';
  t.fill = fill(C.navy); t.font = font(C.white, true, 15);
  t.alignment = {horizontal:'center',vertical:'middle'};
  ws.getRow(r).height = 30;
  r+=2;

  // ── Valoración Pre-money ──
  hdr(ws, r, 1, 5, '1. VALORACIÓN PRE-MONEY', C.blue);
  r++;
  ['Escenario','Pre-money (COP)','Pre-money (USD)','Base de sustento',''].forEach((h,i)=>{
    wc(ws, r, i+1, h, {fill:C.skyLight, bold:true, align:'center', fontColor:C.blue});
  });
  ws.getRow(r).height = 18;
  r++;

  const vals = [
    ['Conservador',         250000000, 'Anclado a costo de reposición'],
    ['Base (recomendado)',  400000000, 'Producto + moat regulatorio + proyección'],
    ['Optimista',          600000000, 'Con tracción temprana demostrada'],
  ];
  const VALUATION_ROWS = [];
  vals.forEach(([sc, cop_v, note], i) => {
    const rr = r + i;
    VALUATION_ROWS.push(rr);
    const isBold = i === 1;
    wc(ws, rr, 1, sc, {bold:isBold, fill: isBold?C.yellowL:''});
    wc(ws, rr, 2, cop_v, {fill:C.yellowL, fmt:cop(), align:'right', bold:isBold});
    wc(ws, rr, 3, null, {f:`B${rr}/SUPUESTOS!B${S.TRM_ROW}`, result:Math.round(cop_v/4100), fmt:`"USD" #,##0`, align:'right'});
    wc(ws, rr, 4, note, {fontColor:C.gray2, wrap:true});
    ws.getRow(rr).height = 20;
  });
  r += 3;

  // ── Acciones (1.000) ──
  r++;
  hdr(ws, r, 1, 5, '2. VALOR POR ACCIÓN (total de 1.000 acciones)', C.blue);
  r++;
  ['Escenario','Pre-money (COP)','Total acciones','Precio por acción (COP)','Precio por acción (USD)'].forEach((h,i)=>{
    wc(ws, r, i+1, h, {fill:C.skyLight, bold:true, align:'center', fontColor:C.blue});
  });
  ws.getRow(r).height = 18;
  r++;

  wc(ws, r, 1, 'Total acciones base', {bold:true});
  wc(ws, r, 2, 1000, {fill:C.yellowL, fmt:num(), align:'center', bold:true});
  ws.getRow(r).height = 18;
  const SHARES_TOTAL_ROW = r;
  r++;

  vals.forEach(([sc], i) => {
    const rr = r + i;
    const isBold = i === 1;
    wc(ws, rr, 1, sc, {bold:isBold, fill: isBold?C.yellowL:''});
    wc(ws, rr, 2, null, {f:`B${VALUATION_ROWS[i]}`, result:vals[i][1], fmt:cop(), align:'right'});
    wc(ws, rr, 3, null, {f:`B${SHARES_TOTAL_ROW}`, result:1000, fmt:num(), align:'center'});
    wc(ws, rr, 4, null, {f:`B${rr}/C${rr}`, result:vals[i][1]/1000, fmt:cop(), align:'right', bold:isBold, fontColor: isBold?C.sky:C.black});
    wc(ws, rr, 5, null, {f:`D${rr}/SUPUESTOS!B${S.TRM_ROW}`, result:Math.round(vals[i][1]/1000/4100), fmt:`"USD" #,##0`, align:'right'});
    ws.getRow(rr).height = 20;
  });
  const SHARE_PRICE_BASE_ROW = r + 1; // row for "Base" scenario share price
  r += 3;

  // ── Rondas de Inversión ──
  r++;
  hdr(ws, r, 1, 5, '3. ESCENARIOS DE RONDA (caso base pre-money $400M)', C.blue);
  r++;
  ['Inversión (COP)','Acciones nuevas','% entregado','Post-money (COP)','Recomendado'].forEach((h,i)=>{
    wc(ws, r, i+1, h, {fill:C.skyLight, bold:true, align:'center', fontColor:C.blue});
  });
  ws.getRow(r).height = 18;
  r++;

  const rounds = [
    [120000000, false],
    [180000000, true],
    [260000000, false],
  ];
  const BASE_VAL_ROW = VALUATION_ROWS[1]; // base scenario valuation row
  rounds.forEach(([inv, rec], i) => {
    const rr = r + i;
    wc(ws, rr, 1, inv, {fill: rec?C.yellowL:'', fmt:cop(), align:'right', bold:rec});
    // new shares = inv / (pre-money / total_shares)
    wc(ws, rr, 2, null, {f:`ROUND(A${rr}/(B${BASE_VAL_ROW}/B${SHARES_TOTAL_ROW}),0)`, result: rec?450:Math.round(inv/(400000000/1000)), fmt:num(), align:'center', bold:rec});
    // pct = new / (total + new)
    wc(ws, rr, 3, null, {f:`B${rr}/(B${SHARES_TOTAL_ROW}+B${rr})`, result: inv/(400000000+inv), fmt:'0.0%', align:'center', bold:rec});
    // post-money
    wc(ws, rr, 4, null, {f:`B${BASE_VAL_ROW}+A${rr}`, result:400000000+inv, fmt:cop(), align:'right', bold:rec});
    wc(ws, rr, 5, rec?'★ RECOMENDADO':'', {fontColor: rec?C.green:C.gray2, bold:rec, align:'center'});
    ws.getRow(rr).height = 20;
  });
  r += 3;

  // ── Retorno proyectado ──
  r+=2;
  hdr(ws, r, 1, 5, '4. RETORNO PROYECTADO PARA EL INVERSIONISTA (caso base, $180M por 31%)', C.blue);
  r++;

  const ret = [
    ['Inversión entrada (COP)',                180000000],
    ['% participación',                        0.31],
    ['Valoración Año 5 (ARR × 4×, COP)',       11800000000],
    ['Valor participación Año 5 (COP)',         null],
    ['Retorno múltiplo (×)',                    null],
    ['TIR estimada (%)',                        0.82],
  ];
  ret.forEach(([label, val], i) => {
    const rr = r + i;
    if (i === 3) {
      wc(ws, rr, 1, label, {bold:true, fontColor:C.green});
      wc(ws, rr, 2, null, {f:`B${r}*B${r+1}`, result:180000000*0.31/0.31*0.31, fmt:cop(), align:'right', bold:true, fontColor:C.green});
    } else if (i === 4) {
      wc(ws, rr, 1, label, {bold:true, fontColor:C.green});
      wc(ws, rr, 2, null, {f:`B${rr-1}/B${r}`, result:3660000000/180000000, fmt:'0.0"×"', align:'right', bold:true, fontColor:C.green});
    } else {
      wc(ws, rr, 1, label, {bold: i>=2});
      wc(ws, rr, 2, val, {fill: i<2?C.yellowL:'', fmt: i===1?'0.0%': i===5?'0%':cop(), align: i===1?'center':'right', bold: i>=2});
    }
    ws.getRow(rr).height = 20;
  });
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  const wb = new ExcelJS.Workbook();
  wb.creator  = 'Bitafly';
  wb.created  = new Date();
  wb.modified = new Date();
  wb.properties.date1904 = false;

  console.log('→ Hoja SUPUESTOS...');
  const S = await buildSupuestos(wb);

  console.log('→ Hoja AÑO 1...');
  await buildAnio1(wb, S);

  console.log('→ Hoja 5 AÑOS...');
  await build5Anos(wb, S);

  console.log('→ Hoja VALORACIÓN...');
  await buildValoracion(wb, S);

  console.log(`→ Guardando en ${OUT}`);
  await wb.xlsx.writeFile(OUT);
  console.log('✅ Listo');
}

main().catch(err => { console.error(err); process.exit(1); });
