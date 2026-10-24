/**
 * analytics.js — eventos de medición vía Google Tag Manager
 *
 * Todo evento se emite con pushDataLayer; GTM (cargado solo tras aceptar cookies)
 * los reenvía a GA4 y a LinkedIn. GA4 ya no se carga desde el código: un
 * <GoogleAnalytics> adicional duplicaba cada visita.
 */

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
 * sign_up      → cuenta nueva creada (/registro, /registro/completar, /invitacion/[token]). Se emite con
 *                pushDataLayer; GTM lo escucha por nombre de evento, no por URL.
 *   params: { method: 'email' | 'google' | 'join_org' | 'invitation' }
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
