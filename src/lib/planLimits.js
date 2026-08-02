// src/lib/planLimits.js

// Precios COP: piloto $20.000/mes ($200.000/año, 15 días gratis) · escuadrilla $238.000/mes ($200.000 + IVA), $2.570.400/año (10% desc.) · flota $476.000/mes ($400.000 + IVA), $5.140.800/año (10% desc.)
export const PLAN_CONFIG = {
  piloto: {
    name: 'Plan Piloto',
    price: { monthly: 20000, annual: 200000, trialDays: 15 },
    allowedRoles: ['piloto'],
    maxDrones: 1,
    maxPilots: 1,
    maxBatteries: 3,
    maxTech: 3,
    features: {
      maintenance: 'basic',
      reports: 'basic',         // Solo Maestro de Vuelo sin logo corporativo
      sms: false,
      authorizations: false,
      audit: false,
      customChecklist: false,
      whiteLabel: false,
      api: false,
    }
  },
  escuadrilla: {
    name: 'Plan Escuadrilla',
    price: { monthly: 238000, annual: 2570400, freeMonths: null },
    allowedRoles: ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto'],
    maxDrones: 3,
    // 5 cupos = 3 piloto + 1 jefe_pilotos + 1 gerente_sms (Gerente General no cuenta,
    // ver isGerenteGeneral/crewCountsForLimit — 2026-08-01, mismos beneficios que Flota).
    maxPilots: 5,
    maxBatteries: null,         // Ilimitadas
    maxTech: null,              // Ilimitados
    features: {
      maintenance: 'advanced',
      reports: 'full',          // F-OPS-002 + F-MNT-003 + F-HUM-005
      sms: 'full',
      authorizations: true,     // F-OPS-001
      audit: true,
      customChecklist: true,
      whiteLabel: false,
      api: false,
    }
  },
  flota: {
    name: 'Plan Flota',
    price: { monthly: 476000, annual: 5140800, freeMonths: null },
    allowedRoles: ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto'],
    maxDrones: 10,
    maxPilots: 10,
    maxBatteries: null,
    maxTech: null,
    features: {
      maintenance: 'advanced',
      reports: 'full',          // F-OPS-002 + F-MNT-003 + F-HUM-005
      sms: 'full',
      authorizations: true,
      audit: true,
      customChecklist: true,
      whiteLabel: false,
      api: false,
    }
  },
  enterprise: {
    name: 'Plan Enterprise',
    price: { monthly: null, annual: null, freeMonths: null }, // A consultar
    allowedRoles: ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto'],
    maxDrones: Infinity,
    maxPilots: Infinity,
    maxBatteries: null,
    maxTech: null,
    features: {
      maintenance: 'advanced',
      reports: 'full',
      sms: 'full',
      authorizations: true,
      audit: true,
      customChecklist: true,
      whiteLabel: true,
      api: true,
    }
  }
};

/**
 * Función para verificar si un usuario puede agregar más drones o pilotos.
 * @param {string} planKey - El slug del plan (ej: 'piloto', 'escuadrilla')
 * @param {number} currentCount - Cuántos tiene registrados actualmente
 * @param {string} type - 'drone' o 'pilot'
 */
/**
 * ¿Esta fila de tripulación cuenta contra el límite de tripulantes del plan?
 * Solo Gerente General NO cuenta (dueño/representante legal, no tripulación operativa).
 * Cuentan: Piloto, Jefe de Pilotos, Gerente SMS, Observador.
 * ⚠️ Cambio 2026-08-01: antes Gerente SMS tampoco contaba (junto con Gerente General) —
 * ahora sí, porque el cupo de 5 de Escuadrilla se definió explícitamente como
 * 3 piloto + 1 jefe_pilotos + 1 gerente_sms. Regla compartida por todos los planes.
 * @param {string} pilotRole - texto del rol (pilot_role) o rol del sistema
 */
export const crewCountsForLimit = (pilotRole) => {
  const s = String(pilotRole || '').toLowerCase().trim();
  // "Gerente General" (texto libre) o 'admin' (rol de sistema) — el único rol libre de cupo.
  if (s === 'gerente general' || s === 'admin') return false;
  return true;
};

/**
 * ¿Esta fila de tripulación corresponde al Gerente General?
 * El GG es el dueño / representante legal del negocio, no tripulación operativa:
 * no se muestra en el roster de Tripulación ni cuenta para los límites de plan.
 * Valor canónico de pilot_role = "Gerente General" (ver AddPilotPanel/EditPilotPanel).
 * @param {string} pilotRole - texto del rol (pilot_role) o rol del sistema
 */
export const isGerenteGeneral = (pilotRole) => {
  const s = String(pilotRole || '').toLowerCase().trim();
  return s === 'gerente general' || s === 'admin';
};

/**
 * @param {string} planKey
 * @param {number} currentCount
 * @param {string} type - 'drone' | 'pilot' | 'battery' | 'tech'
 * @param {number} [extra] - unidades adicionales compradas vía addon_subscriptions
 *   (piloto/dron extra, $30.000/$25.000 COP c/u — ver lib/addons.js). Solo aplica
 *   a 'drone'/'pilot': baterías y tech no tienen add-on, siguen dependiendo solo del plan.
 */
export const canAddResource = (planKey, currentCount, type, extra = 0) => {
  const plan = PLAN_CONFIG[planKey] || PLAN_CONFIG.piloto;
  if (type === 'battery') {
    if (plan.maxBatteries === null || plan.maxBatteries === Infinity) return true;
    return currentCount < plan.maxBatteries;
  }
  if (type === 'tech') {
    if (plan.maxTech === null || plan.maxTech === Infinity) return true;
    return currentCount < plan.maxTech;
  }
  const base = type === 'drone' ? plan.maxDrones : plan.maxPilots;
  if (base === Infinity) return true;
  return currentCount < base + (extra || 0);
};

// Precios en COP para ePayco
// IVA incluido (19%): taxBase = floor(amount / 1.19) · tax = amount - taxBase
// trialDays por plan/ciclo se define abajo en cada bloque (piloto mensual: 15 días antes del primer cobro)
export const EPAYCO_PLANS = {
  piloto: {
    monthly: {
      amount:      20000,
      taxBase:     16807,
      tax:          3193,
      trialDays:   15,
      name:        'Bitafly Piloto Mensual',
      description: 'Suscripción mensual - Plan Piloto para operadores UAS individuales',
      epaycoId:    'piloto_mensual',
      planUid:     'a1e0914364d49714f06612a',
    },
    annual: {
      amount:      200000,
      taxBase:     168067,
      tax:          31933,
      trialDays:   30,
      name:        'Bitafly Piloto Anual',
      description: 'Suscripción anual - Plan Piloto (30 días gratis incluidos)',
      epaycoId:    'piloto_anual',
      planUid:     'a1e0935b41baa59fb014a78',
    },
  },
  escuadrilla: {
    monthly: {
      amount:      238000,
      taxBase:     200000,
      tax:          38000,
      name:        'Bitafly Escuadrilla Mensual',
      description: 'Suscripción mensual - Plan Escuadrilla para operadores UAS',
      epaycoId:    'escuadrilla_mensual',
      planUid:     'a1dea39b3836c9ee300a1b4',
    },
    annual: {
      amount:     2570400,
      taxBase:    2160000,
      tax:         410400,
      name:        'Bitafly Escuadrilla Anual',
      description: 'Suscripción anual - Plan Escuadrilla para operadores UAS (10% de descuento)',
      epaycoId:    'escuadrilla_anual',
      planUid:     'a1dea83a021a7cbb106d996',
    },
  },
  flota: {
    monthly: {
      amount:      476000,
      taxBase:     400000,
      tax:          76000,
      name:        'Bitafly Flota Mensual',
      description: 'Suscripción mensual - Plan Flota para operadores UAS',
      epaycoId:    'flota_mensual',
      planUid:     'a1deab1b8bef2c21807e912',
    },
    annual: {
      amount:     5140800,
      taxBase:    4320000,
      tax:         820800,
      name:        'Bitafly Flota Anual',
      description: 'Suscripción anual - Plan Flota para operadores UAS (10% de descuento)',
      epaycoId:    'flota_anual',
      planUid:     'a1deaea5d185a11c30a7419',
    },
  },
};