// organizationSmsProfile — SMS-J: perfil de organización derivado, el
// único umbral de escalabilidad verificado literal en la norma —
// RAC 100 §100.545(a): "hasta 2 UAS, una sola persona puede desempeñarse
// como Jefe de Pilotos y Gerente de Seguridad Operacional a la vez".
// Deliberadamente NO modela "tipo de operación" ni "complejidad" como ejes
// — ninguna fuente normativa ya leída en este proyecto fija un umbral
// verificable para esos dos ejes (17-implementacion-sms-uas.md §5/§8,
// 30-entidades.md §6) y fabricarlo violaría la regla V1. Lógica pura, con
// tests (regla Q2) — nunca se declara a mano, siempre se deriva de
// `aircraft` real.

export function resolveOrganizationSmsProfile({ aircraftCount = 0 } = {}) {
  const canCombineJpAndGso = aircraftCount <= 2;
  return {
    aircraftCount,
    canCombineJpAndGso,
    note: canCombineJpAndGso
      ? `Con ${aircraftCount} aeronave(s) registrada(s) (≤2), la misma persona puede ejercer como Jefe de Pilotos y Gerente de Seguridad Operacional a la vez (RAC 100 §100.545(a)).`
      : `Con ${aircraftCount} aeronaves registradas (>2), RAC 100 §100.545(a) exige separar Jefe de Pilotos y Gerente de Seguridad Operacional en personas distintas.`,
  };
}
