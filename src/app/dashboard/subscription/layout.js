import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

export default async function SubscriptionLayout({ children }) {
    // Solo el dueño de la cuenta (Gerente General o Piloto Independiente,
    // ambos role='admin') o superadmin — ver Auditoría 2026-07-22: esta ruta
    // usaba 'canManageFleet' por error, que también incluye 'jefe_pilotos',
    // dejándolo ver/cancelar/iniciar checkout de la suscripción de la org
    // pese a que el sidebar (footerLinksAll) nunca le muestra este enlace.
    await requirePermission('canManageSubscription');
    return <>{children}</>;
}