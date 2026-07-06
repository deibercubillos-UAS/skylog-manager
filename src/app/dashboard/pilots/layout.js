import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

// Tripulación visible para todos excepto piloto solo (pilotHidden en nav)
// Guard server-side: autenticado + en la lista de roles permitidos
export default async function PilotsLayout({ children }) {
  await requirePermission('canFly'); // ['superadmin','admin','jefe_pilotos','piloto']
  return <>{children}</>;
}
