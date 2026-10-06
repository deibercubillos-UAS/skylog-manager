import { describe, it, expect } from 'vitest';
import { normalizeText, scoreItem, rankItems } from './commandSearch.js';

describe('normalizeText', () => {
  it('sin tildes ni mayúsculas', () => expect(normalizeText('  Bitácora ÚLTIMA ')).toBe('bitacora ultima'));
  it('vacío', () => expect(normalizeText(null)).toBe(''));
});

describe('scoreItem', () => {
  const item = { title: 'Programación de misiones', subtitle: 'Calendario semanal', keywords: 'agendar' };
  it('prioridades', () => {
    expect(scoreItem(item, 'prog')).toBe(100);
    expect(scoreItem(item, 'mision')).toBe(80);
    expect(scoreItem(item, 'cion de')).toBe(60);
    expect(scoreItem(item, 'calendario')).toBe(30);
    expect(scoreItem(item, 'agendar')).toBe(30);
    expect(scoreItem(item, 'zzz')).toBe(0);
  });
  it('varias palabras en cualquier orden', () => expect(scoreItem(item, 'calendario misiones')).toBe(40));
  it('sin consulta todo coincide', () => expect(scoreItem(item, '')).toBe(1));
  it('ignora tildes', () => expect(scoreItem({ title: 'Bitácora' }, 'bitacora')).toBe(100));
});

describe('rankItems', () => {
  const items = [
    { id: 1, title: 'Mantenimiento' },
    { id: 2, title: 'Reportes y casos', subtitle: 'mantenimiento de sucesos' },
    { id: 3, title: 'Mantener lista' },
    { id: 4, title: 'Otra cosa' },
  ];
  it('ordena por relevancia y filtra', () => {
    expect(rankItems(items, 'mant').map((i) => i.id)).toEqual([1, 3, 2]);
  });
  it('recorta y respeta el orden original sin consulta', () => {
    expect(rankItems(items, '', 2).map((i) => i.id)).toEqual([1, 2]);
  });
  it('sin resultados', () => expect(rankItems(items, 'xyz')).toEqual([]));
});
