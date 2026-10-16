// Skylog V2.0 — `?next=` solo puede ser una ruta interna: nunca otro sitio (evita redirecciones abiertas). Se rechazan
// los caracteres de control y los espacios: el navegador los ignora, así que `/\t/sitio.com` terminaba en otro dominio
// (auditoría 2026-10-16). Además se resuelve la ruta y se exige que siga en el mismo origen.
const BASE = 'https://ruta.interna';

export function safeNextPath(value) {
  const v = String(value || '');
  if (!v.startsWith('/') || v.startsWith('//') || /[\\\s\u0000-\u001f\u007f]/.test(v)) return null;
  try {
    const url = new URL(v, BASE);
    return url.origin === BASE ? url.pathname + url.search + url.hash : null;
  } catch {
    return null;
  }
}
