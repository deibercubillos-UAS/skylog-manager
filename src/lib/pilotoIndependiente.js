/**
 * Piloto independiente = dueño de su propia organización (role 'admin') en
 * plan 'piloto'. Los miembros de una org (piloto/jefe_pilotos/gerente_sms)
 * también tienen subscription_plan==='piloto' en su propia membresía, pero
 * NO son independientes — este predicado es la única fuente de verdad
 * compartida, reemplaza las implementaciones inline que existían en
 * dashboard/layout.js, dashboard/settings/profile/page.js,
 * dashboard/settings/forms/page.js y dashboard/logbook/new/page.js.
 */
export function isPilotoIndependiente({ role, plan }) {
    return plan === 'piloto' && role === 'admin';
}
