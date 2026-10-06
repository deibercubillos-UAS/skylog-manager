// designations — cargos que la organización debe designar por acta (RAC 100 §100.535(14)(15)(16)).
// El Gerente de Seguridad Operacional tiene su propio flujo (validación de perfil, /sms/gobernanza);
// aquí están los otros dos. Lógica pura, con tests (regla Q2).

export const DESIGNATION_ROLES = [
  { key: 'jefe_pilotos', label: 'Jefe de Pilotos', norm: '§100.535(14)' },
  { key: 'gerente_sms', label: 'Gerente de Seguridad Operacional', norm: '§100.535(15)', managedIn: '/sms/gobernanza' },
  { key: 'ejecutivo_responsable', label: 'Ejecutivo Responsable', norm: '§100.535(16)' },
];
export const SELF_SERVICE_DESIGNATIONS = ['jefe_pilotos', 'ejecutivo_responsable'];

const filled = (v) => (v || '').trim().length > 0;

export function validateDesignationInput({ roleType, personId, actReference, actDate, today }) {
  const errors = [];
  if (!SELF_SERVICE_DESIGNATIONS.includes(roleType)) errors.push('Cargo inválido.');
  if (!personId) errors.push('Elige a la persona designada.');
  if (!filled(actReference)) errors.push('Indica el número o descripción del acta de designación.');
  if (!actDate || !/^\d{4}-\d{2}-\d{2}$/.test(actDate)) errors.push('Indica la fecha del acta.');
  else if (today && actDate > today) errors.push('La fecha del acta no puede ser futura.');
  return { ok: errors.length === 0, errors };
}
