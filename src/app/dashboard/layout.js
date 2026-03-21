"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // ESTADOS DE SEGURIDAD Y PERFIL
  const [authLoading, setAuthLoading] = useState(true);
  const [userPlan, setUserPlan] = useState('piloto');
  const [userRole, setUserRole] = useState('piloto');
  const [profile, setProfile] = useState(null);

  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Mis Pilotos', icon: 'person', href: '/dashboard/pilots' },
    { name: 'Mi Flota', icon: 'precision_manufacturing', href: '/dashboard/fleet' },
    { name: 'Suscripción', icon: 'payments', href: '/dashboard/subscription' },
    { name: 'Bitácora de Vuelos', icon: 'menu_book', href: '/dashboard/logbook' },
    { name: 'Protocolos Seguridad', icon: 'security', href: '/dashboard/safety-config' },
    { name: 'Mantenimiento', icon: 'build', href: '/dashboard/maintenance' },
    { name: 'Reportes SMS', icon: 'report_problem', href: '/dashboard/sms' },
    { name: 'Reportes PDF', icon: 'description', href: '/dashboard/reports' },
    { name: 'Configuración', icon: 'settings', href: '/dashboard/settings' },
  ];

  useEffect(() => {
    async function checkAuthAndLoadData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        window.location.href = '/login';
        return;
      }

      try {
        const res = await fetch(`/api/user/profile?userId=${user.id}`);
        const data = await res.json();
        
        if (!data.error) {
          setProfile(data);
          setUserRole(data.role || 'piloto');
          setUserPlan(data.subscription_plan || 'piloto');
        }
      } catch (err) {
        console.error("Error cargando perfil:", err);
      } finally {
        setAuthLoading(false);
      }
    }
    checkAuthAndLoadData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const filteredItems = menuItems.filter(item => {
    if (userRole === 'admin') return true;
    if (userRole === 'gerente_sms') return ['Dashboard', 'Protocolos Seguridad', 'Reportes SMS', 'Reportes PDF', 'Configuración'].includes(item.name);
    if (userRole === 'jefe_pilotos') return ['Dashboard', 'Mis Pilotos', 'Mi Flota', 'Bitácora de Vuelos', 'Mantenimiento', 'Configuración'].includes(item.name);
    return !['Reportes SMS', 'Protocolos Seguridad'].includes(item.name);
  });

  if (authLoading) {
    return (
      <div className="h-screen w-full bg-[#f8f6f6] flex flex-col items-center justify-center space-y-4 text-left">
        <img src="/logo.png" className="size-20 animate-pulse object-contain" alt="BitaFly" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sincronizando Mando Central...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f6f6] font-display text-left">
      <aside className="w-64 bg-[#1A202C] flex flex-col h-full border-r border-slate-700 shrink-0 shadow-2xl">
        <div className="p-6 flex items-center gap-3 border-b border-white/5 mb-4">
          <img src="/logo.png" className="size-10 object-contain" alt="Logo" />
          <div className="text-left">
            <h1 className="text-white text-xl font-black leading-none">BitaFly</h1>
            <p className="text-[#ec5b13] text-[8px] font-black uppercase mt-1 tracking-widest">Plan {userPlan.toUpperCase()}</p>
          </div>
        </div>

        <nav className="flex-1 px-3 mt-2 space-y-1 overflow-y-auto custom-scrollbar">
          {filteredItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                pathname === item.href ? 'bg-[#ec5b13]/10 border-l-4 border-[#ec5b13] text-[#ec5b13]' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="text-sm font-bold">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-[#141a26]">
          <div className="flex items-center gap-3 mb-4 p-2">
            <div className="size-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-black text-xs">
              {profile?.full_name?.slice(0,1).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-white text-xs font-black truncate">{profile?.full_name || 'Usuario'}</p>
              <p className="text-slate-500 text-[9px] uppercase font-black">{userRole.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full py-2 bg-slate-800 hover:bg-red-900/20 text-slate-300 text-[10px] font-black rounded-lg uppercase tracking-widest transition-all">
            Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex-1 text-left">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aviation Management System</span>
          </div>
          <Link href="/dashboard/logbook/new" className="bg-[#ec5b13] hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black shadow-lg shadow-orange-500/20 uppercase transition-all">
            Nuevo Vuelo
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#f8f6f6]">
          {children}
        </div>
      </main>
    </div>
  );
}