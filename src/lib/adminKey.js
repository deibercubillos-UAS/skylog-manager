import crypto from 'crypto';

/**
 * Valida el header `x-admin-key` contra ADMIN_SECRET con comparación de
 * tiempo constante.
 *
 * ⚠️ Regla crítica de seguridad: si ADMIN_SECRET NO está configurada en el
 * entorno, esta función SIEMPRE devuelve false. Sin este guard, un `secret`
 * vacío ('') igualaría en longitud a una petición sin header (`key` = '') y
 * `timingSafeEqual` de dos buffers vacíos devuelve `true` → cualquiera con la
 * URL tendría acceso total. Mismo patrón defensivo que los crons
 * (`if (!secret) return false`).
 */
export function verifyAdminKey(request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  const key = request.headers.get('x-admin-key') || '';
  // timingSafeEqual exige buffers de igual longitud — comparar la longitud
  // primero evita la excepción y no filtra la del secreto (ya se sabe != vacío).
  if (key.length !== secret.length) return false;
  return crypto.timingSafeEqual(Buffer.from(key), Buffer.from(secret));
}
