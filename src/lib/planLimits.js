// src/lib/planLimits.js

export const PLAN_CONFIG = {
  piloto: {
    name: 'Plan Piloto',
    maxDrones: 1,
    maxPilots: 1,
    features: {
      maintenance: false, // Solo visual, no alertas
      reports: 'basic',   // Solo vista previa
      sora: true,
      customChecklist: true
    }
  },
  escuadrilla: {
    name: 'Plan Escuadrilla',
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

// Función de ayuda para validar si puede agregar más
export const canAddResource = (planKey, currentCount, type) => {
  const plan = PLAN_CONFIG[planKey] || PLAN_CONFIG.piloto;
  const limit = type === 'drone' ? plan.maxDrones : plan.maxPilots;
  return currentCount < limit;
};