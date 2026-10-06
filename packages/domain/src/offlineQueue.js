// offlineQueue — cola de envíos pendientes y borradores para trabajar donde no hay señal. Lógica pura (sin
// navegador ni red): quien llama guarda/lee la cola y hace el fetch. Principio de V2: *se bloquea lo que se va a
// hacer, se registra lo que ya se hizo* — por eso el CIERRE de un vuelo (algo que ya ocurrió) se puede encolar sin
// conexión, pero el DESPACHO (que depende de verificaciones del servidor: tiempos de servicio, capacitación,
// aeronave) nunca se encola: solo se conservan las respuestas como borrador.

export const DRAFT_MAX_AGE_HOURS = 12;
export const QUEUE_MAX_AGE_DAYS = 14;

/** Agrega un envío; si ya había uno con la misma clave (un cierre por despacho), queda el más reciente. */
export function enqueue(queue, item) {
  return [...(queue || []).filter((q) => q.key !== item.key), { attempts: 0, status: 'pendiente', ...item }];
}

export function removeFromQueue(queue, key) {
  return (queue || []).filter((q) => q.key !== key);
}

/**
 * ¿Qué hacer con el resultado de enviar un elemento de la cola?
 *  - sent:      el servidor lo aceptó → quitarlo.
 *  - duplicate: el servidor dice que ya estaba registrado (409) → quitarlo, no es un error.
 *  - attention: el servidor lo rechazó (400/403/404/422…) → conservarlo, avisar y NO reintentar solo.
 *  - retry:     sin red o error del servidor (5xx/503) → reintentar más tarde.
 */
export function classifySyncResult({ networkError, status }) {
  if (networkError) return 'retry';
  if (status >= 200 && status < 300) return 'sent';
  if (status === 409) return 'duplicate';
  if (status === 408 || status === 429 || status >= 500) return 'retry';
  return 'attention';
}

/** Aplica el resultado a la cola: devuelve la cola nueva. */
export function applySyncResult(queue, key, outcome, message) {
  if (outcome === 'sent' || outcome === 'duplicate') return removeFromQueue(queue, key);
  return (queue || []).map((q) => {
    if (q.key !== key) return q;
    if (outcome === 'attention') return { ...q, status: 'atencion', lastError: message || 'El servidor rechazó el envío' };
    return { ...q, attempts: (q.attempts || 0) + 1, lastError: message || null };
  });
}

/** Elementos que se pueden enviar ahora: pendientes (no los que esperan atención) y del usuario actual. */
export function dueItems(queue, ownerId) {
  return (queue || []).filter((q) => q.status !== 'atencion' && (!q.ownerId || q.ownerId === ownerId));
}

/** Descarta lo demasiado viejo (un cierre de hace semanas sin enviar ya no es confiable de reenviar solo). */
export function pruneQueue(queue, nowMs, maxAgeDays = QUEUE_MAX_AGE_DAYS) {
  return (queue || []).filter((q) => nowMs - Date.parse(q.queuedAt) <= maxAgeDays * 86_400_000);
}

export function isDraftFresh(draft, nowMs, maxAgeHours = DRAFT_MAX_AGE_HOURS) {
  if (!draft?.savedAt) return false;
  const age = nowMs - Date.parse(draft.savedAt);
  return age >= 0 && age <= maxAgeHours * 3_600_000;
}
