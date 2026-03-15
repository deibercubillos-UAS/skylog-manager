"use client";
import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-navy-custom dark:bg-black flex flex-col h-screen shrink-0 border-r border-slate-200 dark:border-slate-800">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
          <span className="material-symbols-outlined">flight_takeoff</span>
        </div>
        <div>
          <h1 className="text-white text-lg font-bold leading-none">SkyLog</h1>
          <p className="text-slate-400 text-xs mt-1">Gestión Aeronáutica</p>
        </div>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
        <Link href="/" className="flex items-center gap-3 px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-sm font-medium">Panel de Control</span>
        </Link>
        <Link href="/pilotos" className="flex items-center gap-3 px-3 py-2 bg-primary text-white rounded-xl">
          <span className="material-symbols-outlined">group</span>
          <span className="text-sm font-medium">Mis Pilotos</span>
        </Link>
      </nav>
    </aside>
  );
}