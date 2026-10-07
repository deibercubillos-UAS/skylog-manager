#!/usr/bin/env node
// Autoprueba del ETL con datos sintéticos (sin base de datos): el plan debe cumplir los criterios de 32-migracion.md §5.2.
//   node scripts/etl/selftest.mjs
import assert from 'node:assert/strict';
import { syntheticV1 } from './fixtures/synthetic-v1.mjs';
import { buildPlan } from './lib/plan.mjs';

const t = syntheticV1();
const plan = buildPlan(t, { today: new Date('2026-10-06T00:00:00Z') });
const r = plan.report;
let checks = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); checks++; };

// 1. Conteos: v1 = migradas + omitidas (menos personas, que se unen y se cuentan aparte).
for (const [entity, c] of Object.entries(r.counts)) ok(c.source === c.migrated + c.omitted, `${entity}: ${c.source} ≠ ${c.migrated} + ${c.omitted}`);
// 2. Toda fila omitida tiene motivo.
ok(r.omitted.every((o) => o.reason), 'omitida sin motivo');
// 3. Unicidad que exige V2.
const uniq = (rows, key) => new Set(rows.map(key)).size === rows.length;
ok(uniq(plan.aircraft, (a) => `${a.v1Org}|${a.row.serial_number.toLowerCase()}`), 'serie de aeronave repetida');
ok(uniq(plan.batteries, (b) => `${b.v1Org}|${b.row.serial_number.toLowerCase()}`), 'serie de batería repetida');
ok(uniq(plan.memberships, (m) => `${m.personKey}|${m.v1Org}`), 'membresía repetida');
ok(uniq(plan.accounts, (a) => a.v1AuthId) && uniq(plan.accounts, (a) => a.email), 'cuenta repetida');
// 4. Referencias resolubles.
const orgs = new Set(plan.orgs.map((o) => o.v1Id));
const aircraft = new Set(plan.aircraft.map((a) => a.v1Id));
ok(plan.flights.every((f) => orgs.has(f.v1Org) && aircraft.has(f.v1Aircraft)), 'vuelo con organización o aeronave inexistente');
ok(plan.flights.every((f) => f.pilotKey !== null || plan.unassigned.some((u) => u.v1Org === f.v1Org)), 'vuelo sin piloto y sin «Sin asignar»');
ok(plan.models.every((m) => orgs.has(m.v1Org)) && plan.aircraft.every((a) => plan.models.some((m) => m.key === a.modelKey)), 'aeronave sin modelo');
// 5. Reglas de vuelo: duración positiva y aterrizaje posterior.
ok(plan.flights.every((f) => f.row.total_time > 0 && Date.parse(f.row.landing_at) > Date.parse(f.row.takeoff_at)), 'vuelo con duración o fechas inválidas');
// 6. Horas: el odómetro de la aeronave con vuelos coincide con la suma (en el ejemplo, sí).
ok(r.hoursCheck.find((h) => h.serial === 'SN-001').difference === 0, 'horas de SN-001 no cuadran');
// 7. Identidad: Marta (dos organizaciones) es UNA persona con dos membresías; los dos «Duplicado» NO se unen.
const marta = plan.people.find((p) => p.full_name === 'Marta Multi');
ok(marta && plan.memberships.filter((m) => m.personKey === marta.key).length === 2, 'Marta debe tener 2 membresías');
ok(plan.people.filter((p) => p.full_name.startsWith('Duplicado')).length === 2 && r.conflicts.length === 1, 'duplicados mal unidos');
const jefe = plan.people.find((p) => p.full_name === 'Jorge Jefe');
ok(jefe.medical_cert_expiry === '2026-11-15' && r.manual.some((m) => m.kind === 'vencimiento médico divergente'), 'vencimiento médico: gana el más temprano y queda para revisar');
// 8. Cuentas con hash; sin hash (Google) se avisa.
ok(plan.accounts.filter((a) => a.password_hash).length === 4 && r.warnings.some((w) => w.entity === 'accounts'), 'cuentas con/sin hash');
// 9. Suscripciones: la vencida con membresía activa se marca para decidir.
ok(r.flags.some((f) => /vencida/.test(f.flag)) && r.flags.some((f) => /ePayco/.test(f.flag)), 'suscripciones por confirmar');
// 10. La baja de una aeronave la deja fuera de servicio y los inactivos cierran su membresía.
ok(plan.memberships.find((m) => m.source === 'pilots' && !m.active)?.ended_at, 'membresía cerrada sin fecha de fin');
// 11. Idempotencia del plan: dos construcciones iguales.
ok(JSON.stringify(buildPlan(syntheticV1(), { today: new Date('2026-10-06T00:00:00Z') }).report.counts) === JSON.stringify(r.counts), 'plan no determinista');

console.log(`ETL autoprueba: ${checks} verificaciones OK`);
