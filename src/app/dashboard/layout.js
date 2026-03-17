"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [userPlan, setUserPlan] = useState('piloto');
  const [userRole, setUserRole] = useState('piloto');
  const [profile, setProfile] = useState({ full_name: 'Usuario', role: 'Operador' });

  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Mis Pilotos', icon: 'person', href: '/dashboard/pilots' },
    { name: 'Mi Flota', icon: 'precision_manufacturing', href: '/dashboard/fleet' },
    { name: 'Suscripción', icon: 'payments', href: '/dashboard/subscription' },
    { name: 'Bitácora de Vuelos', icon: 'menu_book', href: '/dashboard/logbook' },
    { name: 'Análisis SORA', icon: 'shield', href: '/dashboard/sora' },
    { name: 'Mantenimiento', icon: 'build', href: '/dashboard/maintenance' },
    { name: 'Reportes SMS', icon: 'report_problem', href: '/dashboard/sms' },
    { name: 'Reportes PDF', icon: 'description', href: '/dashboard/reports' },
    { name: 'Configuración', icon: 'settings', href: '/dashboard/settings' },
  ];

  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
          setProfile(data);
          setUserRole(data.role || 'piloto');
          setUserPlan(data.subscription_plan || 'piloto');
        }
      }
    }
    loadUserData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const filteredItems = menuItems.filter(item => {
    if (userRole === 'admin') return true;
    if (userRole === 'gerente_sms') return ['Dashboard', 'Análisis SORA', 'Reportes SMS', 'Reportes PDF'].includes(item.name);
    if (userRole === 'jefe_pilotos') return ['Dashboard', 'Mis Pilotos', 'Mi Flota', 'Bitácora de Vuelos'].includes(item.name);
    return !['Reportes SMS'].includes(item.name);
  });

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f6f6] font-display">
      <aside className="w-64 bg-[#1A202C] flex flex-col h-full border-r border-slate-700 shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-[#ec5b13] rounded-lg p-1.5 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white !text-2xl">flight_takeoff</span>
          </div>
          <div className="text-left overflow-hidden">
            <h1 className="text-white text-lg font-bold leading-tight">SkyLog</h1>
            <p className="text-[#ec5b13] text-[9px] font-black uppercase tracking-widest truncate">Plan {userPlan.toUpperCase()}</p>
          </div>
        </div>
        <nav className="flex-1 px-3 mt-4 space-y-1 overflow-y-auto">
          {filteredItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                pathname === item.href ? 'bg-[#ec5b13]/10 border-l-4 border-[#ec5b13] text-[#ec5b13]' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined shrink-0 text-xl">{item.icon}</span>
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 p-2 text-left">
            <div className="size-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-black">{profile.full_name?.slice(0,1)}</div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold truncate">{profile.full_name}</p>
              <p className="text-slate-500 text-[9px] uppercase font-black">{userRole.replace('_', ' ')}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full py-2 bg-slate-800 text-slate-300 text-[10px] font-black rounded-lg uppercase">Cerrar Sesión</button>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div className="flex-1 text-left"><span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Aviation Management System</span></div>
          <Link href="/dashboard/logbook/new" className="bg-[#ec5b13] text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg uppercase tracking-widest">Nuevo Vuelo</Link>
        </header>
        <div className="flex-1 overflow-y-auto p-8 bg-[#f8f6f6]">{children}</div>
      </main>
    </div>
  );
}
