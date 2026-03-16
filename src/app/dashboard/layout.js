'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  // LISTA EXACTA DE TU DISEÑO ORIGINAL
  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Mis Pilotos', icon: 'person', href: '/dashboard/pilots' },
    { name: 'Mi Flota', icon: 'precision_manufacturing', href: '/fleet' },
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
    <div className="flex h-screen overflow-hidden bg-[#f8f6f6] font-display">
      
      {/* --- SideNavBar (Fixed width) --- */}
      <aside className="w-64 bg-[#1A202C] flex flex-col h-full border-r border-slate-700 shrink-0">
        
        {/* LOGO SECTION */}
        <div className="p-6 flex items-center gap-3">
          <div className="bg-[#ec5b13] rounded-lg p-1.5 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white !text-2xl">flight_takeoff</span>
          </div>
          <div className="text-left overflow-hidden">
            <h1 className="text-white text-lg font-bold leading-tight">SkyLog</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest truncate">Fleet Admin</p>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 px-3 mt-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all group overflow-hidden ${
                  isActive 
                  ? 'bg-[#ec5b13]/10 border-l-4 border-[#ec5b13] text-[#ec5b13]' 
                  : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                {/* ICONO CON BLOQUEO DE TAMAÑO PARA EVITAR DESBORDE */}
                <span 
                  className={`material-symbols-outlined shrink-0 text-center transition-colors ${isActive ? 'text-[#ec5b13]' : 'text-slate-400'}`}
                  style={{ width: '24px', height: '24px', fontSize: '22px', overflow: 'hidden' }}
                >
                  {item.icon}
                </span>
                
                {/* TEXTO DEL MENÚ */}
                <span className="text-sm font-medium whitespace-nowrap truncate">
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* PROFILE & LOGOUT SECTION */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 p-2 text-left">
            <div className="size-10 rounded-full bg-slate-700 overflow-hidden border border-slate-600 shrink-0">
              <img 
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100" 
                alt="User" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">Admin SkyLog</p>
              <p className="text-slate-500 text-[10px] uppercase font-bold">Operaciones</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-900/20 text-slate-300 hover:text-red-400 text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest shadow-inner"
          >
            <span className="material-symbols-outlined !text-sm">logout</span> 
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR / HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex-1 max-w-xl">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#ec5b13] transition-colors" style={{ width: '20px', overflow: 'hidden' }}>
                search
              </span>
              <input 
                className="w-full bg-slate-100 border-none rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
                placeholder="Buscar vuelo, drone o piloto..." 
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="bg-[#ec5b13] hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined !text-sm" style={{ width: '16px', overflow: 'hidden' }}>add</span> 
              NUEVO VUELO
            </button>
            <div className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors">
              <span className="material-symbols-outlined" style={{ width: '24px', overflow: 'hidden' }}>notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-red-500 border-2 border-white rounded-full"></span>
            </div>
          </div>
        </header>

        {/* CONTENT VIEW */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#f8f6f6]">
          {children}
        </div>
      </main>
    </div>
  );
}