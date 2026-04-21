import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = createClient();

  // 1. Obtener usuario rápido
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. PASO CLAVE: Paralelismo y Selección de columnas
  // Solo pedimos lo mínimo para el saludo y contexto
  const [profileReq, statsReq] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, role, organization_id")
      .eq("id", user.id)
      .single(),
    supabase
      .from("flight_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
  ]);

  const profile = profileReq.data;
  const flightCount = statsReq.count || 0;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-navy">
        Bienvenido, {profile?.full_name?.split(' ')[0]}
      </h1>
      <p className="text-gray-500">
        Tienes {flightCount} registros de vuelo en tu bitácora.
      </p>
      
      {/* El resto de tu Dashboard se mantiene igual visualmente */}
      {/* ... */}
    </div>
  );
}