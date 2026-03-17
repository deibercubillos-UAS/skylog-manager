'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userPlan, setUserPlan] = useState('piloto');
  const [userEmail, setUserEmail] = useState('');

  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Mis Pilotos', icon: 'person', href: '/dashboard/pilots' },
    { name: 'Mi Flota', icon: 'precision_manufacturing', href: '/fleet' },
    { name: 'Suscripción', icon: 'payments', href: '/dashboard/subscription' },
    { name: 'Bitácora de Vuelos', icon: 'menu_book', href: '/dashboard/logbook' },
    { name: 'Análisis SORA', icon: 'shield', href: '/dashboard/sora' },
    { name: 'Mantenimiento', icon: 'build', href: '/dashboard/maintenance' },
    { name: 'Personalizar Checklist', icon: 'fact_check', href: '/dashboard/checklist' },
    { name: 'Reportes PDF', icon: 'description', href: '/dashboard/reports' },
    { name: 'Configuración', icon: 'settings', href: '/dashboard/settings' },
  ];

  useEffect(() => {
    async function getUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email);
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('id', user.id)
          .single();
        
        if (profile) setUserPlan(profile.subscription_plan);
      }
    }
    getUserData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f6f6] font-display text-left">
      {/* SideNavBar */}
      <aside className="w-64 bg-[#1A202C] flex flex-col h-full border-r border-slate-700 shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-[#ec5b13] rounded-lg p-1.5 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white">flight_takeoff</span>
          </div>
          <div className="text-left">
            <h1 className="text-white text-lg font-bold leading-tight uppercase tracking-tighter">SkyLog</h1>
            <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">Fleet Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-3 mt-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            // Definir qué funciones son PRO
            const isProFeature = ['Mantenimiento', 'Reportes PDF', 'Análisis SORA'].includes(item.name);
            const isLocked = isProFeature && userPlan === 'piloto';

            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center justify-between px-3 py-3 rounded-xl transition-all group ${
                  isActive 
                  ? 'bg-[#ec5b13]/10 border-l-4 border-[#ec5b13] text-[#ec5b13]' 
                  : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined shrink-0 text-xl">{item.icon}</span>
                  <span className={`text-sm ${isActive ? 'font-black' : 'font-bold'}`}>{item.name}</span>
                </div>
                
                {/* Badge PRO si está bloqueado */}
                {isLocked && (
                  <span className="text-[8px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter ring-1 ring-white/10">Pro</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-slate-800 bg-black/20">
          <div className="flex items-center gap-3 mb-4 p-2 text-left">
            <div className="size-10 rounded-full bg-slate-700 overflow-hidden border border-white/10">
              <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100" alt="User" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold truncate">{userEmail.split('@')[0]}</p>
              <div className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-[#ec5b13] animate-pulse"></span>
                <p className="text-[#ec5b13] text-[9px] font-black uppercase tracking-widest">{userPlan}</p>
              </div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-400 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest shadow-inner border border-white/5"
          >
            <span className="material-symbols-outlined !text-sm">logout</span> Cerrar Sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex-1 max-w-xl text-left">
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Sistema de Gestión de Cumplimiento UAS</p>
          </div>
          <Link href="/dashboard/logbook/new" className="bg-[#ec5b13] hover:bg-orange-600 text-white px-5 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-orange-500/20 transition-all uppercase tracking-widest flex items-center gap-2">
            <span className="material-symbols-outlined !text-sm">add</span> Nuevo Vuelo
          </Link>
        </header>
        <div className="flex-1 overflow-y-auto p-8 bg-[#f8f6f6]">
          {children}
        </div>
      </main>
    </div>
  );
}
