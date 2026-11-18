// Mensajes de error de la base de datos para el usuario. Un error de Postgres/PostgREST trae nombres de tablas, columnas
// y políticas («new row violates row-level security policy for table "flights"»): eso no se muestra, se registra en el
// servidor. Solo pasa tal cual el mensaje de un `raise exception` escrito por nosotros (código P0001, o 23001 en las reglas de evidencia inmutable de despacho y custodia), que ya es texto de
// negocio en español. Todo lo demás se traduce a un mensaje claro y un estado HTTP acorde.
const KNOWN = {
  '23505': [409, 'Ya existe un registro igual.'],
  '23503': [409, 'No se puede completar: el registro está relacionado con otros datos.'],
  '23502': [400, 'Falta un dato obligatorio.'],
  '23514': [400, 'Algún dato no cumple las reglas permitidas.'],
  '22P02': [400, 'Algún dato tiene un formato no válido.'],
  '22001': [400, 'Algún texto es demasiado largo.'],
  '22003': [400, 'Algún número está fuera del rango permitido.'],
  '42501': [403, 'No tienes permiso para esta acción.'],
  PGRST116: [404, 'No se encontró el registro.'],
};

export const GENERIC_ERROR_MESSAGE = 'No se pudo completar la acción. Intenta de nuevo; si el problema continúa, contacta a soporte.';

/** @returns {{ status: number, message: string }} */
export function describeDbError(error, defaultStatus = 500) {
  const code = error?.code ? String(error.code) : '';
  if ((code === 'P0001' || code === '23001') && typeof error.message === 'string' && error.message.trim()) return { status: 400, message: error.message.trim().slice(0, 300) };
  const known = KNOWN[code];
  if (known) return { status: known[0], message: known[1] };
  return { status: defaultStatus, message: GENERIC_ERROR_MESSAGE };
}
