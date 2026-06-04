/**
 * Rate limiter en memoria — sin dependencias externas.
 *
 * LIMITACIÓN: el estado vive en la instancia Vercel actual.
 * Un abusador que llegue a otra instancia no quedará bloqueado.
 * Para protección global entre instancias, migrar a Upstash Redis
 * con @upstash/ratelimit (drop-in replacement de checkRateLimit).
 *
 * USO:
 *   const ip = getClientIp(request);
 *   const { allowed } = checkRateLimit(`vor:${ip}`, { limit: 5, windowMs: 60_000 });
 *   if (!allowed) return NextResponse.json({ error: 'Demasiadas solicitudes' }, { status: 429 });
 */

// { key: { count: number, resetAt: number } }
const store = new Map();

// Limpieza periódica de entradas expiradas (evita crecimiento indefinido del Map)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

/**
 * @param {string}  key       — identificador único (ej: `ruta:ip`)
 * @param {object}  opts
 * @param {number}  opts.limit     — máximo de requests permitidos en la ventana
 * @param {number}  opts.windowMs  — duración de la ventana en milisegundos
 * @returns {{ allowed: boolean, remaining: number, resetAt: number }}
 */
export function checkRateLimit(key, { limit = 10, windowMs = 60_000 } = {}) {
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
