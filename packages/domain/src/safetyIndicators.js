// safetyIndicators — SPI (Indicadores de Desempeño en Seguridad Operacional)
// para explotadores UAS. Lógica pura, verificada contra el ejemplo numérico
// real del libro Excel oficial MAUT-1.0-12-002 v01 (regla Q2 — la propia
// circular MAUT-1.0-22-005 v02 dice "va a packages/domain con pruebas").
// Fuente: docs/skylog-v2/13-herramientas-spi.md.

// §2 — los 11 indicadores oficiales para explotadores UAS, con su taxonomía
// (regla C5 §10: catálogo abierto — estos son precargados, el cliente puede
// agregar propios pero no inventar/renombrar los oficiales).
export const OFFICIAL_INDICATORS = [
  { code: 'U-ARC', name: 'Aterrizaje en ubicación no planeada / emergencia' },
  { code: 'U-MAC-1', name: 'Cuasi colisión con aeronave tripulada' },
  { code: 'U-WILD', name: 'Cuasi colisión con fauna' },
  { code: 'U-CFIT-1', name: 'Cuasi colisión con obstáculo / infraestructura' },
  { code: 'U-MAC-2', name: 'Cuasi colisión con otro UA' },
  { code: 'U-SCF-NP(1)', name: 'Fallas en baterías' },
  { code: 'U-GTI', name: 'Lesiones o golpes/impactos a terceros' },
  { code: 'U-MAC-3', name: 'Pérdida de separación entre dos aeronaves' },
  { code: 'U-LOC-I', name: 'Pérdida de control (riesgo severo)' },
  { code: 'U-CFIT-2', name: 'Pérdida de control con colisión contra el terreno' },
  { code: 'U-SCF-NP(2)', name: 'Pérdida del enlace C2' },
];

// §5 — lo que NO es un indicador de seguridad operacional (aplica igual a
// indicadores oficiales mal definidos y a propios, §10).
export const FORBIDDEN_INDICATOR_PATTERNS = [
  /sistema de gesti[oó]n de calidad/i,
  /seguridad y salud en el trabajo/i,
  /cantidad de reportes/i,
  /actividades? administrativas?/i,
  /cumplimiento de planes de acci[oó]n/i,
];

export function validateIndicatorDefinition(name) {
  const violated = FORBIDDEN_INDICATOR_PATTERNS.find((p) => p.test(name || ''));
  return { valid: !violated, reason: violated ? 'Esa definición no es un indicador de seguridad operacional (§5, 13-herramientas-spi.md)' : null };
}

// §4 — verbos que NO hacen válido un plan de acción (revisar algo que ya se
// evidenció que no funciona no es un plan de acción).
const FORBIDDEN_ACTION_VERBS = /^\s*(verificar|auditar|examinar|supervisar)\b/i;

export const ACTION_DEFENSE_TYPES = ['T', 'R', 'E']; // Tecnología / Reglamentación interna / Entrenamiento

export function validateActionPlan({ defenseType, plan }) {
  const errors = [];
  if (!ACTION_DEFENSE_TYPES.includes(defenseType)) {
    errors.push('La defensa debe ser T (Tecnología), R (Reglamentación interna) o E (Entrenamiento)');
  }
  if (FORBIDDEN_ACTION_VERBS.test(plan || '')) {
    errors.push('Un plan que solo "verifica/audita/examina/supervisa" no es un plan de acción válido (§4, 13-herramientas-spi.md)');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Tasa mensual — §3.1: eventos / ciclos × 1000. D2: meses con cero ciclos no
 * son un error, se neutralizan (nunca NULL silencioso) — se guardan como 0,
 * igual que la columna auxiliar "datos sin div 0" del archivo oficial.
 */
export function monthlyRate(events, cycles) {
  if (!cycles || cycles <= 0) return 0;
  return (events / cycles) * 1000;
}

/** Media aritmética de un array de tasas — verificado: 3.04/12 = 0.2533. */
export function averageRate(rates) {
  if (!rates.length) return 0;
  return rates.reduce((sum, r) => sum + r, 0) / rates.length;
}

/**
 * Desviación estándar POBLACIONAL (÷n, no ÷(n-1)) — §9.2 confirma que la
 * muestral (0.332) NO reproduce el número oficial (0.32); la poblacional sí.
 */
export function populationStdDev(rates) {
  if (!rates.length) return 0;
  const avg = averageRate(rates);
  const variance = rates.reduce((sum, r) => sum + (r - avg) ** 2, 0) / rates.length;
  return Math.sqrt(variance);
}

/**
 * Líneas de alerta — §3.2/§9.1: promedio + {1,2,3}×σ del AÑO ANTERIOR,
 * constantes durante todo el año presente (no ventana móvil, §9.3).
 */
export function computeAlertLines(previousYearRates) {
  const avg = averageRate(previousYearRates);
  const sd = populationStdDev(previousYearRates);
  return { line1: avg + sd, line2: avg + 2 * sd, line3: avg + 3 * sd };
}

/**
 * Meta — §3.3/§9.2: promedio_año_anterior × (1 − mejora_esperada). Se calcula
 * sobre el promedio SIN redondear (D3) — por eso 0.2533×0.90=0.228→"0.23",
 * no 0.25×0.90=0.225.
 */
export function computeTarget(previousYearRates, expectedImprovementPct) {
  const avg = averageRate(previousYearRates);
  return avg * (1 - expectedImprovementPct);
}

/**
 * Regla de activación de alerta — §3.2: NO es "un punto sobre la 1ª línea".
 * Basta que se cumpla cualquiera de las 3 condiciones, evaluadas sobre el año
 * presente en orden cronológico:
 *  - cualquier punto único > línea 3
 *  - 2 puntos CONSECUTIVOS > línea 2
 *  - 3 puntos CONSECUTIVOS > línea 1
 * Devuelve la primera condición que se cumple recorriendo la serie, o null.
 */
export function evaluateAlertActivation(currentYearRates, alertLines) {
  const { line1, line2, line3 } = alertLines;

  for (let i = 0; i < currentYearRates.length; i++) {
    if (currentYearRates[i] > line3) {
      return { triggered: true, condition: 'punto_unico_sobre_linea3', monthIndex: i };
    }
  }

  for (let i = 1; i < currentYearRates.length; i++) {
    if (currentYearRates[i] > line2 && currentYearRates[i - 1] > line2) {
      return { triggered: true, condition: 'dos_consecutivos_sobre_linea2', monthIndex: i };
    }
  }

  for (let i = 2; i < currentYearRates.length; i++) {
    if (currentYearRates[i] > line1 && currentYearRates[i - 1] > line1 && currentYearRates[i - 2] > line1) {
      return { triggered: true, condition: 'tres_consecutivos_sobre_linea1', monthIndex: i };
    }
  }

  return { triggered: false, condition: null, monthIndex: null };
}
