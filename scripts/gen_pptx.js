// Genera: docs/Bitafly_Presentacion_Inversionistas.pptx
const PptxGenJS = require('pptxgenjs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'docs', 'Bitafly_Presentacion_Inversionistas.pptx');

const pres = new PptxGenJS();
pres.layout = 'LAYOUT_WIDE'; // 16:9

// ── Colores ──
const NAVY  = '1A2744';
const BLUE  = '1E3A5F';
const SKY   = '2D7DD2';
const GREEN = '1B7A4A';
const GREENL= 'D4EDDA';
const RED   = 'C0392B';
const GOLD  = 'F39C12';
const WHITE = 'FFFFFF';
const LGRAY = 'F2F4F7';
const GRAY  = 'D5D8DC';

// Cálculos
const PREMONEY   = 400_000_000;
const SHARES     = 1000;
const PRICE_SHR  = PREMONEY / SHARES;
const INV        = 5_000_000;
const NEW_SHR    = INV / PRICE_SHR;       // 12.5
const TOTAL_SHR  = SHARES + NEW_SHR;      // 1012.5
const PCT        = (NEW_SHR / TOTAL_SHR * 100).toFixed(2);  // 1.23%
const POSTMONEY  = PREMONEY + INV;
const ARR5       = 2_949_000_000;
const VAL5       = ARR5 * 4;
const STAKE5     = VAL5 * (NEW_SHR / TOTAL_SHR);
const ROI_X      = (STAKE5 / INV).toFixed(1);

function cop(n) { return '$' + Math.round(n).toLocaleString('es-CO') + ' COP'; }

// ── Master theme ──
pres.defineSlideMaster({
  title: 'MASTER',
  background: { color: WHITE },
  objects: [
    // Bottom bar
    { rect: { x: 0, y: '90%', w: '100%', h: '10%', fill: { color: NAVY } } },
    { text: { text: 'bitafly.com  ·  Confidencial', options: { x: 0.2, y: '92%', w: 5, h: 0.3, fontSize: 9, color: 'AAAAAA' } } },
  ],
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function addSlide(layout) {
  const s = layout ? pres.addSlide({ masterName: 'MASTER' }) : pres.addSlide({ masterName: 'MASTER' });
  return s;
}

function titleSlide(slide, title, subtitle, note) {
  slide.addShape(pres.ShapeType.rect, { x:0, y:0, w:'100%', h:'100%', fill:{ color: NAVY } });
  slide.addShape(pres.ShapeType.rect, { x:0, y:'65%', w:'100%', h:'35%', fill:{ color: SKY } });
  slide.addText(title, {
    x: 0.5, y: 1.2, w: 12, h: 1.5,
    fontSize: 44, bold: true, color: WHITE, align: 'center', fontFace: 'Calibri',
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.5, y: 2.8, w: 12, h: 0.7,
      fontSize: 22, color: 'CCDDEE', align: 'center', italic: true,
    });
  }
  if (note) {
    slide.addText(note, {
      x: 0.5, y: '68%', w: 12, h: 0.6,
      fontSize: 16, color: WHITE, align: 'center',
    });
  }
}

function sectionHeader(slide, text) {
  slide.addShape(pres.ShapeType.rect, { x:0, y:0, w:0.15, h:'100%', fill:{ color: SKY } });
  slide.addText(text, {
    x: 0.5, y: 0.15, w: 12, h: 0.55,
    fontSize: 22, bold: true, color: NAVY, fontFace: 'Calibri',
  });
  slide.addShape(pres.ShapeType.line, { x:0.5, y:0.72, w:12.2, h:0, line:{ color: SKY, width: 2 } });
}

function kpiBox(slide, x, y, w, h, title, value, sub, bgColor, fgColor) {
  slide.addShape(pres.ShapeType.rect, { x, y, w, h, fill:{ color: bgColor }, line:{ color: GRAY, width: 1 } });
  slide.addText(title, { x, y:y+0.05, w, h:0.3, fontSize:11, color:fgColor||NAVY, align:'center', bold:false });
  slide.addText(value, { x, y:y+0.3, w, h:0.55, fontSize:22, bold:true, color:fgColor||NAVY, align:'center' });
  if (sub) slide.addText(sub, { x, y:y+0.85, w, h:0.25, fontSize:10, color:'888888', align:'center', italic:true });
}

function tableSlide(slide, headers, rows, tx, ty, tw, th) {
  const hRow = headers.map(h => ({
    text: h,
    options: { bold: true, color: WHITE, fill: NAVY, fontSize: 12, align: 'center', valign: 'middle' }
  }));
  const dRows = rows.map(row => row.map((cell, ci) => ({
    text: cell,
    options: { fontSize: 11, color: NAVY, fill: ci === 0 ? LGRAY : WHITE, valign: 'middle', align: ci===0 ? 'left':'center' }
  })));
  slide.addTable([hRow, ...dRows], {
    x: tx, y: ty, w: tw, h: th,
    border: { type:'solid', color: GRAY, pt: 0.5 },
    colW: new Array(headers.length).fill(tw / headers.length),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 1: PORTADA
// ═══════════════════════════════════════════════════════════════════════════════
const s1 = addSlide();
titleSlide(s1,
  'BITAFLY',
  'Oportunidad de Inversión — Junio 2026',
  'Plataforma SaaS para gestión de drones en Colombia · RAC 100 · AeroCivil'
);

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 2: EL PROBLEMA
// ═══════════════════════════════════════════════════════════════════════════════
const s2 = addSlide();
sectionHeader(s2, '01  El Problema');

s2.addText('6.000+ operadores de drones en Colombia\ncon una obligación legal que nadie resuelve bien', {
  x:0.5, y:0.85, w:12.2, h:1, fontSize:20, bold:true, color:NAVY, align:'center',
});

const probs = [
  { icon:'📋', title:'Cumplimiento RAC 100 obligatorio', body:'Bitácoras, planes, mantenimiento, SMS y autorizaciones — todo exigido por la UAEAC' },
  { icon:'📊', title:'Hoy lo hacen en Excel y papel', body:'Alto riesgo de multas, errores, accidentes sin respaldo y pérdida de licencia' },
  { icon:'🌍', title:'Las herramientas existentes son extranjeras', body:'Airdata (EE.UU.), DroneDeploy (UK) — sin RAC 100, sin COP, sin soporte en español' },
];
probs.forEach((p, i) => {
  const x = 0.4 + i * 4.15;
  s2.addShape(pres.ShapeType.rect, { x, y:2.0, w:3.9, h:2.8, fill:{ color: LGRAY }, line:{ color: GRAY, width:1 } });
  s2.addText(p.icon, { x, y:2.1, w:3.9, h:0.5, fontSize:28, align:'center' });
  s2.addText(p.title, { x, y:2.65, w:3.9, h:0.5, fontSize:13, bold:true, color:NAVY, align:'center' });
  s2.addText(p.body,  { x, y:3.15, w:3.9, h:1.5, fontSize:11, color:'444444', align:'center', wrap:true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 3: LA SOLUCIÓN
// ═══════════════════════════════════════════════════════════════════════════════
const s3 = addSlide();
sectionHeader(s3, '02  La Solución');

s3.addText('Bitafly: la primera plataforma SaaS colombiana\n100% alineada con el RAC 100', {
  x:0.5, y:0.85, w:12.2, h:0.9, fontSize:19, bold:true, color:NAVY, align:'center',
});

const mods = [
  ['📒','Bitácora digital','Sync automática DJI'],
  ['✈️','Planes de vuelo','KMZ/PDF para AeroCivil'],
  ['🔧','Mantenimiento','Alertas preventivas'],
  ['🛡️','SMS aeronáutico','Gestión de seguridad'],
  ['📡','SORA','Espacio aéreo controlado'],
  ['📊','Reportes','Auditoría y cumplimiento'],
];
mods.forEach((m, i) => {
  const col = i % 3, row = Math.floor(i / 3);
  const x = 0.5 + col * 4.2;
  const y = 1.9 + row * 1.65;
  s3.addShape(pres.ShapeType.rect, { x, y, w:3.9, h:1.4, fill:{ color: i%2===0?LGRAY:WHITE }, line:{ color:SKY, width:1 } });
  s3.addText(m[0]+' '+m[1], { x, y:y+0.1, w:3.9, h:0.4, fontSize:13, bold:true, color:NAVY, align:'center' });
  s3.addText(m[2],           { x, y:y+0.55, w:3.9, h:0.55, fontSize:12, color:'555555', align:'center' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 4: MERCADO
// ═══════════════════════════════════════════════════════════════════════════════
const s4 = addSlide();
sectionHeader(s4, '03  El Mercado');

s4.addText('Colombia: mercado regulado en crecimiento acelerado', {
  x:0.5, y:0.85, w:12.2, h:0.5, fontSize:18, bold:true, color:NAVY, align:'center',
});

// TAM / SAM / SOM circles (representational)
const mktData = [
  { label:'TAM', val:'~6.000', sub:'Operadores drones\ncomerciales Colombia', color:'2D7DD2', x:1.5, y:1.5, w:4, h:3 },
  { label:'SAM', val:'~3.600', sub:'Con cumplimiento\nRAC 100 obligatorio', color:'1B7A4A', x:5.2, y:1.7, w:3.5, h:2.6 },
  { label:'SOM Año 1', val:'~148', sub:'Meta realista\n4% del SAM', color:'C0392B', x:8.5, y:1.9, w:3.2, h:2.2 },
];
mktData.forEach(m => {
  s4.addShape(pres.ShapeType.ellipse, { x:m.x, y:m.y, w:m.w, h:m.h, fill:{ color:m.color, transparency:15 }, line:{ color:m.color, width:2 } });
  s4.addText(m.label, { x:m.x, y:m.y+0.2, w:m.w, h:0.4, fontSize:14, bold:true, color:WHITE, align:'center' });
  s4.addText(m.val,   { x:m.x, y:m.y+0.6, w:m.w, h:0.6, fontSize:22, bold:true, color:WHITE, align:'center' });
  s4.addText(m.sub,   { x:m.x, y:m.y+1.2, w:m.w, h:0.7, fontSize:10, color:WHITE, align:'center', wrap:true });
});

s4.addShape(pres.ShapeType.rect, { x:0.3, y:4.8, w:12.5, h:0.55, fill:{ color: LGRAY }, line:{color:GRAY,width:1} });
s4.addText('📈  Crecimiento del mercado: ~25% anual. RAC 100 hace el cumplimiento OBLIGATORIO → cliente cautivo con alto costo de cambio.', {
  x:0.5, y:4.85, w:12.1, h:0.4, fontSize:12, color:NAVY, bold:true, align:'center',
});

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 5: MODELO DE NEGOCIO / PRECIOS
// ═══════════════════════════════════════════════════════════════════════════════
const s5 = addSlide();
sectionHeader(s5, '04  Modelo de Negocio');

s5.addText('Suscripción mensual/anual — 4 planes escalonados', {
  x:0.5, y:0.85, w:12.2, h:0.45, fontSize:18, bold:true, color:NAVY, align:'center',
});

const plans = [
  { name:'Piloto', price:'$19.900/mes', annual:'$218.900/año', desc:'1 dron, 1 piloto. Para operador independiente.', color:'4A9EDE' },
  { name:'Escuadrilla', price:'$149.900/mes', annual:'$1.648.900/año', desc:'3 drones, 4 pilotos. Empresas pequeñas.', color:SKY },
  { name:'Flota', price:'$249.900/mes', annual:'$2.748.900/año', desc:'15 drones, 15 pilotos. Empresas medianas.', color:BLUE },
  { name:'Enterprise', price:'Cotizar', annual:'Desde $5M/año', desc:'Flota ilimitada. Grandes operadores.', color:NAVY },
];
plans.forEach((p, i) => {
  const x = 0.3 + i * 3.2;
  s5.addShape(pres.ShapeType.rect, { x, y:1.5, w:3.0, h:3.4, fill:{ color: p.color }, line:{ color:'FFFFFF', width:2 } });
  s5.addText(p.name,  { x, y:1.65, w:3.0, h:0.5, fontSize:16, bold:true, color:WHITE, align:'center' });
  s5.addText(p.price, { x, y:2.2, w:3.0, h:0.5, fontSize:18, bold:true, color:WHITE, align:'center' });
  s5.addText(p.annual,{ x, y:2.72, w:3.0, h:0.35, fontSize:11, color:'DDEEFF', align:'center' });
  s5.addShape(pres.ShapeType.line, { x:x+0.2, y:3.1, w:2.6, h:0, line:{ color:'FFFFFF', width:1, transparency:50 } });
  s5.addText(p.desc,  { x, y:3.15, w:3.0, h:0.9, fontSize:11, color:WHITE, align:'center', wrap:true });
});

s5.addText('ARPU mezclado: ~$91.900 COP/cliente/mes  ·  Margen bruto: ~85%  ·  LTV: ~$1.950.000 COP', {
  x:0.3, y:5.1, w:12.5, h:0.4, fontSize:12, bold:true, color:SKY, align:'center',
});

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 6: MÉTRICAS SaaS
// ═══════════════════════════════════════════════════════════════════════════════
const s6 = addSlide();
sectionHeader(s6, '05  Métricas SaaS');

s6.addText('Indicadores de salud del negocio — todos en zona verde', {
  x:0.5, y:0.85, w:12.2, h:0.45, fontSize:18, bold:true, color:NAVY, align:'center',
});

const metrics = [
  { t:'Margen Bruto', v:'85%', ref:'>75%', ok:true },
  { t:'LTV / CAC', v:'~4,9×', ref:'>3×', ok:true },
  { t:'Payback CAC', v:'~5 meses', ref:'<12 meses', ok:true },
  { t:'Churn mensual', v:'4%', ref:'<5%', ok:true },
  { t:'Meses a EBITDA+', v:'10 meses', ref:'<18 meses', ok:true },
  { t:'LTV por cliente', v:'$1.950.000', ref:'>3× CAC', ok:true },
];
metrics.forEach((m, i) => {
  const col = i % 3, row = Math.floor(i / 3);
  const x = 0.4 + col * 4.15;
  const y = 1.55 + row * 1.75;
  s6.addShape(pres.ShapeType.rect, { x, y, w:3.9, h:1.55, fill:{ color:GREENL }, line:{ color:GREEN, width:1.5 } });
  s6.addText('✅', { x, y:y+0.08, w:3.9, h:0.4, fontSize:20, align:'center' });
  s6.addText(m.t, { x, y:y+0.42, w:3.9, h:0.35, fontSize:12, bold:true, color:NAVY, align:'center' });
  s6.addText(m.v, { x, y:y+0.75, w:3.9, h:0.4, fontSize:18, bold:true, color:GREEN, align:'center' });
  s6.addText('Ref: '+m.ref, { x, y:y+1.17, w:3.9, h:0.28, fontSize:10, color:'777777', align:'center', italic:true });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 7: PROYECCIÓN AÑO 1
// ═══════════════════════════════════════════════════════════════════════════════
const s7 = addSlide();
sectionHeader(s7, '06  Proyección Año 1');

s7.addText('EBITDA mensual positivo desde el Mes 10', {
  x:0.5, y:0.85, w:12.2, h:0.45, fontSize:18, bold:true, color:GREEN, align:'center',
});

// Simple bar chart representation
const months = [
  [1,2,'−2.0M'], [2,5,'−1.8M'], [3,10,'−1.7M'], [4,16,'−1.6M'],
  [5,25,'−1.1M'], [6,36,'−0.5M'], [7,48,'−3.3M'], [8,63,'−2.4M'],
  [9,81,'−1.1M'], [10,101,'+0.3M'],[11,123,'+1.9M'],[12,148,'+3.4M'],
];

const barW = 0.85, barX0 = 0.4, barBaseY = 4.7;

months.forEach(([m, clients, ebitda], i) => {
  const x = barX0 + i * 0.95;
  const isPos = m >= 10;
  const barH = Math.min(Math.abs(parseFloat(ebitda)) * 0.45 + 0.3, 2.2);
  const barY = isPos ? barBaseY - barH : barBaseY;
  s7.addShape(pres.ShapeType.rect, {
    x, y: barY, w: barW, h: barH,
    fill:{ color: isPos ? GREEN : RED, transparency: isPos ? 20 : 40 },
    line:{ color: isPos ? GREEN : RED, width: 1 },
  });
  s7.addText(`M${m}`, { x, y:4.85, w:barW, h:0.28, fontSize:9, color:WHITE, align:'center', bold:true });
  s7.addText(ebitda,  { x, y:isPos ? barY-0.35 : barY+barH+0.02, w:barW, h:0.32, fontSize:9, color: isPos?GREEN:RED, align:'center', bold:true });
  s7.addText(`${clients}c`, { x, y:isPos ? barY+barH-0.3 : barY-0.32, w:barW, h:0.28, fontSize:9, color:WHITE, align:'center' });
});

// Arrow from month 10
s7.addText('✅ EBITDA+', { x:8.8, y:1.3, w:2.5, h:0.4, fontSize:13, bold:true, color:GREEN, align:'center' });

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 8: PROYECCIÓN 5 AÑOS
// ═══════════════════════════════════════════════════════════════════════════════
const s8 = addSlide();
sectionHeader(s8, '07  Proyección 5 Años');

s8.addText('Curva en J clásica SaaS: pérdida controlada Año 1, rentabilidad creciente', {
  x:0.5, y:0.85, w:12.2, h:0.45, fontSize:16, bold:true, color:NAVY, align:'center',
});

const yearsData = [
  ['Año 1', '148',  '−$10M', '−17%', SKY],
  ['Año 2', '420',  '+$32M', '+10%', '2A9D8F'],
  ['Año 3', '850',  '+$154M','+20%', '1B7A4A'],
  ['Año 4', '1.450','+$411M','+28%', '145A35'],
  ['Año 5', '2.200','+$784M','+32%', '0D3B22'],
];

const bW = 2.0, bX0 = 0.5;
yearsData.forEach(([yr, clients, ebitda, pct, col], i) => {
  const x = bX0 + i * 2.55;
  const isPos = i > 0;
  const pctNum = parseFloat(pct);
  const barH = isPos ? Math.abs(pctNum) * 0.1 + 0.5 : 0.8;
  const barY = isPos ? 4.1 - barH : 3.3;
  s8.addShape(pres.ShapeType.rect, { x, y:barY, w:bW, h:barH, fill:{color:col}, line:{color:WHITE,width:1} });
  s8.addText(yr,       { x, y:barY-0.42, w:bW, h:0.35, fontSize:13, bold:true, color:NAVY, align:'center' });
  s8.addText(clients+' clientes', { x, y:barY-0.25, w:bW, h:0.28, fontSize:10, color:'555555', align:'center' });
  s8.addText(ebitda,   { x, y:barY + (isPos?barH*0.3:0.25), w:bW, h:0.4, fontSize:14, bold:true, color:WHITE, align:'center' });
  s8.addText('EBITDA\n'+pct, { x, y:barY + (isPos?barH*0.6:0.55), w:bW, h:0.5, fontSize:10, color:'CCFFCC', align:'center', wrap:true });
});

// ARR line
s8.addText('ARR fin Año 5: ~$2.949M COP  ·  Valoración proyectada: ~$11.800M COP', {
  x:0.3, y:5.05, w:12.5, h:0.4, fontSize:13, bold:true, color:GREEN, align:'center',
});

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 9: INVERSIÓN MÍNIMA $5M — LA OFERTA
// ═══════════════════════════════════════════════════════════════════════════════
const s9 = addSlide();
s9.addShape(pres.ShapeType.rect, { x:0, y:0, w:'100%', h:'100%', fill:{color:NAVY} });
s9.addShape(pres.ShapeType.rect, { x:0, y:'75%', w:'100%', h:'25%', fill:{color:SKY} });

s9.addText('Tu Oportunidad', {
  x:0.5, y:0.3, w:12.2, h:0.6, fontSize:20, color:'AACCEE', align:'center', italic:true,
});
s9.addText('Invierte desde $5.000.000 COP', {
  x:0.5, y:0.9, w:12.2, h:0.9, fontSize:36, bold:true, color:WHITE, align:'center',
});
s9.addText('y conviértete en copropietario de Bitafly', {
  x:0.5, y:1.75, w:12.2, h:0.55, fontSize:20, color:'CCDDEE', align:'center',
});

// 3 KPI boxes
const kpis = [
  { t:'Acciones recibidas', v:'12,5 acciones', s:'de 1.000 totales' },
  { t:'Tu participación', v:'1,23%', s:'de Bitafly' },
  { t:'Precio por acción', v:cop(PRICE_SHR), s:'Valoración $400M COP' },
];
kpis.forEach((k, i) => {
  const x = 0.8 + i * 4.2;
  s9.addShape(pres.ShapeType.rect, { x, y:2.5, w:3.8, h:1.8, fill:{color:'FFFFFF', transparency:10}, line:{color:SKY,width:2} });
  s9.addText(k.t, { x, y:2.62, w:3.8, h:0.4, fontSize:12, color:'CCDDEE', align:'center' });
  s9.addText(k.v, { x, y:3.0, w:3.8, h:0.6, fontSize:20, bold:true, color:WHITE, align:'center' });
  s9.addText(k.s, { x, y:3.6, w:3.8, h:0.5, fontSize:11, color:'AABBCC', align:'center', italic:true });
});

s9.addText(`✅  Post-money: ${cop(POSTMONEY)}  ·  Mínimo de inversión: ${cop(INV)}  ·  Precio/acción: ${cop(PRICE_SHR)}`, {
  x:0.5, y:'77%', w:12.2, h:0.5, fontSize:12, color:WHITE, align:'center',
});

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 10: RETORNO PROYECTADO
// ═══════════════════════════════════════════════════════════════════════════════
const s10 = addSlide();
sectionHeader(s10, '08  Retorno Proyectado para el Inversionista');

s10.addText('¿Cuánto puede crecer tu inversión de $5.000.000 COP?', {
  x:0.5, y:0.85, w:12.2, h:0.5, fontSize:18, bold:true, color:NAVY, align:'center',
});

const returns = [
  { yr:'Hoy (entrada)', val:'$5.000.000', note:'Tu inversión inicial', mult:'1×', color:'888888', y:1.55 },
  { yr:'Año 1 (Mes 10)', val:'EBITDA+ empresa', note:'El negocio ya es rentable', mult:'✅', color:SKY, y:2.35 },
  { yr:'Año 2', val:cop(Math.round(2000000000*NEW_SHR/TOTAL_SHR)), note:'~'+( 2000000000*NEW_SHR/TOTAL_SHR/INV).toFixed(1)+'× tu inversión', mult:( 2000000000*NEW_SHR/TOTAL_SHR/INV).toFixed(1)+'×', color:'2A9D8F', y:3.15 },
  { yr:'Año 3', val:cop(Math.round(4000000000*NEW_SHR/TOTAL_SHR)), note:'~'+(4000000000*NEW_SHR/TOTAL_SHR/INV).toFixed(1)+'× tu inversión', mult:(4000000000*NEW_SHR/TOTAL_SHR/INV).toFixed(1)+'×', color:'1B7A4A', y:3.95 },
  { yr:'Año 5', val:cop(Math.round(STAKE5)), note:`~${ROI_X}× tu inversión`, mult:`${ROI_X}×`, color:'145A35', y:4.75 },
];

returns.forEach((r, i) => {
  s10.addShape(pres.ShapeType.rect, { x:0.4, y:r.y, w:2.2, h:0.6, fill:{color:r.color}, line:{color:WHITE,width:1} });
  s10.addText(r.yr, { x:0.4, y:r.y+0.12, w:2.2, h:0.35, fontSize:12, bold:true, color:WHITE, align:'center' });
  s10.addShape(pres.ShapeType.line, { x:2.6, y:r.y+0.3, w:0.4, h:0, line:{color:r.color,width:2} });
  s10.addShape(pres.ShapeType.rect, { x:3.0, y:r.y, w:5.5, h:0.6, fill:{color:i>0?GREENL:LGRAY}, line:{color:GRAY,width:1} });
  s10.addText(r.val, { x:3.0, y:r.y+0.08, w:5.5, h:0.45, fontSize:14, bold:i>1, color:i>1?GREEN:NAVY, align:'center', valign:'middle' });
  s10.addShape(pres.ShapeType.rect, { x:8.7, y:r.y, w:2.5, h:0.6, fill:{color:r.color}, line:{color:WHITE,width:1} });
  s10.addText(r.mult, { x:8.7, y:r.y+0.1, w:2.5, h:0.4, fontSize:16, bold:true, color:WHITE, align:'center' });
  s10.addText(r.note, { x:11.3, y:r.y+0.12, w:1.8, h:0.35, fontSize:10, color:'666666', italic:true, align:'left' });
});

s10.addShape(pres.ShapeType.rect, { x:0.3, y:5.4, w:12.5, h:0.5, fill:{color:'D4EDDA'}, line:{color:GREEN,width:2} });
s10.addText(`★  $5.000.000 COP invertidos hoy → ~${cop(Math.round(STAKE5))} proyectados en Año 5  (~${ROI_X}× · TIR ~82% anual)`, {
  x:0.5, y:5.47, w:12.1, h:0.35, fontSize:13, bold:true, color:GREEN, align:'center',
});

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 11: ESCENARIOS DE RONDA
// ═══════════════════════════════════════════════════════════════════════════════
const s11 = addSlide();
sectionHeader(s11, '09  Escenarios de Ronda');

s11.addText('Pre-money: $400.000.000 COP  ·  Precio/acción: $400.000 COP  ·  Total acciones: 1.000', {
  x:0.5, y:0.85, w:12.2, h:0.45, fontSize:15, color:NAVY, align:'center',
});

tableSlide(s11,
  ['Inversión (COP)', 'Acciones nuevas', '% de la empresa', 'Post-money (COP)', ''],
  [
    ['$120.000.000', '300', '23,1%', '$520.000.000', ''],
    ['$180.000.000  ★ RECOMENDADO', '450', '31,0%', '$580.000.000', ''],
    ['$260.000.000', '650', '39,4%', '$660.000.000', ''],
    ['$5.000.000  (mínimo)', '12,5', '1,23%', '$405.000.000', ''],
  ],
  0.3, 1.5, 12.5, 3.2
);

s11.addShape(pres.ShapeType.rect, { x:0.3, y:5.0, w:12.5, h:0.9, fill:{color:LGRAY}, line:{color:GRAY,width:1} });
s11.addText('💡  La ronda está abierta a múltiples inversionistas desde $5M COP. El total máximo a levantar es $180M COP (31%) para preservar el control del fundador.', {
  x:0.5, y:5.08, w:12.1, h:0.75, fontSize:12, color:NAVY, align:'center', wrap:true,
});

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 12: GLOSARIO RÁPIDO
// ═══════════════════════════════════════════════════════════════════════════════
const s12 = addSlide();
sectionHeader(s12, '10  Glosario Rápido');

tableSlide(s12,
  ['Término', 'Significado simple'],
  [
    ['MRR',      'Ingresos recurrentes mensuales = "sueldo mensual" del negocio'],
    ['ARR',      'MRR × 12 = ingreso anualizado. Base para valorar empresas SaaS'],
    ['ARPU',     'Ingreso promedio por cliente/mes. Bitafly: ~$91.900 COP'],
    ['EBITDA',   'Utilidad operativa bruta antes de impuestos'],
    ['LTV',      'Cuánto genera un cliente en toda su vida. Bitafly: ~$1.950.000 COP'],
    ['CAC',      'Cuánto cuesta conseguir un cliente. Bitafly: ~$400.000 COP'],
    ['Churn',    '% de clientes que cancelan por mes. Bitafly: 4% (meta <5%)'],
    ['Pre-money','Valor de la empresa ANTES de tu inversión: $400M COP'],
    ['TIR/IRR',  'Rendimiento anual equivalente de la inversión: ~82%'],
    ['RAC 100',  'Norma legal colombiana de drones — cumplimiento OBLIGATORIO'],
  ],
  0.3, 1.45, 12.5, 4.1
);

// ═══════════════════════════════════════════════════════════════════════════════
// SLIDE 13: CIERRE / CTA
// ═══════════════════════════════════════════════════════════════════════════════
const s13 = addSlide();
s13.addShape(pres.ShapeType.rect, { x:0, y:0, w:'100%', h:'100%', fill:{color:NAVY} });
s13.addShape(pres.ShapeType.rect, { x:0, y:'80%', w:'100%', h:'20%', fill:{color:SKY} });

s13.addText('BITAFLY', { x:0.5, y:0.6, w:12.2, h:0.8, fontSize:48, bold:true, color:WHITE, align:'center' });
s13.addText('El momento de entrar es ahora.', { x:0.5, y:1.45, w:12.2, h:0.6, fontSize:24, color:'AACCEE', align:'center', italic:true });

const bullets13 = [
  '✅  Producto terminado y funcionando hoy',
  '✅  Mercado regulado = cliente cautivo (RAC 100 obligatorio)',
  '✅  Sin competidor local con cobertura completa',
  '✅  EBITDA+ en 10 meses — el negocio se sostiene solo',
  `✅  $5.000.000 COP → ~${cop(Math.round(STAKE5))} proyectados en Año 5`,
];
bullets13.forEach((b, i) => {
  s13.addText(b, { x:2.5, y:2.2+i*0.6, w:8.5, h:0.5, fontSize:15, color:WHITE, align:'left' });
});

s13.addText('📧 deibercubillos@gmail.com  ·  🌐 bitafly.com', {
  x:0.5, y:'82%', w:12.2, h:0.5, fontSize:14, color:WHITE, align:'center', bold:true,
});
s13.addText('Solicita el modelo Excel completo con fórmulas vivas', {
  x:0.5, y:'89%', w:12.2, h:0.4, fontSize:12, color:'CCDDEE', align:'center', italic:true,
});

// ─── Guardar ─────────────────────────────────────────────────────────────────
pres.writeFile({ fileName: OUT }).then(() => {
  console.log(`✅ PowerPoint guardado: ${OUT}`);
}).catch(err => { console.error(err); process.exit(1); });
