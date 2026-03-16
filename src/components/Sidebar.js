'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Panel de Control', icon: 'dashboard', href: '/' },
    { name: 'Mi Flota', icon: 'pin', href: '/fleet' },
    { name: 'Mantenimiento', icon: 'build', href: '/maintenance' },
    { name: 'Pilotos', icon: 'badge', href: '/pilots' },
    { name: 'Documentación', icon: 'description', href: '/docs' },
  ];

  return (
    <aside className="w-72 bg-slate-900 dark:bg-black flex flex-col border-r border-slate-800 hidden md:flex">
      <div className="p-6 flex items-center gap-3">
        <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center text-white">
          <span className="material-symbols-outlined">rocket_launch</span>
        </div>
        <div>
          <h1 className="text-white text-lg font-bold leading-none">SkyLog Manager</h1>
          <p className="text-slate-400 text-xs mt-1">Industrial Drone Fleet</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-slate-800 text-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-slate-700"></div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium truncate">Ing. Marcos Rivas</p>
            <p className="text-slate-400 text-xs truncate">Administrador</p>
          </div>
        </div>
      </div>
    </aside>
  );
}