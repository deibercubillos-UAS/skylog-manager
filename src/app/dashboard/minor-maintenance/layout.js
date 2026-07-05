import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

// Ver el checklist (incluso diligenciarlo) queda abierto a cualquiera que
// despache — la edición real (configurar ítems, intervalos por aeronave se
// editan en Flota) se gatea dentro del cliente con canManageMinorMaintenanceChecklist.
export default async function MinorMaintenanceLayout({ children }) {
    await requirePermission('canViewMinorMaintenanceChecklist');
    return <>{children}</>;
}
