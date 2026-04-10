"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [data, setData] = useState({ profile: null, org: null });
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/login'; return; }
        
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        const { data: org } = await supabase.from('organizations').select('*').eq('id', prof?.organization_id).single();

        setData({ profile: prof, org });
      } catch (err) {
        console.error("Layout Load Error");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Cierra el menú automáticamente al navegar en móviles
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#1A202C] text-white font-black animate-pulse">CARGANDO BITAFLY...</div>;

  const navLinks = [
    { name: 'Dashboard', icon: 'dashboard', href: '/dashboard' },
    { name: 'Mi Flota', icon: 'precision_manufacturing', href: '/dashboard/fleet' },
    { name: 'Tripulación', icon: 'person', href: '/dashboard/pilots' },
    { name: 'Mantenimiento', icon: 'build', href: '/dashboard/maintenance' },
    { name: 'Programación', icon: 'event_available', href: '/dashboard/authorizations' },
    { name: 'Bitácora', icon: 'menu_book', href: '/dashboard/logbook' },
  ];

  const footerLinks = [
    { name: 'Configuración', icon: 'settings', href: '/dashboard/settings' },
    { name: 'Mi Perfil', icon: 'account_circle', href: '/dashboard/settings/profile' },
    { name: 'Suscripción', icon: 'payments', href: '/dashboard/subscription' },
  ];

  return (
    <div className="flex h-screen bg-[#f8f6f6] font-display overflow-hidden text-left">
      
      {/* SIDEBAR DINÁMICO */}
      <aside className={`fixed inset-y-0 left-0 z-[150] w-64 bg-[#1A202C] text-white flex flex-col transition-transform duration-300 ease-in-out border-r border-white/5 lg:translate-x-0 lg:static ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 border-b border-white/5">
          <h1 className="text-2xl font-black text-orange-500 tracking-tighter leading-none">BITAFLY</h1>
          <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
             <div className="flex justify-between items-center">
                <p className="text-[7px] font-black uppercase text-slate-500 tracking-widest">Plan</p>
                <p className="text-[9px] font-black text-orange-400 uppercase">{data.profile?.subscription_plan || 'PILOTO'}</p>
             </div>
             <div className="flex justify-between items-center">
                <p className="text-[7px] font-black uppercase text-slate-500 tracking-widest">Org ID</p>
                <p className="text-[9px] font-mono text-white">{data.org?.unique_code || '---'}</p>
             </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 mt-2 overflow-y-auto custom-scrollbar">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${pathname === link.href ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-400 hover:bg-white/5'}`}>
              <span className="material-symbols-outlined text-lg">{link.icon}</span>{link.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 bg-black/10">
          <div className="space-y-1 mb-4">
             {footerLinks.map(link => (
                <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-bold transition-all ${pathname === link.href ? 'text-orange-500' : 'text-slate-500 hover:text-slate-300'}`}>
                   <span className="material-symbols-outlined text-base">{link.icon}</span>{link.name}
                </Link>
             ))}
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => window.location.href='/login')} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[10px] font-black text-red-400 hover:bg-red-400/10 transition-colors uppercase tracking-widest">
            <span className="material-symbols-outlined text-lg">logout</span>Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* OVERLAY PARA MÓVILES */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[140] lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-[100]">
  {/* LADO IZQUIERDO: Menú y Empresa */}
  <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
    <button 
      onClick={() => setSidebarOpen(!isSidebarOpen)}
      className="p-2 rounded-xl bg-slate-50 text-slate-600 lg:hidden active:scale-95 transition-all shrink-0"
    >
      <span className="material-symbols-outlined leading-none">
        {isSidebarOpen ? 'close' : 'menu'}
      </span>
    </button>
    
    <div className="text-left truncate">
      <p className="hidden md:block text-[9px] font-black text-slate-400 uppercase leading-none tracking-widest">Organización</p>
      <h2 className="text-xs md:text-sm font-black text-slate-900 uppercase truncate max-w-[120px] md:max-w-none">
        {data.org?.company_name || 'Individual'}
      </h2>
    </div>
  </div>
  
  {/* LADO DERECHO: Nueva Operación y Perfil (Oculto en mobile) */}
  <div className="flex items-center gap-3 md:gap-6">
    <Link href="/dashboard/logbook/new" className="bg-orange-600 hover:bg-orange-700 text-white px-4 md:px-6 py-2 md:py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-95">
      <span className="material-symbols-outlined text-sm md:text-base">add_circle</span> 
      <span className="hidden sm:inline">Nueva Operación</span>
      <span className="sm:hidden">Nuevo</span>
    </Link>

    {/* PERFIL: Solo visible desde tablets en adelante */}
    <div className="hidden md:flex items-center gap-3 border-l border-slate-100 pl-6">
       <div className="text-right">
          <p className="text-[10px] font-black text-slate-900 leading-none">{data.profile?.full_name}</p>
          <p className="text-[8px] font-bold text-orange-500 uppercase mt-1">{data.profile?.role?.replace('_', ' ')}</p>
       </div>
       <div className="size-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
          <span className="material-symbols-outlined text-slate-400 text-xl">person</span>
       </div>
    </div>
  </div>
</header>
        <div className="flex-1 overflow-y-auto p-10">{children}</div>
      </main>
    </div>
  );
}