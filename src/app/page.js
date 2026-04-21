import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from 'next/link';

export default async function DashboardPage() {
  const supabase = createClient();

  // 1. Obtener usuario rápido
  const { data: { user } } = await supabase.auth.getUser();

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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* AQUÍ VA TODO EL DISEÑO DE TU LANDING PAGE */}
      <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto">
        <h1 className="text-2xl font-black text-navy uppercase">Bitafly</h1>
        <a href="/login" className="bg-primary text-white px-6 py-2 rounded-xl font-bold">Ingresar</a>
      </nav>
      <main className="text-center py-20 px-4">
        <h1 className="text-6xl font-black text-navy mb-4">GESTIÓN AERONÁUTICA</h1>
        <p className="text-slate-500">Operaciones seguras, reportes precisos.</p>
      </main>
    </div>
  )
}