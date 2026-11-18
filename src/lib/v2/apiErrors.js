// Respuesta de error para fallos de la base de datos: el detalle técnico va al registro del servidor y el usuario recibe un
// mensaje claro (ver `describeDbError`). Uso: `if (error) return dbError(error, 'flights');`
import { describeDbError } from '@skylog/domain';

export function dbError(error, context = '', defaultStatus = 500) {
  console.error(`[${context || 'api'}]`, error?.code || '', error?.message || error);
  const { status, message } = describeDbError(error, defaultStatus);
  return Response.json({ error: message }, { status });
}
