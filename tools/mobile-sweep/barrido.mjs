// Barrido móvil con Safari real del simulador de iPhone (Appium + XCUITest).
// Uso: node barrido.mjs <carpeta-salida> <url> [<url> ...]
// Por página: mide desbordes y botones pequeños, y guarda la página completa en tramos (parte-01.png, parte-02.png…).
import { remote } from 'webdriverio';
import fs from 'node:fs';
const UDID = process.env.SIM_UDID || '5B19A967-9022-4D30-9E37-73DD4C72E1A6';
const [outDir, ...urls] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const driver = await remote({ hostname: 'localhost', port: 4723, logLevel: 'error', capabilities: { platformName: 'iOS', 'appium:automationName': 'XCUITest', 'appium:udid': UDID, 'appium:deviceName': 'iPhone', 'appium:platformVersion': '26.5', browserName: 'Safari', 'appium:safariInitialUrl': 'about:blank', 'appium:newCommandTimeout': 600, 'appium:autoAcceptAlerts': true } });
const measure = () => {
  const vw = innerWidth, out = { w: vw, sw: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, vh: innerHeight, over: [], small: 0, tiny: 0, errors: [] };
  const seen = new Set();
  document.querySelectorAll('body *').forEach((el) => {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') return;
    // ¿está dentro de un contenedor que desliza por su cuenta? entonces no cuenta
    let p = el.parentElement, scrolls = false; while (p && p !== document.body) { const o = getComputedStyle(p).overflowX; if ((o === 'auto' || o === 'scroll') && p.scrollWidth > p.clientWidth) { scrolls = true; break; } p = p.parentElement; }
    if (!scrolls && (r.right > vw + 1 || r.left < -1) && out.over.length < 8) { const k = el.tagName + el.className; if (!seen.has(k)) { seen.add(k); out.over.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 50), txt: (el.textContent || '').trim().slice(0, 40), left: Math.round(r.left), right: Math.round(r.right) }); } }
    if ((el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'INPUT' || el.tagName === 'SELECT') && (r.height < 40 || r.width < 40) && r.width > 0) out.small++;
    if (cs.fontSize && parseFloat(cs.fontSize) < 11 && (el.childNodes.length === 1 && el.firstChild.nodeType === 3)) out.tiny++;
  });
  return out;
};
const results = [];
for (const url of urls) {
  const slug = url.replace(/^https?:\/\/[^/]+/, '').replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'home';
  const dir = `${outDir}/${slug}`; fs.mkdirSync(dir, { recursive: true });
  try {
    await driver.url(url); await driver.execute(() => { try { localStorage.setItem('bitafly_cookie_consent', 'rejected'); } catch (e) {} });
    await driver.url(url); await driver.pause(4500); // segunda carga: sin el aviso de cookies tapando contenido
    // Safari restaura a veces el foco de un campo y hace zoom: se quita antes de medir (es del arnés de pruebas, no del sitio)
    await driver.execute(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); window.scrollTo(0, 0); });
    await driver.pause(900);
    const m = await driver.execute(measure);
    const step = Math.max(300, m.vh - 110); // se descuenta la barra inferior de Safari
    let y = 0, i = 1;
    while (y < m.h && i <= 40) {
      await driver.execute((yy) => window.scrollTo(0, yy), y); await driver.pause(700);
      await driver.saveScreenshot(`${dir}/parte-${String(i).padStart(2, '0')}.png`);
      y += step; i++;
    }
    await driver.execute(() => window.scrollTo(0, 0));
    results.push({ url, ...m, partes: i - 1 });
  } catch (e) { results.push({ url, error: String(e.message).slice(0, 160) }); }
}
await driver.deleteSession();
fs.writeFileSync(`${outDir}/resultados.json`, JSON.stringify(results, null, 1));
console.log(JSON.stringify(results.map((r) => r.error ? r : { url: r.url, alto: r.h, desbordeDoc: r.sw > r.w, sobresalen: r.over.length, pequeños: r.small, partes: r.partes }), null, 1));
