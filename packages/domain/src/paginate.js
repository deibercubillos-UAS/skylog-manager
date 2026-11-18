// Lectura completa de una consulta paginada. PostgREST devuelve como máximo 1000 filas por petición y corta en silencio:
// un reporte con más filas salía incompleto sin avisar. `fetchPage(from, to)` pide el rango (ambos extremos incluidos)
// y devuelve { data, error }. Termina cuando una página viene incompleta; `truncated` avisa si se llegó al tope de páginas.
export async function fetchAllPages(fetchPage, { pageSize = 1000, maxPages = 50 } = {}) {
  const rows = [];
  for (let page = 0; page < maxPages; page++) {
    const from = page * pageSize;
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) return { rows: null, error, truncated: false };
    const chunk = data || [];
    rows.push(...chunk);
    if (chunk.length < pageSize) return { rows, error: null, truncated: false };
  }
  return { rows, error: null, truncated: true };
}
