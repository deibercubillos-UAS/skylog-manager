import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

export default async function SuppliersLayout({ children }) {
    await requirePermission('canManageSuppliers', { blockIndependentPilot: true });
    return <>{children}</>;
}
