// src/lib/planLimits.js

export const PLAN_CONFIG = {
  piloto: {
    name: 'Plan Piloto',
    allowedRoles: ['piloto'],
    maxDrones: 1,
    maxPilots: 1,
    features: {
      maintenance: false,
      reports: 'basic',
      sora: true,
      customChecklist: true
    }
  },
  escuadrilla: {
    name: 'Plan Escuadrilla',
    allowedRoles: ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto'],
    maxDrones: 15,
    maxPilots: 7,
    features: {
      maintenance: true,
      reports: 'audit',
      sora: true,
      customChecklist: true
    }
  },
  flota: {
    name: 'Plan Flota',
    allowedRoles: ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto'],
    maxDrones: 999,
    maxPilots: 20,
    features: {
      maintenance: 'advanced',
      reports: 'full',
      sora: true,
      customChecklist: true
    }
  },
  enterprise: {
    name: 'Plan Enterprise',
    allowedRoles: ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto', 'mantenimiento'],
    maxDrones: 999,
    maxPilots: 999,
    features: {
      maintenance: 'custom',
      reports: 'api',
      sora: true,
      customChecklist: true,
      whiteLabel: true
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