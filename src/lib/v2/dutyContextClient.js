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

// ── Organización seleccionada (selector del encabezado) ──────────────────────────────────────────────────
// Antes cada pantalla tomaba `organizations[0]` por su cuenta: el selector del encabezado cambiaba el título pero
// la pantalla seguía mostrando (y escribiendo en) la primera organización. Ahora hay UNA organización elegida,
// compartida por todas las pantallas y recordada durante la pestaña (sessionStorage).
const ORG_KEY = 'bitafly_v2_org';
let selectedOrganizationId = null;

export function getSelectedOrganizationId() {
  if (selectedOrganizationId) return selectedOrganizationId;
  try { selectedOrganizationId = window.sessionStorage.getItem(ORG_KEY) || null; } catch { /* sin storage: solo memoria */ }
  return selectedOrganizationId;
}

export function setSelectedOrganizationId(id) {
  selectedOrganizationId = id || null;
  try { if (id) window.sessionStorage.setItem(ORG_KEY, id); else window.sessionStorage.removeItem(ORG_KEY); } catch { /* sin storage */ }
}

/** La organización elegida si sigue siendo del contexto; si no, la primera. */
export function pickOrganizationId(ctx) {
  const orgs = ctx?.organizations || [];
  const chosen = getSelectedOrganizationId();
  if (chosen && orgs.some((o) => o.id === chosen)) return chosen;
  return orgs[0]?.id || '';
}
