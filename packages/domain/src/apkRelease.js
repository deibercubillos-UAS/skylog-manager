// apkRelease — validación de una versión del APK que se publica por OTA (auditoría 2026-11-12, puente de Android).
// La app instala lo que apunte `apk_url`, así que el origen se limita a una lista de hosts y el APK debe traer su
// huella SHA-256: la app la compara con lo que descargó antes de lanzar el instalador. Lógica pura, con pruebas.

/** Host desde el que se sirven los APK (bucket público de releases). */
export const APK_ALLOWED_HOSTS = ['releases.bitafly.com'];

/** SHA-256 en hexadecimal (64 caracteres), normalizado a minúsculas; null si no es válido. */
export function normalizeApkSha256(value) {
  const v = String(value || '').trim().toLowerCase();
  return /^[0-9a-f]{64}$/.test(v) ? v : null;
}

/**
 * Valida `apkUrl` (https, sin credenciales ni puerto, host permitido) y `apkSha256`.
 * Devuelve { ok: true, apkUrl, apkSha256 } o { ok: false, error }.
 */
export function validateApkRelease({ apkUrl, apkSha256, allowedHosts = APK_ALLOWED_HOSTS } = {}) {
  let url;
  try {
    url = new URL(String(apkUrl || '').trim());
  } catch {
    return { ok: false, error: 'apkUrl debe ser una URL https válida' };
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) {
    return { ok: false, error: 'apkUrl debe ser una URL https sin credenciales ni puerto' };
  }
  if (!allowedHosts.includes(url.hostname.toLowerCase())) {
    return { ok: false, error: `apkUrl debe estar en ${allowedHosts.join(', ')}` };
  }
  const sha = normalizeApkSha256(apkSha256);
  if (!sha) return { ok: false, error: 'apkSha256 es requerido: la huella SHA-256 del APK (64 caracteres hexadecimales)' };
  return { ok: true, apkUrl: url.toString(), apkSha256: sha };
}
