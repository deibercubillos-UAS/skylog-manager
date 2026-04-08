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
        
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        const { data: org } = await supabase.from('organizations').select('*').eq('id', prof?.organization_id).single();

        setData({ profile: prof, org });
      } catch (err) {
        console.error("Layout Error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white font-black animate-pulse">BITAFLY OS...</div>;

  const navLinks = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Mi Flota', icon: 'precision_manufacturing', href: '/dashboard/fleet' },
    { name: 'Tripulación', icon: 'person', href: '/dashboard/pilots' },
    { name: 'Mantenimiento', icon: 'build', href: '/dashboard/maintenance' },
  ];

  return (
    <div className="flex h-screen bg-[#f8f6f6] font-display overflow-hidden text-left">
      <aside className={`fixed inset-y-0 left-0 z-[110] w-64 bg-[#1A202C] text-white flex flex-col transition-transform lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-white/5">
          <h1 className="text-2xl font-black text-orange-500 tracking-tighter">BITAFLY</h1>
          <div className="mt-4 p-3 bg-white/5 rounded-2xl border border-white/10">
             <p className="text-[8px] font-black uppercase text-slate-500">Organización ID</p>
             <p className="text-[11px] font-mono text-white font-bold">{data.org?.unique_code || '---'}</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${pathname === link.href ? 'bg-orange-600' : 'hover:bg-white/5'}`}>
              <span className="material-symbols-outlined text-lg">{link.icon}</span>{link.name}
            </Link>
          ))}
          {['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'].includes(data.profile?.role) && (
            <Link href="/dashboard/authorizations" className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold ${pathname === '/dashboard/authorizations' ? 'bg-slate-700' : 'hover:bg-white/5'}`}>
              <span className="material-symbols-outlined text-lg">event_available</span>Programación
            </Link>
          )}
        </nav>
        <div className="p-4 border-t border-white/5">
          <button onClick={() => supabase.auth.signOut().then(() => window.location.href='/login')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black text-red-400 hover:bg-red-400/10">Cerrar Sesión</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2"><span className="material-symbols-outlined">menu</span></button>
            <div className="text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Empresa</p>
              <h2 className="text-sm font-black text-slate-900 uppercase">{data.org?.company_name || 'Individual'}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <Link href="/dashboard/logbook/daily" className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">add_circle</span> Nueva Operación
            </Link>
            <div className="hidden md:block text-right">
               <p className="text-[10px] font-black text-slate-900 leading-none">{data.profile?.full_name}</p>
               <p className="text-[8px] font-bold text-orange-500 uppercase">{data.profile?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-10">{children}</div>
      </main>
    </div>
  );
}