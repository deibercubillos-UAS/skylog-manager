// Capa de dominio pura de Skylog V2.0 — sin React, sin Next.js, sin Supabase.
// Cada función aquí es determinista: mismos datos de entrada, mismo resultado,
// probable con Vitest sin levantar ningún servidor. Ver docs/skylog-v2/33-arquitectura.md.

export function domainReady() {
  return true;
}

export * from './dutyCompliance.js';
