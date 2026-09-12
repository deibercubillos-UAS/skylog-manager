// workspaces — los 4 espacios de trabajo por momento operacional
// (35-frontend.md §3.2), reemplazando la navegación por entidad de datos. El
// rol sigue filtrando qué se ve (sin cambios en los permisos existentes),
// pero además decide el espacio por defecto. Lógica pura, con tests (Q2).

export const WORKSPACES = [
  { key: 'operar', label: 'Operar', hint: 'Hoy / ahora / en campo' },
  { key: 'planear', label: 'Planear', hint: 'Días antes' },
  { key: 'registrar', label: 'Registrar', hint: 'Después / administrativo' },
  { key: 'cumplir', label: 'Cumplir', hint: 'Auditoría / dirección' },
];

// §3.2: piloto → OPERAR; jefe_pilotos → PLANEAR; gerente_sms → CUMPLIR;
// admin/superadmin → panel ejecutivo transversal (se modela como 'operar'
// por defecto — el admin ve los 4 espacios igual, solo cambia dónde aterriza).
const ROLE_DEFAULT_WORKSPACE = {
  piloto: 'operar',
  jefe_pilotos: 'planear',
  gerente_sms: 'cumplir',
  admin: 'operar',
  superadmin: 'operar',
};

export function resolveDefaultWorkspace(role) {
  return ROLE_DEFAULT_WORKSPACE[role] || 'operar';
}
