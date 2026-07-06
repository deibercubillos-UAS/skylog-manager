import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

// Manuales de la empresa: lectura para todos los miembros de la org.
// Guard server-side: autenticado + rol con permiso de ver manuales.
export default async function ManualesLayout({ children }) {
  await requirePermission('canViewManuals');
  return <>{children}</>;
}
