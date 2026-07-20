import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

// Ver el checklist (incluso solo-lectura) queda abierto a cualquier rol que
// despache — la edición real (crear/modificar ítems, activar/desactivar) se
// gatea dentro del cliente con canManageInventoryChecklist (GG+GSMS+JP).
// blockIndependentPilot: oculto del sidebar para el piloto independiente
// (2026-07-20) — sin esto seguiría siendo accesible por URL directa, ya que
// su rol 'admin' sí está en canViewInventoryChecklist.
export default async function InventoryChecklistLayout({ children }) {
    await requirePermission('canViewInventoryChecklist', { blockIndependentPilot: true });
    return <>{children}</>;
}
