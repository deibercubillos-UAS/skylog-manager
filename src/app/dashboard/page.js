'use client';
export const dynamic = 'force-dynamic';

/**
 * Dashboard page — pure client component.
 * Los datos los carga DashboardClient via /api/dashboard.
 * Eliminamos el Server Component con createClient() de @/utils/supabase/server
 * que fallaba en producción por el manejo de cookies en SSR streaming.
 */
import DashboardClient from './DashboardClient';

export default function DashboardPage() {
  return <DashboardClient />;
}
