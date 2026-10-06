// pilotQualifications — CIPU y adiciones del PIC frente a lo que exige una misión (RAC 100 §100.810(d)).
// Lógica pura; fechas 'YYYY-MM-DD' con `today` inyectado. Informativo: avisa, no bloquea.

// Adiciones de la licencia UAS (lista usada por v1 y vigente en el formato del piloto).
export const PILOT_ADDITIONS = [
  'PBMO SUPERIOR A 25 KG Y HASTA 250 KG',
  'DISPERSIÓN',
  'ASPERSIÓN',
  'ENJAMBRE',
  'TRANSPORTE DE CARGA (DRONE DELIVERY)',
  'VUELO NOCTURNO',
  'BVLOS',
  'INSTRUCTOR DE VUELO UAS < 25 KG',
  'INSTRUCTOR DE VUELO UAS 25-250 KG',
  'INSTRUCTOR DE VUELO UAS EN ASPERSIÓN',
  'INSTRUCTOR DE VUELO UAS EN DISPERSIÓN',
  'INSTRUCTOR DE VUELO UAS EN ENJAMBRE',
  'INSTRUCTOR DE VUELO UAS EN CARGA',
  'INSTRUCTOR DE VUELO UAS EN NOCTURNAS',
  'INSTRUCTOR DE VUELO UAS EN BVLOS',
];

/** Adiciones que una misión exige por sí sola: volar BVLOS exige la adición BVLOS. */
export function impliedAdditions({ lineOfSight }) {
  return lineOfSight === 'BVLOS' ? ['BVLOS'] : [];
}

/** Une lo declarado con lo implícito, solo del catálogo y sin repetir. */
export function normalizeRequiredAdditions(declared, ctx = {}) {
  const set = new Set([...(declared || []), ...impliedAdditions(ctx)]);
  return PILOT_ADDITIONS.filter((a) => set.has(a));
}

/**
 * ¿El PIC cumple lo que la misión exige?
 * `additions`: filas { addition, valid_until }. La vigencia debe cubrir el DÍA de la misión (`missionDay`).
 * Devuelve { ok, noLicense, missing: [...], expired: [{addition, validUntil}] }.
 */
export function evaluatePicQualifications({ licenseNumber, additions, required, missionDay }) {
  const noLicense = !(licenseNumber || '').trim();
  const byName = new Map((additions || []).map((a) => [a.addition, a]));
  const missing = [];
  const expired = [];
  for (const req of required || []) {
    const have = byName.get(req);
    if (!have) missing.push(req);
    else if (have.valid_until && have.valid_until < missionDay) expired.push({ addition: req, validUntil: have.valid_until });
  }
  return { ok: !noLicense && missing.length === 0 && expired.length === 0, noLicense, missing, expired };
}

/** Frases legibles para mostrar en la programación. */
export function qualificationMessages(result) {
  const out = [];
  if (result.noLicense) out.push('El PIC no tiene número de licencia/CIPU registrado.');
  if (result.missing.length) out.push(`Al PIC le falta registrar: ${result.missing.join(', ')}.`);
  for (const e of result.expired) out.push(`La adición ${e.addition} del PIC venció el ${e.validUntil}.`);
  return out;
}
