"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Mi Flota', icon: 'precision_manufacturing', href: '/dashboard/fleet' },
    { name: 'Tripulación', icon: 'person', href: '/dashboard/pilots' },
    { name: 'Vuelo Diario (F-OPS)', icon: 'flight_takeoff', href: '/dashboard/logbook/daily' },
    { name: 'Bitácora (Historial)', icon: 'menu_book', href: '/dashboard/logbook' },
    { name: 'Configuración Formatos', icon: 'settings_applications', href: '/dashboard/settings/forms' },
    { name: 'Suscripción', icon: 'payments', href: '/dashboard/subscription/manage' },
  ];

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setProfile(data);
      setAuthLoading(false);
    }
    checkUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (authLoading) return <div className="h-screen flex items-center justify-center font-black uppercase tracking-widest text-slate-300">Iniciando BitaFly...</div>;

  return (
    <div className="flex h-screen bg-[#f8f6f6] text-left">
      <aside className="w-64 bg-[#1A202C] text-white flex flex-col h-full shrink-0 border-r border-slate-800">
        <div className="p-6 border-b border-white/5">
          <h1 className="text-xl font-black uppercase tracking-tighter">BitaFly</h1>
          <p className="text-[#ec5b13] text-[8px] font-black uppercase mt-1">UAS Fleet Manager</p>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${pathname === item.href ? 'bg-[#ec5b13] text-white' : 'text-slate-400 hover:bg-white/5'}`}>
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5">
          <button onClick={handleLogout} className="w-full py-2 bg-white/5 text-[10px] font-black uppercase rounded-lg text-slate-400 hover:text-red-400 transition-all">Salir del Sistema</button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-10">{children}</main>
    </div>
  );
}
