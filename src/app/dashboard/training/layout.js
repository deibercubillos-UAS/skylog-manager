import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

// Ver los programas y evaluaciones queda abierto a cualquier rol (canViewTraining,
// incluye piloto) — crear/editar programas y registrar evaluaciones se gatea dentro
// del cliente con canManageTraining (GG+GSMS+JP, mismo split que Manuales).
export default async function TrainingLayout({ children }) {
    await requirePermission('canViewTraining', { blockIndependentPilot: true });
    return <>{children}</>;
}
