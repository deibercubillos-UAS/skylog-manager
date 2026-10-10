import { describe, it, expect } from 'vitest';
import { validateStockItem } from './equipmentStock.js';

describe('validateStockItem', () => {
  it('acepta un equipo válido y limpia espacios', () => {
    const r = validateStockItem({ name: '  Chalecos  ', category: 'Seguridad', quantity: '5', notes: ' ' });
    expect(r.ok).toBe(true);
    expect(r.clean).toEqual({ name: 'Chalecos', category: 'Seguridad', quantity: 5, notes: null });
  });
  it('rechaza nombre vacío, cantidad negativa o decimal', () => {
    expect(validateStockItem({ name: '', quantity: 1 }).ok).toBe(false);
    expect(validateStockItem({ name: 'x', quantity: -1 }).ok).toBe(false);
    expect(validateStockItem({ name: 'x', quantity: 1.5 }).ok).toBe(false);
  });
  it('cantidad por omisión es 0', () => {
    expect(validateStockItem({ name: 'x' }).clean.quantity).toBe(0);
  });
});
