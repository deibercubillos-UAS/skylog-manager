// migration/core — transformaciones puras v1 → V2 (docs/skylog-v2/32-migracion.md §2 y §4). Cada función devuelve el
// valor nuevo MÁS lo que hay que informar: nada se resuelve en silencio.

const clean = (v) => (v === null || v === undefined ? '' : String(v).trim());
const pad = (n) => String(n).padStart(2, '0');
const COLOMBIA_OFFSET_HOURS = 5; // UTC−5, sin horario de verano (la misma convención de todo V2)

/** 'YYYY-MM-DD' desde un string o un Date (pg devuelve `date` como Date a medianoche UTC). */
export function dateOnly(value) {
  if (!value) return null;
  if (value instanceof Date) return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
  const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Instante UTC (ISO) de una fecha + hora locales de Colombia. `dayOffset` suma días (vuelo que cruza medianoche). */
export function colombiaInstant(date, time, dayOffset = 0) {
  const d = dateOnly(date);
  const t = String(time || '').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!d || !t) return null;
  const [y, mo, da] = d.split('-').map(Number);
  const ms = Date.UTC(y, mo - 1, da + dayOffset, Number(t[1]) + COLOMBIA_OFFSET_HOURS, Number(t[2]), Number(t[3] || 0));
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** Fecha (YYYY-MM-DD) en hora de Colombia de un instante (p. ej. un vencimiento guardado como timestamptz). */
export function colombiaDate(instant) {
  if (!instant) return null;
  const ms = Date.parse(instant);
  if (Number.isNaN(ms)) return null;
  return new Date(ms - COLOMBIA_OFFSET_HOURS * 3_600_000).toISOString().slice(0, 10);
}

const LOS = ['VLOS', 'EVLOS', 'BVLOS'];
const RULES = ['VMC', 'IMC', 'NIGHT'];

/**
 * Un vuelo de v1 → fila de V2, u `omit` con el motivo. No inserta nada: `ctx` trae los mapas ya resueltos.
 * @returns {{ ok: true, row: object, warnings: string[] } | { ok: false, reason: string }}
 */
export function transformFlight(f, ctx) {
  const warnings = [];
  const aircraftId = ctx.aircraft(f.aircraft_id);
  if (f.aircraft_id && !aircraftId) return { ok: false, reason: 'aeronave no migrada' };

  if (!dateOnly(f.flight_date) || !f.takeoff_time) return { ok: false, reason: 'sin fecha u hora de despegue' };
  const takeoff = colombiaInstant(f.flight_date, f.takeoff_time);

  let total = Number(f.total_time);
  let landing = null;
  if (f.landing_time) {
    // Un aterrizaje igual o anterior al despegue puede ser un vuelo que cruzó la medianoche o un registro sin duración.
    // Se elige la lectura que concuerda con `total_time`; sin él, solo se acepta el cruce si dura ≤ 6 h (misma regla
    // que el cierre de vuelo de v1: muy por encima de la autonomía real de cualquier batería).
    const sameDay = colombiaInstant(f.flight_date, f.landing_time);
    const nextDay = colombiaInstant(f.flight_date, f.landing_time, 1);
    const d0 = (Date.parse(sameDay) - Date.parse(takeoff)) / 3_600_000;
    const d1 = (Date.parse(nextDay) - Date.parse(takeoff)) / 3_600_000;
    if (total > 0) landing = d0 > 0 && Math.abs(d0 - total) <= Math.abs(d1 - total) ? sameDay : nextDay;
    else if (d0 > 0) landing = sameDay;
    else if (d0 < 0 && d1 <= 6) landing = nextDay;
    else landing = sameDay; // igual al despegue: duración 0 → se omite más abajo
  }
  if (!(total > 0)) {
    if (!landing) return { ok: false, reason: 'sin duración (total_time vacío y sin hora de aterrizaje)' };
    total = (Date.parse(landing) - Date.parse(takeoff)) / 3_600_000;
    if (!(total > 0)) return { ok: false, reason: 'duración de 0 minutos' };
    warnings.push('duración calculada desde las horas (total_time vacío)');
  }
  if (!landing) {
    landing = new Date(Date.parse(takeoff) + total * 3_600_000).toISOString();
    warnings.push('aterrizaje calculado desde la duración');
  } else if (Math.abs((Date.parse(landing) - Date.parse(takeoff)) / 1000 - total * 3600) > 60) {
    warnings.push('aterrizaje − despegue no coincide con la duración (±1 min)');
  }
  if (Date.parse(landing) <= Date.parse(takeoff)) return { ok: false, reason: 'aterrizaje no posterior al despegue' };

  const pilotPerson = f.pilot_id ? ctx.pilotPerson(f.pilot_id) : null;
  const unassigned = !pilotPerson;
  if (unassigned) warnings.push(f.pilot_id ? 'piloto no migrado → «Sin asignar (migrado)»' : 'sin piloto → «Sin asignar (migrado)»');

  const los = clean(f.line_of_sight).toUpperCase();
  const rules = clean(f.visual_condition).toUpperCase();
  const row = {
    organization_id: ctx.organization(f.organization_id),
    pilot_person_id: pilotPerson,
    aircraft_id: aircraftId || null,
    mission_id: f.auth_id ? ctx.mission(f.auth_id) || null : null,
    takeoff_at: takeoff,
    landing_at: landing,
    total_time: Math.round(total * 10000) / 10000,
    mission_type: clean(f.mission_type) || null,
    location: clean(f.location) || null,
    notes: clean(f.notes) || null,
    external_ref: clean(f.mission_id) || clean(f.flight_number) || null,
    alerts: f.has_alerts && f.alerts_json ? f.alerts_json : null,
    source: f.imported ? 'importado' : 'manual',
    flight_rules: RULES.includes(rules) ? rules : null,
  };
  if (LOS.includes(los)) row.visual_condition = los;
  else warnings.push('sin línea de vista → queda vacía en V2');
  if (!row.organization_id) return { ok: false, reason: 'organización no migrada' };
  return { ok: true, row, warnings, unassigned, replaySource: clean(f.replay_path) || null };
}

/** Salud de batería: v1 la guarda como porcentaje; V2 como tres niveles. */
export function mapBatteryHealth(value) {
  const n = Number(value);
  if (value === null || value === undefined || value === '' || Number.isNaN(n)) return { value: 'buena', warning: 'sin dato de salud → buena' };
  if (n >= 80) return { value: 'buena' };
  if (n >= 50) return { value: 'regular' };
  return { value: 'mala' };
}

export function mapBatteryStatus(value) {
  const v = clean(value).toLowerCase();
  if (['baja', 'retirada', 'retirado', 'dada de baja', 'de baja'].includes(v)) return 'baja';
  return 'operativo';
}

export function mapAircraftStatus(row) {
  if (row.baja_date) return { operational_status: 'fuera_de_servicio', note: 'con baja en v1' };
  const v = clean(row.operational_status).toLowerCase();
  if (v === 'en_mantenimiento') return { operational_status: 'en_mantenimiento' };
  return { operational_status: 'disponible' };
}

/** Marca y modelo: nunca se inventa la marca. Una marca vacía se completa solo si el modelo está en el catálogo. */
export function resolveBrandModel(row, catalog = []) {
  const model = clean(row.model);
  let brand = clean(row.brand);
  if (!brand) {
    const hit = catalog.find((c) => c.model.toLowerCase() === model.toLowerCase());
    if (hit) return { brand: hit.brand, model, inferred: true };
    return { brand: 'Sin definir', model: model || 'Sin definir', unresolved: true };
  }
  return { brand, model: model || 'Sin definir' };
}
export const modelKey = (organizationId, brand, model) => `${organizationId}|${clean(brand).toLowerCase()}|${clean(model).toLowerCase()}`;

const ROLE_BY_PILOT_ROLE = [
  [/general|admin/i, 'admin'],
  [/jefe/i, 'jefe_pilotos'],
  [/sms|gerente/i, 'gerente_sms'],
];
const SYSTEM_ROLES = ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto', 'superadmin'];

/** Rol de un tripulante que NO tiene fila en organization_members (invitado que nunca se registró). */
export function roleFromPilotRole(pilotRole) {
  const text = clean(pilotRole);
  if (SYSTEM_ROLES.includes(text)) return { role: text };
  const hit = ROLE_BY_PILOT_ROLE.find(([re]) => re.test(text));
  if (hit) return { role: hit[1] };
  if (!text || /^piloto/i.test(text)) return { role: 'piloto' };
  return { role: 'piloto', warning: `cargo «${text}» sin equivalente → piloto` };
}

export function mapMembershipRole(role) {
  const r = clean(role).toLowerCase();
  return SYSTEM_ROLES.includes(r) ? { role: r } : { role: 'piloto', warning: `rol «${role}» sin equivalente → piloto` };
}

/**
 * Suscripción de una organización a partir de la membresía del Gerente General (igual que `getOrgPlan()` de v1).
 * El cobro recurrente de ePayco NO se migra (se re-suscribe en Wompi): solo plan y vencimiento (decisión C).
 */
export function transformSubscription(adminMember, today = new Date()) {
  if (!adminMember) return { skip: true, reason: 'sin Gerente General: no hay de dónde leer el plan' };
  const plan = ['piloto', 'escuadrilla', 'flota', 'enterprise'].includes(adminMember.subscription_plan) ? adminMember.subscription_plan : 'piloto';
  const expires_at = colombiaDate(adminMember.subscription_expires_at);
  const wompi = adminMember.payment_provider === 'wompi' && adminMember.wompi_payment_source_id;
  const flags = [];
  if (expires_at && expires_at < dateOnly(today)) flags.push('vencida pero con membresía activa: decidir si sigue o se degrada');
  if (adminMember.epayco_subscription_id) flags.push('tenía recurrencia de ePayco: cancelar en el corte y re-suscribir en Wompi');
  const row = {
    plan,
    expires_at,
    billing: 'monthly',
    payment_provider: wompi ? 'wompi' : null,
    wompi_payment_source_id: wompi ? adminMember.wompi_payment_source_id : null,
    migrated_from_v1: true,
    legacy_epayco_subscription_id: clean(adminMember.epayco_subscription_id) || null,
    notes: `Migrado de v1 (plan ${adminMember.subscription_plan || 's/d'}${expires_at ? `, vence ${expires_at}` : ', sin vencimiento'})`,
  };
  return { skip: false, row, flags };
}

const MISSION_STATUS = { autorizado: 'programada', realizado: 'cerrada', cancelado: 'cancelada' };

/** Una autorización de v1 → misión de V2 (el `plan_data` trae el nombre, la zona, la altitud y las notas). */
export function transformMission(a, ctx) {
  const warnings = [];
  const organization = ctx.organization(a.organization_id);
  if (!organization) return { ok: false, reason: 'organización no migrada' };
  if (!a.scheduled_at) return { ok: false, reason: 'sin fecha programada' };
  let plan = a.plan_data;
  if (typeof plan === 'string') { try { plan = JSON.parse(plan); } catch { plan = null; } }
  plan = plan && typeof plan === 'object' ? plan : {};

  const pic = a.pilot_id ? ctx.pilotPerson(a.pilot_id) : null;
  if (!pic) warnings.push(a.pilot_id ? 'piloto no migrado → «Sin asignar (migrado)»' : 'sin piloto → «Sin asignar (migrado)»');
  const status = MISSION_STATUS[clean(a.status).toLowerCase()];
  if (!status) warnings.push(`estado «${a.status}» sin equivalente → programada`);
  const aircraftId = a.aircraft_id ? ctx.aircraft(a.aircraft_id) : null;
  if (a.aircraft_id && !aircraftId) warnings.push('aeronave no migrada → sin aeronave');

  const hasGeo = plan.points || plan.geo_type || plan.radius;
  const los = clean(a.line_of_sight).toUpperCase();
  const altitude = Number(plan.altitude);
  const row = {
    organization_id: organization,
    pic_person_id: pic,
    aircraft_id: aircraftId,
    observer_person_id: a.observer_id ? ctx.pilotPerson(a.observer_id) || null : null,
    name: clean(plan.op_name) || clean(a.mission_id) || clean(a.mission_type) || 'Misión migrada',
    zone: clean(a.location) || 'Sin zona (migrada)',
    scheduled_at: a.scheduled_at,
    status: status || 'programada',
    notes: clean(plan.notes) || clean(a.cancellation_notes) || null,
    zone_geo: hasGeo ? { geo_type: plan.geo_type || null, points: plan.points || null, radius: plan.radius || null } : null,
    altitude_agl_m: Number.isFinite(altitude) && altitude > 0 ? altitude : null,
  };
  if (LOS.includes(los)) row.line_of_sight = los;
  return { ok: true, row, warnings, unassigned: !pic, aerocivilAuthNumber: clean(a.aerocivil_auth_number) || null };
}
