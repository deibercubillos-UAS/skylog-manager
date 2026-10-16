import { describe, it, expect } from 'vitest';
import { PERMISSION_MATRIX, permissionLevel, canEdit, canView, membershipsCanEdit } from './permissionsMatrix.js';

describe('matriz de permisos (decisión del usuario 2026-10-15)', () => {
  it('ids únicos y 6 roles definidos en cada función', () => {
    const ids = PERMISSION_MATRIX.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PERMISSION_MATRIX) expect(Object.keys(p.levels)).toEqual(['SA', 'GG', 'JP', 'GS', 'P', 'PI']);
  });

  it('Gerente SMS solo ve operación y flota; Jefe de Pilotos las escribe', () => {
    expect(permissionLevel('gerente_sms', 'E2')).toBe('view'); // programar misión
    expect(permissionLevel('jefe_pilotos', 'E2')).toBe('edit');
    expect(permissionLevel('gerente_sms', 'I2')).toBe('view'); // registrar aeronave
    expect(permissionLevel('jefe_pilotos', 'I2')).toBe('edit');
  });

  it('Jefe de Pilotos solo ve el SMS; Gerente SMS y Gerente General lo escriben', () => {
    expect(permissionLevel('jefe_pilotos', 'P2')).toBe('view'); // registrar peligro
    expect(permissionLevel('gerente_sms', 'P2')).toBe('edit');
    expect(permissionLevel('admin', 'P2')).toBe('edit');
  });

  it('solo el Gerente General cambia el plan; JP y GSMS solo ven el uso', () => {
    expect(canEdit('admin', 'AE2')).toBe(true);
    expect(canEdit('jefe_pilotos', 'AE2')).toBe(false);
    expect(permissionLevel('jefe_pilotos', 'AE1')).toBe('view');
    expect(permissionLevel('gerente_sms', 'AE1')).toBe('view');
  });

  it('el cambio de rol queda solo para el Gerente General', () => {
    expect(canEdit('admin', 'K5')).toBe(true);
    expect(canEdit('jefe_pilotos', 'K5')).toBe(false);
    expect(canEdit('gerente_sms', 'K5')).toBe(false);
  });

  it('el piloto no ve la bitácora de la organización ni la tripulación', () => {
    expect(canView('piloto', 'D1')).toBe(false);
    expect(canView('piloto', 'K1')).toBe(false);
  });

  it('un rol desconocido no tiene nada, y una función desconocida lanza', () => {
    expect(permissionLevel('otro', 'E2')).toBe('none');
    expect(() => permissionLevel('admin', 'ZZ99')).toThrow();
  });

  it('membershipsCanEdit mira solo la organización indicada', () => {
    const ms = [{ organization_id: 'a', role: 'piloto' }, { organization_id: 'b', role: 'admin' }];
    expect(membershipsCanEdit(ms, 'a', 'E2')).toBe(false);
    expect(membershipsCanEdit(ms, 'b', 'E2')).toBe(true);
  });
});
