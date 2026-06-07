/**
 * attribution.js — captura y persistencia de atribución de marketing.
 *
 * Modelo:
 *  - PRIMER TOQUE (first-touch): se guarda UNA vez en localStorage la primera
 *    vez que el visitante llega con parámetros UTM/referrer. No se sobreescribe.
 *  - ÚLTIMO TOQUE (last-touch): se actualiza en cada visita con UTM.
 *
 * Uso:
 *   import { captureAttribution, getAttribution } from '@/lib/attribution';
 *   captureAttribution();                 // en el montaje (cliente)
 *   const attr = getAttribution();        // al registrar / capturar lead
 */

const FIRST_KEY = 'bf_attribution_first';
const LAST_KEY  = 'bf_attribution_last';
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];

function readUtmFromUrl() {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const out = {};
  for (const f of UTM_FIELDS) {
    const v = p.get(f);
    if (v) out[f] = v.slice(0, 200);
  }
  return out;
}

function safeGet(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}
function safeSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage lleno o bloqueado */ }
}

/** Captura atribución en el cliente. Llamar en el montaje de la app. */
export function captureAttribution() {
  if (typeof window === 'undefined') return;
  const utm = readUtmFromUrl();
  const referrer = document.referrer && !document.referrer.includes(window.location.host)
    ? document.referrer.slice(0, 300)
    : null;
  const hasSignal = Object.keys(utm).length > 0 || referrer;

  // Primer toque: solo si aún no existe y hay alguna señal
  if (hasSignal && !safeGet(FIRST_KEY)) {
    safeSet(FIRST_KEY, {
      ...utm,
      referrer,
      landing_path: window.location.pathname,
      ts: new Date().toISOString(),
    });
  }
  // Último toque: actualizar si hay señal nueva
  if (hasSignal) {
    safeSet(LAST_KEY, {
      ...utm,
      referrer,
      landing_path: window.location.pathname,
      ts: new Date().toISOString(),
    });
  }
}

/** Devuelve { first, last } para adjuntar al registro o lead. */
export function getAttribution() {
  if (typeof window === 'undefined') return { first: null, last: null };
  return { first: safeGet(FIRST_KEY), last: safeGet(LAST_KEY) };
}

/** Aplana la atribución de primer toque a params para GA4 (sin objetos anidados). */
export function attributionParams() {
  const { first } = getAttribution();
  if (!first) return {};
  return {
    utm_source:   first.utm_source   || '(direct)',
    utm_medium:   first.utm_medium   || '(none)',
    utm_campaign: first.utm_campaign || '(none)',
  };
}
