// Skylog V2.0 — plantilla de referencia para la matriz de riesgo INTERNA del
// SMS (risk_matrices, regla C3 — configurable por organización, distinta de
// la matriz FIJA de MAUT-5.0-12-055 que usa `riskAnalysis.js`, regla C2 — ver
// 18-analisis-riesgos-vuelo.md R1: "dos matrices coexisten y no deben
// mezclarse").
//
// A diferencia de v1 (`src/lib/safetyRiskDefaults.js`), esta plantilla NO se
// etiqueta como "OACI Doc 9859" ni cita una circular específica: esa cita de
// v1 nunca quedó verificada contra una fuente leída en docs/skylog-v2/ (ver
// packages/domain/src/internalRiskMatrix.js) — repetirla aquí habría violado
// la regla V1 (no fabricar contenido normativo sin fuente verificada). Es,
// honestamente, una estructura 5×5 de referencia (práctica estándar de
// gestión de seguridad operacional) que cada organización debe revisar y
// ajustar a sus propios criterios antes de guardarla — nunca se guarda sola,
// sola puebla el formulario para que el usuario la edite y confirme.
export const DEFAULT_PROBABILITY_LEVELS = [
  { code: '5', label: 'Frecuente', description: 'Es probable que ocurra muchas veces' },
  { code: '4', label: 'Ocasional', description: 'Es probable que ocurra algunas veces' },
  { code: '3', label: 'Remoto', description: 'Improbable, pero posible que ocurra' },
  { code: '2', label: 'Improbable', description: 'Muy improbable que ocurra' },
  { code: '1', label: 'Extremadamente improbable', description: 'Casi inconcebible que ocurra' },
];

export const DEFAULT_SEVERITY_LEVELS = [
  { code: 'A', label: 'Catastrófico', description: 'Destrucción del equipo / posibles víctimas' },
  { code: 'B', label: 'Peligroso', description: 'Reducción importante de márgenes de seguridad, daños importantes al equipo' },
  { code: 'C', label: 'Mayor', description: 'Reducción significativa de márgenes de seguridad' },
  { code: 'D', label: 'Menor', description: 'Molestias, limitaciones operacionales' },
  { code: 'E', label: 'Insignificante', description: 'Pocas o ninguna consecuencia' },
];

// Distribución de zonas por celda — mismo patrón visual creciente en
// diagonal que cualquier matriz 5×5 de probabilidad×severidad (más
// probabilidad + más severidad → más riesgo), sin citar una fuente externa.
const DEFAULT_ZONES_BY_ROW = {
  5: { A: 'inaceptable', B: 'inaceptable', C: 'inaceptable', D: 'tolerable', E: 'tolerable' },
  4: { A: 'inaceptable', B: 'inaceptable', C: 'tolerable', D: 'tolerable', E: 'tolerable' },
  3: { A: 'inaceptable', B: 'tolerable', C: 'tolerable', D: 'tolerable', E: 'aceptable' },
  2: { A: 'tolerable', B: 'tolerable', C: 'tolerable', D: 'tolerable', E: 'aceptable' },
  1: { A: 'aceptable', B: 'aceptable', C: 'aceptable', D: 'aceptable', E: 'aceptable' },
};

export function buildDefaultTolerability() {
  const rows = [];
  for (const p of DEFAULT_PROBABILITY_LEVELS) {
    for (const s of DEFAULT_SEVERITY_LEVELS) {
      rows.push({ probabilityCode: p.code, severityCode: s.code, zone: DEFAULT_ZONES_BY_ROW[p.code][s.code] });
    }
  }
  return rows;
}

// Paleta de zonas — variante sólida (celdas de la matriz, alto contraste) y
// variante suave (chips/badges inline, ya usada en el resto de la página).
export const ZONE_STYLES = {
  aceptable: { label: 'Aceptable', solid: 'bg-emerald-500 text-white', soft: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  tolerable: { label: 'Tolerable', solid: 'bg-amber-500 text-white', soft: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  inaceptable: { label: 'Inaceptable', solid: 'bg-red-500 text-white', soft: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
};

export const ZONE_CYCLE = ['', 'aceptable', 'tolerable', 'inaceptable'];
