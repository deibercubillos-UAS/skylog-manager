// Skylog V2.0 — Suscripción: límites reales por plan — mismos 4 planes y
// mismos límites ya en producción (v1, `lib/planLimits.js`), reutilizados
// tal cual para no inventar una tabla de precios nueva. `null` = ilimitado.
export const PLANS = ['piloto', 'escuadrilla', 'flota', 'enterprise'];

export const PLAN_LABELS = {
  piloto: 'Piloto',
  escuadrilla: 'Escuadrilla',
  flota: 'Flota',
  enterprise: 'Enterprise',
};

export const PLAN_LIMITS = {
  piloto: { aircraft: 1, pilots: 1, batteries: 3 },
  escuadrilla: { aircraft: 3, pilots: 5, batteries: null },
  flota: { aircraft: 10, pilots: 10, batteries: null },
  enterprise: { aircraft: null, pilots: null, batteries: null },
};

// Mismo criterio real de v1: el Gerente General (admin) NO cuenta contra
// el límite de "Pilotos" — es el dueño/representante legal, no tripulación
// operativa. superadmin tampoco (no es un miembro real de la operación).
export function crewCountsForLimit(role) {
  return role !== 'admin' && role !== 'superadmin';
}

// Precios reales vigentes en producción (main, `src/lib/planLimits.js`,
// `EPAYCO_PLANS`/`WOMPI_PLANS` — mismo objeto, ver commit b6dab97b). Portados
// tal cual a V2 al traer la integración de Wompi (decisión: "traer el código
// de Wompi ahora a develop-v2"). `enterprise` no tiene precio fijo — se
// gestiona a medida, nunca por checkout (mismo criterio que v1: el cron de
// recurrencia hace `if (!cfg) continue` para ese plan).
export const PLAN_PRICING = {
  piloto: {
    monthly: { amount: 20000, trialDays: 15 },
    annual: { amount: 200000, trialDays: 30 },
  },
  escuadrilla: {
    monthly: { amount: 238000 },
    annual: { amount: 2570400 },
  },
  flota: {
    monthly: { amount: 476000 },
    annual: { amount: 5140800 },
  },
};
