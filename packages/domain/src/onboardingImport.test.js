import { describe, it, expect } from 'vitest';
import { ONBOARDING_SHEETS, parseOnboardingSheet, headerKey, parseDate, roleFromLabel, dedupeInFile } from './onboardingImport.js';

const sheet = (k) => ONBOARDING_SHEETS.find((s) => s.key === k);

describe('encabezados y utilidades', () => {
  it('los encabezados de la plantilla se reconocen, con o sin asterisco, tildes y mayúsculas', () => {
    for (const s of ONBOARDING_SHEETS) for (const c of s.columns) {
      expect(headerKey(s, c.header)).toBe(c.key);
      expect(headerKey(s, `${c.header} *`)).toBe(c.key);
      expect(headerKey(s, c.header.toUpperCase())).toBe(c.key);
    }
    expect(headerKey(sheet('aeronaves'), 'Numero de serie')).toBeNull(); // «N.º de serie» ≠ «Numero de serie»: se avisa, no se adivina
  });
  it('fechas', () => {
    expect(parseDate('2026-03-05')).toBe('2026-03-05');
    expect(parseDate('5/3/2026')).toBe('2026-03-05');
    expect(parseDate(new Date(Date.UTC(2026, 2, 5)))).toBe('2026-03-05');
    expect(parseDate('31/02/2026')).toBeNull();
    expect(parseDate('hola')).toBeNull();
  });
  it('roles en español', () => {
    expect(roleFromLabel('Jefe de Pilotos')).toBe('jefe_pilotos');
    expect(roleFromLabel('gerente SMS')).toBe('gerente_sms');
    expect(roleFromLabel('Gerente General')).toBe('admin');
    expect(roleFromLabel('director')).toBeNull();
  });
});

describe('parseOnboardingSheet', () => {
  it('aeronaves: válidas, con error y la fila de ejemplo se ignora', () => {
    const r = parseOnboardingSheet('aeronaves', [
      { 'Marca *': 'Ejemplo: DJI', 'Modelo *': 'X', 'N.º de serie *': 'S0' },
      { 'Marca *': 'DJI', 'Modelo *': 'M350', 'N.º de serie *': 'SN1', 'Horas totales': '12,5' },
      { 'Marca *': 'DJI', 'Modelo *': '', 'N.º de serie *': 'SN2' },
      {},
    ]);
    expect(r.skipped).toBe(2);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ row: 3, brand: 'DJI', serial: 'SN1', hours: 12.5 });
    expect(r.errors).toEqual([{ row: 4, message: 'Falta el modelo.' }]);
  });
  it('baterías: ciclos enteros y salud válida', () => {
    const r = parseOnboardingSheet('baterias', [{ 'N.º de serie': 'B1', Ciclos: 3.5, 'Estado de salud': 'Buena' }, { 'N.º de serie': 'B2', Ciclos: 4, 'Estado de salud': 'Excelente' }]);
    expect(r.errors.map((e) => e.message)).toEqual(['Los ciclos debe ser un número entero.', 'Estado de salud: buena, regular o mala.']);
  });
  it('tripulación: correo y rol', () => {
    const r = parseOnboardingSheet('tripulacion', [{ Correo: 'Ana@Empresa.com', Rol: 'Piloto', 'Nombre completo': 'Ana' }, { Correo: 'malo', Rol: 'cocinero' }]);
    expect(r.items[0]).toMatchObject({ email: 'ana@empresa.com', role: 'piloto', name: 'Ana' });
    expect(r.errors).toHaveLength(2);
  });
  it('celdas con hipervínculo llegan como { text }', () => {
    const r = parseOnboardingSheet('tripulacion', [{ Correo: { text: 'luis@empresa.com', hyperlink: 'mailto:luis@empresa.com' }, Rol: 'piloto' }]);
    expect(r.items[0].email).toBe('luis@empresa.com');
  });
  it('pólizas: fechas y orden', () => {
    const r = parseOnboardingSheet('polizas', [
      { Aseguradora: 'X', 'N.º de póliza': 'P1', Inicio: '2026-01-01', Fin: '2026-12-31', 'Valor asegurado (COP)': 5000 },
      { Aseguradora: 'X', 'N.º de póliza': 'P2', Inicio: '2026-12-31', Fin: '2026-01-01' },
    ]);
    expect(r.items[0]).toMatchObject({ type: 'rce', start: '2026-01-01', end: '2026-12-31', amount: 5000 });
    expect(r.errors[0].message).toMatch(/anterior/);
  });
  it('contactos: pide teléfono o correo', () => {
    expect(parseOnboardingSheet('contactos', [{ Nombre: 'Torre' }]).errors[0].message).toMatch(/teléfono o un correo/);
  });
  it('hoja desconocida lanza', () => {
    expect(() => parseOnboardingSheet('nada', [])).toThrow();
  });
});

describe('dedupeInFile', () => {
  it('la primera fila gana', () => {
    const r = dedupeInFile([{ s: 'A', row: 2 }, { s: 'a', row: 3 }, { s: 'B', row: 4 }], (x) => x.s.toLowerCase());
    expect(r.unique.map((x) => x.row)).toEqual([2, 4]);
    expect(r.duplicates.map((x) => x.row)).toEqual([3]);
  });
});
