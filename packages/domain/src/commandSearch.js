// commandSearch — búsqueda de la paleta de comandos (⌘K / Ctrl+K). Lógica pura: normaliza (sin tildes ni
// mayúsculas), puntúa y ordena. Cada ítem: { id, title, subtitle?, keywords? }.

export function normalizeText(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** 0 = no coincide. Mayor = mejor: empieza por la consulta > empieza una palabra > aparece dentro > todas las palabras aparecen. */
export function scoreItem(item, query) {
  const q = normalizeText(query);
  if (!q) return 1;
  const title = normalizeText(item.title);
  const hay = `${title} ${normalizeText(item.subtitle)} ${normalizeText(item.keywords)}`;
  if (title.startsWith(q)) return 100;
  if (title.split(/\s+/).some((w) => w.startsWith(q))) return 80;
  if (title.includes(q)) return 60;
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length > 1 && words.every((w) => hay.includes(w))) return 40;
  if (hay.includes(q)) return 30;
  return 0;
}

/** Filtra y ordena (estable por posición original); `limit` recorta. Sin consulta devuelve los primeros `limit`. */
export function rankItems(items, query, limit = 8) {
  return (items || [])
    .map((item, index) => ({ item, index, score: scoreItem(item, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((x) => x.item);
}
