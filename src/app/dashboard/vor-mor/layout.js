import { requirePermission } from '@/lib/authGuards';

export const dynamic = 'force-dynamic';

// Auditoría 2026-07-22: esta ruta no tenía NINGÚN guard server-side — cualquier
// usuario autenticado (incluido un piloto de la org) podía navegar aquí
// directamente y ver el listado completo de reportes VOR/MOR (incluye
// investigation_summary/internal_notes/contributing_factors), aunque el enlace
// solo se muestra desde Seguridad SMS/Protocolos a superadmin/admin/gerente_sms.
// Mismos roles que ya gatean esas dos páginas de origen (canManageSMS).
export default async function VorMorLayout({ children }) {
  await requirePermission('canManageSMS');
  return <>{children}</>;
}
