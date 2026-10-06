// Skylog V2.0 — almacenamiento local (solo navegador) de la cola de cierres de vuelo pendientes y de los
// borradores del Despacho. Toda lectura/escritura va en try/catch: el modo privado o el almacenamiento lleno no
// deben romper la pantalla (se pierde la comodidad, no la función). La lógica de la cola vive en
// packages/domain/src/offlineQueue.js.
const QUEUE_KEY = 'skylog_v2_pending_closes';
const DRAFT_PREFIX = 'skylog_v2_dispatch_draft:';
export const QUEUE_EVENT = 'skylog:queue-changed'; // la cola cambió → refrescar lo que se muestra
export const ENQUEUED_EVENT = 'skylog:queue-enqueued'; // se agregó algo → intentar enviarlo ya (distinto, para no ciclar al escribir)

function read(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function write(key, value) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const readQueue = () => (Array.isArray(read(QUEUE_KEY)) ? read(QUEUE_KEY) : []);
export function writeQueue(queue) {
  const ok = write(QUEUE_KEY, queue.length ? queue : null);
  try {
    window.dispatchEvent(new Event(QUEUE_EVENT));
  } catch {}
  return ok;
}

export const readDraft = (missionId) => read(DRAFT_PREFIX + missionId);
export const writeDraft = (missionId, data) => write(DRAFT_PREFIX + missionId, { ...data, savedAt: new Date().toISOString() });
export const clearDraft = (missionId) => write(DRAFT_PREFIX + missionId, null);

/** Un fallo de red de fetch() es un TypeError («Failed to fetch» / «Load failed» / «NetworkError…»). */
export const isNetworkError = (e) => e instanceof TypeError || /failed to fetch|load failed|network/i.test(e?.message || '');

/** Guarda la cola con un cierre nuevo y avisa al sincronizador para que lo intente de inmediato. */
export function saveQueueAndSync(queue) {
  const ok = writeQueue(queue);
  try {
    window.dispatchEvent(new Event(ENQUEUED_EVENT));
  } catch {}
  return ok;
}
