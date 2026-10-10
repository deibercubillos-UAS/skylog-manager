import { describe, it, expect } from 'vitest';
import { evaluationReminder, spiAnnualReminder, monthlyReportReminder, monthlyReportDeadline, previousPeriod, calendarDaysUntil } from './regulatoryReminders.js';

describe('evaluationReminder', () => {
  const pend = (dueDate) => ({ status: 'pending', dueDate });
  it('hitos 7/3/1/hoy según los días que faltan', () => {
    expect(evaluationReminder(pend('2026-10-20'), '2026-10-09')).toBeNull(); // 11 días
    expect(evaluationReminder(pend('2026-10-16'), '2026-10-09')).toMatchObject({ milestone: '7d' });
    expect(evaluationReminder(pend('2026-10-12'), '2026-10-09')).toMatchObject({ milestone: '3d' });
    expect(evaluationReminder(pend('2026-10-10'), '2026-10-09')).toMatchObject({ milestone: '1d' });
    expect(evaluationReminder(pend('2026-10-09'), '2026-10-09')).toMatchObject({ milestone: 'hoy' });
  });
  it('vencida, agotada, aprobada y sin configurar', () => {
    expect(evaluationReminder({ status: 'overdue', dueDate: '2026-10-01' }, '2026-10-09').milestone).toBe('vencida');
    expect(evaluationReminder({ status: 'failed', dueDate: '2026-10-30' }, '2026-10-09').milestone).toBe('agotada');
    expect(evaluationReminder({ status: 'ok', dueDate: '2026-10-10' }, '2026-10-09')).toBeNull();
    expect(evaluationReminder({ status: 'not_configured' }, '2026-10-09')).toBeNull();
    expect(evaluationReminder(null, '2026-10-09')).toBeNull();
  });
  it('si el cron falló un día, el hito siguiente sale igual (ya pasó el de 7 días)', () => {
    expect(evaluationReminder(pend('2026-10-14'), '2026-10-09').milestone).toBe('7d'); // faltan 5 → aún en la banda de 7
  });
});

describe('spiAnnualReminder', () => {
  it('antes de la ventana no avisa; dentro, por hitos; después del plazo, vencido; tras el 30 de abril, nada', () => {
    expect(spiAnnualReminder({ today: '2027-02-01' })).toBeNull();
    expect(spiAnnualReminder({ today: '2027-02-28' })).toMatchObject({ reportYear: 2026, milestone: '30d' });
    expect(spiAnnualReminder({ today: '2027-03-20' })).toMatchObject({ milestone: '15d' });
    expect(spiAnnualReminder({ today: '2027-03-29' })).toMatchObject({ milestone: '1d' });
    expect(spiAnnualReminder({ today: '2027-03-30' })).toMatchObject({ milestone: 'hoy', daysLeft: 0 });
    expect(spiAnnualReminder({ today: '2027-04-02' })).toMatchObject({ milestone: 'vencido' });
    expect(spiAnnualReminder({ today: '2027-05-02' })).toBeNull();
  });
  it('si la vigencia ya se marcó como enviada, no avisa', () => {
    expect(spiAnnualReminder({ today: '2027-03-29', submittedYears: [2026] })).toBeNull();
    expect(spiAnnualReminder({ today: '2027-03-29', submittedYears: [2025] })).not.toBeNull();
  });
});

describe('monthlyReportReminder', () => {
  it('quinto día hábil de octubre 2026 es el 7 (1,2,5,6,7)', () => {
    expect(monthlyReportDeadline('2026-10-01')).toBe('2026-10-07');
  });
  it('festivo desplaza el plazo: abril 2026 (jueves y viernes santos 2 y 3)', () => {
    expect(monthlyReportDeadline('2026-04-01')).toBe('2026-04-09'); // hábiles: 1, 6, 7, 8, 9 (el 2 y el 3 son Jueves y Viernes Santo)
  });
  it('hitos del mes', () => {
    expect(monthlyReportReminder({ today: '2026-10-01' })).toMatchObject({ period: '2026-09', milestone: 'abierto' });
    expect(monthlyReportReminder({ today: '2026-10-05' })).toMatchObject({ milestone: '3d' });
    expect(monthlyReportReminder({ today: '2026-10-06' })).toMatchObject({ milestone: '1d' });
    expect(monthlyReportReminder({ today: '2026-10-07' })).toMatchObject({ milestone: 'hoy' });
    expect(monthlyReportReminder({ today: '2026-10-08' })).toMatchObject({ milestone: 'vencido' });
  });
  it('enero mira diciembre del año anterior; período enviado no avisa', () => {
    expect(previousPeriod('2027-01-10')).toBe('2026-12');
    expect(monthlyReportReminder({ today: '2026-10-06', sentPeriods: ['2026-09'] })).toBeNull();
  });
  it('calendarDaysUntil', () => {
    expect(calendarDaysUntil('2026-10-09', '2026-10-12')).toBe(3);
  });
});
