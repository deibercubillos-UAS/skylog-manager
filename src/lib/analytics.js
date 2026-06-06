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
 * Eventos estándar de GA4 usados en BitaFly
 * ─────────────────────────────────────────
 *
 * sign_up      → nuevo usuario registrado (gratis, pago o unirse a org)
 *   params: { method: 'email' | 'join_org', plan: 'piloto' | 'escuadrilla' | 'flota' }
 *
 * purchase     → pago ePayco confirmado (plan pago activado)
 *   params: { currency: 'COP', value: number, transaction_id: string,
 *             items: [{ item_id: string, item_name: string, price: number }] }
 *
 * generate_lead → formulario de contacto o descarga de lead magnet
 *   params: { lead_source: 'contact_form' | 'checklist_rac100' }
 */
