// Skylog V2.0 — la app de Google Play (variante `play` de android/) agrega este texto al user-agent de su WebView.
// Google Play exige su propio sistema de facturación para vender suscripciones digitales dentro de la app, así que en
// esa variante no se muestra ni se acepta ningún pago (el cobro sigue funcionando en la web y en la app `direct`).
export const PLAY_APP_UA = 'BitaFlyPlay';

/** En el navegador: ¿corre dentro de la app de Google Play? */
export function isPlayApp() {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes(PLAY_APP_UA);
}

/** En el servidor: ¿la petición viene de la app de Google Play? */
export function isPlayAppRequest(request) {
  return (request.headers.get('user-agent') || '').includes(PLAY_APP_UA);
}
