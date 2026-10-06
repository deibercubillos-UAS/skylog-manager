// Skylog V2.0 — acta (`?kind=act`) y hoja de vida (`?kind=resume`) de una designación. Subir lo hace la
// autoridad de la organización (la misma que designa); verlo, cualquier gestor — la hoja de vida es dato personal.
import { makeRowDocumentRoute } from '@/lib/v2/rowDocument';
import { isDutyManager } from '@/lib/v2/duty';

const KINDS = {
  act: { pathColumn: 'act_document_path', folder: 'designaciones', label: 'acta' },
  resume: { pathColumn: 'resume_document_path', folder: 'designaciones', label: 'hoja-de-vida' },
};
const AUTHORITY_ROLES = ['admin', 'gerente_sms', 'superadmin'];

export const { POST, GET, DELETE } = makeRowDocumentRoute({
  table: 'designations',
  rowLabel: 'la designación',
  resolve: (request) => KINDS[new URL(request.url).searchParams.get('kind')] || null,
  canWrite: (memberships, orgId) => (memberships || []).some((m) => m.organization_id === orgId && AUTHORITY_ROLES.includes(m.role)),
  canRead: (memberships, orgId) => isDutyManager(memberships, orgId),
});
