"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [data, setData] = useState({ profile: null, org: null });
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/login'; return; }

        // Paso 1: Obtener Perfil
        const { data: prof, error: pErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (pErr) throw pErr;

        // Paso 2: Obtener Organización solo si existe el ID
        let organization = null;
        if (prof?.organization_id) {
          const { data: org, error: oErr } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', prof.organization_id)
            .single();
          if (!oErr) organization = org;
        }

        setData({ profile: prof, org: organization });
      } catch (err) {
        console.error("Layout Load Error:", err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#1A202C] text-white font-black animate-pulse">AUTORIZANDO ACCESO...</div>;

  return (
    <div className="flex h-screen bg-[#f8f6f6] font-display overflow-hidden text-left">
      <aside className={`fixed inset-y-0 left-0 z-[100] w-64 bg-[#1A202C] text-white flex flex-col transition-transform lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-white/5">
          <h1 className="text-2xl font-black text-orange-500 tracking-tighter mb-4">BITAFLY</h1>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-[10px] space-y-1">
            <p className="text-slate-500 font-bold uppercase">Plan: <span className="text-orange-400">{data.profile?.subscription_plan || 'PILOTO'}</span></p>
            <p className="text-slate-500 font-bold uppercase">ID: <span className="text-white font-mono">{data.org?.unique_code || 'N/A'}</span></p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${pathname === '/dashboard' ? 'bg-orange-600' : 'hover:bg-white/5'}`}>Dashboard</Link>
          <Link href="/dashboard/fleet" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${pathname === '/dashboard/fleet' ? 'bg-orange-600' : 'hover:bg-white/5'}`}>Mi Flota</Link>
          <Link href="/dashboard/pilots" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${pathname === '/dashboard/pilots' ? 'bg-orange-600' : 'hover:bg-white/5'}`}>Tripulación</Link>
        </nav>
        <div className="p-4 border-t border-white/5">
          <button onClick={() => supabase.auth.signOut().then(() => window.location.href='/login')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black text-red-400 hover:bg-red-400/10">Cerrar Sesión</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden material-symbols-outlined">menu</button>
          <span className="font-black text-[10px] uppercase text-slate-400 tracking-widest">{data.org?.company_name || 'Individual'}</span>
          <span className="text-[10px] font-black uppercase text-slate-900">{data.profile?.full_name}</span>
        </header>
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}