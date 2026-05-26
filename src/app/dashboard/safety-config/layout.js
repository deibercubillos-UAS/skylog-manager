import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

export default async function SafetyConfigLayout({ children }) {
    await requirePermission('canViewAudit');
    return <>{children}</>;
}