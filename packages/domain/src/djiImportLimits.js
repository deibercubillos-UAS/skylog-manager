// djiImportLimits — topes de la importación manual de logs DJI (auditoría 2026-11-12). Cada log sube a la ruta, se
// descifra y, para los logs recientes, pide las llaves a DJI con la `DJI_API_KEY` COMPARTIDA de la plataforma: sin tope,
// cualquier miembro agotaba la cuota de todos y gastaba CPU del servidor. Lógica pura, con pruebas.

// Vercel rechaza cualquier petición de más de 4,5 MB ANTES de que llegue a la ruta (responde texto, no JSON): los topes
// por archivo y por petición quedan por debajo de ese techo, y la pantalla envía un log por petición.
export const VERCEL_MAX_BODY_BYTES = 4.5 * 1024 * 1024;

export const DJI_IMPORT_LIMITS = {
  maxFilesPerRequest: 10,
  maxBytesPerFile: 4 * 1024 * 1024, // un log real pesa de cientos de KB a unos pocos MB
  maxBytesPerRequest: 4.4 * 1024 * 1024,
  // Ritmo por persona (cada archivo cuenta): 40 logs cada 10 minutos.
  filesPerWindow: 40,
  windowMs: 10 * 60 * 1000,
};

/**
 * `sizes`: tamaños en bytes de los archivos recibidos. Devuelve { ok: true } o { ok: false, status, error }.
 */
export function checkDjiImportBatch(sizes, limits = DJI_IMPORT_LIMITS) {
  const list = Array.isArray(sizes) ? sizes : [];
  if (list.length === 0) return { ok: false, status: 400, error: 'Sube al menos un archivo .txt de log DJI' };
  if (list.length > limits.maxFilesPerRequest) {
    return { ok: false, status: 413, error: `Sube como máximo ${limits.maxFilesPerRequest} logs por vez.` };
  }
  if (list.some((n) => !Number.isFinite(n) || n > limits.maxBytesPerFile)) {
    return { ok: false, status: 413, error: `Cada log debe pesar como máximo ${Math.round(limits.maxBytesPerFile / 1024 / 1024)} MB.` };
  }
  if (list.reduce((a, n) => a + n, 0) > limits.maxBytesPerRequest) {
    return { ok: false, status: 413, error: 'Los archivos juntos pesan demasiado. Sube menos logs por vez.' };
  }
  return { ok: true };
}
