// Comparación de secretos en tiempo constante (el `===` de JS se corta en la primera diferencia y filtra, por el tiempo
// de respuesta, cuántos caracteres acertó quien adivina). Se comparan los SHA-256 de ambos valores: así `timingSafeEqual`
// recibe siempre buffers de igual largo y tampoco se filtra el largo del secreto.
import crypto from 'crypto';

export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a ?? '')).digest();
  const hb = crypto.createHash('sha256').update(String(b ?? '')).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/** ¿La petición trae `Authorization: Bearer <CRON_SECRET>`? Sin secreto configurado, nunca. */
export function isCronAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return safeEqual(request.headers.get('authorization') || '', `Bearer ${secret}`);
}
