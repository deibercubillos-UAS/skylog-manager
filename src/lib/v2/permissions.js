// Skylog V2.0 — permisos por rol. La matriz vive en packages/domain/src/permissionsMatrix.js
// (decisión del usuario 2026-10-15, documentada en docs/skylog-v2/70-matriz-de-permisos.md).
// Las rutas usan estos helpers con el id de la función de la matriz (p. ej. 'I2' = registrar aeronave).
export { membershipsCanEdit, membershipsCanView, permissionLevel, canEdit, canView } from '@skylog/domain';

import { membershipIsReadOnly } from '@skylog/domain';

/** 403 si la organización está en solo lectura por plan vencido; null si se puede escribir. Para las rutas que no pasan por `membershipsCanEdit`. */
export function readOnlyBlock(memberships, organizationId) {
  if (!membershipIsReadOnly(memberships, organizationId)) return null;
  return Response.json({ error: 'La organización está en solo lectura porque el plan venció. Renueva el pago para volver a registrar.', readOnly: true }, { status: 403 });
}
