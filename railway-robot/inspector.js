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

const PORTAL_URL = 'https://www.aerocivil.gov.co/servicios/servicios-en-linea/uas';

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
        options:  Array.from(el.options).slice(0, 5).map(o => o.text), // primeras 5 opciones
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
      url:      page.url(),
      title:    await page.title().catch(() => ''),
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

    // ── PASO A: Página inicial ────────────────────────────────────────────
    await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await addStep('Página inicial del portal', page);

    // ── PASO B: Intentar login ────────────────────────────────────────────
    // Buscar campos de usuario/contraseña con múltiples estrategias
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

      // Intentar submit
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
            await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
            await page.waitForTimeout(2000);
            break;
          }
        } catch {}
      }

      await addStep('Después de intentar login', page);
    } else {
      // Puede haber un botón/link para abrir el login primero
      const loginLinkSelectors = [
        'a:has-text("Ingresar")', 'a:has-text("Acceso")',
        'a:has-text("Login")',    'a:has-text("Iniciar sesión")',
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

    // ── PASO C: Explorar después del login ────────────────────────────────
    // Verificar si estamos logueados buscando elementos del dashboard
    const loggedIn = await page.locator([
      'text=/cerrar sesión/i', 'text=/salir/i', 'text=/logout/i',
      'text=/mi cuenta/i', '[href*="logout"]', '[href*="signout"]',
      'text=/bienvenido/i', 'text=/solicitudes/i',
    ].join(', ')).first().isVisible({ timeout: 3000 }).catch(() => false);

    if (loggedIn) {
      await addStep('Dashboard (login exitoso) ✅', page);

      // Buscar menú UAS
      const uasSelectors = [
        'a:has-text("UAS")', 'a:has-text("Solicitudes")',
        'a:has-text("Operaciones")', 'a:has-text("Nuevo")',
        '[href*="uas"]', '[href*="solicitud"]',
      ];
      for (const sel of uasSelectors) {
        try {
          const el = page.locator(sel).first();
          if (await el.isVisible({ timeout: 2000 })) {
            await el.click();
            await page.waitForLoadState('domcontentloaded', { timeout: 10000 });
            await page.waitForTimeout(1500);
            await addStep(`Menú UAS (${sel})`, page);
            break;
          }
        } catch {}
      }
    } else {
      await addStep('Estado desconocido después del login (revisar screenshot)', page);
    }

  } catch (err) {
    steps.push({ label: 'ERROR FATAL', error: err.message, screenshot: null, elements: [] });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  return { steps, totalSteps: steps.length };
}
