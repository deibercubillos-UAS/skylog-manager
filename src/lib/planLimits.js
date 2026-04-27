// src/lib/planLimits.js

// Precios USD: piloto $5/mes ($4 anual, gratis 6 meses) · escuadrilla $15/mes ($12 anual) · flota $39/mes ($29 anual) · enterprise custom
export const PLAN_CONFIG = {
  piloto: {
    name: 'Plan Piloto',
    price: { monthly: 5, annual: 4, freeMonths: 6 },
    allowedRoles: ['piloto'],
    maxDrones: 1,
    maxPilots: 1,
    maxBatteries: 2,
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

export const EPAYCO_LINKS = {
  escuadrilla: "https://payco.link/tuid-escuadrilla", // Reemplaza con tu link real
  flota: "https://payco.link/tuid-flota",           // Reemplaza con tu link real
};