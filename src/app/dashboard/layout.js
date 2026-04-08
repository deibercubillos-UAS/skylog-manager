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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const { data: org } = await supabase.from('organizations').select('*').eq('id', prof?.organization_id).single();
      setData({ profile: prof, org });
      setLoading(false);
    }
    loadData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black uppercase animate-pulse">Iniciando Bitafly...</div>;

  const menu = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Mi Flota', icon: 'precision_manufacturing', href: '/dashboard/fleet' },
    { name: 'Tripulación', icon: 'person', href: '/dashboard/pilots' },
    { name: 'Mantenimiento', icon: 'build', href: '/dashboard/maintenance' },
  ];

  return (
    <div className="flex h-screen bg-[#f8f6f6] font-display overflow-hidden text-left">
      {/* SIDEBAR */}
      <aside className={`fixed inset-y-0 left-0 z-[100] w-64 bg-[#1A202C] text-white flex flex-col transition-transform lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="size-8 bg-orange-600 rounded-lg flex items-center justify-center font-black">B</div>
            <h1 className="text-xl font-black uppercase tracking-tighter">BitaFly</h1>
          </div>
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Plan: <span className="text-orange-400">{data.profile?.subscription_plan}</span></p>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">ID: <span className="text-white font-mono">{data.org?.unique_code}</span></p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {menu.map(item => (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${pathname === item.href ? 'bg-orange-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}>
              <span className="material-symbols-outlined text-lg">{item.icon}</span>{item.name}
            </Link>
          ))}
          {['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'].includes(data.profile?.role) && (
            <Link href="/dashboard/authorizations" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-black text-orange-400 hover:bg-orange-400/10">
              <span className="material-symbols-outlined">calendar_month</span>Programación
            </Link>
          )}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black text-red-400 hover:bg-red-400/10">
            <span className="material-symbols-outlined">logout</span>Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* CONTENIDO */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center justify-between px-8">
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 text-slate-600"><span className="material-symbols-outlined">menu</span></button>
          <span className="font-black text-xs uppercase text-slate-400 tracking-widest">{data.org?.company_name}</span>
          <div className="flex items-center gap-4">
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-900 leading-none uppercase">{data.profile?.full_name}</p>
                <p className="text-[8px] font-bold text-orange-500 uppercase mt-1">{data.profile?.role?.replace('_', ' ')}</p>
             </div>
             <div className="size-8 rounded-full bg-slate-200 border-2 border-white shadow-sm"></div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}