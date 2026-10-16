// Skylog V2.0 — foto de una aeronave (v1 `aircraft.image_url`). Sube un gestor; ve cualquier miembro de la
// organización. Mismo patrón que los demás adjuntos (`lib/v2/rowDocument.js`).
import { makeRowDocumentRoute } from '@/lib/v2/rowDocument';
import { membershipsCanEdit } from '@/lib/v2/permissions';


export const { POST, GET, DELETE } = makeRowDocumentRoute({
  table: 'aircraft',
  rowLabel: 'la aeronave',
  resolve: () => ({ pathColumn: 'image_path', folder: 'aeronaves', label: 'foto' }),
  canWrite: (memberships, orgId) => membershipsCanEdit(memberships, orgId, 'I4'),
  canRead: (memberships, orgId) => (memberships || []).some((m) => m.organization_id === orgId),
});
