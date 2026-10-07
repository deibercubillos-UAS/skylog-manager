import { describe, it, expect } from 'vitest';
import { mergePeople, normalizeAdditions } from './identity.js';

const profile = (o) => ({ id: 'p1', full_name: 'Ana Gómez', email: 'ana@x.co', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z', ...o });
const pilot = (o) => ({ id: 'k1', name: 'Ana G.', organization_id: 'o1', created_at: '2025-02-01T00:00:00Z', updated_at: '2025-02-01T00:00:00Z', ...o });

describe('mergePeople — quién es una persona', () => {
  it('une piloto y perfil por profile_id', () => {
    const r = mergePeople({ profiles: [profile({})], pilots: [pilot({ profile_id: 'p1' })] });
    expect(r.people).toHaveLength(1);
    expect(r.pilotToPerson.get('k1')).toBe(r.profileToPerson.get('p1'));
  });
  it('una persona en varias organizaciones = una persona con varios pilotos', () => {
    const r = mergePeople({ profiles: [profile({})], pilots: [pilot({ profile_id: 'p1' }), pilot({ id: 'k2', organization_id: 'o2', profile_id: 'p1' })] });
    expect(r.people).toHaveLength(1);
    expect(r.people[0].pilotIds).toEqual(['k1', 'k2']);
  });
  it('une por correo sin importar mayúsculas cuando no hay enlace', () => {
    const r = mergePeople({ profiles: [profile({ email: 'Ana@X.co' })], pilots: [pilot({ email: 'ana@x.CO' })] });
    expect(r.people).toHaveLength(1);
  });
  it('une dos pilotos sin cuenta por documento', () => {
    const r = mergePeople({ pilots: [pilot({ id: 'a', id_type: 'CC', id_number: '1.234.567' }), pilot({ id: 'b', organization_id: 'o2', id_type: 'cc', id_number: '1234567' })] });
    expect(r.people).toHaveLength(1);
  });
  it('NO une si coincide el correo pero el documento difiere (y lo reporta)', () => {
    const r = mergePeople({ pilots: [pilot({ id: 'a', email: 'z@x.co', id_type: 'CC', id_number: '111' }), pilot({ id: 'b', email: 'z@x.co', id_type: 'CC', id_number: '222' })] });
    expect(r.people).toHaveLength(2);
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0].reason).toMatch(/correo/);
  });
  it('NO une si coincide el documento pero el correo difiere', () => {
    const r = mergePeople({ pilots: [pilot({ id: 'a', email: 'a@x.co', id_type: 'CC', id_number: '111' }), pilot({ id: 'b', email: 'b@x.co', id_type: 'CC', id_number: '111' })] });
    expect(r.people).toHaveLength(2);
    expect(r.conflicts[0].reason).toMatch(/documento/);
  });
  it('un piloto sin cuenta es una persona sin perfil', () => {
    const r = mergePeople({ pilots: [pilot({})] });
    expect(r.people[0].profileIds).toEqual([]);
  });
});

describe('mergePeople — qué valor gana', () => {
  it('nombre: el del perfil; si no, nombre+apellido; si no, el del piloto', () => {
    expect(mergePeople({ profiles: [profile({})], pilots: [pilot({ profile_id: 'p1' })] }).people[0].full_name).toBe('Ana Gómez');
    expect(mergePeople({ profiles: [profile({ full_name: '', first_name: 'Ana', last_name: 'Gómez' })] }).people[0].full_name).toBe('Ana Gómez');
    expect(mergePeople({ pilots: [pilot({ name: 'Solo Piloto' })] }).people[0].full_name).toBe('Solo Piloto');
    expect(mergePeople({ pilots: [pilot({ name: '' })] }).people[0].full_name).toBe('Sin nombre (migrado)');
  });
  it('vencimiento médico: la fecha más temprana, y queda para confirmar a mano', () => {
    const r = mergePeople({ profiles: [profile({ medical_expiry: '2027-05-01' })], pilots: [pilot({ profile_id: 'p1', medical_expiry: '2026-11-15' })] });
    expect(r.people[0].medical_cert_expiry).toBe('2026-11-15');
    const row = r.report.find((x) => x.field === 'medical_cert_expiry');
    expect(row.manual).toBe(true);
    expect(row.discarded).toBe('2027-05-01');
  });
  it('vencimiento médico igual en ambas: sin reporte', () => {
    const r = mergePeople({ profiles: [profile({ medical_expiry: '2027-05-01' })], pilots: [pilot({ profile_id: 'p1', medical_expiry: '2027-05-01' })] });
    expect(r.report.find((x) => x.field === 'medical_cert_expiry')).toBeUndefined();
  });
  it('teléfono y licencia: gana el más reciente no vacío y se informa lo descartado', () => {
    const r = mergePeople({ profiles: [profile({ phone: '300', license_number: 'L-1', updated_at: '2025-03-01T00:00:00Z' })], pilots: [pilot({ profile_id: 'p1', phone: '311', license_number: '', updated_at: '2025-06-01T00:00:00Z' })] });
    expect(r.people[0].phone).toBe('311');
    expect(r.people[0].license_number).toBe('L-1');
    expect(r.report.find((x) => x.field === 'phone').discarded).toBe('300');
  });
  it('documento: gana el del piloto; el tipo solo viaja si hay número', () => {
    const r = mergePeople({ profiles: [profile({ id_type: 'CC' })], pilots: [pilot({ profile_id: 'p1', id_type: 'CE', id_number: '99' })] });
    expect(r.people[0]).toMatchObject({ document_type: 'CE', document_number: '99' });
    expect(mergePeople({ profiles: [profile({ id_type: 'CC' })] }).people[0].document_type).toBeNull();
  });
  it('correo en minúsculas', () => {
    expect(mergePeople({ profiles: [profile({ email: 'ANA@X.CO' })] }).people[0].email).toBe('ana@x.co');
  });
});

describe('normalizeAdditions', () => {
  it('separa las del catálogo de las desconocidas y no repite', () => {
    const r = normalizeAdditions(['bvlos', 'VUELO NOCTURNO', 'BVLOS', 'ACROBACIA']);
    expect(r.known).toEqual(['BVLOS', 'VUELO NOCTURNO']);
    expect(r.unknown).toEqual(['ACROBACIA']);
  });
  it('acepta JSON en texto, objetos con nombre y basura', () => {
    expect(normalizeAdditions('["ENJAMBRE"]').known).toEqual(['ENJAMBRE']);
    expect(normalizeAdditions([{ name: 'dispersión' }]).known).toEqual(['DISPERSIÓN']);
    expect(normalizeAdditions(null)).toEqual({ known: [], unknown: [] });
    expect(normalizeAdditions('no es json')).toEqual({ known: [], unknown: [] });
  });
});
