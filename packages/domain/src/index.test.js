import { describe, it, expect } from 'vitest';
import { domainReady } from './index.js';

describe('packages/domain — cimientos de Fase 0', () => {
  it('el paquete existe y sus pruebas corren', () => {
    expect(domainReady()).toBe(true);
  });
});
