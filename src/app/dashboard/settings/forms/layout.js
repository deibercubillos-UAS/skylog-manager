import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

export default async function FormsLayout({ children }) {
    await requirePermission('canViewFinance', { blockIndependentPilot: true });
    return <>{children}</>;
}