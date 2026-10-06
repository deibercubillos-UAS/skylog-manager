// Skylog V2.0 — adjunto de un evento de mantenimiento (orden de trabajo, informe, recibo; v1 `attachment_path`).
// Lo sube y lo ve un gestor (como el resto del módulo de mantenimiento).
import { makeRowDocumentRoute } from '@/lib/v2/rowDocument';
import { isDutyManager } from '@/lib/v2/duty';

export const { POST, GET, DELETE } = makeRowDocumentRoute({
  table: 'maintenance_events',
  rowLabel: 'el evento de mantenimiento',
  resolve: () => ({ pathColumn: 'document_path', folder: 'mantenimiento', label: 'adjunto' }),
  canWrite: (memberships, orgId) => isDutyManager(memberships, orgId),
  canRead: (memberships, orgId) => isDutyManager(memberships, orgId),
});
