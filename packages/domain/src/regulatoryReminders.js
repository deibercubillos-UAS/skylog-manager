// regulatoryReminders — cuándo avisar de los plazos periódicos que no dependen de un evento:
//  1. Evaluaciones de capacitación (fecha límite propia por evaluación).
//  2. Envío anual de indicadores SPI a la Aerocivil (antes del 30 de marzo de cada vigencia).
//  3. Paquete mensual SMS a la Aerocivil (primeros 5 días hábiles del mes vencido, RAC 100 §100.535(a)(26)).
// Lógica pura (`today` inyectado, 'YYYY-MM-DD' en hora de Bogotá). Cada función devuelve el HITO vigente (o null) y el
// servidor lo usa como parte de la clave de deduplicación: cada hito se avisa UNA vez, y si el cron falla un día el
// aviso sale al siguiente (no depende de caer en una fecha exacta).
import { addBusinessDays, businessDaysUntil } from './colombianCalendar.js';

const pad = (n) => String(n).padStart(2, '0');
const DAY_MS = 86_400_000;

export function calendarDaysUntil(fromStr, toStr) {
  const a = Date.parse(`${fromStr.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${toStr.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / DAY_MS);
}

/** Hitos (días antes de la fecha límite) en que se avisa de una evaluación pendiente. */
export const EVALUATION_REMINDER_DAYS = [7, 3, 1];

/**
 * @param {{ status: string, dueDate: string }} compliance resultado de `computeEvaluationCompliance`
 * @returns {{ milestone: string, daysLeft: number|null } | null}
 */
export function evaluationReminder(compliance, today) {
  if (!compliance || compliance.status === 'ok' || compliance.status === 'not_configured') return null;
  if (compliance.status === 'failed') return { milestone: 'agotada', daysLeft: null };
  if (compliance.status === 'overdue') return { milestone: 'vencida', daysLeft: null };
  if (!compliance.dueDate) return null;
  const daysLeft = calendarDaysUntil(today, compliance.dueDate);
  if (daysLeft <= 0) return { milestone: 'hoy', daysLeft: 0 };
  for (const t of [...EVALUATION_REMINDER_DAYS].sort((x, y) => x - y)) {
    if (daysLeft <= t) return { milestone: `${t}d`, daysLeft };
  }
  return null;
}

export const SPI_ANNUAL_DEADLINE_MONTH_DAY = '03-30';
export const SPI_REMINDER_DAYS = [30, 15, 7, 3, 1, 0];

/**
 * Envío anual del SPI: en el año T se reporta la vigencia T-1 antes del 30 de marzo de T.
 * La ventana de avisos va de 30 días antes del plazo hasta el 30 de abril (después deja de insistir).
 * @param {{ today: string, submittedYears?: number[] }} p  `submittedYears` = vigencias ya marcadas como enviadas
 */
export function spiAnnualReminder({ today, submittedYears = [] }) {
  const year = Number(today.slice(0, 4));
  const reportYear = year - 1;
  if (submittedYears.includes(reportYear)) return null;
  const deadline = `${year}-${SPI_ANNUAL_DEADLINE_MONTH_DAY}`;
  const daysLeft = calendarDaysUntil(today, deadline);
  if (today > `${year}-04-30`) return null;
  if (daysLeft < 0) return { reportYear, deadline, daysLeft, milestone: 'vencido' };
  for (const t of [...SPI_REMINDER_DAYS].sort((x, y) => x - y)) {
    if (daysLeft <= t) return { reportYear, deadline, daysLeft, milestone: t === 0 ? 'hoy' : `${t}d` };
  }
  return null;
}

export function previousPeriod(today) {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
}

/** Quinto día hábil del mes de `today` (los festivos colombianos no cuentan). */
export function monthlyReportDeadline(today) {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const lastDayPrev = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10);
  return addBusinessDays(lastDayPrev, 5);
}

/**
 * Paquete mensual SMS: durante los primeros 5 días hábiles del mes se avisa del período vencido (el mes anterior).
 * Hitos: `abierto` (desde el 1.er día, con más de 3 días hábiles de margen), `3d`, `1d`, `hoy` y `vencido`
 * (solo mientras no haya empezado el mes siguiente: nunca se arrastra un aviso de períodos viejos).
 * @param {{ today: string, sentPeriods?: string[] }} p
 */
export function monthlyReportReminder({ today, sentPeriods = [] }) {
  const period = previousPeriod(today);
  if (sentPeriods.includes(period)) return null;
  const deadline = monthlyReportDeadline(today);
  const daysLeft = businessDaysUntil(today, deadline);
  let milestone;
  if (daysLeft < 0) milestone = 'vencido';
  else if (daysLeft === 0) milestone = 'hoy';
  else if (daysLeft <= 1) milestone = '1d';
  else if (daysLeft <= 3) milestone = '3d';
  else milestone = 'abierto';
  return { period, deadline, daysLeft, milestone };
}
