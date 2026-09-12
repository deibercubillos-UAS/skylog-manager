// smsReporting — enrutamiento de reportes de seguridad operacional según la
// Directiva MAUT-1.0-22-004 (MOR/VOR) y RAC 219. Lógica pura, con tests
// (regla Q2) — nada de esto se verifica de memoria.
// Fuente: docs/skylog-v2/12-directivas-maut.md §2.

// §2.5 — un accidente o incidente grave NUNCA va por MOR/VOR: sigue RAC 114.
// La clasificación de severidad debe BIFURCAR el flujo, no solo etiquetarlo
// (corrección de fondo respecto al modelo v1, que ofrecía las 3 severidades
// sobre el mismo flujo único).
export const REPORT_SEVERITY_LEVELS = ['incidente', 'incidente_grave', 'accidente'];

// §2.2 — los 12 eventos UAS de obligatorio reporte (taxonomía OACI + Directiva
// 02-24). La lista general de ~300 eventos también aplica — esta tabla es
// adicional, no sustitutiva (§2.2 del documento fuente).
export const UAS_MANDATORY_EVENTS = [
  { code: 'UA-CTOL', label: 'Colisión con obstáculo(s) durante el despegue o el aterrizaje' },
  { code: 'UA-SCF-NP', label: 'Falla o mal funcionamiento de transmisión desde el suelo' },
  { code: 'UA-SCF-NP', label: 'Falla o mal funcionamiento de sistemas/componentes de comunicaciones a bordo' },
  { code: 'UA-SCF-NP', label: 'Falla o mal funcionamiento de sistemas/componentes de datalink' },
  { code: 'UA-LOC-I', label: 'Pérdida de control en vuelo' },
  { code: 'UA-GCOL', label: 'Cuasi colisión con RPA' },
  { code: 'UA-SEC', label: 'Operación de RPA sin autorización' },
  { code: 'UA-SEC', label: 'Ingreso a espacio aéreo sin autorización' },
  { code: 'UA-SEC', label: 'Excursión de los límites del Mando Operativo Aeroespacial (MOA)' },
  { code: 'UA-ATM', label: 'Comunicaciones incorrectas, confusas, incompletas o ausentes del RPA con el ATC' },
  { code: 'UA-ATM', label: 'Coordinación deficiente relacionada con la operación de un RPA' },
  { code: 'UA-NAV', label: 'Reporte incorrecto de posición de un RPA' },
];

/**
 * Determina la ruta de un reporte — nunca por "obligatorio/voluntario" (eso NO
 * distingue MOR de VOR, §2.1), sino por severidad y por quién reporta:
 *  - accidente/incidente_grave → 'rac114' (nunca MOR/VOR, §2.5) — pendiente de
 *    diseñar (el documento fuente marca el RAC 114 como no revisado todavía).
 *  - reportado por el Gerente SMS → 'mor', y exige análisis previo del propio
 *    Gerente SMS antes de poder radicarse (§2.1: "una vez haya realizado el
 *    respectivo filtraje y análisis inicial").
 *  - reportado por cualquier otra persona → 'vor', sin análisis previo exigido
 *    (§2.1: "tampoco se espera que realice análisis sobre el evento").
 */
export function classifyReportRoute({ severity, reportedByRole }) {
  if (!REPORT_SEVERITY_LEVELS.includes(severity)) {
    throw new Error(`Severidad inválida: ${severity} — debe ser una de ${REPORT_SEVERITY_LEVELS.join('/')}`);
  }

  if (severity === 'accidente' || severity === 'incidente_grave') {
    return { route: 'rac114', requiresManagerAnalysis: false, canSubmit: false };
  }

  const isManager = reportedByRole === 'gerente_sms';
  return {
    route: isManager ? 'mor' : 'vor',
    requiresManagerAnalysis: isManager,
    canSubmit: true,
  };
}

/**
 * Un reporte MOR solo puede radicarse cuando el Gerente SMS ya lo analizó
 * (§2.1) — un VOR nunca lo exige. `analyzedAt` es la marca de que el propio
 * Gerente SMS hizo el filtraje/análisis inicial antes de radicar.
 */
export function canFileReport({ route, requiresManagerAnalysis, analyzedAt }) {
  if (route === 'rac114') return false;
  if (requiresManagerAnalysis && !analyzedAt) return false;
  return true;
}
