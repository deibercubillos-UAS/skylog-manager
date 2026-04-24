import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

export default async function ReportsLayout({ children }) {
    await requirePermission('canViewAudit');
    return <>{children}</>;
}