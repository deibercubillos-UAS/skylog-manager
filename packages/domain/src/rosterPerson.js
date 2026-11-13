// rosterPerson — qué Persona existente se puede reutilizar al agregar un tripulante a una organización (E1: no duplicar
// personas, 30-entidades.md §2) sin dejar que el alta sirva para averiguar quién está registrado en otras empresas
// (auditoría 2026-11-12). Pura y con tests (regla Q2).

/**
 * @param {string[]} candidateIds Personas que coinciden por documento o correo.
 * @param {{person_id:string, organization_id:string}[]} memberships Membresías (de cualquier estado) de esos candidatos.
 * @param {Set<string>|string[]} accountPersonIds Candidatos que tienen cuenta.
 * @param {string} organizationId Organización a la que se agrega.
 * @returns {string|null} id reutilizable, o null (se crea una ficha propia y no se revela la coincidencia).
 * Es reutilizable la persona que solo ha estado en ESTA organización y que, si tiene cuenta, ya estuvo aquí.
 */
export function pickReusablePerson(candidateIds, memberships, accountPersonIds, organizationId) {
  const hasAccount = new Set(accountPersonIds || []);
  for (const id of candidateIds || []) {
    const orgs = new Set((memberships || []).filter((m) => m.person_id === id).map((m) => m.organization_id));
    const onlyHere = [...orgs].every((o) => o === organizationId);
    if (onlyHere && (!hasAccount.has(id) || orgs.has(organizationId))) return id;
  }
  return null;
}
