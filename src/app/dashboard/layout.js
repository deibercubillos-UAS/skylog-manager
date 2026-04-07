"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [authLoading, setAuthLoading] = useState(true);
  const [enabledForms, setEnabledForms] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // <-- Estado para el menú móvil

  const staticMenu = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Mi Flota', icon: 'precision_manufacturing', href: '/dashboard/fleet' },
    { name: 'Tripulación', icon: 'person', href: '/dashboard/pilots' },
  ];

  const formLinks = {
    'vuelo_diario': { name: 'Vuelo Diario', icon: 'flight_takeoff', href: '/dashboard/logbook/daily' },
    'registro_baterias': { name: 'Registro Baterías', icon: 'battery_charging_full', href: '/dashboard/logbook/batteries' },
    'inventario_mision': { name: 'Inventario Misión', icon: 'inventory_2', href: '/dashboard/logbook/inventory' },
    'bitacora_vuelos': { name: 'Bitácora Histórica', icon: 'menu_book', href: '/dashboard/logbook' },
    'historial_pilotos': { name: 'Historial Pilotos', icon: 'history_edu', href: '/dashboard/logbook/pilots' },
  };

  useEffect(() => {
    async function loadSettings() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      const res = await fetch('/api/form-settings');
      const data = await res.json();
      setEnabledForms(data.enabled_forms || []);
      setAuthLoading(false);
    }
    loadSettings();
  }, [pathname]);

  // Cerrar el menú automáticamente al cambiar de página en móvil
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (authLoading) return <div className="h-screen flex items-center justify-center font-black uppercase text-slate-300 animate-pulse">Iniciando BitaFly...</div>;

  return (
    <div className="flex h-screen bg-[#f8f6f6] text-left font-display overflow-hidden">
      
      {/* OVERLAY (Cerrar al tocar fuera en móvil) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR COLAPSABLE */}
      <aside className={`
        fixed inset-y-0 left-0 z-[110] w-64 bg-[#1A202C] text-white flex flex-col h-full shrink-0 border-r border-slate-800 transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:translate-x-0 lg:static
      `}>
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter leading-none">BitaFly</h1>
            <p className="text-[#ec5b13] text-[8px] font-black uppercase mt-1 tracking-widest">UAS Fleet Manager</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden material-symbols-outlined text-slate-500">close</button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {staticMenu.map(item => (
             <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${pathname === item.href ? 'bg-[#ec5b13] text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                <span className="material-symbols-outlined text-lg">{item.icon}</span>{item.name}
             </Link>
          ))}

          <div className="pt-4 pb-2 px-4"><p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Documentación Activa</p></div>
          {enabledForms.map(id => {
            const item = formLinks[id];
            if (!item) return null;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${pathname === item.href ? 'bg-[#ec5b13] text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                <span className="material-symbols-outlined text-lg">{item.icon}</span>{item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-1">
          <Link href="/dashboard/settings/forms" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-white/5">
            <span className="material-symbols-outlined text-base">settings_applications</span>Formatos
          </Link>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all">
            <span className="material-symbols-outlined text-base">logout</span>Salir
          </button>
        </div>
      </aside>
      
      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-50">
            {/* BOTÓN HAMBURGUESA (MÓVIL) */}
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-50 text-slate-600 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>

            <Link href="/dashboard/logbook/daily" className="bg-[#ec5b13] hover:bg-orange-600 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">add_circle</span> <span className="hidden sm:inline">Nueva Operación</span>
            </Link>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10">
          {children}
        </div>
      </main>
    </div>
  );
}