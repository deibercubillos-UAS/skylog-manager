/**
 * Módulo singleton para la tabla colombia_geo.
 *
 * El primer componente que llame a getColombiaGeo() dispara el fetch.
 * Cualquier llamada posterior (mismo mount o diferente componente)
 * recibe la misma Promise — nunca se emiten dos requests simultáneos.
 * Una vez resuelta, la respuesta queda en módulo-level cache para
 * el resto del ciclo de vida de la SPA (no se vuelve a pedir aunque
 * el componente se desmonte y remonte).
 */

let _cache = null;   // datos resueltos
let _promise = null; // request en vuelo

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @returns {Promise<Array>} filas de colombia_geo
 */
export async function getColombiaGeo(supabase) {
  if (_cache) return _cache;

  if (!_promise) {
    _promise = supabase
      .from('colombia_geo')
      .select('*')
      .range(0, 1200)
      .order('Nombre Departamento')
      .then(({ data }) => {
        _cache = data || [];
        return _cache;
      })
      .catch((err) => {
        _promise = null; // permite reintentar en el próximo render
        throw err;
      });
  }

  return _promise;
}
