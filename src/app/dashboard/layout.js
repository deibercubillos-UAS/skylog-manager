'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Mis Pilotos', icon: 'person', href: '/dashboard/pilots' },
    { name: 'Mi Flota', icon: 'precision_manufacturing', href: '/dashboard/fleet' },
    { name: 'Bitácora de Vuelos', icon: 'menu_book', href: '/dashboard/logbook' },
    { name: 'Análisis SORA', icon: 'shield', href: '/dashboard/sora' },
    { name: 'Mantenimiento', icon: 'build', href: '/dashboard/maintenance' },
    { name: 'Reportes PDF', icon: 'description', href: '/dashboard/reports' },
    { name: 'Configuración', icon: 'settings', href: '/dashboard/settings' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f6f6]">
      
      {/* Sidebar fijo a la izquierda */}
      <aside className="w-64 bg-[#1A202C] flex flex-col h-full border-r border-slate-700 shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-[#ec5b13] rounded-lg p-1.5 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white">flight_takeoff</span>
          </div>
          <div className="text-left">
            <h1 className="text-white text-lg font-bold leading-tight">SkyLog</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Fleet Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-3 mt-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                  isActive ? 'bg-[#ec5b13]/10 border-l-4 border-[#ec5b13] text-[#ec5b13]' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span className="material-symbols-outlined shrink-0 text-xl">{item.icon}</span>
                <span className="text-sm font-medium whitespace-nowrap">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 p-2 text-left">
            <div className="size-10 rounded-full bg-slate-700 overflow-hidden border border-slate-600">
              <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100" alt="User" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">Admin SkyLog</p>
              <p className="text-slate-500 text-[10px] uppercase font-bold">Operaciones</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-900/20 text-slate-300 text-[10px] font-bold rounded-lg uppercase transition-all">
            <span className="material-symbols-outlined !text-sm">logout</span> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex-1 max-w-xl text-left">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input className="w-full bg-slate-100 border-none rounded-xl py-2 pl-10 pr-4 text-sm outline-none" placeholder="Buscar..." />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="bg-[#ec5b13] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg">NUEVO VUELO</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 bg-[#f8f6f6]">
          {children}
        </div>
      </main>
    </div>
  );
}