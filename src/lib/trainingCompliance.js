// Cálculo de ciclo de recurrencia y estado de cumplimiento del examen de
// Capacitación (training_exams + training_exam_attempts).
//
// Los ciclos son ventanas de N días desde `start_date` — NO meses calendario:
// semanal=7, quincenal=15, mensual=30, personalizado=recurrence_days. Es una
// aproximación deliberada y documentada (evita casos borde de "mes calendario"
// con longitudes distintas) — mismo espíritu que otras fechas "estimadas" ya
// documentadas en el proyecto (ej. próximo mantenimiento).

const RECURRENCE_DAYS = { semanal: 7, quincenal: 15, mensual: 30 };

export function cycleLengthDays(exam) {
    if (exam?.recurrence === 'personalizado') {
        return Math.max(1, parseInt(exam.recurrence_days || 30, 10));
    }
    return RECURRENCE_DAYS[exam?.recurrence] || 30;
}

const isoDate = (d) => d.toISOString().split('T')[0];

// Ciclo vigente (cycleStart/cycleEnd, ambos Date) que contiene `today`.
export function currentCycle(exam, today = new Date()) {
    const start = new Date(`${exam.start_date}T00:00:00`);
    const len = cycleLengthDays(exam);
    const diffDays = Math.floor((today - start) / 86400000);
    const cycleIndex = Math.max(0, Math.floor(diffDays / len));
    const cycleStart = new Date(start.getTime() + cycleIndex * len * 86400000);
    const cycleEnd = new Date(cycleStart.getTime() + (len - 1) * 86400000);
    return { cycleStart, cycleEnd, cycleIndex };
}

// Próxima sesión/instancia de un training_session (cronograma) — mismo cálculo
// de ciclo, usado solo para mostrar "próxima sesión" en la UI (informativo).
export function nextOccurrence(session, today = new Date()) {
    const { cycleStart, cycleEnd } = currentCycle(session, today);
    // Si hoy ya pasó el fin del ciclo actual (no debería, currentCycle ya avanza),
    // se muestra el inicio de ese ciclo como referencia de la próxima sesión.
    return { date: cycleStart, cycleEnd };
}

// Estado de cumplimiento de UN piloto frente a un examen, dados sus intentos
// históricos (array de filas de training_exam_attempts, cualquier ciclo).
// Devuelve compliant=true si nunca se configuró examen (nada que exigir).
export function computeCompliance(exam, attempts, today = new Date()) {
    if (!exam) return { status: 'not_configured', compliant: true };

    const { cycleStart, cycleEnd } = currentCycle(exam, today);
    const cycleStartISO = isoDate(cycleStart);
    const cycleAttempts = (attempts || []).filter(a => a.cycle_start === cycleStartISO);
    const passed = cycleAttempts.some(a => a.passed);
    const attemptsUsed = cycleAttempts.length;
    const maxAttempts = exam.max_attempts || 1;
    const attemptsLeft = Math.max(0, maxAttempts - attemptsUsed);
    const overdue = today > cycleEnd && !passed;

    let status;
    if (passed) status = 'ok';
    else if (attemptsUsed >= maxAttempts) status = 'failed';
    else if (overdue) status = 'overdue';
    else status = 'pending';

    return {
        status,                         // 'ok' | 'pending' | 'failed' | 'overdue'
        compliant: status === 'ok' || status === 'pending',
        cycleStart: cycleStartISO,
        cycleEnd: isoDate(cycleEnd),
        attemptsUsed,
        attemptsLeft,
        maxAttempts,
    };
}

export const RECURRENCE_LABELS = {
    semanal: 'Semanal', quincenal: 'Quincenal', mensual: 'Mensual', personalizado: 'Personalizado',
};

// Fechas reales de ocurrencia de una sesión del cronograma (`training_sessions`)
// dentro de [from, to] — se proyectan desde `start_date` con el mismo paso fijo
// de N días que usa el cumplimiento de examen (`cycleLengthDays`), NUNCA se
// inventa una ocurrencia fuera de esa cadencia. Usado por el reporte de
// Cronograma de Capacitación en /dashboard/reports.
export function occurrencesInRange(session, from, to) {
    const len = cycleLengthDays(session);
    const start = new Date(`${session.start_date}T00:00:00`);
    const rangeFrom = new Date(`${from}T00:00:00`);
    const rangeTo = new Date(`${to}T00:00:00`);
    if (isNaN(start) || isNaN(rangeFrom) || isNaN(rangeTo) || rangeTo < start) return [];

    const diffToFrom = Math.floor((rangeFrom - start) / 86400000);
    let k = diffToFrom > 0 ? Math.ceil(diffToFrom / len) : 0;
    const dates = [];
    let occ = new Date(start.getTime() + k * len * 86400000);
    while (occ <= rangeTo && dates.length < 1000) {
        if (occ >= rangeFrom) dates.push(isoDate(occ));
        k += 1;
        occ = new Date(start.getTime() + k * len * 86400000);
    }
    return dates;
}
