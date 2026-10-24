// Skylog V2.0 — adjunto de un evento de mantenimiento (orden de trabajo, informe, recibo; v1 `attachment_path`).
// Lo sube y lo ve un gestor (como el resto del módulo de mantenimiento).
import { makeRowDocumentRoute } from '@/lib/v2/rowDocument';
import { membershipsCanEdit, membershipsCanView } from '@/lib/v2/permissions';


export const { POST, GET, DELETE } = makeRowDocumentRoute({
  table: 'maintenance_events',
  rowLabel: 'el evento de mantenimiento',
  adminWrites: true, // el evento es inmutable para el usuario (sin política de UPDATE); solo document_path se escribe con la llave de servicio
  resolve: () => ({ pathColumn: 'document_path', folder: 'mantenimiento', label: 'adjunto' }),
  canWrite: (memberships, orgId) => membershipsCanEdit(memberships, orgId, 'L2'),
  canRead: (memberships, orgId) => membershipsCanView(memberships, orgId, 'L2'),
});
