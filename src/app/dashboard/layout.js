"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [authLoading, setAuthLoading] = useState(true);
  const [enabledForms, setEnabledForms] = useState([]);

  // Base de ítems fijos
  const staticMenu = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Mi Flota', icon: 'precision_manufacturing', href: '/dashboard/fleet' },
    { name: 'Tripulación', icon: 'person', href: '/dashboard/pilots' },
    { name: 'Programar Misión', icon: 'assignment_turned_in', href: '/dashboard/authorizations' },
  ];

  // Mapeo de formularios activables
  const formLinks = {
    'vuelo_diario': { name: 'Vuelo Diario', icon: 'flight_takeoff', href: '/dashboard/logbook/daily' },
    'registro_baterias': { name: 'Registro Baterías', icon: 'battery_charging_full', href: '/dashboard/logbook/batteries' },
    'inventario_mision': { name: 'Inventario Misión', icon: 'inventory_2', href: '/dashboard/logbook/inventory' },
    'bitacora_vuelos': { name: 'Bitácora Histórica', icon: 'menu_book', href: '/dashboard/logbook' },
    'historial_pilotos': { name: 'Historial Pilotos', icon: 'history_edu', href: '/dashboard/logbook/pilots' },
  };

  const footerMenu = [
    { name: 'Configuración Formatos', icon: 'settings_applications', href: '/dashboard/settings/forms' },
    { name: 'Suscripción', icon: 'payments', href: '/dashboard/subscription/manage' },
  ];

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
  }, [pathname]); // Recargar al navegar por si hubo cambios

  if (authLoading) return <div className="h-screen flex items-center justify-center font-black uppercase tracking-widest text-slate-300">Sincronizando BitaFly...</div>;

  return (
    <div className="flex h-screen bg-[#f8f6f6] text-left font-display">
      <aside className="w-64 bg-[#1A202C] text-white flex flex-col h-full shrink-0 border-r border-slate-800">
        <div className="p-6 border-b border-white/5">
          <h1 className="text-xl font-black uppercase tracking-tighter">BitaFly</h1>
          <p className="text-[#ec5b13] text-[8px] font-black uppercase mt-1">UAS Fleet Manager</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {staticMenu.map(item => (
             <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${pathname === item.href ? 'bg-[#ec5b13] text-white' : 'text-slate-400 hover:bg-white/5'}`}>
                <span className="material-symbols-outlined text-lg">{item.icon}</span>{item.name}
             </Link>
          ))}

          {/* RENDERIZADO DINÁMICO DE FORMULARIOS ACTIVOS */}
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
          {footerMenu.map(item => (
             <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${pathname === item.href ? 'bg-white/10 text-white' : 'text-slate-500 hover:bg-white/5'}`}>
                <span className="material-symbols-outlined text-base">{item.icon}</span>{item.name}
             </Link>
          ))}
        </div>
      </aside>
      
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-end px-10 shrink-0 z-50">
            <Link href="/dashboard/logbook/daily" className="bg-[#ec5b13] hover:bg-orange-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">add_circle</span> Nueva Operación
            </Link>
        </header>
        <div className="flex-1 overflow-y-auto p-10">{children}</div>
      </main>
    </div>
  );
}
