import Link from 'next/link';
import { createClient } from '@/lib/supabaseServer';
import { redirect } from 'next/navigation';
import MissionControlClient from './MissionControlClient';
import { getOrgPlan } from '@/lib/orgPlan';

export const dynamic = 'force-dynamic';

export default async function AuthorizePage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // IMPORTANTE: incluir subscription_plan en el SELECT — sin esto la verificación
  // del plan más abajo fallaría y mandaba todos los planes pagos al fallback piloto
  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role, subscription_plan')
    .eq('id', user.id)
    .single();

  if (!['superadmin', 'admin', 'jefe_pilotos'].includes(profile?.role)) redirect('/dashboard');

  // El plan efectivo de la org vive en el perfil del admin (organizations no
  // tiene columna de plan). Usar el plan del miembro bloquearía al Jefe de
  // Pilotos (cuyo profile.subscription_plan es 'piloto').
  const plan = await getOrgPlan(supabase, profile.organization_id, profile?.subscription_plan || 'piloto');
  if (plan === 'piloto') {
    return (
      <div className="max-w-xl mx-auto py-16 px-6 text-center animate-in fade-in duration-500">
        <div className="size-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-orange-100">
          <span className="material-symbols-outlined text-primary text-3xl">workspace_premium</span>
        </div>
        <p className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-3">Función premium</p>
        <h1 className="text-2xl md:text-3xl font-black text-navy uppercase tracking-tighter mb-3">
          Programación avanzada de vuelos
        </h1>
        <p className="text-sm text-slate-500 leading-relaxed mb-8">
          La gestión completa de misiones (Formato 100 UAEAC y autorizaciones)
          está incluida en los planes <span className="font-black text-navy">Escuadrilla</span> en adelante.
          Si solo necesitas generar el KMZ para AeroCivil, usa la herramienta gratuita.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard/plan-vuelo" className="px-6 py-3 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20">
            Ir a Planear Vuelo
          </Link>
          <Link href="/dashboard/subscription" className="px-6 py-3 bg-navy text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all">
            Mejorar mi plan
          </Link>
        </div>
      </div>
    );
  }

  const [pilotsReq, dronesReq, orgReq] = await Promise.all([
    supabase.from('pilots').select('*').eq('organization_id', profile.organization_id).eq('is_active', true).order('name'),
    supabase.from('aircraft').select('*').eq('organization_id', profile.organization_id).eq('status', 'Operativo'),
    supabase.from('organizations').select('*').eq('id', profile.organization_id).single()
  ]);

  const initialData = {
    pilots: pilotsReq.data || [],
    drones: dronesReq.data || [],
    org: orgReq.data || {},
    userRole: profile.role
  };

  return <MissionControlClient initialData={initialData} />;
}