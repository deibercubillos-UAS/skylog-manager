import { describe, it, expect } from 'vitest';
import { NOTIFICATION_TYPES, NOTIFICATION_TYPE_KEYS, canSendAnnouncement, validateAnnouncement, safeInternalLink, resolveRecipients, groupByDay, timeAgo, expiryAlertToNotification, weekKey } from './notifications.js';

describe('tipos', () => {
  it('cada tipo tiene etiqueta e ícono', () => {
    for (const k of NOTIFICATION_TYPE_KEYS) expect(NOTIFICATION_TYPES[k].label && NOTIFICATION_TYPES[k].icon).toBeTruthy();
    expect(NOTIFICATION_TYPE_KEYS).toContain('anuncio');
  });
});

describe('anuncios', () => {
  it('solo los gestores pueden enviar', () => {
    expect(canSendAnnouncement(['admin'])).toBe(true);
    expect(canSendAnnouncement(['piloto', 'gerente_sms'])).toBe(true);
    expect(canSendAnnouncement(['piloto'])).toBe(false);
    expect(canSendAnnouncement([])).toBe(false);
  });
  it('valida título, mensaje y destinatarios', () => {
    expect(validateAnnouncement({ title: 'Reunión', body: '  Mañana 8 am ', roles: ['piloto', 'piloto'] })).toMatchObject({ ok: true, clean: { title: 'Reunión', body: 'Mañana 8 am', roles: ['piloto'] } });
    expect(validateAnnouncement({ title: 'ab' }).ok).toBe(false);
    expect(validateAnnouncement({ title: 'x'.repeat(121) }).ok).toBe(false);
    expect(validateAnnouncement({ title: 'Hola', body: 'x'.repeat(601) }).ok).toBe(false);
    expect(validateAnnouncement({ title: 'Hola', roles: ['superadmin'] }).ok).toBe(false);
    expect(validateAnnouncement({ title: 'Hola' }).clean).toMatchObject({ body: null, roles: [] });
  });
});

describe('enlaces', () => {
  it('solo rutas internas', () => {
    expect(safeInternalLink('/flota/tripulacion')).toBe('/flota/tripulacion');
    expect(safeInternalLink('//evil.com')).toBeNull();
    expect(safeInternalLink('https://evil.com')).toBeNull();
    expect(safeInternalLink('/a\\b')).toBeNull();
    expect(safeInternalLink(null)).toBeNull();
  });
});

describe('resolveRecipients', () => {
  const members = [
    { person_id: 'a', role: 'admin' }, { person_id: 'b', role: 'jefe_pilotos' }, { person_id: 'c', role: 'piloto' },
    { person_id: 'c', role: 'gerente_sms' }, { person_id: 'd', role: 'piloto' },
  ];
  it('por rol, sin repetir (una persona con dos roles cuenta una vez)', () => {
    expect(resolveRecipients({ members, roles: ['piloto', 'gerente_sms'] }).sort()).toEqual(['c', 'd']);
  });
  it('por persona solo si es miembro; el autor se excluye salvo que se pida', () => {
    expect(resolveRecipients({ members, personIds: ['a', 'zzz'] })).toEqual(['a']);
    expect(resolveRecipients({ members, roles: ['admin'], actorPersonId: 'a' })).toEqual([]);
    expect(resolveRecipients({ members, roles: ['admin'], actorPersonId: 'a', includeActor: true })).toEqual(['a']);
  });
  it('une roles y personas', () => {
    expect(resolveRecipients({ members, roles: ['admin'], personIds: ['d'] }).sort()).toEqual(['a', 'd']);
  });
});

describe('presentación', () => {
  const now = new Date('2026-10-09T15:00:00Z');
  it('agrupa por día de Colombia', () => {
    const g = groupByDay([{ created_at: '2026-10-09T14:00:00Z' }, { created_at: '2026-10-09T01:00:00Z' }, { created_at: '2026-10-08T20:00:00Z' }, { created_at: '2026-10-01T12:00:00Z' }], now);
    expect(g.map((x) => x.label)).toEqual(['Hoy', 'Ayer', '2026-10-01']);
    // 01:00Z del 9 = 20:00 del 8 en Colombia → «Ayer»
    expect(g[0].items).toHaveLength(1);
    expect(g[1].items).toHaveLength(2);
  });
  it('hace cuánto', () => {
    expect(timeAgo('2026-10-09T14:59:40Z', now)).toBe('ahora');
    expect(timeAgo('2026-10-09T14:30:00Z', now)).toBe('hace 30 min');
    expect(timeAgo('2026-10-09T10:00:00Z', now)).toBe('hace 5 h');
    expect(timeAgo('2026-10-06T15:00:00Z', now)).toBe('hace 3 d');
  });
});

describe('vencimientos', () => {
  it('una alerta se vuelve notificación, una vez por semana', () => {
    const n = expiryAlertToNotification({ key: 'pol-1', severity: 'warn', title: 'Póliza RCE vence pronto', detail: 'Vence el 2026-10-20', href: '/polizas' }, '2026-10-09');
    expect(n).toMatchObject({ type: 'vencimiento', link: '/polizas', severity: 'warn' });
    expect(n.dedupeKey).toBe('venc:pol-1:2026-W41');
    expect(expiryAlertToNotification({ key: 'pol-1', title: 't', detail: 'd', href: '/polizas' }, '2026-10-12').dedupeKey).toBe('venc:pol-1:2026-W42');
    expect(expiryAlertToNotification({ key: 'x', title: 't', detail: 'd', href: 'https://x.com' }, '2026-10-09').link).toBeNull();
  });
  it('semana ISO', () => {
    expect(weekKey('2026-01-01')).toBe('2026-W01');
    expect(weekKey('2026-12-31')).toBe('2026-W53');
    expect(weekKey('2026-10-05')).toBe('2026-W41');
  });
});
