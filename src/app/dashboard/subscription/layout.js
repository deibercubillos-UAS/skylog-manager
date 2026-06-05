import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

export default async function SubscriptionLayout({ children }) {
    // Cualquier usuario autenticado puede ver su suscripción (incluyendo piloto independiente).
    // La autenticación mínima se verifica a través del middleware.
    await requirePermission('canManageFleet');
    return <>{children}</>;
}