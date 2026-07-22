import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

export default async function MaintenanceLayout({ children }) {
    // Reactivado para el piloto independiente (2026-07-22, pedido explícito
    // del usuario — revierte el bloqueo de 2026-07-20).
    await requirePermission('canManageOps');
    return <>{children}</>;
}