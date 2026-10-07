import { describe, it, expect } from 'vitest';
import { canInviteRole, validateInvitation, invitationState, invitationExpiresAt, INVITE_ROLES } from './invitations.js';

describe('canInviteRole', () => {
  it('un Jefe de Pilotos invita pilotos, jefes y gerentes SMS, no gerentes generales', () => {
    expect(canInviteRole(['jefe_pilotos'], 'piloto')).toBe(true);
    expect(canInviteRole(['jefe_pilotos'], 'gerente_sms')).toBe(true);
    expect(canInviteRole(['jefe_pilotos'], 'admin')).toBe(false);
  });
  it('solo el Gerente General (o superadmin) invita a otro Gerente General', () => {
    expect(canInviteRole(['admin'], 'admin')).toBe(true);
    expect(canInviteRole(['superadmin'], 'admin')).toBe(true);
    expect(canInviteRole(['gerente_sms'], 'admin')).toBe(false);
  });
  it('un piloto no invita a nadie', () => expect(canInviteRole(['piloto'], 'piloto')).toBe(false));
  it('rol inexistente', () => expect(canInviteRole(['admin'], 'superadmin')).toBe(false));
  it('roles invitables', () => expect(INVITE_ROLES).toHaveLength(4));
});

describe('validateInvitation', () => {
  it('normaliza el correo', () => expect(validateInvitation({ email: ' A@B.CO ', role: 'piloto' }).clean.email).toBe('a@b.co'));
  it('rechaza correo y rol inválidos', () => {
    expect(validateInvitation({ email: 'x', role: 'piloto' }).ok).toBe(false);
    expect(validateInvitation({ email: 'a@b.co', role: 'dios' }).ok).toBe(false);
  });
});

describe('invitationState', () => {
  const now = Date.parse('2026-10-06T12:00:00Z');
  it.each([
    [{ status: 'pendiente', expires_at: '2026-10-10T00:00:00Z' }, 'usable'],
    [{ status: 'pendiente', expires_at: '2026-10-01T00:00:00Z' }, 'expirada'],
    [{ status: 'aceptada', expires_at: '2026-10-10T00:00:00Z' }, 'usada'],
    [{ status: 'revocada', expires_at: '2026-10-10T00:00:00Z' }, 'revocada'],
    [null, 'inexistente'],
  ])('%j → %s', (inv, expected) => expect(invitationState(inv, now)).toBe(expected));
});

describe('invitationExpiresAt', () => it('7 días por defecto', () => expect(invitationExpiresAt('2026-10-06T12:00:00.000Z')).toBe('2026-10-13T12:00:00.000Z')));
