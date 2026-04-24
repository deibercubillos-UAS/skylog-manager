import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

export default async function SubscriptionLayout({ children }) {
    await requirePermission('canViewFinance');
    return <>{children}</>;
}