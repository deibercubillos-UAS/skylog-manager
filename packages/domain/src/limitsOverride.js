// limitsOverride — límites de una organización cuando el superadmin los ajusta por encima o por debajo de los de su plan
// (`subscriptions.limits_override`). Número = ese límite; null = ilimitado; llave ausente = rige el del plan.

export const LIMIT_KINDS = ['pilots', 'aircraft', 'batteries'];
export const MAX_LIMIT = 10000;

const validNumber = (v) => Number.isInteger(v) && v >= 0 && v <= MAX_LIMIT;

/**
 * Límites efectivos = los del plan con el ajuste aplicado. Un valor inválido en el ajuste se ignora (rige el del plan).
 * @param {{pilots: number|null, aircraft: number|null, batteries: number|null}} planLimits
 * @param {object|null|undefined} override
 */
export function effectiveLimits(planLimits, override) {
  const out = { ...planLimits };
  if (!override || typeof override !== 'object' || Array.isArray(override)) return out;
  for (const k of LIMIT_KINDS) {
    if (!(k in override)) continue;
    const v = override[k];
    if (v === null || validNumber(v)) out[k] = v;
  }
  return out;
}

/**
 * Valida el ajuste que envía el panel. Devuelve `{ value }` (objeto sin llaves de más, o null si no queda ningún ajuste)
 * o `{ error }`.
 */
export function normalizeLimitsOverride(input) {
  if (input === null || input === undefined) return { value: null };
  if (typeof input !== 'object' || Array.isArray(input)) return { error: 'Los límites deben ser un objeto.' };
  const value = {};
  for (const [k, v] of Object.entries(input)) {
    if (!LIMIT_KINDS.includes(k)) return { error: `Límite desconocido: ${k}.` };
    if (v !== null && !validNumber(v)) return { error: `El límite de ${k} debe ser un número entero entre 0 y ${MAX_LIMIT}, o ilimitado.` };
    value[k] = v;
  }
  return { value: Object.keys(value).length ? value : null };
}
