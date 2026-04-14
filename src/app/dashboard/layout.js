"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [data, setData] = useState({ profile: null, org: null });
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeFlight, setActiveFlight] = useState(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { window.location.href = '/login'; return; }
        
        const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        const { data: org } = await supabase.from('organizations').select('*').eq('id', prof?.organization_id).single();

        // BUSCAMOS SI HAY UN VUELO ACTIVO (Sin hora de aterrizaje)
        const { data: flight } = await supabase
            .from('flights')
            .select('id')
            .is('landing_time', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        setData({ profile: prof, org });
        setActiveFlight(flight); // <--- GUARDAMOS EL VUELO ENCONTRADO
      } catch (err) {
        console.error("Layout Load Error");
      } finally {
        setLoading(false);
      }
    }
    loadData();
}, [pathname]); // <--- IMPORTANTE: Añadimos pathname para que refresque al navegar

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
  // NUEVO ACCESO AL CENTRO DE REPORTES
  { name: 'Reportes', icon: 'assessment', href: '/dashboard/reports' }, 
];

  const footerLinks = [
    { name: 'Configuración', icon: 'settings', href: '/dashboard/settings' },
    { name: 'Mi Perfil', icon: 'account_circle', href: '/dashboard/settings/profile' },
    { name: 'Suscripción', icon: 'payments', href: '/dashboard/subscription' },
  ];

  return (
    <div className="flex h-screen bg-[#f8f6f6] font-display overflow-hidden text-left">
      
      {/* SIDEBAR DINÁMICO */}
      <aside className={`
          fixed inset-y-0 left-0 z-[150] w-64 bg-[#1A202C] text-white flex flex-col 
          transition-transform duration-300 ease-in-out border-r border-white/5
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* BLOQUE DE ESTATUS COMPACTO */}
          <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between gap-2">
            <div className="flex flex-col min-w-0">
                <span className="text-[6px] font-black text-slate-500 uppercase tracking-tighter">Plan</span>
                <span className="text-[9px] font-black text-orange-400 uppercase truncate">
                  {data.profile?.subscription_plan || 'PILOTO'}
                </span>
           </div>
   
   <div className="w-px h-6 bg-white/10 shrink-0"></div> {/* Divisor vertical */}
   
   <div className="flex flex-col text-right">
      <span className="text-[6px] font-black text-slate-500 uppercase tracking-tighter">Org ID</span>
      <span className="text-[9px] font-mono font-bold text-white leading-none">
        {data.org?.unique_code || '---'}
      </span>
   </div>
</div>

        <nav className="flex-1 p-4 space-y-1 mt-2 overflow-y-auto custom-scrollbar">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${pathname === link.href ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'text-slate-400 hover:bg-white/5'}`}>
              <span className="material-symbols-outlined text-lg">{link.icon}</span>{link.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5 bg-black/10 transition-all duration-500">
          {/* BOTÓN DE CONTROL: Gestión Administrativa */}
          <button 
            onClick={() => setIsAdminOpen(!isAdminOpen)}
            className="w-full flex items-center justify-between px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-500 hover:text-slate-300 transition-all group"
          >
            <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-sm">settings_suggest</span>
                <span>Administración</span>
            </div>
            <span className={`material-symbols-outlined text-xs transition-transform duration-300 ${isAdminOpen ? 'rotate-180' : ''}`}>
                expand_less
            </span>
          </button>

          {/* GRUPO COLAPSABLE */}
          <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isAdminOpen ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-1 pb-2">
              {footerLinks.map(link => (
                  <Link 
                    key={link.href} 
                    href={link.href} 
                    className={`flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-bold transition-all ${pathname === link.href ? 'text-orange-500' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    <span className="material-symbols-outlined text-base">{link.icon}</span>
                    {link.name}
                  </Link>
              ))}
            </div>
          </div>

          {/* BOTÓN SALIR: Siempre visible o compacto */}
          <button 
            onClick={() => supabase.auth.signOut().then(() => window.location.href='/login')} 
            className="w-full flex items-center gap-3 px-4 py-3 mt-1 rounded-xl text-[10px] font-black text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-all uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* OVERLAY PARA MÓVILES */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[140] lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* CONTENIDO PRINCIPAL */}
      <main className={`
          flex-1 flex flex-col overflow-hidden transition-all duration-300
          ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}
      `}>
       <header className="h-16 md:h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-[100]">
  {/* LADO IZQUIERDO: Toggle y Empresa */}
  <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
    <button 
      onClick={() => setSidebarOpen(!isSidebarOpen)}
      className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
    >
      <span className="material-symbols-outlined leading-none">
        {isSidebarOpen ? 'menu_open' : 'menu'}
      </span>
    </button>
    
    <div className="text-left truncate">
      <p className="hidden md:block text-[9px] font-black text-slate-400 uppercase leading-none tracking-widest">Organización</p>
      <h2 className="text-xs md:text-sm font-black text-slate-900 uppercase truncate max-w-[120px] md:max-w-none">
        {data.org?.company_name || 'Individual'}
      </h2>
    </div>
  </div>
  
  {/* LADO DERECHO: Acciones y Perfil */}
<div className="flex items-center gap-2 md:gap-6">
  
  {/* CONTENEDOR DE BOTONES OPERATIVOS */}
  <div className="flex items-center gap-2">
    
    {/* BOTÓN 1: TÉRMINO DE VUELO (Solo si activeFlight existe) */}
    {activeFlight && (
      <Link 
        href={`/dashboard/logbook/finalize?id=${activeFlight.id}`} 
        className="bg-slate-900 hover:bg-black text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg border border-white/10 transition-all flex items-center gap-2 active:scale-95"
      >
        <span className="material-symbols-outlined text-sm md:text-base text-orange-500">flight_land</span> 
        <span className="hidden sm:inline">Término de Vuelo</span>
        <span className="sm:hidden">Finalizar</span>
      </Link>
    )}

    {/* BOTÓN 2: NUEVA OPERACIÓN */}
    <Link 
      href="/dashboard/logbook/new" 
      className="bg-orange-600 hover:bg-orange-700 text-white px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-95"
    >
      <span className="material-symbols-outlined text-sm md:text-base">add_circle</span> 
      <span className="hidden sm:inline">Nueva Operación</span>
      <span className="sm:hidden">Nuevo</span>
    </Link>
  </div>

  {/* PERFIL CLICKABLE (Separado por línea en desktop) */}
  <Link 
      href="/dashboard/settings/profile" 
      className="flex items-center gap-3 border-l border-slate-100 pl-2 md:pl-6 group hover:opacity-80 transition-all"
  >
     <div className="hidden md:block text-right">
        <p className="text-[10px] font-black text-slate-900 leading-none group-hover:text-orange-600 transition-colors">{data.profile?.full_name}</p>
        <p className="text-[8px] font-bold text-orange-500 uppercase mt-1">{data.profile?.role?.replace('_', ' ')}</p>
     </div>
     <div className="size-8 md:size-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
        {data.profile?.avatar_url ? (
            <img src={data.profile.avatar_url} className="size-full object-cover" alt="Perfil" />
        ) : (
            <span className="material-symbols-outlined text-slate-400 text-xl">person</span>
        )}
     </div>
  </Link>
</div>
</header>
        <div className="flex-1 overflow-y-auto p-10">{children}</div>
      </main>
    </div>
  );
}