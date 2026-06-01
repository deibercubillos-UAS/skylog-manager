// src/lib/planLimits.js

// Precios COP: piloto $15.000/mes ($150.000/año, 2 meses gratis) · escuadrilla $59.000/mes · flota $159.000/mes
export const PLAN_CONFIG = {
  piloto: {
    name: 'Plan Piloto',
    price: { monthly: 15000, annual: 150000, freeMonths: 2 },
    allowedRoles: ['piloto'],
    maxDrones: 1,
    maxPilots: 1,
    maxBatteries: 3,
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
  const limit = type === 'drone' ? plan.maxDrones : plan.maxPilots;
  return currentCount < limit;
};

/**
 * Función para verificar permisos según el Rol Operativo.
 * @param {string} role - El rol del usuario (ej: 'jefe_pilotos', 'gerente_sms')
 * @param {string} action - La acción a realizar
 */
export const hasPermission = (role, action) => {
  const permissions = {
    admin: ['all'],
    jefe_pilotos: [
      'manage_fleet', 
      'manage_pilots', 
      'view_logbook', 
      'register_flight'
    ],
    gerente_sms: [
      'view_logbook', 
      'manage_sora', 
      'manage_checklist', 
      'view_incidents',
      'view_reports'
    ],
    piloto: [
      'register_flight', 
      'view_my_flights',
      'view_fleet'
    ]
  };
  
  const userPerms = permissions[role] || permissions['piloto'];
  return userPerms.includes('all') || userPerms.includes(action);
};

// Precios en COP para ePayco
// IVA incluido (19%): taxBase = floor(amount / 1.19) · tax = amount - taxBase
// trial_days: 60 en piloto = 2 meses gratis antes del primer cobro
export const EPAYCO_PLANS = {
  piloto: {
    monthly: {
      amount:      15000,
      taxBase:     12605,
      tax:          2395,
      trialDays:   60,
      name:        'Bitafly Piloto Mensual',
      description: 'Suscripción mensual - Plan Piloto para operadores UAS individuales',
      epaycoId:    'bitafly_piloto_monthly',
    },
    annual: {
      amount:      150000,
      taxBase:     126050,
      tax:          23950,
      trialDays:   60,
      name:        'Bitafly Piloto Anual',
      description: 'Suscripción anual - Plan Piloto (2 meses gratis incluidos)',
      epaycoId:    'bitafly_piloto_annual',
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
    },
    annual: {
      amount:      590000,
      taxBase:     495798,
      tax:          94202,
      name:        'Bitafly Escuadrilla Anual',
      description: 'Suscripción anual - Plan Escuadrilla para operadores UAS',
      epaycoId:    'Escuadrilla Anual',
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
    },
    annual: {
      amount:     1590000,
      taxBase:    1336134,
      tax:         253866,
      name:        'Bitafly Flota Anual',
      description: 'Suscripción anual - Plan Flota para operadores UAS',
      epaycoId:    'flota_anual',
    },
  },
};