import { describe, it, expect } from 'vitest';
import { canViewReporterIdentity, redactReporterIdentity } from './smsReporterConfidentiality.js';

describe('canViewReporterIdentity', () => {
  it('el propio reportante siempre ve su identidad, sin importar el rol', () => {
    expect(canViewReporterIdentity({ confidentialityLevel: 'confidencial', viewerRole: 'piloto', isReporter: true })).toBe(true);
  });

  it('reporte normal — cualquier gestor lo ve (RLS ya exige ser gestor o el propio reportante)', () => {
    expect(canViewReporterIdentity({ confidentialityLevel: 'normal', viewerRole: 'jefe_pilotos', isReporter: false })).toBe(true);
  });

  it('reporte confidencial — Jefe de Pilotos y admin NO ven la identidad', () => {
    expect(canViewReporterIdentity({ confidentialityLevel: 'confidencial', viewerRole: 'jefe_pilotos', isReporter: false })).toBe(false);
    expect(canViewReporterIdentity({ confidentialityLevel: 'confidencial', viewerRole: 'admin', isReporter: false })).toBe(false);
  });

  it('reporte confidencial — solo el Gerente SMS (el analista asignado) o superadmin la ven', () => {
    expect(canViewReporterIdentity({ confidentialityLevel: 'confidencial', viewerRole: 'gerente_sms', isReporter: false })).toBe(true);
    expect(canViewReporterIdentity({ confidentialityLevel: 'confidencial', viewerRole: 'superadmin', isReporter: false })).toBe(true);
  });
});

describe('redactReporterIdentity', () => {
  const baseRow = { id: 'r1', reported_by: 'person-1', confidentiality_level: 'confidencial', reporter: { full_name: 'Juan Pérez' } };

  it('redacta reported_by y el join de reporter cuando no se puede ver', () => {
    const result = redactReporterIdentity(baseRow, { viewerRole: 'jefe_pilotos', viewerPersonId: 'person-2' });
    expect(result.reported_by).toBeNull();
    expect(result.reporter).toBeNull();
    expect(result.identity_redacted).toBe(true);
  });

  it('no redacta para el Gerente SMS', () => {
    const result = redactReporterIdentity(baseRow, { viewerRole: 'gerente_sms', viewerPersonId: 'person-2' });
    expect(result.reported_by).toBe('person-1');
    expect(result.reporter.full_name).toBe('Juan Pérez');
    expect(result.identity_redacted).toBe(false);
  });

  it('no redacta para el propio reportante', () => {
    const result = redactReporterIdentity(baseRow, { viewerRole: 'piloto', viewerPersonId: 'person-1' });
    expect(result.identity_redacted).toBe(false);
  });

  it('nunca muta la fila original', () => {
    const copy = { ...baseRow };
    redactReporterIdentity(baseRow, { viewerRole: 'jefe_pilotos', viewerPersonId: 'person-2' });
    expect(baseRow).toEqual(copy);
  });
});
