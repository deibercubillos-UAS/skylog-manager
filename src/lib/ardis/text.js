export function stripAccents(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function collapseSpaces(text) {
  return text.replace(/\s+/g, ' ').trim();
}

export function normalizeForMatch(text) {
  return stripAccents(text.trim().toLowerCase());
}
