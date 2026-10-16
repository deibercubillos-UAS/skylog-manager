import { describe, it, expect } from 'vitest';
import { READ_ONLY_ALLOWED, isOrgReadOnly, readOnlyFromDate, membershipIsReadOnly } from './subscriptionAccess.js';
import { PERMISSION_MATRIX, membershipsCanEdit, membershipsCanView, permissionsForRole } from './permissionsMatrix.js';

const today = new Date('2026-10-16T15:00:00Z');

describe('organización en solo lectura por plan vencido', () => {
  it('no aplica durante los 7 días de gracia', () => {
    expect(isOrgReadOnly({ plan: 'escuadrilla', expiresAt: '2026-10-09', today })).toBe(false);
  });
  it('aplica desde el día 8 después del vencimiento', () => {
    expect(isOrgReadOnly({ plan: 'escuadrilla', expiresAt: '2026-10-08', today })).toBe(true);
    expect(readOnlyFromDate('2026-10-08')).toBe('2026-10-16');
  });
  it('Enterprise y los planes sin vencimiento quedan fuera', () => {
    expect(isOrgReadOnly({ plan: 'enterprise', expiresAt: '2025-01-01', today })).toBe(false);
    expect(isOrgReadOnly({ plan: 'flota', expiresAt: null, today })).toBe(false);
  });
  it('aplica también al plan Piloto (es de pago)', () => {
    expect(isOrgReadOnly({ plan: 'piloto', expiresAt: '2026-09-01', today })).toBe(true);
  });
});

describe('permisos con la organización en solo lectura', () => {
  const org = 'org-1';
  const gg = [{ organization_id: org, role: 'admin', readOnly: true }];
  const pilot = [{ organization_id: org, role: 'piloto', readOnly: true }];

  it('todas las funciones permitidas existen en la matriz', () => {
    const ids = new Set(PERMISSION_MATRIX.map((p) => p.id));
    for (const id of READ_ONLY_ALLOWED) expect(ids.has(id), id).toBe(true);
  });
  it('bloquea la operación pero deja ver', () => {
    expect(membershipsCanEdit(gg, org, 'I2')).toBe(false); // registrar aeronave
    expect(membershipsCanEdit(gg, org, 'E2')).toBe(false); // programar misión
    expect(membershipsCanView(gg, org, 'I1')).toBe(true);
  });
  it('deja pagar, gestionar la propia cuenta y reportar sucesos', () => {
    expect(membershipsCanEdit(gg, org, 'AE3')).toBe(true);
    expect(membershipsCanEdit(gg, org, 'B6')).toBe(true);
    expect(membershipsCanEdit(pilot, org, 'U1')).toBe(true);
    expect(membershipsCanEdit(pilot, org, 'F4')).toBe(true);
  });
  it('sin solo lectura nada cambia', () => {
    expect(membershipsCanEdit([{ organization_id: org, role: 'admin' }], org, 'I2')).toBe(true);
  });
  it('la pantalla recibe «ver» en vez de «editar»', () => {
    const p = permissionsForRole('admin', { readOnly: true });
    expect(p.I2).toBe('view');
    expect(p.AE3).toBe('edit');
    expect(permissionsForRole('piloto', { readOnly: true }).AE2).toBe('none'); // no gana permisos que no tenía
  });
  it('membershipIsReadOnly mira solo esa organización', () => {
    expect(membershipIsReadOnly(gg, org)).toBe(true);
    expect(membershipIsReadOnly(gg, 'otra')).toBe(false);
  });
});
