// Skylog V2.0 — acta (`?kind=act`) y hoja de vida (`?kind=resume`) de una designación. Subir lo hace quien designa
// (AD9: GG y Gerente SMS). El acta la ve quien ve los cargos (AD8); la hoja de vida es dato personal y solo la ve quien
// puede ver el expediente de otro tripulante (K10) — antes también el Piloto (auditoría 2026-10-16).
import { makeRowDocumentRoute } from '@/lib/v2/rowDocument';
import { membershipsCanView, membershipsCanEdit } from '@/lib/v2/permissions';

const KINDS = {
  act: { pathColumn: 'act_document_path', folder: 'designaciones', label: 'acta' },
  resume: { pathColumn: 'resume_document_path', folder: 'designaciones', label: 'hoja-de-vida' },
};

export const { POST, GET, DELETE } = makeRowDocumentRoute({
  table: 'designations',
  rowLabel: 'la designación',
  resolve: (request) => KINDS[new URL(request.url).searchParams.get('kind')] || null,
  canWrite: (memberships, orgId) => membershipsCanEdit(memberships, orgId, 'AD9'),
  canRead: (memberships, orgId, target) => membershipsCanView(memberships, orgId, target?.label === 'hoja-de-vida' ? 'K10' : 'AD8'),
});
