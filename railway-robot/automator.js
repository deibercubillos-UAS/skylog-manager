/**
 * automator.js — Automatización del portal AeroCivil UAS (Oracle APEX)
 *
 * Flujo completo según formato oficial:
 *  1. Login
 *  2. Navegación: Crear Solicitudes → Autorización de Vuelo UAS → Crear Solicitud
 *  3. Popup inicial: Solicitante, Contacto, Opciones, Jefe de Pilotos, Términos
 *  4. Datos de la Operación: tipo, fechas, PBMO, departamento, ciudad, contacto visual
 *  5. UAS y Pilotos: aeronave, póliza, pilotos, observadores, modo KML
 *  6. Coordenadas: cargar KML, tipo, nombre, altura, unidad
 *  7. Crear Solicitud: autollenado → documentos → enviar
 *
 * Portal AeroCivil UAS (Oracle APEX):
 * https://g1ec7dbefb1d8e0-adbprodoa1.adb.sa-bogota-1.oraclecloudapps.com/ords/r/wsp_app_uasyp/col-aerocivil/login?tz=-5:00
 *
 * NOTA: Los selectores Oracle APEX usan prefijo Pxx_ donde xx es el número de página.
 * Los marcados con [VERIFICAR] deben confirmarse con el inspector.
 */

import { chromium }   from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';
import path            from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Supabase admin client ─────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DEBUG          = process.env.DEBUG_SCREENSHOTS === 'true';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const PORTAL_URL     = 'https://g1ec7dbefb1d8e0-adbprodoa1.adb.sa-bogota-1.oraclecloudapps.com/ords/r/wsp_app_uasyp/col-aerocivil/login?tz=-5:00';
const MAX_RETRIES    = 2;
const DELAY          = 1200; // ms entre acciones (simula comportamiento humano)

// ── Utilidades de base de datos ───────────────────────────────────────────────
async function updateJob(jobId, fields) {
  const { error } = await supabase.from('automation_jobs').update(fields).eq('id', jobId);
  if (error) console.error(`[updateJob] ${error.message}`);
}

async function appendLog(jobId, step, message, level = 'info') {
  const { data } = await supabase.from('automation_jobs').select('automation_log').eq('id', jobId).single();
  const log = Array.isArray(data?.automation_log) ? data.automation_log : [];
  log.push({ step, message, level, ts: new Date().toISOString() });
  await supabase.from('automation_jobs').update({ automation_log: log }).eq('id', jobId);
  console.log(`[JOB ${jobId}][${level.toUpperCase()}] ${step}: ${message}`);
}

async function dbg(page, jobId, label) {
  if (!DEBUG) return;
  try {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const fn = `${Date.now()}-${label.replace(/\s+/g, '_')}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, fn) });
  } catch {}
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Helpers Oracle APEX ───────────────────────────────────────────────────────

/**
 * Hace click en el botón "Siguiente" de Oracle APEX.
 * El botón puede tener texto "Siguiente", "Next" o ser el botón .t-Button--hot.
 */
async function clickSiguiente(page) {
  const selectors = [
    'button:has-text("Siguiente")',
    'button:has-text("Next")',
    '.t-Button--hot:has-text("Siguiente")',
    '.t-Button--hot',
    'button[type="submit"]',
  ];
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).last(); // último = el del paso actual
      if (await el.isVisible({ timeout: 3000 })) {
        await el.click();
        await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
        await sleep(2500);
        return;
      }
    } catch {}
  }
  throw new Error('Botón "Siguiente" no encontrado');
}

/**
 * Selecciona un item en un LOV de Oracle APEX.
 * Oracle APEX puede renderizar LOVs como <select> simple o como popup de búsqueda.
 * Se intenta primero como <select>, luego como LOV popup.
 */
async function apexLovSelect(page, fieldSelector, displayValue, searchValue = null) {
  const search = searchValue || displayValue;

  // 1. Intentar como <select> nativo
  try {
    const sel = page.locator(fieldSelector).first();
    if (await sel.isVisible({ timeout: 3000 })) {
      const tag = await sel.evaluate(el => el.tagName.toLowerCase());
      if (tag === 'select') {
        await sel.selectOption({ label: displayValue });
        await sleep(800);
        return true;
      }
    }
  } catch {}

  // 2. Intentar como input con sugerencias (LOV popup Oracle APEX)
  try {
    const input = page.locator(fieldSelector).first();
    if (await input.isVisible({ timeout: 3000 })) {
      await input.fill(search);
      await sleep(1000);
      // Buscar resultado en popup/dropdown de Oracle APEX
      const resultSelectors = [
        '.lov-results li',
        '.apex-lov-result',
        '.popup-lov-results tr td',
        `li:has-text("${displayValue.substring(0, 20)}")`,
        `td:has-text("${displayValue.substring(0, 20)}")`,
      ];
      for (const rs of resultSelectors) {
        try {
          const result = page.locator(rs).first();
          if (await result.isVisible({ timeout: 2000 })) {
            await result.click();
            await sleep(800);
            return true;
          }
        } catch {}
      }
    }
  } catch {}

  // 3. Intentar click en el botón LOV (ícono de búsqueda junto al campo)
  try {
    const lovBtn = page.locator(`${fieldSelector} ~ button, ${fieldSelector} ~ .a-Button`).first();
    if (await lovBtn.isVisible({ timeout: 2000 })) {
      await lovBtn.click();
      await sleep(1500);
      // Buscar en el dialog de LOV
      const searchInput = page.locator('.popup-lov-search input, [placeholder*="Buscar" i]').first();
      if (await searchInput.isVisible({ timeout: 3000 })) {
        await searchInput.fill(search);
        await page.keyboard.press('Enter');
        await sleep(1000);
        const row = page.locator('.popup-lov-results tr:first-child td, .lov-results li:first-child').first();
        if (await row.isVisible({ timeout: 3000 })) {
          await row.click();
          await sleep(800);
          return true;
        }
      }
    }
  } catch {}

  console.warn(`[apexLovSelect] No se pudo seleccionar "${displayValue}" en ${fieldSelector}`);
  return false;
}

/**
 * Llena un campo de texto/número de Oracle APEX.
 */
async function apexFill(page, selectors, value, label) {
  const sels = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of sels) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 3000 })) {
        await el.fill(String(value));
        await sleep(400);
        return true;
      }
    } catch {}
  }
  console.warn(`[apexFill] Campo "${label}" no encontrado`);
  return false;
}

/**
 * Hace click en un radio button o checkbox por texto visible o selector.
 */
async function apexRadio(page, groupSelector, optionText) {
  // Intentar por label con texto
  try {
    const label = page.locator(`label:has-text("${optionText}")`).first();
    if (await label.isVisible({ timeout: 3000 })) {
      await label.click();
      await sleep(600);
      return true;
    }
  } catch {}

  // Intentar por input radio dentro del grupo con valor
  try {
    const radio = page.locator(`${groupSelector} input[type="radio"]`).filter({ hasText: optionText }).first();
    if (await radio.isVisible({ timeout: 2000 })) {
      await radio.check();
      await sleep(600);
      return true;
    }
  } catch {}

  // Intentar por span/div con texto dentro del grupo
  try {
    const span = page.locator(`${groupSelector} span:has-text("${optionText}")`).first();
    if (await span.isVisible({ timeout: 2000 })) {
      await span.click();
      await sleep(600);
      return true;
    }
  } catch {}

  console.warn(`[apexRadio] Opción "${optionText}" no encontrada en ${groupSelector}`);
  return false;
}

/**
 * Llena un campo de fecha/hora de Oracle APEX.
 * Intenta llenar directamente el input; si tiene datepicker, lo maneja.
 */
async function apexDateTimeFill(page, fieldSelector, dateStr, timeStr = null) {
  // dateStr formato: DD/MM/YYYY o YYYY-MM-DD
  // timeStr formato: HH:MM
  try {
    const input = page.locator(fieldSelector).first();
    if (await input.isVisible({ timeout: 3000 })) {
      await input.click();
      await sleep(500);
      await input.fill(dateStr);
      await sleep(400);
      // Confirmar con Enter o click en "Hecho"
      try {
        const done = page.locator('button:has-text("Hecho"), button:has-text("OK"), button:has-text("Aceptar")').first();
        if (await done.isVisible({ timeout: 1500 })) {
          await done.click();
          await sleep(500);
        } else {
          await page.keyboard.press('Escape');
        }
      } catch {
        await page.keyboard.press('Tab');
      }
      return true;
    }
  } catch {}
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — wrapper con reintentos
// ─────────────────────────────────────────────────────────────────────────────
export async function runAutomation(jobId, credentials, formData, kmlContent) {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt++;
    console.log(`[JOB ${jobId}] Intento ${attempt}/${MAX_RETRIES}`);
    let browser = null;

    try {
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });
      await _automate(jobId, credentials, formData, kmlContent, browser);
      return; // éxito
    } catch (err) {
      console.error(`[JOB ${jobId}] Intento ${attempt} falló: ${err.message}`);
      if (attempt >= MAX_RETRIES) {
        await updateJob(jobId, {
          status:        'failed',
          error_message: `[Intento ${attempt}/${MAX_RETRIES}] ${err.message}`,
          completed_at:  new Date().toISOString(),
        });
        await appendLog(jobId, 'ERROR FINAL', err.message, 'error');
      } else {
        await appendLog(jobId, `Intento ${attempt} fallido`, `Reintentando en 5s… ${err.message}`, 'warn');
        await sleep(5000);
      }
    } finally {
      if (browser) { try { await browser.close(); } catch {} }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LÓGICA PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
async function _automate(jobId, credentials, formData, kmlContent, browser) {
  await updateJob(jobId, { status: 'running', started_at: new Date().toISOString(), step_number: 0 });

  const context = await browser.newContext({
    userAgent:  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale:     'es-CO',
    timezoneId: 'America/Bogota',
    viewport:   { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  // ══════════════════════════════════════════════════════════════════════════
  // PASO 1 — LOGIN
  // ══════════════════════════════════════════════════════════════════════════
  await updateJob(jobId, { current_step: 'Accediendo al portal AeroCivil', step_number: 1 });
  await appendLog(jobId, 'PASO 1', 'Navegando al portal AeroCivil Oracle APEX');

  await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 40000 });
  await sleep(2000);
  await dbg(page, jobId, '01_login_page');

  // Llenar usuario
  await apexFill(page, [
    '#username', 'input[name="username"]',
    'input[placeholder*="usuario" i]', 'input[autocomplete="username"]',
  ], credentials.username, 'usuario');
  await sleep(400);

  // Llenar contraseña
  await apexFill(page, [
    '#password', 'input[name="password"]', 'input[type="password"]',
  ], credentials.password, 'contraseña');
  await sleep(400);

  await dbg(page, jobId, '02_login_filled');

  // Submit login
  for (const sel of ['button[type="submit"]', 'input[type="submit"]', 'button:has-text("Ingresar")', 'button:has-text("Acceder")']) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 2000 })) { await el.click(); break; }
    } catch {}
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 25000 });
  await sleep(4000); // Oracle APEX necesita tiempo extra para renderizar
  await dbg(page, jobId, '03_after_login');

  // Verificar login exitoso por URL
  if (page.url().includes('/login')) {
    throw new Error('Login fallido — la URL sigue siendo /login. Verifique las credenciales.');
  }
  await appendLog(jobId, 'PASO 1', `Login exitoso. URL: ${page.url()}`);

  // ══════════════════════════════════════════════════════════════════════════
  // PASO 2 — NAVEGACIÓN: Autorización de Vuelo UAS → Crear Solicitud
  // ══════════════════════════════════════════════════════════════════════════
  await updateJob(jobId, { current_step: 'Navegando a Autorización de Vuelo UAS', step_number: 2 });
  await appendLog(jobId, 'PASO 2', 'Abriendo menú lateral Oracle APEX');

  // 2a. Abrir menú lateral (.t-Button--headerTree)
  try {
    const treeBtn = page.locator('.t-Button--headerTree').first();
    if (await treeBtn.isVisible({ timeout: 5000 })) {
      await treeBtn.click();
      await sleep(1500);
      await dbg(page, jobId, '04_menu_open');
    }
  } catch {
    await appendLog(jobId, 'PASO 2', 'Botón de menú lateral no encontrado, continuando', 'warn');
  }

  // 2b. Expandir "Crear Solicitudes" (.a-TreeView-toggle)
  try {
    const toggle = page.locator(
      'li:has(.a-TreeView-label:has-text("Crear Solicitudes")) .a-TreeView-toggle, ' +
      'li:has(a:has-text("Crear Solicitudes")) .a-TreeView-toggle'
    ).first();
    if (await toggle.isVisible({ timeout: 4000 })) {
      await toggle.click();
      await sleep(1500);
      await dbg(page, jobId, '05_crear_solicitudes_open');
    }
  } catch {
    await appendLog(jobId, 'PASO 2', 'Toggle "Crear Solicitudes" no encontrado', 'warn');
  }

  // 2c. Click en "Autorización de Vuelo UAS"
  await page.locator(
    '.a-TreeView-label:has-text("Autorización de Vuelo UAS"), ' +
    '.a-TreeView-label:has-text("Autorización de Vuelo"), ' +
    'a:has-text("Autorización de Vuelo UAS")'
  ).first().click();
  await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
  await sleep(2000);
  await dbg(page, jobId, '06_auth_vuelo_list');
  await appendLog(jobId, 'PASO 2', 'En página Autorización de Vuelo UAS');

  // 2d. Click en "Crear Solicitud" (botón superior derecho)
  await page.locator(
    'button:has-text("Crear Solicitud"), a:has-text("Crear Solicitud")'
  ).first().click();
  await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
  await sleep(2500);
  await dbg(page, jobId, '07_crear_solicitud_form');
  await appendLog(jobId, 'PASO 2', 'Formulario de creación abierto');

  // ══════════════════════════════════════════════════════════════════════════
  // PASO 3 — POPUP INICIAL: Solicitante, Contacto, Opciones, Jefe de Pilotos
  // ══════════════════════════════════════════════════════════════════════════
  await updateJob(jobId, { current_step: 'Llenando datos iniciales de la solicitud', step_number: 3 });
  await appendLog(jobId, 'PASO 3', 'Llenando popup inicial: Solicitante, Contacto, Opciones');

  // [VERIFICAR] Solicitante — LOV con nombre de empresa/persona
  // El ID de Oracle APEX típicamente es #Pxx_SOLICITANTE
  await apexLovSelect(page,
    '[id*="SOLICITANTE" i], [id*="solicitante" i], [placeholder*="Solicitante" i]',
    credentials.solicitante || ''
  );
  await sleep(800);
  await dbg(page, jobId, '08_solicitante_selected');

  // [VERIFICAR] Contacto — LOV con datos de la cuenta
  await apexLovSelect(page,
    '[id*="CONTACTO" i], [id*="contacto" i], [placeholder*="Contacto" i]',
    credentials.contact_name || ''
  );
  await sleep(800);

  // [VERIFICAR] Opciones — Radio: "Solicitud de Autorización de Vuelo" (siempre)
  await apexRadio(page, '[id*="OPCION" i], [id*="opcion" i]', 'Solicitud de Autorización de Vuelo');
  await sleep(600);

  // [VERIFICAR] Aplica Jefe de Pilotos — Radio: Sí/No
  const aplicaJefe = formData.aplica_jefe_pilotos ?? false;
  await apexRadio(page, '[id*="JEFE" i], [id*="jefe" i]', aplicaJefe ? 'Si' : 'No');
  await sleep(600);

  if (aplicaJefe) {
    // [VERIFICAR] Jefe de Pilotos es el solicitante — Radio: Sí/No
    const jefeEsSolicitante = formData.jefe_es_solicitante ?? true;
    await apexRadio(page, '[id*="JEFE_SOLICITAN" i]', jefeEsSolicitante ? 'Si' : 'No');
    await sleep(600);

    if (!jefeEsSolicitante && formData.jefe_cipu) {
      // [VERIFICAR] Buscar Jefe de Pilotos por CIPU
      await apexFill(page, ['[id*="JEFE_PILOTOS" i], [placeholder*="CIPU" i]'], formData.jefe_cipu, 'CIPU Jefe');
      await sleep(500);
      // Hacer click en la lupa de búsqueda
      try {
        await page.locator('button:has-text("buscar"), .a-Button[title*="Buscar"]').first().click();
        await sleep(1000);
        await page.locator('.lov-results li:first-child, tr.lov-row:first-child').first().click();
        await sleep(800);
      } catch {}
    }
  }

  // [VERIFICAR] Términos y condiciones — checkbox "SI"
  try {
    const terminos = page.locator('input[type="checkbox"][id*="TERMINO" i], label:has-text("acepto")').first();
    if (await terminos.isVisible({ timeout: 3000 })) {
      await terminos.check();
      await sleep(500);
    }
  } catch {}

  await dbg(page, jobId, '09_popup_filled');

  // Botón Siguiente → pasar a Datos de la Operación
  await clickSiguiente(page);
  await appendLog(jobId, 'PASO 3', 'Popup inicial completado → Datos de la Operación');

  // ══════════════════════════════════════════════════════════════════════════
  // PASO 4 — DATOS DE LA OPERACIÓN
  // ══════════════════════════════════════════════════════════════════════════
  await updateJob(jobId, { current_step: 'Llenando datos de la operación', step_number: 4 });
  await appendLog(jobId, 'PASO 4', 'Sección Datos de la Operación');
  await dbg(page, jobId, '10_datos_operacion');

  // Trámite y SubTrámite son autollenados — no hacer nada

  // [VERIFICAR] Tipo de Operación Aérea — checkboxes (uno o varios)
  const tiposOperacion = {
    'simple_captura':       'Simple captura de imágenes o datos',
    'vigilancia_seguridad': 'Captura de imágenes o datos con fines de vigilancia',
    'medios_comunicacion':  'Captura de imágenes o datos para medios de comunicación',
    'aspersion':            'Aspersión',
    'enjambre':             'Enjambre',
    'dispersion':           'Dispersión',
    'transporte_carga':     'Transporte de Carga',
    'instruccion':          'Instrucción',
  };

  const tipoSeleccionado = formData.tipo_operacion;
  if (tipoSeleccionado) {
    const tipos = Array.isArray(tipoSeleccionado) ? tipoSeleccionado : [tipoSeleccionado];
    for (const tipo of tipos) {
      const textoLabel = tiposOperacion[tipo] || tipo;
      try {
        // Buscar checkbox por label o texto cercano
        const cb = page.locator(`label:has-text("${textoLabel.substring(0, 30)}")`).first();
        if (await cb.isVisible({ timeout: 2000 })) { await cb.click(); await sleep(400); }
      } catch {}
    }
  }

  // [VERIFICAR] Empresa Contratante — opcional, LOV
  if (formData.empresa_contratante) {
    await apexLovSelect(page,
      '[id*="EMPRESA_CONTRAT" i], [id*="empresa_contratante" i]',
      formData.empresa_contratante
    );
    await sleep(600);
  }

  // [VERIFICAR] Inicio de operación — date picker + hora
  // formData.fecha_inicio = 'DD/MM/YYYY', formData.hora_inicio = 'HH:MM'
  if (formData.fecha_inicio) {
    await apexDateTimeFill(page, '[id*="INICIO_OPER" i], [id*="fecha_inicio" i]', formData.fecha_inicio, formData.hora_inicio);
    await sleep(600);
    if (formData.hora_inicio) {
      await apexFill(page, ['[id*="HORA_INICIO" i]', '[id*="hora_inicio" i]'], formData.hora_inicio, 'Hora inicio');
    }
  }

  // [VERIFICAR] Final de operación
  if (formData.fecha_fin) {
    await apexDateTimeFill(page, '[id*="FIN_OPER" i], [id*="fecha_fin" i]', formData.fecha_fin, formData.hora_fin);
    await sleep(600);
    if (formData.hora_fin) {
      await apexFill(page, ['[id*="HORA_FIN" i]', '[id*="hora_fin" i]'], formData.hora_fin, 'Hora fin');
    }
  }

  // [VERIFICAR] Otros detalles del cronograma de operación
  if (formData.otros_detalles) {
    await apexFill(page,
      ['[id*="OTROS_DETALLE" i]', '[id*="otros_detalles" i]', 'textarea[id*="CRONO" i]'],
      formData.otros_detalles, 'Otros detalles'
    );
  }

  // [VERIFICAR] PBMO (gramos) — el formulario puede enviar peso_maximo en Kg, convertir
  const pbmoGramos = formData.pbmo_gramos
    || (formData.peso_maximo ? Math.round(parseFloat(formData.peso_maximo) * 1000) : null);
  if (pbmoGramos) {
    await apexFill(page,
      ['[id*="PBMO" i]', '[id*="pbmo" i]', '[placeholder*="PBMO" i]', '[placeholder*="gramos" i]'],
      String(pbmoGramos), 'PBMO'
    );
  }

  // [VERIFICAR] Departamento(s)
  if (formData.department) {
    await apexLovSelect(page,
      '[id*="DEPARTAMENTO" i], [id*="departamento" i]',
      formData.department
    );
    await sleep(800);
  }

  // [VERIFICAR] Ciudad o Municipio
  if (formData.municipality || formData.ciudad) {
    await apexLovSelect(page,
      '[id*="CIUDAD" i], [id*="MUNICIPIO" i], [id*="ciudad" i]',
      formData.municipality || formData.ciudad || ''
    );
    await sleep(800);
  }

  // [VERIFICAR] Tipo de contacto visual con la UA — Radio: VLOS/EVLOS/BVLOS
  // Soporta string directo ('VLOS') o el objeto del formulario {vlos:true, evlos:false, bvlos:false}
  let contactoVisual = formData.tipo_contacto_visual || 'VLOS';
  if (typeof contactoVisual === 'object') {
    if (contactoVisual.bvlos) contactoVisual = 'BVLOS';
    else if (contactoVisual.evlos) contactoVisual = 'EVLOS';
    else contactoVisual = 'VLOS';
  }
  // También soporta formData.contacto_visual (el nombre del campo en el formulario)
  if (formData.contacto_visual && !formData.tipo_contacto_visual) {
    const cv = formData.contacto_visual;
    if (cv.bvlos) contactoVisual = 'BVLOS';
    else if (cv.evlos) contactoVisual = 'EVLOS';
    else contactoVisual = 'VLOS';
  }
  await apexRadio(page, '[id*="CONTACTO_VISUAL" i], [id*="VLOS" i]', contactoVisual);
  await sleep(500);

  // [VERIFICAR] Vuelos Especiales — checkboxes opcionales
  if (formData.vuelos_especiales?.length > 0) {
    const vuelosMap = {
      'nocturno':      'Vuelo nocturno',
      'zona_urbana':   'Vuelo en zona urbana',
      'autonomo':      'Vuelo autónomo',
      'demostracion':  'Demostraciones comerciales',
      'cautiva':       'Vuelo de UA cautiva',
      'competencias':  'competencias y actividades deportivas',
    };
    for (const v of formData.vuelos_especiales) {
      const texto = vuelosMap[v] || v;
      try {
        const lbl = page.locator(`label:has-text("${texto.substring(0, 25)}")`).first();
        if (await lbl.isVisible({ timeout: 2000 })) { await lbl.click(); await sleep(400); }
      } catch {}
    }
  }

  // [VERIFICAR] Justificación (Opcional, máx 1300 caracteres)
  // El formulario puede enviar 'justificacion' o 'justificacion_especial'
  const justificacionTexto = formData.justificacion || formData.justificacion_especial || '';
  if (justificacionTexto) {
    const justText = justificacionTexto.substring(0, 1300);
    await apexFill(page,
      ['[id*="JUSTIFICACION" i]', 'textarea[id*="JUST" i]', 'textarea:visible'],
      justText, 'Justificación'
    );
  }
  // (si no hay justificación separada, la variable 'justificacionTexto' fue vacía)

  await dbg(page, jobId, '11_datos_operacion_filled');

  // Botón Siguiente → UAS y Pilotos
  await clickSiguiente(page);
  await appendLog(jobId, 'PASO 4', 'Datos de la Operación completados → UAS y Pilotos');

  // ══════════════════════════════════════════════════════════════════════════
  // PASO 5 — UAS Y PILOTOS
  // ══════════════════════════════════════════════════════════════════════════
  await updateJob(jobId, { current_step: 'Seleccionando aeronaves y pilotos', step_number: 5 });
  await appendLog(jobId, 'PASO 5', 'Sección UAS y Pilotos');
  await dbg(page, jobId, '12_uas_pilotos');

  // [VERIFICAR] Seleccionar Aeronave(s) — LOV filtrado por Serial o RUAS
  const uasSerial = formData.uas_serial || formData.aeronaves?.[0]?.serial_number || '';
  const uasRuas   = formData.uas_ruas   || formData.aeronaves?.[0]?.ruas           || '';
  const uasSearch = uasSerial || uasRuas;
  if (uasSearch) {
    await apexLovSelect(page,
      '[id*="AERONAVE" i], [id*="UAS" i], [placeholder*="Serial" i], [placeholder*="RUAS" i]',
      uasSearch
    );
    await sleep(1000);
  }

  // [VERIFICAR] Registro de Póliza — tabla editable con doble click en celda
  // La tabla tiene columnas: Número póliza, Inicio cobertura, Fin cobertura, Aseguradora
  const poliza = formData.poliza || formData.aeronaves?.[0];
  if (poliza?.policy || poliza?.poliza_numero) {
    try {
      // Hacer click en botón "Editar" de la tabla de pólizas
      const editBtn = page.locator('button:has-text("Editar"), button[title*="Edit"]').first();
      if (await editBtn.isVisible({ timeout: 3000 })) {
        await editBtn.click();
        await sleep(800);
      }

      // Doble click en la primera celda editable (diferente a Serial del UA)
      const editableCell = page.locator('table tr:first-child td:nth-child(2), .a-IGR-cell:first-child').first();
      if (await editableCell.isVisible({ timeout: 3000 })) {
        await editableCell.dblclick();
        await sleep(800);

        // Llenar campos de la póliza en la fila editable
        await apexFill(page, ['input[id*="POLIZA_NUM" i]', 'input[id*="poliza" i]', 'td input:visible'],
          poliza.policy || poliza.poliza_numero || '', 'Número póliza');
        await sleep(300);
        await apexFill(page, ['input[id*="INICIO_COB" i]', 'input[id*="inicio_cobertura" i]'],
          poliza.start_date || poliza.poliza_inicio || '', 'Inicio cobertura');
        await sleep(300);
        await apexFill(page, ['input[id*="FIN_COB" i]', 'input[id*="fin_cobertura" i]'],
          poliza.end_date || poliza.poliza_fin || '', 'Fin cobertura');
        await sleep(300);
        await apexFill(page, ['input[id*="ASEGURADORA" i]', 'input[id*="aseguradora" i]'],
          poliza.insurer || poliza.poliza_aseguradora || '', 'Aseguradora');
        await sleep(400);
      }
    } catch (e) {
      await appendLog(jobId, 'PASO 5', `Póliza no pudo llenarse: ${e.message}`, 'warn');
    }
  }

  // [VERIFICAR] Seleccionar Piloto(s) — LOV filtrado por CIPU (license_number)
  const pilotoCipu = formData.pilot_cipu
    || formData.pilotos_solicitud?.[0]?.license_number
    || formData.pilotos_solicitud?.[0]?.cipu
    || '';
  if (pilotoCipu) {
    await apexLovSelect(page,
      '[id*="PILOTO" i], [placeholder*="CIPU" i]',
      pilotoCipu
    );
    await sleep(800);
  }

  // [VERIFICAR] Seleccionar Observador(es) — LOV opcional por CIPU
  const observadorCipu = formData.observer_cipu
    || formData.observadores?.[0]?.license_number
    || formData.observadores?.[0]?.cipu
    || '';
  if (observadorCipu) {
    await apexLovSelect(page,
      '[id*="OBSERVADOR" i], [id*="observador" i]',
      observadorCipu
    );
    await sleep(800);
  }

  // [VERIFICAR] Modo de ingreso para coordenadas — Radio: "Carga con Archivo KML"
  await apexRadio(page, '[id*="MODO_COORD" i], [id*="modo_ingreso" i]', 'Carga con Archivo KML');
  await sleep(600);

  await dbg(page, jobId, '13_uas_pilotos_filled');

  // Botón Siguiente → Coordenadas
  await clickSiguiente(page);
  await appendLog(jobId, 'PASO 5', 'UAS y Pilotos completados → Coordenadas');

  // ══════════════════════════════════════════════════════════════════════════
  // PASO 6 — COORDENADAS DE LA OPERACIÓN AÉREA (KML)
  // ══════════════════════════════════════════════════════════════════════════
  await updateJob(jobId, { current_step: 'Cargando archivo KML', step_number: 6 });
  await appendLog(jobId, 'PASO 6', 'Sección Coordenadas — cargando KML');
  await dbg(page, jobId, '14_coordenadas');

  // Trámite y Subtrámite son autollenados

  // [VERIFICAR] Click en botón "Cargar KML" (lado derecho inferior)
  try {
    const cargarKmlBtn = page.locator('button:has-text("Cargar KML"), a:has-text("Cargar KML")').first();
    if (await cargarKmlBtn.isVisible({ timeout: 4000 })) {
      await cargarKmlBtn.click();
      await sleep(1500);
      await dbg(page, jobId, '15_kml_dialog');
    }
  } catch {
    await appendLog(jobId, 'PASO 6', 'Botón Cargar KML no encontrado', 'warn');
  }

  // [VERIFICAR] Tipo Coordenada — Select: Polígono / Tramo lineal / Circunferencia
  const geoType = formData.geo_type || 'polygon';
  const geoTypeTexto = {
    'polygon':    'Poligono',
    'line':       'Tramo lineal',
    'circle':     'Circunferencia en coordina y radio',
  }[geoType] || 'Poligono';
  await apexLovSelect(page,
    '[id*="TIPO_COORD" i], [id*="tipo_coordenada" i]',
    geoTypeTexto
  );
  await sleep(600);

  // [VERIFICAR] Nombre Coordenada
  const geoName = formData.geo_name || formData.zona_operacion || 'Operacion UAS';
  await apexFill(page,
    ['[id*="NOMBRE_COORD" i]', '[id*="nombre_coordenada" i]', '[placeholder*="Nombre" i]'],
    geoName, 'Nombre Coordenada'
  );
  await sleep(400);

  // [VERIFICAR] Altura
  const alturaMetros = formData.altitude_meters || 120;
  await apexFill(page,
    ['[id*="ALTURA" i]', '[id*="altura" i]', '[placeholder*="Altura" i]'],
    String(alturaMetros), 'Altura'
  );
  await sleep(400);

  // [VERIFICAR] Unidad de Medida — Select: Metros / Pies
  const unidad = formData.altitude_unit || 'Metros';
  await apexLovSelect(page,
    '[id*="UNIDAD_MEDIDA" i], [id*="unidad" i]',
    unidad
  );
  await sleep(400);

  // [VERIFICAR] Radio (solo si circunferencia)
  if (geoType === 'circle' && formData.radius) {
    await apexFill(page,
      ['[id*="RADIO" i]', '[id*="radio" i]'],
      String(formData.radius), 'Radio'
    );
    await sleep(400);
  }

  // [VERIFICAR] Subir archivo KML
  if (kmlContent) {
    const tmpKml = `/tmp/uas_${jobId}.kml`;
    writeFileSync(tmpKml, kmlContent, 'utf8');

    const fileInput = page.locator('input[type="file"]').first();
    if (await fileInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fileInput.setInputFiles(tmpKml);
      await sleep(2000);
      await appendLog(jobId, 'PASO 6', 'KML subido correctamente');
    } else {
      // En Oracle APEX el input file puede estar oculto — intentar con setInputFiles directamente
      try {
        await page.locator('input[type="file"]').first().setInputFiles(tmpKml);
        await sleep(2000);
        await appendLog(jobId, 'PASO 6', 'KML subido (input oculto)');
      } catch (e) {
        await appendLog(jobId, 'PASO 6', `No se pudo subir KML: ${e.message}`, 'warn');
      }
    }
  }

  await dbg(page, jobId, '16_kml_uploaded');

  // Botón Siguiente → Crear Solicitud Autorización Vuelos
  await clickSiguiente(page);
  await appendLog(jobId, 'PASO 6', 'Coordenadas completadas → Crear Solicitud');

  // ══════════════════════════════════════════════════════════════════════════
  // PASO 7 — CREAR SOLICITUD AUTORIZACIÓN VUELOS
  // Datos de autollenado + carga de documentos
  // ══════════════════════════════════════════════════════════════════════════
  await updateJob(jobId, { current_step: 'Finalizando solicitud y adjuntando documentos', step_number: 7 });
  await appendLog(jobId, 'PASO 7', 'Sección final — Crear Solicitud Autorización Vuelos');
  await dbg(page, jobId, '17_crear_solicitud_final');

  // Esta sección es mayormente autollenada. Solo se necesita dar "Siguiente"
  // para llegar al cargue de documentos.
  await clickSiguiente(page);
  await sleep(1500);
  await dbg(page, jobId, '18_documentos');

  // [VERIFICAR] Cargue de documentos obligatorios
  // 1. KML (mismo archivo que en coordenadas)
  // 2. Póliza de seguro
  // 3. Formato de análisis de riesgos (SORA)
  // Oracle APEX: botón "Edit" o "+" para adjuntar documentos
  try {
    const editDocBtn = page.locator('button:has-text("Edit"), button:has-text("Adjuntar"), .a-Button:has-text("Edit")').first();
    if (await editDocBtn.isVisible({ timeout: 3000 })) {
      await editDocBtn.click();
      await sleep(1000);

      // Subir KML como primer documento
      if (kmlContent) {
        const tmpKml = `/tmp/uas_doc_${jobId}.kml`;
        writeFileSync(tmpKml, kmlContent, 'utf8');
        const fileInputs = await page.locator('input[type="file"]').all();
        if (fileInputs.length > 0) {
          await fileInputs[0].setInputFiles(tmpKml);
          await sleep(1500);
        }
      }
    }
  } catch (e) {
    await appendLog(jobId, 'PASO 7', `Cargue de documentos: ${e.message}`, 'warn');
  }

  await dbg(page, jobId, '19_before_submit');

  // ══════════════════════════════════════════════════════════════════════════
  // PASO 8 — ENVIAR / RADICAR
  // ══════════════════════════════════════════════════════════════════════════
  await updateJob(jobId, { current_step: 'Enviando solicitud final', step_number: 8 });

  // [VERIFICAR] Botón de envío final — puede llamarse "Enviar", "Radicar" o "Finalizar"
  for (const sel of [
    'button:has-text("Enviar")',
    'button:has-text("Radicar")',
    'button:has-text("Finalizar")',
    'button:has-text("Guardar")',
    '.t-Button--hot:last-child',
  ]) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 3000 })) {
        await btn.click();
        await page.waitForLoadState('domcontentloaded', { timeout: 40000 });
        await sleep(3000);
        break;
      }
    } catch {}
  }

  await dbg(page, jobId, '20_after_submit');
  await appendLog(jobId, 'PASO 8', 'Solicitud enviada');

  // ══════════════════════════════════════════════════════════════════════════
  // PASO 9 — CAPTURAR NÚMERO DE RADICADO
  // ══════════════════════════════════════════════════════════════════════════
  await updateJob(jobId, { current_step: 'Capturando número de radicado', step_number: 9 });

  let requestNumber = null;

  // Intentar extraer el número de radicado del contenido de la página
  const pageText = await page.textContent('body').catch(() => '');
  const patterns = [
    /radicado[:\s#°º]+(\d{4,})/i,
    /solicitud[:\s#°º]+(\d{4,})/i,
    /N[°º][:\s]+(\d{4,})/i,
    /(\d{4}-\d{4,})/,
    /(\d{8,})/,
  ];
  for (const pattern of patterns) {
    const match = pageText.match(pattern);
    if (match) { requestNumber = match[1]; break; }
  }

  // También buscar en elementos específicos
  if (!requestNumber) {
    for (const sel of ['[id*="RADICADO" i]', '[id*="SOLICITUD_ID" i]', '[class*="radicado" i]', 'h1, h2, h3']) {
      try {
        const text = await page.locator(sel).first().innerText({ timeout: 2000 });
        const m = text.match(/\d{4,}/);
        if (m) { requestNumber = m[0]; break; }
      } catch {}
    }
  }

  await appendLog(jobId, 'PASO 9',
    requestNumber
      ? `Número de radicado: ${requestNumber}`
      : 'No se pudo capturar el número de radicado automáticamente',
    requestNumber ? 'info' : 'warn'
  );

  // ── Marcar job como completado ─────────────────────────────────────────────
  await updateJob(jobId, {
    status:                   'completed',
    aerocivil_request_number: requestNumber,
    step_number:              9,
    current_step:             'Radicación completada',
    completed_at:             new Date().toISOString(),
  });

  await appendLog(jobId, 'COMPLETADO', `Automatización finalizada. Radicado: ${requestNumber || 'N/D'}`);
  console.log(`[JOB ${jobId}] ✅ Completado. Radicado: ${requestNumber}`);
}
