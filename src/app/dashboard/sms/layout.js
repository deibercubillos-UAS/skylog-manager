import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

export default async function SMSLayout({ children }) {
    await requirePermission('canViewFinance');
    return <>{children}</>;
}