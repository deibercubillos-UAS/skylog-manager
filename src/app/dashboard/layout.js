'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Mis Pilotos', icon: 'person', href: '/dashboard/pilots' },
    { name: 'Mi Flota', icon: 'precision_manufacturing', href: '/fleet' },
    { name: 'Bitácora', icon: 'menu_book', href: '/dashboard/logbook' },
    { name: 'Análisis SORA', icon: 'shield', href: '/dashboard/sora' },
    { name: 'Mantenimiento', icon: 'build', href: '/dashboard/maintenance' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f6f6] font-display">
      {/* SideNavBar */}
      <aside className="w-64 bg-[#1A202C] flex flex-col h-full border-r border-slate-700">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-[#ec5b13] rounded-lg p-1.5 flex items-center justify-center">
            <span className="material-symbols-outlined text-white">flight_takeoff</span>
          </div>
          <div>
            <h1 className="text-white text-lg font-bold leading-tight">SkyLog</h1>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Fleet Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                pathname === item.href 
                ? 'bg-[#ec5b13]/10 border-l-4 border-[#ec5b13] text-[#ec5b13]' 
                : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 p-2">
            <div className="size-10 rounded-full bg-slate-700 overflow-hidden border border-slate-600">
              <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=100" alt="User" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">Admin SkyLog</p>
              <p className="text-slate-500 text-[10px] uppercase font-bold">Operaciones</p>
            </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-red-900/20 text-slate-300 hover:text-red-400 text-[10px] font-bold rounded-lg transition-all uppercase tracking-widest">
            <span className="material-symbols-outlined text-sm">logout</span> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Superior */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <div className="flex-1 max-w-xl">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input className="w-full bg-slate-100 border-none rounded-xl py-2 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="Buscar..." />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="bg-[#ec5b13] hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-black shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">add</span> NUEVO VUELO
            </button>
            <div className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-2 right-2 size-2 bg-red-500 border-2 border-white rounded-full"></span>
            </div>
          </div>
        </header>

        {/* Contenido Dinámico */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}