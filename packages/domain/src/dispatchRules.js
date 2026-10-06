// dispatchRules — reglas del Despacho y del Cierre de vuelo (RAC 100 §100.535(23)).
// Lógica pura, sin Supabase, con tests (regla Q2). El servidor la usa para RE-EVALUAR todo
// antes de escribir: nunca se confía en lo que diga el navegador. Las fechas son 'YYYY-MM-DD'
// (hora de Colombia) y la fecha de hoy la inyecta quien llama.
//
// Qué BLOQUEA, qué AVISA y qué solo INFORMA (decisión del usuario, 2026-10-05):
//   bloquean → programación, tiempos de servicio, examen de capacitación, aeronave
//   avisan   → lista de chequeo sin configurar, matriz de riesgo sin configurar
//   informa  → póliza RCE. Es OPCIONAL: no restringe el vuelo y, si la organización no ha
//              registrado ninguna póliza, ni siquiera se menciona (no usa ese módulo).
import { resolveInternalToleranceZone } from './internalRiskMatrix.js';
import { COVERAGE_REASON_LABELS } from './insuranceCoverage.js';

export const BLOCKING_GATES = ['schedule', 'duty', 'training', 'aircraft'];
export const CHECKLIST_VALUES = ['si', 'no', 'na'];
export const SAFETY_REPORT_TYPES = ['VOR', 'MOR'];

function gate(id, ok, message, { blocking, soft = false }) {
  // `info`: dato útil que no alarma (ícono neutro, no cuenta como aviso).
  return { id, status: ok ? 'ok' : blocking ? 'blocked' : soft ? 'info' : 'warn', blocking, message };
}

/**
 * Verificaciones automáticas previas al despacho.
 * @param {object} i
 *  - mission: { status }          - isPic: boolean
 *  - missionDate / today: 'YYYY-MM-DD'
 *  - openPeriodType: tipo del período de servicio/descanso abierto, o null
 *  - service: { rest: {compliant}, monthly: {compliant}, daily: {compliant} }
 *  - exam: { compliant }          - aircraft: { assigned, operationalStatus }
 *  - insurance: resultado de findRceCoverage, o null si no se evaluó o no se pudo evaluar
 *  - checklistCount: nº de listas de chequeo Prevuelo configuradas
 *  - riskMatrixReady: la organización tiene matriz de riesgo completa
 */
export function buildDispatchGates(i) {
  const gates = [];

  // 1. Programación: solo el PIC, solo misiones programadas y solo el día de la misión.
  let scheduleMsg = 'La misión está programada para hoy y eres su PIC.';
  let scheduleOk = true;
  if (!i.isPic) {
    scheduleOk = false;
    scheduleMsg = 'Solo el PIC asignado puede despachar esta misión.';
  } else if (i.mission?.status !== 'programada') {
    scheduleOk = false;
    scheduleMsg = `La misión está en estado "${i.mission?.status}" y ya no se puede despachar.`;
  } else if (i.missionDate !== i.today) {
    scheduleOk = false;
    scheduleMsg = `La misión está programada para el ${i.missionDate}, no para hoy.`;
  }
  gates.push(gate('schedule', scheduleOk, scheduleMsg, { blocking: true }));

  // 2. Tiempos de servicio (§100.540): período abierto de otro tipo, descanso, horas mensuales/diarias.
  const dutyProblems = [];
  if (i.openPeriodType && i.openPeriodType !== 'servicio') dutyProblems.push(`Tienes un período de "${i.openPeriodType}" abierto: ciérralo antes de despachar.`);
  if (i.service?.rest && i.service.rest.compliant === false) dutyProblems.push('No ha pasado el descanso mínimo desde tu último servicio (§100.540(f)).');
  if (i.service?.monthly && i.service.monthly.compliant === false) dutyProblems.push('Ya alcanzaste el límite mensual de horas de vuelo (§100.540).');
  if (i.service?.daily && i.service.daily.compliant === false) dutyProblems.push('Ya alcanzaste el límite diario de horas de vuelo (§100.540).');
  gates.push(gate('duty', dutyProblems.length === 0, dutyProblems.join(' ') || 'Dentro de los límites de tiempos de servicio y descanso.', { blocking: true }));

  // 3. Examen de capacitación: reprobado sin intentos en el ciclo vigente bloquea.
  const examOk = i.exam?.compliant !== false;
  gates.push(gate('training', examOk, examOk ? 'Evaluación de capacitación al día.' : 'Evaluación de capacitación reprobada sin intentos disponibles en el ciclo vigente.', { blocking: true }));

  // 4. Aeronave: debe estar asignada y disponible.
  let aircraftOk = true;
  let aircraftMsg = 'Aeronave asignada y disponible.';
  if (!i.aircraft?.assigned) {
    aircraftOk = false;
    aircraftMsg = 'La misión no tiene aeronave asignada: pídele a un gestor que la asigne en Programación.';
  } else if (i.aircraft.operationalStatus !== 'disponible') {
    aircraftOk = false;
    aircraftMsg = `La aeronave está "${String(i.aircraft.operationalStatus).replace(/_/g, ' ')}" y no puede despachar.`;
  }
  gates.push(gate('aircraft', aircraftOk, aircraftMsg, { blocking: true }));

  // 5. Póliza RCE (§100.410(a)(2)(i)) — OPCIONAL, solo informa. Sin ninguna póliza registrada la
  //    organización no usa este módulo: no se muestra nada. Solo se menciona cuando SÍ tiene pólizas
  //    y ninguna cubre esta aeronave hoy.
  if (i.insurance && i.insurance.reason !== 'sin_poliza_rce') {
    gates.push(gate('insurance', i.insurance.covered, i.insurance.covered ? 'Póliza RCE vigente cubre la aeronave hoy.' : `${COVERAGE_REASON_LABELS[i.insurance.reason] || 'Sin cobertura RCE hoy'} (informativo: no restringe el vuelo).`, { blocking: false, soft: true }));
  }

  // 6–7. Configuración de la organización — avisan.
  gates.push(gate('checklists', i.checklistCount > 0, i.checklistCount > 0 ? `${i.checklistCount} lista(s) de chequeo de Prevuelo por diligenciar.` : 'No hay listas de chequeo de Prevuelo configuradas: el despacho no tendrá verificación de pasos.', { blocking: false }));
  gates.push(gate('risk_matrix', !!i.riskMatrixReady, i.riskMatrixReady ? 'Matriz de riesgo configurada.' : 'La organización no ha configurado su matriz de riesgo: se omite la evaluación de riesgos.', { blocking: false }));

  const blockedBy = gates.filter((g) => g.status === 'blocked').map((g) => g.id);
  return { gates, canDispatch: blockedBy.length === 0, blockedBy };
}

/**
 * Evaluación de riesgos del despacho contra la matriz INTERNA de la organización (regla C3,
 * configurable; no es el formato oficial MAUT-5.0-12-055, que va por autorización).
 *  - aceptable → no se pide nada.
 *  - tolerable → mitigar es voluntario (si escribe barreras, se guardan como voluntarias).
 *  - inaceptable → barreras obligatorias y un riesgo residual que YA NO sea inaceptable.
 * Los códigos son texto configurable por la organización ("1", "A"…).
 */
export function evaluateDispatchRisk({ tolerability, probabilityCode, severityCode, mitigation, residualProbabilityCode, residualSeverityCode }) {
  const errors = [];
  const initial = resolveInternalToleranceZone(tolerability, probabilityCode, severityCode);
  if (!probabilityCode || !severityCode) errors.push('Elige la probabilidad y la gravedad.');
  else if (!initial.configured) errors.push('Esa combinación de probabilidad y gravedad no tiene criterio en la matriz.');

  const text = (mitigation || '').trim();
  const needsMitigation = initial.zone === 'inaceptable';
  const voluntary = initial.zone === 'tolerable' && text.length > 0;
  let residualZone = null;

  if (needsMitigation) {
    if (!text) errors.push('El riesgo es inaceptable: describe las barreras o mitigaciones aplicadas.');
    if (!residualProbabilityCode || !residualSeverityCode) {
      errors.push('Evalúa el riesgo residual después de mitigar.');
    } else {
      const residual = resolveInternalToleranceZone(tolerability, residualProbabilityCode, residualSeverityCode);
      residualZone = residual.zone;
      if (!residual.configured) errors.push('La combinación residual no tiene criterio en la matriz.');
      else if (residual.zone === 'inaceptable') errors.push('El riesgo residual sigue siendo inaceptable: refuerza las barreras antes de despachar.');
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    initialZone: initial.zone,
    residualZone,
    needsMitigation,
    voluntaryMitigation: voluntary,
    // Lo que se guarda: barreras solo si eran obligatorias o el piloto eligió registrarlas.
    storedMitigation: needsMitigation || voluntary ? text : null,
  };
}

/**
 * Construye las filas de evidencia a partir de las DEFINICIONES de las listas (cargadas por el
 * servidor) y las respuestas del piloto. El texto del paso sale de la definición, nunca del
 * navegador. `answers`: { [checklistId]: [{ value, note }] } alineado por posición.
 * Exige que cada paso de cada lista tenga respuesta válida.
 */
export function buildChecklistItems(checklists, answers) {
  const items = [];
  const problems = [];
  let noCount = 0;

  for (const list of checklists || []) {
    const steps = Array.isArray(list.steps) ? list.steps : [];
    const given = answers?.[list.id] || [];
    steps.forEach((stepText, position) => {
      const a = given[position];
      if (!a || !CHECKLIST_VALUES.includes(a.value)) {
        problems.push({ checklistId: list.id, position });
        return;
      }
      if (a.value === 'no') noCount += 1;
      items.push({
        checklist_id: list.id,
        checklist_name: list.name,
        checklist_version: list.version || null,
        position,
        step_text: typeof stepText === 'string' ? stepText : stepText?.text || String(stepText),
        value: a.value,
        note: a.note?.trim() || null,
      });
    });
  }
  return { complete: problems.length === 0, items, noCount, missing: problems.length };
}

/**
 * Validación del cierre de vuelo. Devuelve las horas reales (2 decimales), nunca las del cliente.
 * `dispatchedAt`, `takeoffAt`, `landingAt`, `now`: instantes ISO.
 */
export function validateFlightClose({ dispatchedAt, takeoffAt, landingAt, now, safetyReport, safetyReportType }) {
  const errors = [];
  const t0 = Date.parse(takeoffAt);
  const t1 = Date.parse(landingAt);
  const d = Date.parse(dispatchedAt);
  const n = Date.parse(now);
  const TOLERANCE_MS = 2 * 60_000; // desfase de reloj entre dispositivo y servidor

  if (Number.isNaN(t0) || Number.isNaN(t1)) return { ok: false, errors: ['Indica la hora de despegue y de aterrizaje.'], totalTime: null };
  if (t1 <= t0) errors.push('El aterrizaje debe ser posterior al despegue.');
  if (t0 < d - TOLERANCE_MS) errors.push('El despegue no puede ser anterior al momento en que se despachó.');
  if (t1 > n + TOLERANCE_MS) errors.push('El aterrizaje no puede estar en el futuro.');
  if (t1 - t0 > 24 * 3_600_000) errors.push('Un vuelo de más de 24 horas no es plausible: revisa las horas.');
  if (safetyReport && !SAFETY_REPORT_TYPES.includes(safetyReportType)) errors.push('Indica si el reporte de seguridad es VOR o MOR.');

  const totalTime = t1 > t0 ? Math.round(((t1 - t0) / 3_600_000) * 100) / 100 : null;
  if (totalTime !== null && totalTime <= 0) errors.push('El vuelo dura menos de un minuto: revisa las horas.');
  return { ok: errors.length === 0, errors, totalTime };
}
