"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }) {
  const [data, setData] = useState({ profile: null, org: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/login'; return; }
        
        // Carga en paralelo para velocidad
        const [profRes, orgsRes] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', user.id).single(),
          supabase.from('organizations').select('*')
        ]);

        const profile = profRes.data;
        // Buscamos su organización específica en el set
        const org = orgsRes.data?.find(o => o.id === profile?.organization_id);

        setData({ profile, org });
      } catch (err) {
        console.error("Error crítico de layout:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center font-black bg-slate-900 text-white uppercase animate-pulse">Iniciando Protocolos BitaFly...</div>;

  return (
    <div className="flex h-screen bg-[#f8f6f6] overflow-hidden">
      <aside className="w-64 bg-[#1A202C] text-white flex flex-col p-6 border-r border-white/5">
        <div className="mb-10">
          <h1 className="text-2xl font-black tracking-tighter text-orange-500">BITAFLY</h1>
          <div className="mt-3 p-3 bg-white/5 rounded-2xl border border-white/10">
             <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">Plan Activo</p>
             <p className="text-[11px] font-black text-orange-400 uppercase">{data.profile?.subscription_plan || 'PILOTO'}</p>
             <p className="text-[8px] font-black uppercase text-slate-500 mt-3 tracking-widest">ID Organización</p>
             <p className="text-[11px] font-mono text-white font-bold">{data.org?.unique_code || '---'}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 text-left">
          <Link href="/dashboard" className="block p-3 rounded-xl hover:bg-white/5 font-bold text-sm">Dashboard</Link>
          <Link href="/dashboard/fleet" className="block p-3 rounded-xl hover:bg-white/5 font-bold text-sm">Mi Flota</Link>
          <Link href="/dashboard/pilots" className="block p-3 rounded-xl hover:bg-white/5 font-bold text-sm">Tripulación</Link>
          {['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'].includes(data.profile?.role) && (
            <Link href="/dashboard/authorizations" className="block p-3 rounded-xl bg-[#ec5b13] text-white font-black text-xs uppercase tracking-widest mt-4 shadow-lg">Programación</Link>
          )}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b flex items-center px-8 justify-between shadow-sm">
           <span className="font-black text-[10px] uppercase text-slate-400 tracking-widest">
             {data.org?.company_name || 'Individual'}
           </span>
           <button onClick={() => supabase.auth.signOut().then(() => window.location.href='/login')} className="text-[10px] font-black text-red-500 uppercase tracking-widest border border-red-100 px-4 py-2 rounded-lg hover:bg-red-50 transition-all">Salir</button>
        </header>
        <div className="flex-1 overflow-y-auto p-10">{children}</div>
      </main>
    </div>
  );
}
