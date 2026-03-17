'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  
  // ESTADOS PARA USUARIO Y PLAN
  const [userPlan, setUserPlan] = useState('piloto'); // Por defecto piloto
  const [profile, setProfile] = useState({ full_name: 'Usuario', role: 'Operador' });

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

  // 1. CARGAR DATOS DEL PERFIL Y PLAN
  useEffect(() => {
    async function loadUserData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role, subscription_plan')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setProfile(data);
          setUserPlan(data.subscription_plan || 'piloto');
        }
      }
    }
    loadUserData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f6f6] font-display">
      
      {/* --- SideNavBar --- */}
      <aside className="w-64 bg-[#1A202C] flex flex-col h-full border-r border-slate-700 shrink-0">
        
        {/* LOGO */}
        <div className="p-6 flex items-center gap-3">
          <div className="bg-[#ec5b13] rounded-lg p-1.5 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white !text-2xl">flight_takeoff</span>
          </div>
          <div className="text-left overflow-hidden">
            <h1 className="text-white text-lg font-bold leading-tight tracking-tighter">SkyLog</h1>
            <p className="text-[#ec5b13] text-[9px] font-black uppercase tracking-widest truncate">
               Plan {userPlan.toUpperCase()}
            </p>
          </div>
        </div>

        {/* NAVEGACIÓN DINÁMICA CON BLOQUEOS */}
        <nav className="flex-1 px-3 mt-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            
            // Lógica de bloqueo visual para Plan Piloto
            const isLocked = userPlan === 'piloto' && 
              (item.name === 'Mantenimiento' || item.name === 'Reportes PDF' || item.name === 'Análisis SORA');

            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center justify-between px-3 py-3 rounded-lg transition-all group overflow-hidden ${
                  isActive 
                  ? 'bg-[#ec5b13]/10 border-l-4 border-[#ec5b13] text-[#ec5b13]' 
                  : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined shrink-0 transition-colors ${isActive ? 'text-[#ec5b13]' : 'text-slate-400'}`} style={{ width: '24px', overflow: 'hidden' }}>
                    {item.icon}
                  </span>
                  <span className={`text-sm ${isActive ? 'font-black' : 'font-medium'} whitespace-nowrap truncate`}>
                    {item.name}
                  </span>
                </div>

                {/* Badge de bloqueo */}
                {isLocked && (
                  <span className="text-[8px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter shadow-inner">
                    Pro
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* PERFIL Y CIERRE DE SESIÓN */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 p-2 text-left bg-white/5 rounded-xl border border-white/5">
            <div className="size-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-black text-xs shrink-0">
              {profile.full_name?.slice(0,1).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-bold truncate">{profile.full_name}</p>
              <p className="text-slate-500 text-[9px] uppercase font-black tracking-widest">{profile.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-900/20 text-slate-300 hover:text-red-400 text-[10px] font-black rounded-lg transition-all uppercase tracking-widest"
          >
            <span className="material-symbols-outlined !text-sm">logout</span> 
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex-1 max-w-xl text-left">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input className="w-full bg-slate-100 border-none rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="Buscar registros..." />
            </div>
          </div>
          <Link href="/dashboard/logbook/new" className="bg-[#ec5b13] hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 uppercase tracking-widest">
            <span className="material-symbols-outlined !text-sm">add</span> NUEVO VUELO
          </Link>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#f8f6f6]">
          {children}
        </div>
      </main>
    </div>
  );
}