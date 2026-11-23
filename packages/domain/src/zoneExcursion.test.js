import { describe, it, expect } from 'vitest';
import { validateZoneGeo, outsideByMeters, evaluateZoneExcursion } from './zoneExcursion.js';

// Cuadrado de ~111 m de lado en el ecuador (lat 0): 0,001° ≈ 111,32 m.
const SQUARE = {
  geoType: 'polygon',
  points: [{ lat: 0, lng: 0 }, { lat: 0.001, lng: 0 }, { lat: 0.001, lng: 0.001 }, { lat: 0, lng: 0.001 }],
  radius: null,
};
const INSIDE = { lat: 0.0005, lng: 0.0005 };
const OUT_FAR = { lat: 0.0005, lng: 0.0012 }; // ~22 m al este del borde
const OUT_NEAR = { lat: 0.0005, lng: 0.00108 }; // ~9 m al este del borde (dentro del margen)
const track = (pts) => pts;

describe('validateZoneGeo', () => {
  it('acepta las tres geometrías bien formadas', () => {
    expect(validateZoneGeo(SQUARE).geoType).toBe('polygon');
    expect(validateZoneGeo({ geoType: 'circle', points: [{ lat: 0, lng: 0 }], radius: 100 })).toBeTruthy();
    expect(validateZoneGeo({ geoType: 'linear', points: [{ lat: 0, lng: 0 }, { lat: 0.002, lng: 0 }], radius: 30 })).toBeTruthy();
  });
  it('rechaza geometrías incompletas', () => {
    expect(validateZoneGeo(null)).toBeNull();
    expect(validateZoneGeo({ geoType: 'polygon', points: [{ lat: 0, lng: 0 }] })).toBeNull(); // < 3 puntos
    expect(validateZoneGeo({ geoType: 'circle', points: [{ lat: 0, lng: 0 }] })).toBeNull(); // sin radio
    expect(validateZoneGeo({ geoType: 'linear', points: [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }] })).toBeNull(); // sin ancho
    expect(validateZoneGeo({ geoType: 'otra', points: [] })).toBeNull();
  });
});

describe('outsideByMeters — signo y magnitud', () => {
  it('polígono: dentro es negativo, fuera positivo y proporcional', () => {
    const zone = validateZoneGeo(SQUARE);
    expect(outsideByMeters(INSIDE, zone)).toBeLessThan(0);
    expect(outsideByMeters(OUT_FAR, zone)).toBeGreaterThan(15);
    expect(outsideByMeters(OUT_FAR, zone)).toBeCloseTo(22.3, 0);
  });
  it('círculo: distancia al centro menos el radio', () => {
    const zone = validateZoneGeo({ geoType: 'circle', points: [{ lat: 0, lng: 0 }], radius: 100 });
    expect(outsideByMeters({ lat: 0, lng: 0 }, zone)).toBeCloseTo(-100, 0);
    expect(outsideByMeters({ lat: 0, lng: 0.0012 }, zone)).toBeGreaterThan(15); // ~133 m - 100
  });
  it('lineal: distancia a la polilínea menos la media-anchura', () => {
    const zone = validateZoneGeo({ geoType: 'linear', points: [{ lat: 0, lng: 0 }, { lat: 0.002, lng: 0 }], radius: 30 });
    expect(outsideByMeters({ lat: 0.001, lng: 0.0002 }, zone)).toBeLessThan(0); // ~22 m - 30 → dentro
    expect(outsideByMeters({ lat: 0.001, lng: 0.0005 }, zone)).toBeGreaterThan(15); // ~55 m - 30 → fuera
  });
});

describe('evaluateZoneExcursion', () => {
  it('traza enteramente dentro → no hay salida', () => {
    const r = evaluateZoneExcursion(track([
      { t: 0, ...INSIDE }, { t: 2, ...INSIDE }, { t: 4, ...INSIDE },
    ]), SQUARE);
    expect(r.applicable).toBe(true);
    expect(r.outside).toBe(false);
    expect(r.segments).toHaveLength(0);
  });

  it('salida sostenida y más allá del margen → la detecta con su pico y duración', () => {
    const r = evaluateZoneExcursion(track([
      { t: 0, ...INSIDE }, { t: 2, ...OUT_FAR }, { t: 4, ...OUT_FAR }, { t: 6, ...OUT_FAR }, { t: 8, ...INSIDE },
    ]), SQUARE, { marginM: 15, minDurationS: 3 });
    expect(r.outside).toBe(true);
    expect(r.segments).toHaveLength(1);
    expect(r.segments[0].durationS).toBe(4); // t=2..6
    expect(r.maxExceedM).toBeGreaterThan(15);
    expect(r.segments[0].peak.exceedM).toBeGreaterThan(15);
  });

  it('salto puntual fuera pero breve (< minDuration) → NO cuenta (ruido de GPS)', () => {
    const r = evaluateZoneExcursion(track([
      { t: 0, ...INSIDE }, { t: 10, ...OUT_FAR }, { t: 20, ...INSIDE },
    ]), SQUARE, { marginM: 15, minDurationS: 3 });
    expect(r.outside).toBe(false); // un solo punto, duración 0
  });

  it('fuera pero dentro del margen → NO cuenta', () => {
    const r = evaluateZoneExcursion(track([
      { t: 0, ...OUT_NEAR }, { t: 2, ...OUT_NEAR }, { t: 4, ...OUT_NEAR },
    ]), SQUARE, { marginM: 15, minDurationS: 3 });
    expect(r.outside).toBe(false);
  });

  it('círculo: salida sostenida detectada', () => {
    const zone = { geoType: 'circle', points: [{ lat: 0, lng: 0 }], radius: 100 };
    const far = { lat: 0, lng: 0.0012 };
    const r = evaluateZoneExcursion([
      { t: 0, lat: 0, lng: 0 }, { t: 3, ...far }, { t: 6, ...far }, { t: 9, lat: 0, lng: 0 },
    ], zone, { marginM: 15, minDurationS: 3 });
    expect(r.outside).toBe(true);
    expect(r.geoType).toBe('circle');
  });

  it('sin zona válida o sin traza → no aplicable, no bloquea', () => {
    expect(evaluateZoneExcursion([{ t: 0, ...INSIDE }], null).applicable).toBe(false);
    expect(evaluateZoneExcursion([{ t: 0, ...INSIDE }], SQUARE).applicable).toBe(false); // 1 punto
    expect(evaluateZoneExcursion([], SQUARE).outside).toBe(false);
  });

  it('un margen mayor puede volver tolerable una salida pequeña', () => {
    const pts = track([{ t: 0, ...OUT_FAR }, { t: 2, ...OUT_FAR }, { t: 4, ...OUT_FAR }]);
    expect(evaluateZoneExcursion(pts, SQUARE, { marginM: 15 }).outside).toBe(true);
    expect(evaluateZoneExcursion(pts, SQUARE, { marginM: 50 }).outside).toBe(false); // ~22 m < 50
  });
});
