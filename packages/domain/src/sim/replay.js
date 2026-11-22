// Grabación y repetición deterministas (entregable 1.5). Una sesión queda definida por:
// perfil + configuración + semilla del entorno + la LISTA DE ENTRADAS por paso. Con eso, volver a
// correr la simulación reproduce exactamente el mismo vuelo — el servidor recalcula la nota y el
// debriefing reproduce la escena sin guardar cada fotograma, solo las entradas.

import { advance, createInitialState, DEFAULT_DT, mergeConfig } from './engine.js';

/**
 * Corre una simulación completa a partir de una lista de entradas (una por paso).
 * @param {Object} opts
 * @param {Object} opts.profile
 * @param {Object} opts.environment  creado con createEnvironment (determinista por semilla)
 * @param {Array<Object>} opts.inputs  entradas por paso (palancas/modo/banderas)
 * @param {Object} [opts.config]
 * @param {number} [opts.dt]
 * @param {Object} [opts.initial]  estado inicial (por defecto createInitialState)
 * @param {boolean} [opts.keepTrace=false]  si guarda el estado de cada paso (para el debriefing)
 * @returns {{finalState:Object, steps:number, trace:Object[]|null}}
 */
export function runSimulation({ profile, environment, inputs, config, dt = DEFAULT_DT, initial, keepTrace = false }) {
  const cfg = mergeConfig(config);
  let state = initial ?? createInitialState(profile, { batteryFraction: cfg.batteryFraction });
  const ctx = { profile, environment, config: cfg, dt };
  const trace = keepTrace ? [state] : null;
  for (let i = 0; i < inputs.length; i++) {
    state = advance(state, inputs[i], ctx);
    if (trace) trace.push(state);
  }
  return { finalState: state, steps: inputs.length, trace };
}

/** Repite una grabación (perfil + semilla + entradas) y devuelve el estado final. */
export function replaySimulation(recording) {
  return runSimulation({ ...recording, keepTrace: false }).finalState;
}

/** Construye una lista de `n` entradas idénticas (atajo para pruebas y escenarios simples). */
export function constantInputs(n, input = {}) {
  return Array.from({ length: n }, () => ({ ...input }));
}
