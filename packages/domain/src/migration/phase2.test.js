import { describe, it, expect } from 'vitest';
import { transformMaintenance, joinSupplierContact, remapAuditResponses, mapManualStatus, newFileKey, groupChecklists, transformProtocol, v1ObjectRef, personDocuments } from './phase2.js';

const ctx = { aircraft: (id) => (id === 'a1' ? 'A1' : null), organization: (id) => (id === 'o1' ? 'O1' : null) };
const log = (o = {}) => ({ organization_id: 'o1', aircraft_id: 'a1', maintenance_type: 'PREVENTIVO', description: 'Cambio de hélices', technician_name: 'Pedro', maintenance_date: '2026-02-03', hours_at_service: 12.5, ...o });

describe('transformMaintenance', () => {
  it('preventivo → programado, con técnico y horas', () => {
    const r = transformMaintenance(log(), ctx);
    expect(r.ok).toBe(true);
    expect(r.row).toMatchObject({ type: 'programado', performed_at: '2026-02-03T05:00:00.000Z', performed_at_aircraft_hours: 12.5, findings: 'Cambio de hélices\nTécnico: Pedro' });
  });
  it('MENOR → menor; tipo desconocido → correctivo con aviso', () => {
    expect(transformMaintenance(log({ maintenance_type: 'MENOR' }), ctx).row.type).toBe('menor');
    const raro = transformMaintenance(log({ maintenance_type: 'Otro' }), ctx);
    expect(raro.row.type).toBe('correctivo');
    expect(raro.warnings[0]).toMatch(/sin equivalente/);
  });
  it('horas vacías quedan nulas; sin fecha, aeronave u organización se omite', () => {
    expect(transformMaintenance(log({ hours_at_service: null }), ctx).row.performed_at_aircraft_hours).toBeNull();
    expect(transformMaintenance(log({ maintenance_date: null }), ctx)).toMatchObject({ ok: false });
    expect(transformMaintenance(log({ aircraft_id: 'zz' }), ctx)).toMatchObject({ ok: false, reason: 'aeronave no migrada' });
    expect(transformMaintenance(log({ organization_id: 'zz' }), ctx).ok).toBe(false);
  });
  it('lleva las rutas de adjunto y recibo para la copia de archivos', () => {
    const r = transformMaintenance(log({ attachment_path: 'orgs/x/a.pdf', return_doc_path: 'orgs/x/r.pdf', return_checklist: { 1: true } }), ctx);
    expect(r).toMatchObject({ attachment: 'orgs/x/a.pdf', receipt: 'orgs/x/r.pdf', hasChecklists: true });
  });
});

describe('proveedores y manuales', () => {
  it('contacto en un solo texto', () => {
    expect(joinSupplierContact({ contact_name: 'Ana', contact_email: 'a@x.co', contact_phone: '300' })).toBe('Ana · a@x.co · 300');
    expect(joinSupplierContact({})).toBeNull();
  });
  it('respuestas de auditoría re-indexadas al criterio nuevo; las huérfanas se informan', () => {
    const map = (id) => ({ c1: 'N1' }[id] || null);
    expect(remapAuditResponses({ c1: { value: 'cumple' }, c9: { value: 'no_cumple' } }, map)).toEqual({ responses: { N1: { value: 'cumple' } }, dropped: ['c9'] });
    expect(remapAuditResponses('{"c1":{"value":"cumple"}}', map).responses).toEqual({ N1: { value: 'cumple' } });
    expect(remapAuditResponses(null, map)).toEqual({ responses: {}, dropped: [] });
  });
  it('estado del manual y clave nueva del archivo', () => {
    expect(mapManualStatus('archived')).toBe('archived');
    expect(mapManualStatus('raro')).toBe('active');
    expect(newFileKey('ORG', 'manuals', 'orgs/abc/manuals/m1/17-Manual Operaciones (v2).pdf')).toBe('v2-orgs/ORG/manuals/17-Manual_Operaciones_v2_.pdf');
    expect(newFileKey('ORG', 'x', '')).toBe('v2-orgs/ORG/x/archivo');
  });
});

describe('listas de chequeo', () => {
  const d = (o) => ({ organization_id: 'o1', form_type: 'health', aircraft_model: 'General', field_number: 1, label_text: 'Descansé 8 h', ...o });
  it('una lista por organización y tipo, con los pasos en orden y sin vacíos', () => {
    const r = groupChecklists([d({ field_number: 2, label_text: 'Sin alcohol' }), d({ field_number: 1 }), d({ field_number: 3, label_text: '  ' })]);
    expect(r.lists).toHaveLength(1);
    expect(r.lists[0]).toMatchObject({ name: 'Salud del piloto', category: 'Prevuelo', steps: ['Descansé 8 h', 'Sin alcohol'] });
    expect(r.discardedEmpty).toBe(1);
  });
  it('pre-vuelo por modelo; «General» no agrega sufijo; mantenimiento va a su categoría', () => {
    const r = groupChecklists([d({ form_type: 'preflight', aircraft_model: 'General' }), d({ form_type: 'preflight', aircraft_model: 'JGJ' }), d({ form_type: 'minor_maintenance' })]);
    expect(r.lists.map((l) => l.name).sort()).toEqual(['Mantenimiento menor', 'Pre-vuelo', 'Pre-vuelo — JGJ']);
    expect(r.lists.find((l) => l.name === 'Mantenimiento menor').category).toBe('Mantenimiento');
  });
  it('SORA y filas sin organización no son listas de chequeo', () => {
    expect(groupChecklists([d({ form_type: 'sora' }), d({ organization_id: null })]).lists).toEqual([]);
  });
  it('protocolos libres', () => {
    expect(transformProtocol({ name: 'Emergencia', category: 'Seguridad Operacional', steps: ['a', ' ', 'b'], icon: 'warning' })).toMatchObject({ category: 'Seguridad Operacional', steps: ['a', 'b'], warning: null });
    expect(transformProtocol({ name: '', category: 'Antigua', steps: null }).warning).toMatch(/sin equivalente/);
  });
});

describe('archivos', () => {
  it('path de bucket, URL con CDN y URL del almacenamiento anterior', () => {
    expect(v1ObjectRef('orgs/o1/a.pdf', 'documents')).toEqual({ bucket: 'documents', key: 'orgs/o1/a.pdf' });
    expect(v1ObjectRef('/orgs/o1/a.pdf', 'documents').key).toBe('orgs/o1/a.pdf');
    expect(v1ObjectRef('https://cdn.bitafly.com/o1/drones/x%201.jpg', 'documents')).toEqual({ bucket: 'fleet-images', key: 'o1/drones/x 1.jpg' });
    expect(v1ObjectRef('https://abc.supabase.co/storage/v1/object/public/documents/x.png', 'documents')).toMatchObject({ key: null, legacyUrl: expect.any(String) });
    expect(v1ObjectRef('', 'documents')).toBeNull();
    expect(v1ObjectRef('no es url ni path http://', 'documents')).toBeTruthy();
  });
  it('expediente: un documento por tipo, el de la fila más reciente', () => {
    const docs = personDocuments([
      { id: 'a', updated_at: '2025-01-01T00:00:00Z', id_doc_url: 'old/cedula.pdf', medical_url: 'old/med.pdf' },
      { id: 'b', updated_at: '2025-06-01T00:00:00Z', id_doc_url: 'new/cedula.pdf', medical_cert_url: 'new/med.pdf', certificate_url: 'new/cipu.pdf' },
    ]);
    const by = Object.fromEntries(docs.map((d) => [d.doc_type, d.ref.key]));
    expect(by).toEqual({ cedula: 'new/cedula.pdf', certificado_medico: 'new/med.pdf', otro: 'new/cipu.pdf' });
  });
});
