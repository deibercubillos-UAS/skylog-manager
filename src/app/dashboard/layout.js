"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [userProfile, setUserProfile] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(data);
    }
    loadProfile();
  }, []);

  const rolesConPoder = ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'];

  const staticMenu = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Mi Flota', icon: 'precision_manufacturing', href: '/dashboard/fleet' },
    { name: 'Tripulación', icon: 'person', href: '/dashboard/pilots' },
  ];

  if (!userProfile) return <div className="h-screen flex items-center justify-center font-black uppercase text-slate-300 animate-pulse">Iniciando Sistemas de Vuelo...</div>;

  return (
    <div className="flex h-screen bg-[#f8f6f6] font-display overflow-hidden text-left">
      <aside className={`fixed inset-y-0 left-0 z-[110] w-64 bg-[#1A202C] text-white flex flex-col transition-transform lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-white/5">
          <h1 className="text-xl font-black uppercase tracking-tighter">BitaFly</h1>
          <p className="text-[#ec5b13] text-[8px] font-black uppercase mt-1">SaaS de Gestión Aeronáutica</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {staticMenu.map(item => (
             <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${pathname === item.href ? 'bg-[#ec5b13] text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                <span className="material-symbols-outlined text-lg">{item.icon}</span>{item.name}
             </Link>
          ))}

          {/* MENÚ DE PROGRAMACIÓN - EXCLUSIVO JEFATURA */}
          {rolesConPoder.includes(userProfile.role) && (
            <>
              <div className="pt-4 pb-2 px-4"><p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Mando Operativo</p></div>
              <Link href="/dashboard/authorizations" className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${pathname === '/dashboard/authorizations' ? 'bg-[#ec5b13] text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                  <span className="material-symbols-outlined text-lg">calendar_month</span>Programar Misión
              </Link>
            </>
          )}

          <div className="pt-4 pb-2 px-4"><p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Registros</p></div>
          <Link href="/dashboard/logbook/daily" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:bg-white/5">
            <span className="material-symbols-outlined text-lg">flight_takeoff</span>Vuelo Diario
          </Link>
        </nav>

        <div className="p-4 border-t border-white/5">
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10">
            <span className="material-symbols-outlined text-base">logout</span>Cerrar Sesión
          </button>
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-slate-50 rounded-xl"><span className="material-symbols-outlined">menu</span></button>
            <div className="flex items-center gap-3">
               <p className="text-[10px] font-black uppercase text-slate-400">Organización:</p>
               <span className="text-xs font-black text-[#ec5b13] uppercase">{userProfile.company_name}</span>
            </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}
