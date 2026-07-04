import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

// Ver el checklist (incluso solo-lectura) queda abierto a cualquier rol que
// despache — la edición real (crear/modificar ítems, activar/desactivar) se
// gatea dentro del cliente con canManageInventoryChecklist (GG+GSMS+JP).
export default async function InventoryChecklistLayout({ children }) {
    await requirePermission('canViewInventoryChecklist');
    return <>{children}</>;
}
