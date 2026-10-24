/**
 * analytics.js — helpers para Google Analytics 4
 *
 * @next/third-parties/google inyecta window.gtag automáticamente cuando
 * NEXT_PUBLIC_GA_ID está definido. Esta función es un wrapper seguro que:
 *  - No hace nada en SSR (typeof window === 'undefined')
 *  - No falla si gtag aún no cargó (typeof window.gtag !== 'function')
 *  - Acepta cualquier nombre de evento y parámetros opcionales
 *
 * Uso:
 *   import { trackEvent } from '@/lib/analytics';
 *   trackEvent('sign_up', { method: 'email', plan: 'piloto' });
 */
export function trackEvent(eventName, params = {}) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', eventName, params);
}

/**
 * Empuja un evento al dataLayer de Google Tag Manager.
 *
 * GTM solo se carga si el usuario aceptó las cookies (CookieConsentManager).
 * Si no aceptó, el push cae en un arreglo que nadie lee: es inofensivo y no
 * envía nada a terceros. Los activadores de GTM escuchan estos eventos por
 * nombre (activador "Evento personalizado"), no por URL.
 *
 * `event_id` debe ser estable y único por conversión: es la llave de
 * deduplicación entre el navegador (Insight Tag) y el servidor (CAPI).
 */
export function pushDataLayer(eventName, params = {}) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  // Sin nombre de evento solo se actualiza el estado del dataLayer (p. ej. { ecommerce: null }).
  window.dataLayer.push(eventName ? { event: eventName, ...params } : { ...params });
}

/**
 * Eventos estándar de GA4 usados en BitaFly
 * ─────────────────────────────────────────
 *
 * sign_up      → nuevo usuario registrado (gratis, pago o unirse a org)
 *   params: { method: 'email' | 'join_org', plan: 'piloto' | 'escuadrilla' | 'flota' }
 *
 * purchase     → pago Wompi confirmado (plan pago activado). Se emite con
 *                pushDataLayer desde (v2)/suscripcion/page.js.
 *   params: { event_id: string,
 *             ecommerce: { transaction_id: string, currency: 'COP', value: number,
 *                          items: [{ item_id, item_name, price, quantity }] } }
 *
 * generate_lead → formulario de contacto o descarga de lead magnet
 *   params: { lead_source: 'contact_form' | 'checklist_rac100' }
 */
