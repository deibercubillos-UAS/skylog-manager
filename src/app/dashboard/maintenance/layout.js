import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

export default async function MaintenanceLayout({ children }) {
    // blockIndependentPilot: oculto del sidebar para el piloto independiente
    // (2026-07-20) — sin esto seguiría siendo accesible por URL directa, ya
    // que su rol 'admin' sí está en canManageOps.
    await requirePermission('canManageOps', { blockIndependentPilot: true });
    return <>{children}</>;
}