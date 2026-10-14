// Contexto de la sesión (organizaciones, rol, nombre) para el cliente. El cascarón y cada página lo pedían por
// separado en cada navegación (2 peticiones iguales, cada una con varias consultas a la base). Aquí se comparte una
// sola petición en vuelo y se reutiliza la respuesta 60 s. Devuelve un Response, igual que fetch.
const TTL_MS = 60_000;
let cached = null; // { at, promise }

export function fetchDutyContext() {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.promise.then((r) => r.clone());
  const promise = fetch('/api/duty/context').then((res) => {
    if (!res.ok && cached?.promise === promise) cached = null; // los errores no se guardan
    return res;
  });
  promise.catch(() => { if (cached?.promise === promise) cached = null; });
  cached = { at: now, promise };
  return promise.then((r) => r.clone());
}

export function invalidateDutyContext() {
  cached = null;
}
