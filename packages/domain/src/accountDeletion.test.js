import { describe, it, expect } from 'vitest';
import { planAccountDeletion, EXPORT_SOURCES } from './accountDeletion.js';

const me = 'p1';
describe('planAccountDeletion', () => {
  it('única integrante: la organización se elimina con ella', () => {
    const r = planAccountDeletion({ personId: me, memberships: [{ organization_id: 'o1', organization_name: 'Acme', role: 'admin' }], membersByOrg: { o1: [{ person_id: me, role: 'admin' }] } });
    expect(r.canDelete).toBe(true);
    expect(r.orgsToDelete).toEqual([{ organization_id: 'o1', name: 'Acme' }]);
  });
  it('único Gerente General con más integrantes: bloquea', () => {
    const r = planAccountDeletion({ personId: me, memberships: [{ organization_id: 'o1', organization_name: 'Acme', role: 'admin' }], membersByOrg: { o1: [{ person_id: me, role: 'admin' }, { person_id: 'p2', role: 'piloto' }] } });
    expect(r.canDelete).toBe(false);
    expect(r.blockers[0].code).toBe('unico_gerente_general');
  });
  it('hay otro Gerente General: puede salir', () => {
    const r = planAccountDeletion({ personId: me, memberships: [{ organization_id: 'o1', role: 'admin' }], membersByOrg: { o1: [{ person_id: me, role: 'admin' }, { person_id: 'p2', role: 'admin' }] } });
    expect(r.canDelete).toBe(true);
    expect(r.orgsToLeave).toHaveLength(1);
  });
  it('piloto de una organización con gente: sale sin bloqueo', () => {
    const r = planAccountDeletion({ personId: me, memberships: [{ organization_id: 'o1', role: 'piloto' }], membersByOrg: { o1: [{ person_id: me, role: 'piloto' }, { person_id: 'p2', role: 'admin' }] } });
    expect(r.canDelete).toBe(true);
  });
  it('superadmin y dueña única de escuela con asesores: bloquean', () => {
    expect(planAccountDeletion({ personId: me, memberships: [{ organization_id: 'o1', role: 'superadmin' }], membersByOrg: {} }).canDelete).toBe(false);
    const r = planAccountDeletion({ personId: me, memberships: [], membersByOrg: {}, partnerOwnerships: [{ partner_id: 's1', partner_name: 'Escuela', otherOwners: 0, activeAdvisors: 2 }] });
    expect(r.blockers[0].code).toBe('socio_con_asesores');
  });
  it('sin membresías: nada que bloquear', () => {
    expect(planAccountDeletion({ personId: me }).canDelete).toBe(true);
  });
});
describe('EXPORT_SOURCES', () => {
  it('claves únicas', () => {
    const keys = EXPORT_SOURCES.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
