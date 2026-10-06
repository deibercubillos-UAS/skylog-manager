import { describe, it, expect } from 'vitest';
import { easterSunday, colombianHolidays, isBusinessDay, addBusinessDays, businessDaysUntil } from './colombianCalendar.js';

// Los 18 festivos de Colombia en 2026 (calendario oficial): fijos, Semana Santa y Ley Emiliani.
const FESTIVOS_2026 = [
  '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03', '2026-05-01',
  '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29', '2026-07-20', '2026-08-07',
  '2026-08-17', '2026-10-12', '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25',
];

describe('easterSunday', () => {
  it('calcula la Pascua de años conocidos', () => {
    const iso = (y) => easterSunday(y).toISOString().slice(0, 10);
    expect(iso(2024)).toBe('2024-03-31');
    expect(iso(2025)).toBe('2025-04-20');
    expect(iso(2026)).toBe('2026-04-05');
    expect(iso(2027)).toBe('2027-03-28');
  });
});

describe('colombianHolidays', () => {
  it('2026: exactamente los 18 festivos oficiales', () => {
    expect([...colombianHolidays(2026)].sort()).toEqual(FESTIVOS_2026);
  });

  it('los festivos trasladables siempre caen en lunes', () => {
    for (const year of [2024, 2025, 2026, 2027, 2028]) {
      for (const d of colombianHolidays(year)) {
        const [, m, day] = d.split('-').map(Number);
        const fixed = [[1, 1], [5, 1], [7, 20], [8, 7], [12, 8], [12, 25]].some(([fm, fd]) => fm === m && fd === day);
        const holyWeek = new Date(d + 'T00:00:00Z').getUTCDay() === 4 || new Date(d + 'T00:00:00Z').getUTCDay() === 5;
        if (!fixed && !holyWeek) expect(new Date(d + 'T00:00:00Z').getUTCDay()).toBe(1);
      }
    }
  });

  it('un festivo que ya cae lunes no se mueve (Colombia 2026: 20 de julio y 12 de octubre)', () => {
    expect(colombianHolidays(2026).has('2026-10-12')).toBe(true);
    expect(colombianHolidays(2026).has('2026-10-19')).toBe(false);
  });
});

describe('isBusinessDay', () => {
  it('lunes a viernes sin festivo', () => {
    expect(isBusinessDay('2026-10-05')).toBe(true); // lunes
    expect(isBusinessDay('2026-10-09')).toBe(true); // viernes
  });
  it('fin de semana y festivo no', () => {
    expect(isBusinessDay('2026-10-10')).toBe(false); // sábado
    expect(isBusinessDay('2026-10-11')).toBe(false); // domingo
    expect(isBusinessDay('2026-10-12')).toBe(false); // festivo
  });
});

describe('addBusinessDays', () => {
  it('el día de partida no cuenta: lunes + 5 = lunes siguiente', () => {
    expect(addBusinessDays('2026-09-07', 5)).toBe('2026-09-14');
  });
  it('salta fines de semana', () => {
    expect(addBusinessDays('2026-10-02', 1)).toBe('2026-10-05'); // viernes → lunes
  });
  it('salta festivos: el lunes 12 de octubre no cuenta', () => {
    expect(addBusinessDays('2026-10-09', 1)).toBe('2026-10-13'); // viernes → martes
    expect(addBusinessDays('2026-10-08', 5)).toBe('2026-10-16'); // jue → … sin el lunes festivo
  });
  it('Semana Santa 2026 (2 y 3 de abril) no cuentan', () => {
    expect(addBusinessDays('2026-04-01', 1)).toBe('2026-04-06'); // miércoles → lunes
  });
  it('0 días devuelve la misma fecha', () => {
    expect(addBusinessDays('2026-10-05', 0)).toBe('2026-10-05');
  });
});

describe('businessDaysUntil', () => {
  it('mismo día: 0', () => {
    expect(businessDaysUntil('2026-10-05', '2026-10-05')).toBe(0);
  });
  it('hacia el futuro cuenta el día de llegada, no el de partida', () => {
    expect(businessDaysUntil('2026-10-05', '2026-10-06')).toBe(1);
    expect(businessDaysUntil('2026-10-05', '2026-10-09')).toBe(4);
  });
  it('los fines de semana y festivos no suman', () => {
    expect(businessDaysUntil('2026-10-09', '2026-10-13')).toBe(1); // vie → mar, sin sáb/dom/lunes festivo
  });
  it('hacia atrás es negativo (plazo vencido)', () => {
    expect(businessDaysUntil('2026-10-07', '2026-10-05')).toBe(-2);
  });
  it('es consistente con addBusinessDays', () => {
    const start = '2026-03-18';
    const end = addBusinessDays(start, 7);
    expect(businessDaysUntil(start, end)).toBe(7);
  });
});
