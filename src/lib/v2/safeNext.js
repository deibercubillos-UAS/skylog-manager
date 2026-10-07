// Skylog V2.0 — `?next=` solo puede ser una ruta interna: nunca otro sitio (evita redirecciones abiertas).
export function safeNextPath(value) {
  const v = String(value || '');
  return v.startsWith('/') && !v.startsWith('//') && !v.includes('\\') ? v : null;
}
