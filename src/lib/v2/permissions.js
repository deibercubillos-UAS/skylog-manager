// Skylog V2.0 — permisos por rol. La matriz vive en packages/domain/src/permissionsMatrix.js
// (decisión del usuario 2026-10-15, documentada en docs/skylog-v2/70-matriz-de-permisos.md).
// Las rutas usan estos helpers con el id de la función de la matriz (p. ej. 'I2' = registrar aeronave).
export { membershipsCanEdit, membershipsCanView, permissionLevel, canEdit, canView } from '@skylog/domain';
