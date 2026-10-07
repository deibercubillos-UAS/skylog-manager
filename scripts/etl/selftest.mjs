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
// 10b. Fase 2.
ok(plan.maintenance.length === 1 && plan.maintenance[0].row.type === 'programado', 'mantenimiento');
ok(r.omitted.some((o) => o.entity === 'maintenance_events' && /fecha/.test(o.reason)), 'mantenimiento sin fecha debe omitirse');
ok(plan.maintenance[0].attachment.bucket === 'maintenance-docs' && plan.maintenance[0].receipt.key.endsWith('recibo.pdf'), 'archivos de mantenimiento');
ok(plan.suppliers[0].row.contact === 'Luis · l@r.co · 300' && plan.suppliers[0].row.nit === '800.1-1', 'proveedor');
ok(plan.audits[0].row.auditor_name === 'Sin registrar (migrada)', 'auditoría sin auditor');
ok(plan.manuals.length === 1 && plan.manualVersions.length === 2 && plan.manualAcks.length === 1, 'manuales');
const health = plan.checklists.find((c) => c.row.name === 'Salud del piloto');
ok(health && health.row.steps.join('|') === 'Descansé 8 h|Sin alcohol', 'lista de salud ordenada y sin vacíos');
ok(plan.checklists.some((c) => c.row.name === 'Pre-vuelo — JGJ') && plan.checklists.some((c) => c.row.name === 'Falla de enlace') && !plan.checklists.some((c) => /SORA/.test(c.row.name)), 'listas de chequeo');
ok(plan.personDocs.some((d) => d.doc_type === 'cedula') && plan.personDocs.find((d) => d.doc_type === 'certificado_medico').ref.bucket === 'fleet-images', 'expediente con URL del CDN');
ok(plan.aircraftImages.length === 1 && plan.archive.sora_assessments.length === 1 && !JSON.stringify(plan.archive.auth_users).includes('$2a$'), 'archivo de v1 sin contraseñas');
// 10c. SMS.
ok(plan.smsReports.length === 2 && plan.smsReports.find((x) => x.v1Id.startsWith('report:')).row.route === 'vor', 'reportes SMS y VOR/MOR');
ok(plan.caseActions.length === 1 && plan.caseEvents.length === 2 && r.omitted.some((o) => o.entity === 'sms_case_actions'), 'acciones y eventos de casos (la huérfana se omite)');
ok(plan.hazards.length === 2 && plan.hazards.filter((h) => h.assessment).length === 1 && plan.barriers.length === 1, 'peligros y barreras');
// 11. Idempotencia del plan: dos construcciones iguales.
ok(JSON.stringify(buildPlan(syntheticV1(), { today: new Date('2026-10-06T00:00:00Z') }).report.counts) === JSON.stringify(r.counts), 'plan no determinista');

console.log(`ETL autoprueba: ${checks} verificaciones OK`);
