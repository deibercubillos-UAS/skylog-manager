import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

export default async function MaintenanceLayout({ children }) {
    await requirePermission('canManageOps');
    return <>{children}</>;
}