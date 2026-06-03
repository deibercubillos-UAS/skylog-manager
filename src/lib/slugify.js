/**
 * slugify.js
 * Convierte un nombre de empresa en un slug URL-seguro.
 *
 * Ejemplos:
 *   "Drone Tech Colombia SAS"  → "drone-tech-colombia-sas"
 *   "Aerofoto & Cía. Ltda."    → "aerofoto-cia-ltda"
 *   "Piloto: Juan García"      → "piloto-juan-garcia"
 *   "AEROUAS S.A.S"            → "aerouas-sas"
 */
export function slugify(text) {
  return (text || '')
    // 1. Normalizar Unicode → descomponer acentos (NFD) y eliminar diacríticos
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // 2. Minúsculas
    .toLowerCase()
    // 3. Reemplazar caracteres especiales comunes por separador o nada
    .replace(/[&]/g,  '-and-')
    .replace(/[ñ]/g,  'n')
    // 4. Eliminar todo lo que no sea alfanumérico ni espacio ni guion
    .replace(/[^a-z0-9\s-]/g, '')
    // 5. Espacios/underscores → guion
    .replace(/[\s_]+/g, '-')
    // 6. Múltiples guiones seguidos → uno solo
    .replace(/-{2,}/g, '-')
    // 7. Recortar guiones al inicio/fin
    .replace(/^-+|-+$/g, '')
    // 8. Límite de longitud
    .substring(0, 60);
}

/**
 * Genera un slug único añadiendo un sufijo numérico si ya existe.
 * checkExists(slug) debe retornar true si el slug ya está ocupado.
 */
export async function uniqueSlug(base, checkExists) {
  const clean = slugify(base);
  if (!clean) return `org-${Math.random().toString(36).slice(2, 8)}`;

  if (!(await checkExists(clean))) return clean;

  for (let i = 2; i <= 99; i++) {
    const candidate = `${clean}-${i}`;
    if (!(await checkExists(candidate))) return candidate;
  }

  // Fallback: añadir 6 chars random
  return `${clean}-${Math.random().toString(36).slice(2, 8)}`;
}
