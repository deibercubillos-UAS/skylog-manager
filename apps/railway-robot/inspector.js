/**
 * inspector.js — Herramienta de diagnóstico de selectores
 * Navega el portal AeroCivil paso a paso y devuelve:
 *   - Screenshots en base64 de cada pantalla
 *   - Lista de todos los inputs/buttons/selects encontrados
 *   - URL y título de cada página
 *
 * SOLO para uso en desarrollo/depuración. NO llamar en producción.
 */

import { chromium } from 'playwright';

const PORTAL_URL = 'https://g1ec7dbefb1d8e0-adbprodoa1.adb.sa-bogota-1.oraclecloudapps.com/ords/r/wsp_app_uasyp/col-aerocivil/login?tz=-5:00';

// Extrae todos los elementos interactivos visibles de la página
async function extractPageElements(page) {
  return page.evaluate(() => {
    const elements = [];

    // Inputs
    document.querySelectorAll('input:not([type="hidden"])').forEach(el => {
      elements.push({
        tag:         'input',
        type:        el.type || 'text',
        id:          el.id          || null,
        name:        el.name        || null,
        placeholder: el.placeholder || null,
        value:       el.value       || null,
        visible:     el.offsetParent !== null,
        selector:    el.id ? `#${el.id}` : el.name ? `input[name="${el.name}"]` : null,
      });
    });

    // Selects
    document.querySelectorAll('select').forEach(el => {
      elements.push({
        tag:      'select',
        id:       el.id   || null,
        name:     el.name || null,
        visible:  el.offsetParent !== null,
        selector: el.id ? `#${el.id}` : el.name ? `select[name="${el.name}"]` : null,
        options:  Array.from(el.options).slice(0, 5).map(o => o.text),
      });
    });

    // Buttons y links de acción
    document.querySelectorAll('button, input[type="submit"], a[href]').forEach(el => {
      const text = el.innerText?.trim() || el.value || '';
      if (text.length < 80) {
        elements.push({
          tag:      el.tagName.toLowerCase(),
          type:     el.type || null,
          id:       el.id   || null,
          text:     text,
          href:     el.href  || null,
          visible:  el.offsetParent !== null,
          selector: el.id ? `#${el.id}` : text ? `${el.tagName.toLowerCase()}:has-text("${text.substring(0, 30)}")` : null,
        });
      }
    });

    return elements;
  });
}

export async function inspectPortal(credentials) {
  const steps = [];
  let browser  = null;

  const addStep = async (label, page, error = null) => {
    let screenshot64 = null;
    let elements     = [];

    try {
      const buf = await page.screenshot({ fullPage: false });
      screenshot64 = buf.toString('base64');
    } catch {}

    try {
      elements = await extractPageElements(page);
    } catch {}

    steps.push({
      label,
      url:        page.url(),
      title:      await page.title().catch(() => ''),
      screenshot: screenshot64,
      elements:   elements.filter(e => e.visible !== false),
      error:      error?.message || null,
    });
  };

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale:    'es-CO',
      viewport:  { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(20000);

    // ── PASO A: Página inicial (login) ────────────────────────────────────────
    await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await addStep('Página inicial del portal', page);

    // ── PASO B: Llenar formulario de login ────────────────────────────────────
    let loginAttempted = false;

    const usernameSelectors = [
      '#username', 'input[name="username"]', 'input[type="email"]',
      'input[placeholder*="usuario" i]', 'input[placeholder*="correo" i]',
      'input[placeholder*="email" i]', 'input[autocomplete="username"]',
    ];
    const passwordSelectors = [
      '#password', 'input[name="password"]', 'input[type="password"]',
    ];

    for (const sel of usernameSelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 2000 })) {
          await el.fill(credentials.username);
          loginAttempted = true;
          break;
        }
      } catch {}
    }

    for (const sel of passwordSelectors) {
      try {
        const el = page.locator(sel).first();
        if (await el.isVisible({ timeout: 2000 })) {
          await el.fill(credentials.password);
          break;
        }
      } catch {}
    }

    if (loginAttempted) {
      await addStep('Formulario de login (campos llenados)', page);

      const submitSelectors = [
        'button[type="submit"]', 'input[type="submit"]',
        'button:has-text("Ingresar")', 'button:has-text("Acceder")',
        'button:has-text("Entrar")', 'button:has-text("Login")',
      ];
      for (const sel of submitSelectors) {
        try {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 2000 })) {
            await el.click();
            await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
            await page.waitForTimeout(4000); // Oracle APEX necesita tiempo extra para JS
            break;
          }
        } catch {}
      }

      await addStep('Después de intentar login', page);
    } else {
      const loginLinkSelectors = [
        'a:has-text("Ingresar")', 'a:has-text("Acceso")',
        'a:has-text("Login")', 'a:has-text("Iniciar sesión")',
        '#btn-login', '.login-btn', '[href*="login"]',
      ];
      for (const sel of loginLinkSelectors) {
        try {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 2000 })) {
            await el.click();
            await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
            await page.waitForTimeout(1500);
            break;
          }
        } catch {}
      }
      await addStep('Después de buscar enlace de login', page);
    }

    // ── PASO C: Verificar login exitoso (Oracle APEX UAS portal) ─────────────
    // Oracle APEX redirige fuera de /login al autenticarse correctamente.
    // Comprobamos por URL (más fiable que buscar texto en el DOM).
    await page.waitForTimeout(2000); // tiempo extra para Oracle APEX JS
    const currentUrl = page.url();
    const loggedIn = !currentUrl.includes('/login');

    if (loggedIn) {
      await addStep('Dashboard (login exitoso) ✅', page);

      // ── PASO D: Click en botón de árbol del header Oracle APEX ───────────────
      // Clase: t-Button--headerTree  (abre/cierra el menú lateral de navegación)
      try {
        const treeBtn = page.locator('.t-Button--headerTree').first();
        if (await treeBtn.isVisible({ timeout: 4000 })) {
          await treeBtn.click();
          await page.waitForTimeout(1500);
          await addStep('Menú lateral desplegado', page);
        }
      } catch {}

      // ── PASO E: Expandir nodo "Crear Solicitudes" en el árbol ────────────────
      // Click en .a-TreeView-toggle del item que contiene "Crear Solicitudes"
      try {
        const toggle = page.locator(
          'li:has(.a-TreeView-label:has-text("Crear Solicitudes")) .a-TreeView-toggle, ' +
          'li:has(a:has-text("Crear Solicitudes")) .a-TreeView-toggle'
        ).first();

        if (await toggle.isVisible({ timeout: 4000 })) {
          await toggle.click();
          await page.waitForTimeout(1500);
          await addStep('Nodo Crear Solicitudes expandido', page);
        }
      } catch {}

      // ── PASO F: Click en "Autorización de Vuelo UAS" (.a-TreeView-label) ────
      try {
        const authLabel = page.locator(
          '.a-TreeView-label:has-text("Autorización de Vuelo UAS"), ' +
          '.a-TreeView-label:has-text("Autorización de Vuelo"), ' +
          'a:has-text("Autorización de Vuelo UAS")'
        ).first();

        if (await authLabel.isVisible({ timeout: 4000 })) {
          await authLabel.click();
          await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
          await page.waitForTimeout(2000);
          await addStep('Autorización de Vuelo UAS — lista de solicitudes', page);

          // ── PASO G: Click en "Crear Solicitud" ─────────────────────────────────
          const crearBtn = page.locator(
            'button:has-text("Crear Solicitud"), ' +
            'a:has-text("Crear Solicitud"), ' +
            'button:has-text("Crear"), ' +
            'a:has-text("Crear")'
          ).first();

          if (await crearBtn.isVisible({ timeout: 4000 })) {
            await crearBtn.click();
            await page.waitForLoadState('domcontentloaded', { timeout: 20000 });
            await page.waitForTimeout(2000);
            await addStep('Formulario — Crear Solicitud (campos F-100)', page);
          }
        }
      } catch {}

    } else {
      await addStep('Estado desconocido después del login — revisar screenshot', page);
    }

  } catch (err) {
    steps.push({ label: 'ERROR FATAL', error: err.message, screenshot: null, elements: [] });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  return { steps, totalSteps: steps.length };
}
