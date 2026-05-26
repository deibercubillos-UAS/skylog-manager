/**
 * Dashboard page — Server Component wrapper.
 * DashboardClient (Client Component) carga los datos via /api/dashboard.
 * Al ser Server Component, este archivo no se incluye en el JS bundle
 * del cliente y el middleware protege la ruta antes del render.
 */
import DashboardClient from './DashboardClient';

export default function DashboardPage() {
  return <DashboardClient />;
}
