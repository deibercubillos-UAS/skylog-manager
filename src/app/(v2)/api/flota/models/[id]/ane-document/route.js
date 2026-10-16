// Skylog V2.0 — autorización de la ANE (banda de frecuencias licenciada) de un modelo de UAS. Lo gestiona un
// gestor; cualquier miembro de la organización puede consultarla (es parte de la ficha técnica).
import { makeRowDocumentRoute } from '@/lib/v2/rowDocument';
import { membershipsCanEdit } from '@/lib/v2/permissions';


export const { POST, GET, DELETE } = makeRowDocumentRoute({
  table: 'aircraft_models',
  rowLabel: 'el modelo',
  resolve: () => ({ pathColumn: 'ane_authorization_path', folder: 'modelos', label: 'autorizacion-ane' }),
  canWrite: (memberships, orgId) => membershipsCanEdit(memberships, orgId, 'I10'),
  canRead: (memberships, orgId) => (memberships || []).some((m) => m.organization_id === orgId),
});
