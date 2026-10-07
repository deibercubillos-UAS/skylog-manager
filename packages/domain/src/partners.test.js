import { describe, it, expect } from 'vitest';
import {
  normalizeCode, codeInitials, codeCandidate, effectiveCommissionPct, commissionAmount, commissionPeriod,
  grantSeatsCheck, grantDates, grantDaysLeft, grantNeedsReminder, partnerInvitationState, validatePartnerInput,
} from './partners.js';

describe('códigos de venta', () => {
  it('normaliza mayúsculas, espacios y símbolos', () => {
    expect(normalizeCode('  eac xb12 ')).toBe('EAC-XB12');
    expect(normalizeCode('a_b!c')).toBe('ABC');
    expect(normalizeCode('--x--')).toBe('X');
    expect(normalizeCode('')).toBe('');
    expect(normalizeCode(null)).toBe('');
  });
  it('iniciales sin acentos y con tope', () => {
    expect(codeInitials('Escuela Águilas del Cielo')).toBe('EADC');
    expect(codeInitials('Escuela Águilas del Cielo Azul')).toBe('EADC');
    expect(codeInitials('')).toBe('BF');
    expect(codeInitials('***')).toBe('BF');
  });
  it('candidato INICIALES-XXXX sin caracteres ambiguos', () => {
    const c = codeCandidate('Aero Drones', () => 0);
    expect(c).toBe('AD-AAAA');
    for (let i = 0; i < 50; i++) expect(codeCandidate('X')).toMatch(/^X-[A-HJ-NP-Z2-9]{4}$/);
  });
});

describe('comisión', () => {
  it('un asesor de una escuela activa usa el % de la escuela', () => {
    expect(effectiveCommissionPct({ commission_pct: 5, parent_partner_id: 'e' }, { status: 'activo', commission_pct: 20 })).toBe(20);
  });
  it('si la escuela está inactiva o no hay, usa el propio', () => {
    expect(effectiveCommissionPct({ commission_pct: 5, parent_partner_id: 'e' }, { status: 'inactivo', commission_pct: 20 })).toBe(5);
    expect(effectiveCommissionPct({ commission_pct: 5 }, null)).toBe(5);
    expect(effectiveCommissionPct({ commission_pct: 5, parent_partner_id: 'e' }, { status: 'activo', commission_pct: 0 })).toBe(5);
  });
  it('monto redondeado al peso y sin negativos', () => {
    expect(commissionAmount(238000, 20)).toBe(47600);
    expect(commissionAmount(100, 33.333)).toBe(33);
    expect(commissionAmount(-5, 10)).toBe(0);
    expect(commissionAmount(1000, 0)).toBe(0);
    expect(commissionAmount('x', 10)).toBe(0);
  });
  it('período en UTC', () => {
    expect(commissionPeriod(new Date('2026-10-31T23:30:00Z'))).toBe('2026-10');
    expect(commissionPeriod(new Date('2026-01-01T00:00:00Z'))).toBe('2026-01');
  });
});

describe('regalos', () => {
  it('cupos', () => {
    expect(grantSeatsCheck({ status: 'activo', free_seats_limit: null, free_seats_used: 99 })).toEqual({ ok: true, remaining: null });
    expect(grantSeatsCheck({ status: 'activo', free_seats_limit: 3, free_seats_used: 2 })).toEqual({ ok: true, remaining: 1 });
    expect(grantSeatsCheck({ status: 'activo', free_seats_limit: 3, free_seats_used: 3 }).reason).toBe('sin_cupo');
    expect(grantSeatsCheck({ status: 'inactivo', free_seats_limit: null, free_seats_used: 0 }).reason).toBe('inactivo');
    expect(grantSeatsCheck(null).ok).toBe(false);
  });
  it('fechas: vence a los N días y se purga 90 días después', () => {
    const d = grantDates(90, new Date('2026-01-01T00:00:00Z'));
    expect(d.expires_at).toBe('2026-04-01T00:00:00.000Z');
    expect(d.purge_after).toBe('2026-06-30T00:00:00.000Z');
    expect(grantDates(undefined, new Date('2026-01-01T00:00:00Z')).expires_at).toBe('2026-04-01T00:00:00.000Z');
  });
  it('aviso a 5 días o menos, solo antes de vencer', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    expect(grantDaysLeft('2026-01-04T00:00:00Z', now)).toBe(3);
    expect(grantNeedsReminder('2026-01-04T00:00:00Z', now)).toBe(true);
    expect(grantNeedsReminder('2026-01-06T00:00:00Z', now)).toBe(true);
    expect(grantNeedsReminder('2026-01-07T00:00:00Z', now)).toBe(false);
    expect(grantNeedsReminder('2025-12-31T00:00:00Z', now)).toBe(false);
    expect(grantNeedsReminder(null, now)).toBe(false);
  });
});

describe('invitación de socio', () => {
  const now = Date.parse('2026-01-10T00:00:00Z');
  it('estados', () => {
    expect(partnerInvitationState({ status: 'pendiente', expires_at: '2026-01-12T00:00:00Z' }, now)).toBe('usable');
    expect(partnerInvitationState({ status: 'pendiente', expires_at: '2026-01-09T00:00:00Z' }, now)).toBe('expirada');
    expect(partnerInvitationState({ status: 'aceptada', expires_at: '2026-01-20T00:00:00Z' }, now)).toBe('usada');
    expect(partnerInvitationState({ status: 'revocada', expires_at: '2026-01-20T00:00:00Z' }, now)).toBe('revocada');
    expect(partnerInvitationState(null)).toBe('inexistente');
  });
});

describe('validatePartnerInput', () => {
  it('alta válida con valores por defecto', () => {
    const r = validatePartnerInput({ type: 'escuela', name: ' Escuela Uno ', commission_pct: '15' });
    expect(r.ok).toBe(true);
    expect(r.clean).toMatchObject({ type: 'escuela', name: 'Escuela Uno', commission_pct: 15, free_seats_limit: null, free_days: 90 });
  });
  it('rechaza tipo, nombre, comisión, cupo y días inválidos', () => {
    expect(validatePartnerInput({ type: 'x', name: 'A' }).errors.length).toBe(2);
    expect(validatePartnerInput({ type: 'asesor', name: 'Ana', commission_pct: 101 }).ok).toBe(false);
    expect(validatePartnerInput({ type: 'asesor', name: 'Ana', free_seats_limit: -1 }).ok).toBe(false);
    expect(validatePartnerInput({ type: 'asesor', name: 'Ana', free_days: 0 }).ok).toBe(false);
    expect(validatePartnerInput({ type: 'asesor', name: 'Ana', free_days: 900 }).ok).toBe(false);
  });
  it('edición parcial solo valida lo que viene', () => {
    expect(validatePartnerInput({ commission_pct: 10 }, { partial: true }).clean).toEqual({ commission_pct: 10 });
    expect(validatePartnerInput({ status: 'inactivo' }, { partial: true }).clean).toEqual({ status: 'inactivo' });
    expect(validatePartnerInput({ status: 'raro' }, { partial: true }).ok).toBe(false);
    expect(validatePartnerInput({ free_seats_limit: '' }, { partial: true }).clean).toEqual({ free_seats_limit: null });
  });
});
