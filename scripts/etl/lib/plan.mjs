// scripts/etl/lib/plan.mjs — construye el PLAN de migración v1 → V2 a partir de las tablas de v1 (en memoria, sin
// tocar ninguna base). El mismo plan alimenta el `--dry-run` (solo informe) y el `--commit` (escritura). Cada fila
// omitida o transformada con aviso queda en el informe: nada se resuelve en silencio (32-migracion.md premisa 3).
import { DJI_MODELS_CATALOG } from '../../../src/lib/v2/djiModelsCatalog.js';
import {
  mergePeople, transformFlight, transformMission, transformSubscription, mapBatteryHealth, mapBatteryStatus, mapAircraftStatus,
  resolveBrandModel, modelKey, roleFromPilotRole, mapMembershipRole, dateOnly,
} from '../../../packages/domain/src/migration/index.js';

const clean = (v) => (v === null || v === undefined ? '' : String(v).trim());
const UNASSIGNED_NAME = 'Sin asignar (migrado)';

export function buildPlan(t, { today = new Date() } = {}) {
  const tbl = (name) => t[name] || [];
  const report = { counts: {}, omitted: [], warnings: [], manual: [], identity: [], conflicts: [], flags: [], notes: [] };
  const count = (entity, source, migrated) => { report.counts[entity] = { source, migrated, omitted: source - migrated }; };
  const omit = (entity, id, reason) => report.omitted.push({ entity, id, reason });
  const warn = (entity, id, message) => report.warnings.push({ entity, id, message });

  // ── 1. Organizaciones (+ certificaciones) ──────────────────────────────────────────────────────────────────────
  const orgs = tbl('organizations').map((o) => ({
    v1Id: o.id,
    row: {
      company_name: clean(o.company_name) || 'Sin nombre (migrada)',
      nit: clean(o.tax_id) || null,
      domicile: clean(o.address) || null,
      created_at: o.created_at || null,
      legal_rep: clean(o.legal_rep) || null,
      phone: clean(o.phone) || null,
      contact_email: clean(o.operator_email).toLowerCase() || null,
      nit_type: clean(o.tax_id_type) || null,
    },
    logoSource: clean(o.logo_url) || null,
    cert: clean(o.dan_number) || clean(o.operator_number) || o.registration_expiry
      ? { dan_number: clean(o.dan_number) || null, operator_number: clean(o.operator_number) || null, registration_expiry: dateOnly(o.registration_expiry) }
      : null,
    archived: { authorized_operations: o.authorized_operations, slug: o.slug, unique_code: o.unique_code },
  }));
  const orgIds = new Set(orgs.map((o) => o.v1Id));
  orgs.filter((o) => !o.row.company_name || o.row.company_name === 'Sin nombre (migrada)').forEach((o) => warn('organizations', o.v1Id, 'sin nombre'));
  const nits = new Map();
  orgs.forEach((o) => { const k = o.row.nit?.replace(/[\s.\-]/g, '').toUpperCase(); if (k) { if (nits.has(k)) warn('organizations', o.v1Id, `NIT repetido con ${nits.get(k)} — V2 exige NIT único: revisar a mano`); else nits.set(k, o.v1Id); } });
  count('organizations', tbl('organizations').length, orgs.length);

  // ── 2. Personas (identidad §3) → cuentas → membresías → adiciones ──────────────────────────────────────────────
  const authById = new Map(tbl('auth_users').map((u) => [u.id, u]));
  const merged = mergePeople({ profiles: tbl('profiles'), pilots: tbl('pilots') });
  report.identity = merged.report;
  report.conflicts = merged.conflicts;
  report.manual.push(...merged.report.filter((r) => r.manual).map((r) => ({ kind: 'vencimiento médico divergente', ...r })));
  merged.conflicts.forEach((c) => report.manual.push({ kind: 'posible duplicado sin unir', ...c }));

  const people = merged.people.map((p) => ({ ...p, v1Key: `person:${p.profileIds[0] || p.pilotIds[0]}` }));
  const accounts = [];
  for (const p of people) {
    const candidates = p.profileIds.map((id) => authById.get(id)).filter(Boolean);
    if (p.profileIds.length && !candidates.length) { warn('accounts', p.profileIds[0], 'perfil sin usuario de autenticación: la persona se migra sin cuenta'); continue; }
    if (!candidates.length) continue;
    const [first, ...extra] = candidates;
    extra.forEach((u) => report.manual.push({ kind: 'dos cuentas para una misma persona', person: p.full_name, kept: first.email, dropped: u.email }));
    accounts.push({
      personKey: p.key, v1AuthId: first.id, email: clean(first.email).toLowerCase(), password_hash: first.encrypted_password || null,
      email_confirmed: !!first.email_confirmed_at, signup_attribution: tbl('profiles').find((x) => x.id === first.id)?.signup_attribution || null,
    });
    if (!first.encrypted_password) warn('accounts', first.id, 'usuario sin contraseña cifrada (ingreso con Google/enlace): usará "olvidé mi contraseña" o Google');
  }

  // Membresías: organization_members es la fuente de verdad; los pilotos sin fila se derivan de `pilots`.
  const memberships = new Map();
  const mKey = (personKey, org) => `${personKey}|${org}`;
  for (const m of tbl('organization_members')) {
    const personKey = merged.profileToPerson.get(m.user_id);
    if (personKey === undefined) { omit('memberships', m.id, 'perfil no encontrado'); continue; }
    if (!orgIds.has(m.organization_id)) { omit('memberships', m.id, 'organización no migrada'); continue; }
    const mapped = mapMembershipRole(m.role);
    if (mapped.warning) warn('memberships', m.id, mapped.warning);
    memberships.set(mKey(personKey, m.organization_id), { personKey, v1Org: m.organization_id, role: mapped.role, active: m.is_active !== false, started_at: m.joined_at || null, ended_at: null, source: 'organization_members', v1Id: m.id });
  }
  for (const pl of tbl('pilots')) {
    const personKey = merged.pilotToPerson.get(pl.id);
    if (!orgIds.has(pl.organization_id)) { omit('pilots', pl.id, 'organización no migrada'); continue; }
    const k = mKey(personKey, pl.organization_id);
    const inactive = pl.is_active === false || !!pl.deactivated_at;
    const existing = memberships.get(k);
    if (existing) {
      if (inactive && existing.active) { existing.active = false; existing.ended_at = pl.deactivated_at || null; }
      continue;
    }
    const mapped = roleFromPilotRole(pl.pilot_role);
    if (mapped.warning) warn('memberships', pl.id, mapped.warning);
    memberships.set(k, { personKey, v1Org: pl.organization_id, role: mapped.role, active: !inactive, started_at: pl.created_at || null, ended_at: inactive ? pl.deactivated_at || null : null, source: 'pilots', v1Id: `pilot:${pl.id}` });
  }
  for (const m of memberships.values()) {
    // `ended_at` debe ser posterior a `started_at`; si no lo es, se cierra "ahora" (se informa).
    if (!m.active) { if (!m.ended_at || (m.started_at && Date.parse(m.ended_at) <= Date.parse(m.started_at))) m.ended_at = new Date(Math.max(Date.parse(m.started_at || 0) + 1000, today.getTime())).toISOString(); }
  }
  const additions = people.flatMap((p) => p.additions.map((addition) => ({ personKey: p.key, addition })));
  people.forEach((p) => p.unknownAdditions.forEach((a) => report.manual.push({ kind: 'adición de licencia fuera del catálogo', person: p.full_name, addition: a })));
  const peopleRows = tbl('profiles').length + tbl('pilots').length;
  report.counts.people = { source: peopleRows, migrated: peopleRows, omitted: 0, note: `${people.length} personas a partir de ${peopleRows} filas (perfiles + pilotos): varias filas pueden ser la misma persona` };
  report.counts.accounts = { source: tbl('auth_users').length, migrated: accounts.length, omitted: tbl('auth_users').length - accounts.length };

  // ── 3. Flota: modelos → aeronaves → baterías → componentes ─────────────────────────────────────────────────────
  const models = new Map();
  const aircraft = [];
  const seenSerial = new Set();
  for (const a of tbl('aircraft')) {
    if (!orgIds.has(a.organization_id)) { omit('aircraft', a.id, 'organización no migrada'); continue; }
    const bm = resolveBrandModel(a, DJI_MODELS_CATALOG);
    if (bm.unresolved) report.manual.push({ kind: 'aeronave con marca sin definir', aircraft: a.id, model: bm.model });
    if (bm.inferred) warn('aircraft', a.id, `marca «${bm.brand}» tomada del catálogo por el modelo`);
    const mk = modelKey(a.organization_id, bm.brand, bm.model);
    if (!models.has(mk)) models.set(mk, { key: mk, v1Org: a.organization_id, brand: bm.brand, model: bm.model, mtow_kg: Number(a.mtow) > 0 ? Number(a.mtow) : null });
    else if (!models.get(mk).mtow_kg && Number(a.mtow) > 0) models.get(mk).mtow_kg = Number(a.mtow);
    let serial = clean(a.serial_number);
    if (!serial) { serial = `SIN-SERIE-${String(a.id).slice(0, 8)}`; warn('aircraft', a.id, 'sin número de serie → se asigna un marcador'); }
    const sk = `${a.organization_id}|${serial.toLowerCase()}`;
    if (seenSerial.has(sk)) { omit('aircraft', a.id, `serie repetida en la organización («${serial}»)`); continue; }
    seenSerial.add(sk);
    const status = mapAircraftStatus(a);
    aircraft.push({
      v1Id: a.id, v1Org: a.organization_id, modelKey: mk,
      row: { serial_number: serial, ruas_number: clean(a.ruas) || null, total_hours: Number(a.total_hours) || 0, operational_status: status.operational_status, created_at: a.created_at || null },
      sources: { image: clean(a.image_url) || null, rce: clean(a.rce_url) || null, dan: clean(a.dan_url) || null },
    });
  }
  count('aircraft', tbl('aircraft').length, aircraft.length);
  const aircraftIds = new Set(aircraft.map((a) => a.v1Id));

  const batteries = [];
  const seenBat = new Set();
  for (const b of tbl('batteries')) {
    if (!orgIds.has(b.organization_id)) { omit('batteries', b.id, 'organización no migrada'); continue; }
    const serial = clean(b.serial_number);
    if (!serial) { omit('batteries', b.id, 'sin serie'); continue; }
    const k = `${b.organization_id}|${serial.toLowerCase()}`;
    if (seenBat.has(k)) { omit('batteries', b.id, `serie repetida («${serial}»)`); continue; }
    seenBat.add(k);
    const health = mapBatteryHealth(b.health_status);
    if (health.warning) warn('batteries', b.id, health.warning);
    batteries.push({ v1Id: b.id, v1Org: b.organization_id, row: { serial_number: serial, brand: clean(b.brand) || null, model: clean(b.model) || null, cycles: Number(b.cycles) || 0, health_status: health.value, status: mapBatteryStatus(b.status), created_at: b.created_at || null } });
  }
  count('batteries', tbl('batteries').length, batteries.length);

  const components = [];
  for (const c of tbl('aircraft_components')) {
    if (!aircraftIds.has(c.aircraft_id)) { omit('aircraft_components', c.id, 'aeronave no migrada'); continue; }
    components.push({ v1Id: c.id, v1Org: c.organization_id, v1Aircraft: c.aircraft_id, row: {
      component_type: c.component_type, name: clean(c.name) || null, serial_number: clean(c.serial) || null, status: c.status === 'retirado' ? 'retirado' : 'activo',
      installed_at: c.installed_at || null, installed_at_aircraft_hours: Number(c.installed_at_aircraft_hours) || 0, retired_at: c.retired_at || null, retired_at_aircraft_hours: c.retired_at_aircraft_hours ?? null } });
  }
  count('aircraft_components', tbl('aircraft_components').length, components.length);

  // ── 4. Misiones y vuelos ───────────────────────────────────────────────────────────────────────────────────────
  const pilotPerson = (pilotId) => (merged.pilotToPerson.has(pilotId) ? merged.pilotToPerson.get(pilotId) : null);
  const unassignedOrgs = new Set();
  const missions = [];
  const missionIds = new Set();
  const authCtx = { organization: (id) => (orgIds.has(id) ? id : null), pilotPerson, aircraft: (id) => (aircraftIds.has(id) ? id : null), mission: () => null };
  for (const a of tbl('flight_authorizations')) {
    const r = transformMission(a, authCtx);
    if (!r.ok) { omit('missions', a.id, r.reason); continue; }
    r.warnings.forEach((w) => warn('missions', a.id, w));
    if (r.unassigned) unassignedOrgs.add(a.organization_id);
    if (r.aerocivilAuthNumber) report.manual.push({ kind: 'N.º de autorización AeroCivil de una misión (se archiva; no hay autorización equivalente en V2)', mission: a.id, number: r.aerocivilAuthNumber });
    missionIds.add(a.id);
    missions.push({ v1Id: a.id, v1Org: a.organization_id, v1Aircraft: r.row.aircraft_id, picKey: pilotPerson(a.pilot_id), observerKey: a.observer_id ? pilotPerson(a.observer_id) : null, row: r.row });
  }
  count('missions', tbl('flight_authorizations').length, missions.length);

  const flights = [];
  const seenFlight = new Set();
  const flightCtx = { ...authCtx, mission: (id) => (missionIds.has(id) ? id : null) };
  for (const f of tbl('flights')) {
    const r = transformFlight(f, flightCtx);
    if (!r.ok) { omit('flights', f.id, r.reason); continue; }
    const dk = `${f.organization_id}|${f.aircraft_id}|${dateOnly(f.flight_date)}|${f.takeoff_time}`;
    if (seenFlight.has(dk)) { omit('flights', f.id, 'duplicado (misma aeronave, fecha y hora de despegue)'); continue; }
    seenFlight.add(dk);
    r.warnings.forEach((w) => warn('flights', f.id, w));
    if (r.unassigned) unassignedOrgs.add(f.organization_id);
    flights.push({ v1Id: f.id, v1Org: f.organization_id, v1Aircraft: f.aircraft_id, v1Mission: f.auth_id && missionIds.has(f.auth_id) ? f.auth_id : null, pilotKey: pilotPerson(f.pilot_id), row: r.row, replaySource: r.replaySource });
  }
  count('flights', tbl('flights').length, flights.length);

  // Horas: odómetro copiado tal cual y comparado con la suma de los vuelos migrados (§4-5).
  const flightHours = new Map();
  flights.forEach((f) => flightHours.set(f.v1Aircraft, (flightHours.get(f.v1Aircraft) || 0) + f.row.total_time));
  report.hoursCheck = aircraft.map((a) => ({ aircraft: a.v1Id, serial: a.row.serial_number, odometer: a.row.total_hours, flights_sum: Math.round((flightHours.get(a.v1Id) || 0) * 100) / 100, difference: Math.round((a.row.total_hours - (flightHours.get(a.v1Id) || 0)) * 100) / 100 }));

  // Personas «Sin asignar (migrado)»: una por organización que las necesite (decisión F).
  const unassigned = [...unassignedOrgs].map((v1Org) => ({ v1Org, v1Key: `unassigned:${v1Org}`, row: { full_name: UNASSIGNED_NAME } }));
  report.notes.push(`${unassigned.length} organización(es) con vuelos o misiones sin piloto → persona «${UNASSIGNED_NAME}»`);

  // ── 5. Pólizas, suscripciones, socios, app, municipios ────────────────────────────────────────────────────────
  const insurance = tbl('insurance_policies').filter((p) => orgIds.has(p.organization_id)).map((p) => ({
    v1Id: p.id, v1Org: p.organization_id, v1Aircraft: p.aircraft_id && aircraftIds.has(p.aircraft_id) ? p.aircraft_id : null,
    row: { policy_type: 'rce', insurer: clean(p.insurance_company), policy_number: clean(p.policy_number), start_date: dateOnly(p.start_date), end_date: dateOnly(p.end_date), covers_all_fleet: !p.aircraft_id, is_active: true } }));
  count('insurance_policies', tbl('insurance_policies').length, insurance.length);

  const subscriptions = [];
  for (const o of orgs) {
    const admins = tbl('organization_members').filter((m) => m.organization_id === o.v1Id && m.role === 'admin' && m.is_active !== false).sort((a, b) => Date.parse(a.joined_at || 0) - Date.parse(b.joined_at || 0));
    const s = transformSubscription(admins[0], today);
    if (s.skip) { warn('subscriptions', o.v1Id, s.reason); continue; }
    s.flags.forEach((f) => report.flags.push({ organization: o.row.company_name, v1Org: o.v1Id, plan: s.row.plan, expires_at: s.row.expires_at, flag: f }));
    subscriptions.push({ v1Org: o.v1Id, row: s.row, organization: o.row.company_name });
  }
  count('subscriptions', orgs.length, subscriptions.length);

  const partners = tbl('partners').map((p) => ({ v1Id: p.id, row: { type: p.type, name: p.name, status: p.status, commission_pct: Number(p.commission_pct) || 0, free_seats_limit: p.free_seats_limit ?? null, free_seats_used: Number(p.free_seats_used) || 0, free_days: Number(p.free_days) || 90, created_at: p.created_at || null }, v1Parent: p.parent_partner_id || null, logoSource: clean(p.logo_url) || null }));
  const partnerIds = new Set(partners.map((p) => p.v1Id));
  const partnerCodes = tbl('partner_codes').filter((c) => partnerIds.has(c.partner_id)).map((c) => ({ v1Id: c.id, v1Partner: c.partner_id, row: { code: c.code, active: c.active !== false, created_at: c.created_at || null } }));
  const partnerMembers = [];
  for (const m of tbl('partner_members')) {
    const personKey = merged.profileToPerson.get(m.profile_id);
    if (personKey === undefined || !partnerIds.has(m.partner_id)) { omit('partner_members', m.id, 'perfil o socio no migrado'); continue; }
    partnerMembers.push({ v1Id: m.id, v1Partner: m.partner_id, personKey, row: { role: m.role, created_at: m.created_at || null } });
  }
  const grants = tbl('free_grants').filter((g) => !g.partner_id || partnerIds.has(g.partner_id)).map((g) => ({
    v1Id: g.id, v1Partner: g.partner_id || null, v1Advisor: g.advisor_member_id || null, v1RedeemedOrg: g.redeemed_org_id && orgIds.has(g.redeemed_org_id) ? g.redeemed_org_id : null,
    row: { email: clean(g.email).toLowerCase(), plan: g.plan || 'piloto', status: g.status, token: g.token, granted_at: g.granted_at, expires_at: g.expires_at, purge_after: g.purge_after, welcome_shown_at: g.welcome_shown_at || null } }));
  const referrals = tbl('referrals').filter((r) => partnerIds.has(r.partner_id) && orgIds.has(r.org_id)).map((r) => ({ v1Id: r.id, v1Partner: r.partner_id, v1Org: r.org_id, row: { code: r.code || null, plan: r.plan || null, billing: r.billing || null, status: r.status, created_at: r.created_at || null } }));
  count('partners', tbl('partners').length, partners.length);
  count('free_grants', tbl('free_grants').length, grants.length);
  count('referrals', tbl('referrals').length, referrals.length);
  if (tbl('referral_commissions').length) report.manual.push({ kind: 'hay comisiones en v1: migrarlas requiere decidir su referencia de pago', count: tbl('referral_commissions').length });

  const release = tbl('app_releases').filter((r) => r.is_current).sort((a, b) => b.version_code - a.version_code)[0] || null;
  const geo = tbl('colombia_geo').map((g) => ({ code: g['Código Municipio'] ?? g.code, department: g['Nombre Departamento'] ?? g.department, municipality: g['Nombre Municipio'] ?? g.municipality })).filter((g) => g.code && g.department && g.municipality);
  count('colombia_geo', tbl('colombia_geo').length, geo.length);

  return { orgs, people, accounts, memberships: [...memberships.values()], additions, models: [...models.values()], aircraft, batteries, components, missions, flights, unassigned, insurance, subscriptions, partners, partnerCodes, partnerMembers, grants, referrals, release, geo, report };
}
