// src/lib/planLimits.js

// Precios COP: piloto $20.000/mes ($200.000/año, 30 días gratis) · escuadrilla $59.000/mes · flota $159.000/mes
export const PLAN_CONFIG = {
  piloto: {
    name: 'Plan Piloto',
    price: { monthly: 20000, annual: 200000, trialDays: 30 },
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
    price: { monthly: 15, annual: 12, freeMonths: null },
    allowedRoles: ['admin', 'jefe_pilotos', 'piloto'],
    maxDrones: 3,
    maxPilots: 4,
    maxBatteries: null,         // Ilimitadas
    maxTech: null,              // Ilimitados
    features: {
      maintenance: true,        // Alertas automáticas
      reports: 'partial',       // F-OPS-002 + F-MNT-003
      sms: 'basic',             // Registro de incidentes
      authorizations: true,     // F-OPS-001
      audit: false,
      customChecklist: false,
      whiteLabel: false,
      api: false,
    }
  },
  flota: {
    name: 'Plan Flota',
    price: { monthly: 39, annual: 29, freeMonths: null },
    allowedRoles: ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto'],
    maxDrones: 15,
    maxPilots: 15,
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
export const canAddResource = (planKey, currentCount, type) => {
  const plan = PLAN_CONFIG[planKey] || PLAN_CONFIG.piloto;
  if (type === 'battery') {
    if (plan.maxBatteries === null || plan.maxBatteries === Infinity) return true;
    return currentCount < plan.maxBatteries;
  }
  if (type === 'tech') {
    if (plan.maxTech === null || plan.maxTech === Infinity) return true;
    return currentCount < plan.maxTech;
  }
  const limit = type === 'drone' ? plan.maxDrones : plan.maxPilots;
  return currentCount < limit;
};

// Precios en COP para ePayco
// IVA incluido (19%): taxBase = floor(amount / 1.19) · tax = amount - taxBase
// trial_days: 60 en piloto = 2 meses gratis antes del primer cobro
export const EPAYCO_PLANS = {
  piloto: {
    monthly: {
      amount:      20000,
      taxBase:     16807,
      tax:          3193,
      trialDays:   30,
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
      amount:      59000,
      taxBase:     49580,
      tax:          9420,
      name:        'Bitafly Escuadrilla Mensual',
      description: 'Suscripción mensual - Plan Escuadrilla para operadores UAS',
      epaycoId:    'escuadrilla_mensual',
      planUid:     'a1dea39b3836c9ee300a1b4',
    },
    annual: {
      amount:      590000,
      taxBase:     495798,
      tax:          94202,
      name:        'Bitafly Escuadrilla Anual',
      description: 'Suscripción anual - Plan Escuadrilla para operadores UAS',
      epaycoId:    'escuadrilla_anual',
      planUid:     'a1dea83a021a7cbb106d996',
    },
  },
  flota: {
    monthly: {
      amount:      159000,
      taxBase:     133613,
      tax:          25387,
      name:        'Bitafly Flota Mensual',
      description: 'Suscripción mensual - Plan Flota para operadores UAS',
      epaycoId:    'flota_mensual',
      planUid:     'a1deab1b8bef2c21807e912',
    },
    annual: {
      amount:     1590000,
      taxBase:    1336134,
      tax:         253866,
      name:        'Bitafly Flota Anual',
      description: 'Suscripción anual - Plan Flota para operadores UAS',
      epaycoId:    'flota_anual',
      planUid:     'a1deaea5d185a11c30a7419',
    },
  },
};