/**
 * Rate limiter COMPARTIDO entre instancias (hallazgo S3).
 *
 * El conteo vive en Postgres (tabla `rate_limits` + función atómica `check_rate_limit`,
 * migración 20261118140000), así el límite vale global y no por instancia Vercel.
 * Si la base no responde —o la migración aún no se aplicó— cae al limitador en memoria
 * (fail-open): una caída de la base no debe tumbar registro/contacto. El limitador en
 * memoria sigue dando protección por instancia mientras tanto.
 *
 * `checkRateLimit` es ASÍNCRONA: todas las rutas la usan con `await`.
 *
 * USO:
 *   const ip = getClientIp(request);
 *   const { allowed } = await checkRateLimit(`vor:${ip}`, { limit: 5, windowMs: 60_000 });
 *   if (!allowed) return Response.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
 */
import { createAdminClient } from '@/lib/supabaseServer';

// ── Respaldo en memoria (por instancia) ────────────────────────────────────
// { key: { count: number, resetAt: number } }
const store = new Map();

// Limpieza periódica de entradas expiradas (evita crecimiento indefinido del Map)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

function checkRateLimitLocal(key, { limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { allowed: true, remaining: limit - 1, resetAt: entry.resetAt };
  }

  entry.count++;
  store.set(key, entry);

  if (entry.count > limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// ── Limitador compartido (Postgres) ────────────────────────────────────────
/**
 * @param {string}  key       — identificador único (ej: `ruta:ip`)
 * @param {object}  opts
 * @param {number}  opts.limit     — máximo de requests permitidos en la ventana
 * @param {number}  opts.windowMs  — duración de la ventana en milisegundos
 * @returns {Promise<{ allowed: boolean, remaining: number, resetAt: number }>}
 */
export async function checkRateLimit(key, { limit = 10, windowMs = 60_000 } = {}) {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('check_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_ms: windowMs,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('check_rate_limit sin respuesta');
    return {
      allowed: row.allowed,
      remaining: row.remaining,
      resetAt: new Date(row.reset_at).getTime(),
    };
  } catch (e) {
    // Fail-open al limitador en memoria (incluye el caso «la migración aún no se aplicó»).
    console.warn('[rateLimiter] almacén compartido no disponible; uso memoria local:', e?.message || e);
    return checkRateLimitLocal(key, { limit, windowMs });
  }
}

/**
 * Extrae la IP real del cliente desde los headers de Vercel/Next.js.
 * Prioriza x-forwarded-for (proxy) sobre x-real-ip.
 *
 * @param {Request} request
 * @returns {string}
 */
export function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}
