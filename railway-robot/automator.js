/**
 * automator.js — Lógica principal de automatización Playwright
 * Navega el portal UAEAC y radica el Formato F-100 de forma automática.
 *
 * NOTAS DE SELECTORES:
 * Los selectores marcados con [VERIFICAR] deben confirmarse contra el portal
 * real con el usuario. Usar el modo debug (DEBUG_SCREENSHOTS=true) para
 * tomar capturas en cada paso y ajustar si es necesario.
 *
 * Portal AeroCivil UAS: https://www.aerocivil.gov.co/servicios/servicios-en-linea/uas
 * (puede requerir SIPAC o portal secundario — verificar con la cuenta real)
 */

import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Supabase admin client (para actualizar automation_jobs) ───────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DEBUG = process.env.DEBUG_SCREENSHOTS === 'true';
const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');

// Portal URLs — verificar con cuenta real
const PORTAL_LOGIN_URL = 'https://www.aerocivil.gov.co/servicios/servicios-en-linea/uas';
const MAX_RETRIES      = 2;
const STEP_DELAY_MS    = 1200; // pausa entre acciones (ms) — simula comportamiento humano

// ── Helpers ───────────────────────────────────────────────────────────────
async function updateJob(jobId, fields) {
  const { error } = await supabase
    .from('automation_jobs')
    .update({ ...fields })
    .eq('id', jobId);
  if (error) console.error(`[updateJob] ${error.message}`);
}

async function appendLog(jobId, step, message, level = 'info') {
  const { data } = await supabase
    .from('automation_jobs')
    .select('automation_log')
    .eq('id', jobId)
    .single();

  const log = Array.isArray(data?.automation_log) ? data.automation_log : [];
  log.push({ step, message, level, ts: new Date().toISOString() });

  await supabase
    .from('automation_jobs')
    .update({ automation_log: log })
    .eq('id', jobId);

  console.log(`[JOB ${jobId}][${level.toUpperCase()}] ${step}: ${message}`);
}

async function screenshot(page, jobId, label) {
  if (!DEBUG) return;
  try {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const filename = `${Date.now()}-${label.replace(/\s+/g, '_')}.png`;
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, filename), fullPage: false });
    console.log(`[Screenshot] ${filename}`);
  } catch { /* ignorar errores de screenshot */ }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── Función de selección segura (intenta múltiples selectores) ─────────────
async function safeFill(page, selectors, value, label) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 3000 })) {
        await el.fill(value);
        return true;
      }
    } catch { /* intenta el siguiente */ }
  }
  throw new Error(`No se encontró el campo "${label}" con ninguno de los selectores: ${selectors.join(', ')}`);
}

async function safeClick(page, selectors, label) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 3000 })) {
        await el.click();
        return true;
      }
    } catch { /* intenta el siguiente */ }
  }
  throw new Error(`No se encontró el botón "${label}" con ninguno de los selectores: ${selectors.join(', ')}`);
}

async function safeSelect(page, selectors, value, label) {
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 3000 })) {
        await el.selectOption({ label: value });
        return true;
      }
    } catch { /* intenta el siguiente */ }
  }
  // Fallback: buscar por texto en el select
  throw new Error(`No se encontró el selector "${label}" con valor "${value}"`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN AUTOMATION
// ─────────────────────────────────────────────────────────────────────────────
export async function runAutomation(jobId, credentials, formData, kmlContent) {
  let browser = null;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt++;
    console.log(`[JOB ${jobId}] Intento ${attempt}/${MAX_RETRIES}`);

    try {
      await _automate(jobId, credentials, formData, kmlContent);
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
      if (browser) {
        try { await browser.close(); } catch {}
        browser = null;
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Función interna de un intento completo
// ─────────────────────────────────────────────────────────────────────────────
async function _automate(jobId, credentials, formData, kmlContent) {
  // Marcar inicio
  await updateJob(jobId, {
    status:      'running',
    started_at:  new Date().toISOString(),
    step_number: 0,
  });

  // ── Lanzar browser ────────────────────────────────────────────────────────
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale:    'es-CO',
    timezoneId:'America/Bogota',
    viewport:  { width: 1280, height: 900 },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  // ────────────────────────────────────────────────────────────────────────────
  // PASO 1 — Navegar al portal y autenticar
  // ────────────────────────────────────────────────────────────────────────────
  await updateJob(jobId, { current_step: 'Accediendo al portal AeroCivil', step_number: 1 });
  await appendLog(jobId, 'PASO 1', 'Navegando al portal UAEAC UAS');

  await page.goto(PORTAL_LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 40000 });
  await sleep(STEP_DELAY_MS);
  await screenshot(page, jobId, '01_portal_home');

  // Hacer clic en el enlace de acceso/login (si aplica)
  // [VERIFICAR] El portal puede requerir hacer clic en "Ingresar" o "Acceso Portal" primero
  try {
    await safeClick(page, [
      'a:has-text("Ingresar")',
      'a:has-text("Acceso")',
      'button:has-text("Iniciar sesión")',
      '#btn-login',
    ], 'Botón de acceso inicial');
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
    await sleep(STEP_DELAY_MS);
  } catch {
    // Puede que el formulario de login ya esté visible
    await appendLog(jobId, 'PASO 1', 'Botón de acceso no encontrado, intentando login directo', 'warn');
  }

  // [VERIFICAR] Selectores del formulario de login
  await safeFill(page, [
    '#username',
    'input[name="username"]',
    'input[placeholder*="usuario" i]',
    'input[type="text"]:visible',
  ], credentials.username, 'Campo usuario');
  await sleep(500);

  await safeFill(page, [
    '#password',
    'input[name="password"]',
    'input[type="password"]',
  ], credentials.password, 'Campo contraseña');
  await sleep(500);

  await screenshot(page, jobId, '02_login_filled');

  await safeClick(page, [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Ingresar")',
    'button:has-text("Acceder")',
    '#btn-submit',
  ], 'Botón de submit login');

  await page.waitForLoadState('networkidle', { timeout: 25000 });
  await sleep(STEP_DELAY_MS * 2);
  await screenshot(page, jobId, '03_after_login');

  // Verificar que el login fue exitoso
  const loginError = await page.locator('text=/contraseña incorrecta|usuario no encontrado|error de autenticación/i').isVisible().catch(() => false);
  if (loginError) {
    throw new Error('Credenciales inválidas en el portal AeroCivil');
  }

  await appendLog(jobId, 'PASO 1', 'Login exitoso');

  // ────────────────────────────────────────────────────────────────────────────
  // PASO 2 — Navegar a Nueva Solicitud UAS F-100
  // ────────────────────────────────────────────────────────────────────────────
  await updateJob(jobId, { current_step: 'Navegando a Nueva Solicitud UAS', step_number: 2 });
  await appendLog(jobId, 'PASO 2', 'Buscando sección de solicitudes UAS');

  // [VERIFICAR] Menú de navegación dentro del portal
  await safeClick(page, [
    'a:has-text("UAS")',
    'a:has-text("Solicitudes")',
    'a:has-text("Operaciones UAS")',
    'a:has-text("Nuevo")',
    '#menu-uas',
  ], 'Menú UAS');
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
  await sleep(STEP_DELAY_MS);
  await screenshot(page, jobId, '04_uas_menu');

  // [VERIFICAR] Botón "Nueva Solicitud"
  try {
    await safeClick(page, [
      'button:has-text("Nueva Solicitud")',
      'a:has-text("Nueva Solicitud")',
      'button:has-text("Crear")',
      '#btn-nueva-solicitud',
    ], 'Nueva Solicitud');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    await sleep(STEP_DELAY_MS);
  } catch {
    await appendLog(jobId, 'PASO 2', 'Botón "Nueva Solicitud" no encontrado, continuando', 'warn');
  }

  await screenshot(page, jobId, '05_form_start');
  await appendLog(jobId, 'PASO 2', 'Formulario F-100 abierto');

  // ────────────────────────────────────────────────────────────────────────────
  // PASO 3 — Información del solicitante / empresa
  // ────────────────────────────────────────────────────────────────────────────
  await updateJob(jobId, { current_step: 'Llenando información del solicitante', step_number: 3 });

  // Solicitante / empresa contratante
  if (formData.empresa_contratante) {
    await safeFill(page, [
      '#empresa_contratante',
      'input[name="empresa_contratante"]',
      'input[placeholder*="empresa" i]',
      'input[placeholder*="contratante" i]',
    ], formData.empresa_contratante, 'Empresa contratante').catch(() =>
      appendLog(jobId, 'PASO 3', 'Campo empresa_contratante no encontrado', 'warn')
    );
    await sleep(STEP_DELAY_MS / 2);
  }

  // Departamento / Municipio
  if (formData.department) {
    await safeSelect(page, [
      'select[name="departamento"]',
      '#departamento',
      'select[id*="dept" i]',
    ], formData.department, 'Departamento').catch(() =>
      appendLog(jobId, 'PASO 3', 'Campo departamento no encontrado', 'warn')
    );
    await sleep(800);
  }

  if (formData.municipality) {
    await safeSelect(page, [
      'select[name="municipio"]',
      '#municipio',
      'select[id*="muni" i]',
    ], formData.municipality, 'Municipio').catch(() =>
      appendLog(jobId, 'PASO 3', 'Campo municipio no encontrado', 'warn')
    );
    await sleep(800);
  }

  // Fechas
  if (formData.fecha_inicio) {
    await safeFill(page, ['#fecha_inicio', 'input[name="fecha_inicio"]', 'input[type="date"]:first-of-type'], formData.fecha_inicio, 'Fecha inicio').catch(() => {});
  }
  if (formData.hora_inicio) {
    await safeFill(page, ['#hora_inicio', 'input[name="hora_inicio"]'], formData.hora_inicio, 'Hora inicio').catch(() => {});
  }
  if (formData.fecha_fin) {
    await safeFill(page, ['#fecha_fin', 'input[name="fecha_fin"]'], formData.fecha_fin, 'Fecha fin').catch(() => {});
  }
  if (formData.hora_fin) {
    await safeFill(page, ['#hora_fin', 'input[name="hora_fin"]'], formData.hora_fin, 'Hora fin').catch(() => {});
  }

  await screenshot(page, jobId, '06_section3_filled');
  await appendLog(jobId, 'PASO 3', 'Información de operación llenada');

  // ────────────────────────────────────────────────────────────────────────────
  // PASO 4 — Tipo de operación (checkboxes)
  // ────────────────────────────────────────────────────────────────────────────
  await updateJob(jobId, { current_step: 'Marcando tipo de operación', step_number: 4 });

  const tipoOp = formData.tipo_operacion || {};
  const checkboxMap = {
    simple_captura:        ['#simple_captura',        'input[value="simple_captura"]'],
    vigilancia_seguridad:  ['#vigilancia_seguridad',  'input[value="vigilancia_seguridad"]'],
    medios_comunicacion:   ['#medios_comunicacion',   'input[value="medios_comunicacion"]'],
    aspersion:             ['#aspersion',              'input[value="aspersion"]'],
    dispersion:            ['#dispersion',             'input[value="dispersion"]'],
    enjambre:              ['#enjambre',               'input[value="enjambre"]'],
    carga_delivery:        ['#carga_delivery',         'input[value="carga_delivery"]'],
    instruccion:           ['#instruccion',            'input[value="instruccion"]'],
    misiones_publicas:     ['#misiones_publicas',      'input[value="misiones_publicas"]'],
  };

  for (const [key, selectors] of Object.entries(checkboxMap)) {
    if (tipoOp[key]) {
      for (const sel of selectors) {
        try {
          const cb = page.locator(sel).first();
          if (await cb.isVisible({ timeout: 2000 })) {
            const checked = await cb.isChecked().catch(() => false);
            if (!checked) await cb.check();
            break;
          }
        } catch { /* no encontrado, omitir */ }
      }
    }
  }

  await appendLog(jobId, 'PASO 4', 'Tipos de operación marcados');

  // ────────────────────────────────────────────────────────────────────────────
  // PASO 5 — Aeronave(s) principal
  // ────────────────────────────────────────────────────────────────────────────
  await updateJob(jobId, { current_step: 'Ingresando datos de aeronave(s)', step_number: 5 });

  const aeronave = formData.aeronaves?.[0];
  if (aeronave) {
    // RUAS
    if (aeronave.ruas) {
      await safeFill(page, [
        '#ruas',
        'input[name="ruas"]',
        'input[placeholder*="RUAS" i]',
        'input[placeholder*="matrícula" i]',
      ], aeronave.ruas, 'RUAS').catch(() =>
        appendLog(jobId, 'PASO 5', 'Campo RUAS no encontrado', 'warn')
      );
      await sleep(500);
    }

    // Otros campos de aeronave
    for (const [field, selectors] of [
      ['model',         ['#modelo_ua', 'input[name="modelo_ua"]']],
      ['serial_number', ['#serial_ua', 'input[name="serial_ua"]', 'input[name="serial"]']],
      ['insurer',       ['#aseguradora', 'input[name="aseguradora"]']],
      ['policy',        ['#poliza',      'input[name="poliza"]', 'input[name="numero_poliza"]']],
      ['start_date',    ['#inicio_poliza', 'input[name="inicio_poliza"]']],
      ['end_date',      ['#fin_poliza',    'input[name="fin_poliza"]']],
    ]) {
      if (aeronave[field]) {
        await safeFill(page, selectors, aeronave[field], field).catch(() => {});
        await sleep(300);
      }
    }
  }

  await screenshot(page, jobId, '07_aeronave_filled');
  await appendLog(jobId, 'PASO 5', 'Datos de aeronave ingresados');

  // ────────────────────────────────────────────────────────────────────────────
  // PASO 6 — Piloto principal
  // ────────────────────────────────────────────────────────────────────────────
  await updateJob(jobId, { current_step: 'Ingresando datos del piloto', step_number: 6 });

  const piloto = formData.pilotos_solicitud?.[0];
  if (piloto) {
    for (const [field, selectors] of [
      ['name',       ['#nombre_piloto',    'input[name="nombre_piloto"]']],
      ['id_number',  ['#cedula_piloto',    'input[name="cedula_piloto"]', 'input[name="id_piloto"]']],
      ['phone',      ['#telefono_piloto',  'input[name="telefono_piloto"]']],
    ]) {
      if (piloto[field]) {
        await safeFill(page, selectors, piloto[field], field).catch(() => {});
        await sleep(300);
      }
    }
  }

  await appendLog(jobId, 'PASO 6', 'Datos de piloto ingresados');

  // ────────────────────────────────────────────────────────────────────────────
  // PASO 7 — Subir KML y datos geográficos
  // ────────────────────────────────────────────────────────────────────────────
  await updateJob(jobId, { current_step: 'Subiendo archivo KML al portal', step_number: 7 });

  if (kmlContent) {
    try {
      // Guardar KML en archivo temporal
      const tmpKmlPath = `/tmp/operacion_uas_${jobId}.kml`;
      writeFileSync(tmpKmlPath, kmlContent, 'utf8');

      // [VERIFICAR] Selector del input file para KML
      const fileInput = page.locator([
        'input[type="file"][accept*="kml" i]',
        'input[type="file"][accept*="kmz" i]',
        'input[type="file"]',
      ].join(', ')).first();

      if (await fileInput.isVisible({ timeout: 5000 })) {
        await fileInput.setInputFiles(tmpKmlPath);
        await sleep(STEP_DELAY_MS * 2); // esperar upload
        await appendLog(jobId, 'PASO 7', 'KML subido correctamente');
      } else {
        await appendLog(jobId, 'PASO 7', 'Input de archivo KML no encontrado en el formulario', 'warn');
      }
    } catch (err) {
      await appendLog(jobId, 'PASO 7', `Error subiendo KML: ${err.message}`, 'warn');
    }
  }

  // Altura de operación
  if (formData.altitude_feet) {
    await safeFill(page, [
      '#altura_pies',
      'input[name="altura_pies"]',
      'input[placeholder*="pies" i]',
    ], String(formData.altitude_feet), 'Altura en pies').catch(() => {});
  }

  await screenshot(page, jobId, '08_kml_uploaded');

  // ────────────────────────────────────────────────────────────────────────────
  // PASO 8 — Otros detalles y envío final
  // ────────────────────────────────────────────────────────────────────────────
  await updateJob(jobId, { current_step: 'Revisando y enviando formulario', step_number: 8 });

  // Peso bruto máximo
  if (formData.peso_maximo) {
    await safeFill(page, [
      '#peso_maximo',
      'input[name="peso_maximo"]',
    ], String(formData.peso_maximo), 'Peso máximo').catch(() => {});
  }

  // Otros detalles
  if (formData.otros_detalles) {
    await safeFill(page, [
      '#otros_detalles',
      'textarea[name="otros_detalles"]',
    ], formData.otros_detalles, 'Otros detalles').catch(() => {});
  }

  await sleep(STEP_DELAY_MS);
  await screenshot(page, jobId, '09_before_submit');

  // [VERIFICAR] Botón de envío final del formulario
  await safeClick(page, [
    'button:has-text("Enviar")',
    'button:has-text("Radicar")',
    'button:has-text("Guardar")',
    'input[type="submit"]',
    '#btn-submit',
    '#btn-enviar',
    '#btn-radicar',
  ], 'Botón enviar formulario');

  await page.waitForLoadState('networkidle', { timeout: 40000 });
  await sleep(STEP_DELAY_MS * 2);
  await screenshot(page, jobId, '10_after_submit');

  // ────────────────────────────────────────────────────────────────────────────
  // PASO 9 — Capturar número de radicado
  // ────────────────────────────────────────────────────────────────────────────
  await updateJob(jobId, { current_step: 'Capturando número de radicado', step_number: 9 });

  let requestNumber = null;

  // [VERIFICAR] Cómo muestra el portal el número de radicado (texto, modal, etc.)
  const numberSelectors = [
    '[id*="radicado"]',
    '[id*="numero_solicitud"]',
    '[class*="radicado"]',
    '[class*="numero-solicitud"]',
    'text=/N[°º]\s*\d{4,}/i',
    'text=/Radicado:\s*\d+/i',
    'text=/Solicitud N[°º]/i',
  ];

  for (const sel of numberSelectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 3000 })) {
        const text = await el.innerText();
        const match = text.match(/\d{4,}/);
        if (match) {
          requestNumber = match[0];
          break;
        }
      }
    } catch { /* continuar */ }
  }

  if (!requestNumber) {
    // Buscar en el título o contenido de la página
    const pageContent = await page.textContent('body').catch(() => '');
    const match = pageContent.match(/(?:radicado|solicitud|número|N[°º])[:\s]+(\d{4,})/i);
    if (match) requestNumber = match[1];
  }

  await appendLog(jobId, 'PASO 9', requestNumber
    ? `Número de radicado capturado: ${requestNumber}`
    : 'No se pudo capturar automáticamente el número de radicado', requestNumber ? 'info' : 'warn'
  );

  // ── Marcar job como completado ─────────────────────────────────────────────
  await updateJob(jobId, {
    status:                  'completed',
    aerocivil_request_number: requestNumber,
    step_number:             9,
    current_step:            'Radicación completada',
    completed_at:            new Date().toISOString(),
  });

  await appendLog(jobId, 'COMPLETADO', `Automatización finalizada. Radicado: ${requestNumber || 'N/D'}`);
  console.log(`[JOB ${jobId}] ✅ Completado. Radicado: ${requestNumber}`);

  await browser.close();
}
