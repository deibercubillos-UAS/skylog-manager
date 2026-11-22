// Punto de entrada del núcleo de vuelo del simulador (Fase 1). Lógica pura y probada, sin pantalla.
// Se consume como `@skylog/domain/sim`. La escena 3D (Fase 2) solo DIBUJA lo que decide esta capa.
// Ver docs/skylog-v2/45-simulador-3d-plan.md.

export * from './util.js';
export * from './rng.js';
export * from './profiles.js';
export * from './environment.js';
export * from './flightModel.js';
export * from './battery.js';
export * from './automation.js';
export * from './engine.js';
export * from './replay.js';
