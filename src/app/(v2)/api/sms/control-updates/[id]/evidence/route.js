// Skylog V2.0 — SMS Matriz de peligros: evidencia (PDF/imagen) de un avance de
// control. Bucket privado, path nunca expuesto, descarga por URL firmada tras
// validar membresía. Subir/quitar: gestor SMS (P2); ver: cualquiera que vea la
// matriz (P1). Mismo patrón que pólizas, acta de designación, foto de aeronave.
import { makeRowDocumentRoute } from '@/lib/v2/rowDocument';
import { membershipsCanView, membershipsCanEdit } from '@/lib/v2/permissions';

export const { POST, GET, DELETE } = makeRowDocumentRoute({
  table: 'hazard_control_updates',
  rowLabel: 'el avance',
  resolve: () => ({ pathColumn: 'evidence_path', folder: 'peligros-evidencias', label: 'evidencia' }),
  canWrite: (memberships, orgId) => membershipsCanEdit(memberships, orgId, 'P2'),
  canRead: (memberships, orgId) => membershipsCanView(memberships, orgId, 'P1'),
});
