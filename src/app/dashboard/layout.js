"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }) {
  const [profile, setProfile] = useState(null);
  const [org, setOrg] = useState(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(prof);

      if (prof?.organization_id) {
        const { data: o } = await supabase.from('organizations').select('*').eq('id', prof.organization_id).single();
        setOrg(o);
      }
    }
    loadData();
  }, []);

  if (!profile) return <div className="h-screen flex items-center justify-center font-black bg-slate-900 text-white">CARGANDO SISTEMAS...</div>;

  return (
    <div className="flex h-screen bg-[#f8f6f6] overflow-hidden">
      <aside className="w-64 bg-[#1A202C] text-white flex flex-col p-6">
        <div className="mb-10">
          <h1 className="text-2xl font-black tracking-tighter text-orange-500 leading-none">BITAFLY</h1>
          <div className="mt-2 p-2 bg-white/5 rounded-lg border border-white/10">
             <p className="text-[8px] font-black uppercase text-slate-500">Plan Activo:</p>
             <p className="text-[10px] font-black text-orange-400 uppercase">{profile.subscription_plan || 'PILOTO'}</p>
             <p className="text-[8px] font-black uppercase text-slate-500 mt-2">ID Empresa:</p>
             <p className="text-[10px] font-mono text-white">{org?.unique_code || 'N/A'}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-2 text-left">
          <Link href="/dashboard" className="block p-3 rounded-xl hover:bg-white/5 font-bold text-sm">Dashboard</Link>
          <Link href="/dashboard/fleet" className="block p-3 rounded-xl hover:bg-white/5 font-bold text-sm">Mi Flota</Link>
          <Link href="/dashboard/pilots" className="block p-3 rounded-xl hover:bg-white/5 font-bold text-sm">Tripulación</Link>
          {['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'].includes(profile.role) && (
            <Link href="/dashboard/authorizations" className="block p-3 rounded-xl bg-orange-600 font-bold text-sm">Programar Misión</Link>
          )}
        </nav>
      </aside>
      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b flex items-center px-8 justify-between">
           <span className="font-black text-xs uppercase text-slate-400">{org?.company_name}</span>
           <button onClick={() => supabase.auth.signOut().then(() => window.location.href='/login')} className="text-xs font-black text-red-500 uppercase">Salir</button>
        </header>
        <div className="flex-1 overflow-y-auto p-10">{children}</div>
      </main>
    </div>
  );
}
