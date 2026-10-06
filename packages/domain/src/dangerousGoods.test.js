import { describe, it, expect } from 'vitest';
import { validateDangerousGoodsDeclaration } from './dangerousGoods.js';

describe('validateDangerousGoodsDeclaration', () => {
  it('no transporta: válido sin observaciones', () => expect(validateDangerousGoodsDeclaration({ declaration: 'no_transporta' }).ok).toBe(true));
  it('transporta exige describir', () => {
    expect(validateDangerousGoodsDeclaration({ declaration: 'transporta', notes: ' ' }).ok).toBe(false);
    expect(validateDangerousGoodsDeclaration({ declaration: 'transporta', notes: 'Baterías de litio, ver MO cap. 7' }).ok).toBe(true);
  });
  it('declaración inválida o vacía', () => {
    expect(validateDangerousGoodsDeclaration({ declaration: '' }).ok).toBe(false);
    expect(validateDangerousGoodsDeclaration({ declaration: 'tal vez' }).ok).toBe(false);
  });
  it('observaciones demasiado largas', () => expect(validateDangerousGoodsDeclaration({ declaration: 'no_transporta', notes: 'x'.repeat(1001) }).ok).toBe(false));
});
