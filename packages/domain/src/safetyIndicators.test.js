import { describe, it, expect } from 'vitest';
import {
  monthlyRate,
  averageRate,
  populationStdDev,
  computeAlertLines,
  computeTarget,
  evaluateAlertActivation,
  validateIndicatorDefinition,
  validateActionPlan,
  OFFICIAL_INDICATORS,
} from './safetyIndicators.js';

describe('monthlyRate', () => {
  it('reproduce el ejemplo oficial: 2 eventos / 1842 ciclos × 1000 = 1.09', () => {
    expect(monthlyRate(2, 1842)).toBeCloseTo(1.0858, 3);
  });

  it('neutraliza división por cero en vez de NULL/NaN (D2)', () => {
    expect(monthlyRate(3, 0)).toBe(0);
    expect(monthlyRate(0, 0)).toBe(0);
  });
});

describe('averageRate / populationStdDev', () => {
  it('usa desviación estándar POBLACIONAL, no muestral', () => {
    const rates = [1, 2, 3, 4];
    // población: sqrt(((1.5)^2+(0.5)^2+(0.5)^2+(1.5)^2)/4) = sqrt(5/4) = 1.118
    // muestral (÷ n-1) daría 1.291 — distinto, confirma que se usa población
    expect(populationStdDev(rates)).toBeCloseTo(1.118, 2);
    expect(populationStdDev(rates)).not.toBeCloseTo(1.291, 2);
  });

  it('promedio de un array vacío es 0, no NaN', () => {
    expect(averageRate([])).toBe(0);
    expect(populationStdDev([])).toBe(0);
  });
});

describe('computeAlertLines / computeTarget', () => {
  const previousYear = [1, 2, 3, 4];

  it('línea 1/2/3 = promedio + {1,2,3}×σ', () => {
    const avg = averageRate(previousYear);
    const sd = populationStdDev(previousYear);
    const lines = computeAlertLines(previousYear);
    expect(lines.line1).toBeCloseTo(avg + sd, 6);
    expect(lines.line2).toBeCloseTo(avg + 2 * sd, 6);
    expect(lines.line3).toBeCloseTo(avg + 3 * sd, 6);
  });

  it('meta se calcula sobre el promedio SIN redondear', () => {
    // avg = 2.5, mejora 10% → meta = 2.25, no redondeada
    expect(computeTarget(previousYear, 0.1)).toBeCloseTo(2.25, 6);
  });
});

describe('evaluateAlertActivation', () => {
  const lines = { line1: 1, line2: 2, line3: 3 };

  it('no activa con un solo punto sobre la línea 1 (corrige el falso positivo de producción)', () => {
    const result = evaluateAlertActivation([1.5, 0, 0], lines);
    expect(result.triggered).toBe(false);
  });

  it('activa con un único punto sobre la línea 3', () => {
    const result = evaluateAlertActivation([0, 3.5, 0], lines);
    expect(result.triggered).toBe(true);
    expect(result.condition).toBe('punto_unico_sobre_linea3');
  });

  it('activa con 2 puntos consecutivos sobre la línea 2', () => {
    const result = evaluateAlertActivation([0, 2.5, 2.5, 0], lines);
    expect(result.triggered).toBe(true);
    expect(result.condition).toBe('dos_consecutivos_sobre_linea2');
  });

  it('NO activa con 2 puntos sobre línea 2 que no son consecutivos', () => {
    const result = evaluateAlertActivation([2.5, 0, 2.5], lines);
    expect(result.triggered).toBe(false);
  });

  it('activa con 3 puntos consecutivos sobre la línea 1', () => {
    const result = evaluateAlertActivation([1.2, 1.2, 1.2], lines);
    expect(result.triggered).toBe(true);
    expect(result.condition).toBe('tres_consecutivos_sobre_linea1');
  });
});

describe('validateIndicatorDefinition', () => {
  it('rechaza "cantidad de reportes recibidos" (§5)', () => {
    expect(validateIndicatorDefinition('Cantidad de reportes recibidos al mes').valid).toBe(false);
  });

  it('acepta un indicador real de ocurrencia', () => {
    expect(validateIndicatorDefinition('Pérdida del enlace C2').valid).toBe(true);
  });
});

describe('validateActionPlan', () => {
  it('rechaza un plan que empieza con un verbo prohibido', () => {
    const result = validateActionPlan({ defenseType: 'T', plan: 'Verificar el procedimiento de mantenimiento' });
    expect(result.valid).toBe(false);
  });

  it('rechaza una defensa fuera de T/R/E', () => {
    const result = validateActionPlan({ defenseType: 'X', plan: 'Instalar sensor redundante de enlace C2' });
    expect(result.valid).toBe(false);
  });

  it('acepta un plan de acción válido', () => {
    const result = validateActionPlan({ defenseType: 'T', plan: 'Instalar sensor redundante de enlace C2' });
    expect(result.valid).toBe(true);
  });
});

describe('OFFICIAL_INDICATORS', () => {
  it('trae exactamente los 11 indicadores oficiales', () => {
    expect(OFFICIAL_INDICATORS).toHaveLength(11);
    expect(OFFICIAL_INDICATORS.map((i) => i.code)).toContain('U-SCF-NP(2)');
  });
});
