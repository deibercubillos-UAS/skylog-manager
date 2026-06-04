"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Image from 'next/image';
import { ROLE_LABELS, PERMISSIONS, hasPermission } from '@/lib/roles';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [data, setData] = useState({ profile: null, org: null });
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeFlight, setActiveFlight] = useState(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  // Sidebar abierto por defecto solo en desktop
  useEffect(() => { setSidebarOpen(window.innerWidth >= 1024); }, []);

// EFECTO 1: Cargar Perfil + Organización + suscripción Realtime al plan
  useEffect(() => {
    let realtimeChannel;

    async function loadIdentity() {
      try {
        // getSession() lee el token de la cookie sin hacer un roundtrip a Supabase Auth.
        // El JWT ya fue validado por el middleware en el servidor — esto es seguro.
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) { window.location.href = '/login'; return; }

        // Solo los campos que el layout realmente usa
        const { data: prof } = await supabase
          .from('profiles')
          .select('id,organization_id,role,first_name,full_name,email,avatar_url,subscription_plan')
          .eq('id', user.id)
          .single();
        if (!prof) throw new Error("No profile");

        // Protección: si el perfil existe pero no tiene organización asignada,
        // la creamos automáticamente para que las políticas RLS funcionen.
        if (!prof.organization_id) {
          const { data: newOrg } = await supabase
            .from('organizations')
            .insert([{ company_name: `Piloto: ${prof.first_name || user.email}` }])
            .select('id')
            .single();
          if (newOrg) {
            await supabase.from('profiles').update({ organization_id: newOrg.id }).eq('id', user.id);
            prof.organization_id = newOrg.id;
          }
        }

        // Cargar organización EN PARALELO con el primer vuelo activo
        const [orgRes, flightRes] = await Promise.all([
          supabase
            .from('organizations')
            .select('id,company_name,unique_code,tax_id,logo_url,subscription_plan')
            .eq('id', prof.organization_id)
            .single(),
          supabase
            .from('flights')
            .select('id')
            .eq('organization_id', prof.organization_id)
            .is('landing_time', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        ]);

        setData({ profile: prof, org: orgRes.data });
        setActiveFlight(flightRes.data);

        // Suscripción Realtime: si el admin actualiza el plan o el rol desde Supabase,
        // el sidebar se actualiza automáticamente sin que el usuario cierre sesión.
        realtimeChannel = supabase
          .channel(`profile-${user.id}`)
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
            (payload) => {
              setData((prev) => ({ ...prev, profile: { ...prev.profile, ...payload.new } }));
            }
          )
          .subscribe();

      } catch (err) {
        console.error("Layout Handshake Error:", err.message);
      } finally {
        setLoading(false);
      }
    }

    loadIdentity();

    // Limpiar suscripción al desmontar
    return () => {
      if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    };
  }, []); // ← SOLO al montar, NO en cada navegación

  // EFECTO 2: Refrescar SOLO el vuelo activo al navegar entre páginas (consulta ligera)
  useEffect(() => {
      async function refreshActiveFlight() {
        if (!data.profile?.organization_id) return;
        const { data: flight } = await supabase
            .from('flights')
            .select('id')
            .eq('organization_id', data.profile.organization_id)
            .is('landing_time', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
        setActiveFlight(flight || null);
      }
      // Evita doble-llamada en el primer render (cuando aún no hay perfil)
      if (data.profile?.organization_id) {
        refreshActiveFlight();
      }
  }, [pathname, data.profile?.organization_id]);

  // Cierra el menú automáticamente al navegar en móviles
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#1A202C] text-white font-black animate-pulse">CARGANDO BITAFLY...</div>;

  const role = data.profile?.role;

// Plan: verificar en org Y en profile para no bloquear usuarios válidos
const plan = data.org?.subscription_plan || data.profile?.subscription_plan || 'piloto';
const isPaidPlan  = !['piloto', null, undefined, ''].includes(plan);
const isPilotoPlan = plan === 'piloto'; // solo piloto autónomo (sin SMS, sin auditoría)

// pilotHidden: true  → se oculta cuando el plan es 'piloto' (sin importar el rol)
// pilotOnly: true    → se muestra SOLO cuando el plan es 'piloto'
const navLinks = [
  { name: 'Dashboard',      icon: 'dashboard',               href: '/dashboard',                 roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  { name: 'Mi Flota',       icon: 'precision_manufacturing', href: '/dashboard/fleet',           roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  { name: 'Tripulación',    icon: 'group',                   href: '/dashboard/pilots',          roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'], pilotHidden: true },
  { name: 'Mantenimiento',  icon: 'build',                   href: '/dashboard/maintenance',     roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  { name: 'Planear Vuelo',  icon: 'map',                     href: '/dashboard/plan-vuelo',      roles: ['superadmin', 'admin', 'jefe_pilotos', 'piloto'], pilotOnly: true },
  { name: 'Programación',   icon: 'event_available',         href: '/dashboard/authorizations',  roles: ['superadmin', 'admin', 'jefe_pilotos'],            pilotHidden: true },
  { name: 'Bitácora',       icon: 'menu_book',               href: '/dashboard/logbook',         roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  { name: 'Reportes',       icon: 'assessment',              href: '/dashboard/reports',         roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'],   pilotHidden: true },
  { name: 'Seguridad Operacional', icon: 'health_and_safety', href: '/dashboard/safety',          roles: ['superadmin', 'admin', 'gerente_sms'],                    pilotHidden: true },
  { name: 'SORA',           icon: 'radar',                   href: '/dashboard/sora',            roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'],   pilotHidden: true },
  { name: 'Auditoría',      icon: 'fact_check',              href: '/dashboard/audit',           roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'],   pilotHidden: true },
  { name: 'Listas de Chequeo', icon: 'rule',                 href: '/dashboard/settings/forms',  roles: ['superadmin', 'admin', 'gerente_sms'] },
];

// FILTRAR por rol, plan y flags pilotOnly / pilotHidden
const filteredLinks = navLinks.filter(link =>
  link.roles.includes(role) &&
  (!link.paidOnly     || isPaidPlan) &&
  (!link.pilotHidden  || !isPilotoPlan) &&
  (!link.pilotOnly    || isPilotoPlan)
);

const footerLinksAll = [
    { name: 'Configurar Organización', icon: 'settings',        href: '/dashboard/settings',          roles: ['superadmin', 'admin'] },
    { name: 'Gestión de Usuarios',     icon: 'groups',          href: '/dashboard/users',             roles: ['superadmin', 'admin'], paidOnly: true },
    { name: 'Mi Perfil',               icon: 'account_circle',  href: '/dashboard/settings/profile',  roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
    { name: 'Suscripción',             icon: 'payments',        href: '/dashboard/subscription',      roles: ['superadmin', 'admin', 'gerente_sms'] },
];
const footerLinks = footerLinksAll.filter(link =>
  link.roles.includes(role) && (!link.paidOnly || isPaidPlan)
);

  // ── Links para la barra de navegación inferior (mobile) ─────────────────
  const bottomNavLinks = [
    { name: 'Inicio',      icon: 'dashboard',    href: '/dashboard' },
    { name: 'Bitácora',    icon: 'menu_book',    href: '/dashboard/logbook' },
    { name: 'Flota',       icon: 'precision_manufacturing', href: '/dashboard/fleet' },
    { name: 'Ajustes',     icon: 'settings',     href: '/dashboard/settings' },
  ].filter(l => filteredLinks.some(fl => fl.href === l.href) || footerLinks.some(fl => fl.href === l.href) || l.href === '/dashboard');

  return (
    <div className="flex h-screen bg-[#f8f6f6] font-display overflow-hidden text-left">

      {/* ── SIDEBAR DINÁMICO ─────────────────────────────────────────────── */}
      <aside className={`
          fixed inset-y-0 left-0 z-[150] w-64 bg-[#1A202C] text-white flex flex-col
          transition-transform duration-300 ease-in-out border-r border-white/5
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* MARCA / LOGO — clic navega a Mi Perfil */}
        <Link
          href="/dashboard/settings/profile"
          className="flex items-center gap-3 px-5 py-4 border-b border-white/5 shrink-0 hover:bg-white/5 transition-colors group"
        >
          <div className="size-9 bg-orange-600 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-600/30 group-hover:bg-orange-500 transition-colors">
            <span className="material-symbols-outlined text-white text-lg">flight</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-white leading-none tracking-tight">Bitafly</p>
            <p className="text-xs text-orange-400 font-bold mt-0.5 truncate">
              {data.org?.company_name || 'Mi Organización'}
            </p>
          </div>
        </Link>

        {/* BLOQUE DE ESTATUS */}
        <div className="mx-3 mt-3 p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between gap-2 shrink-0">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-black text-slate-500 uppercase tracking-tight leading-none">Plan</span>
            <span className="text-xs font-black text-orange-400 uppercase truncate mt-0.5">
              {data.profile?.subscription_plan || 'PILOTO'}
            </span>
          </div>
          <div className="w-px h-6 bg-white/10 shrink-0" />
          <div className="flex flex-col text-right min-w-0">
            <span className="text-xs font-black text-slate-500 uppercase tracking-tight leading-none">NIT</span>
            <span className="text-xs font-mono font-bold text-white leading-none mt-0.5">
              {data.org?.tax_id || '---'}
            </span>
          </div>
        </div>

        {/* NAV PRINCIPAL */}
        <nav className="flex-1 p-3 space-y-0.5 mt-2 overflow-y-auto custom-scrollbar">
          {filteredLinks.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                pathname === link.href
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-lg shrink-0">{link.icon}</span>
              {link.name}
            </Link>
          ))}
        </nav>

        {/* PIE DE SIDEBAR */}
        {/* pb-20 lg:pb-3 → en mobile la barra inferior (h-16) tapa este bloque; el padding extra lo empuja arriba */}
        <div className="p-3 pb-20 lg:pb-3 border-t border-white/5 bg-black/10 space-y-1 shrink-0">
          {/* ADMINISTRACIÓN COLAPSABLE */}
          <button
            onClick={() => setIsAdminOpen(!isAdminOpen)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black uppercase text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-base">settings_suggest</span>
              <span>Administración</span>
            </div>
            <span className={`material-symbols-outlined text-sm transition-transform duration-300 ${isAdminOpen ? 'rotate-180' : ''}`}>
              expand_less
            </span>
          </button>

          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isAdminOpen ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-0.5 pb-1 pt-0.5">
              {footerLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    pathname === link.href ? 'text-orange-400 bg-white/5' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <span className="material-symbols-outlined text-base shrink-0">{link.icon}</span>
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* MASTER CONTROL (superadmin) */}
          {data.profile?.role === 'superadmin' && (
            <Link
              href="/admin/master"
              className="flex items-center gap-3 px-4 py-3 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600 hover:text-white transition-all"
            >
              <span className="material-symbols-outlined text-base">settings_accessibility</span>
              <div className="text-left min-w-0">
                <p className="text-xs font-black uppercase leading-none">Master Control</p>
                <p className="text-xs opacity-70 uppercase mt-0.5">Gestión Global SaaS</p>
              </div>
            </Link>
          )}

          {/* CERRAR SESIÓN */}
          <button
            onClick={() => supabase.auth.signOut().then(() => (window.location.href = '/login'))}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black text-red-500/70 hover:text-red-400 hover:bg-red-500/10 transition-all uppercase tracking-widest"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* OVERLAY MÓVIL */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[140] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── CONTENIDO PRINCIPAL ──────────────────────────────────────────── */}
      <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>

        {/* HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 sticky top-0 z-[100]">

          {/* IZQUIERDA: hamburguesa + empresa */}
          <div className="flex items-center gap-3 overflow-hidden">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="size-11 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
              aria-label="Abrir menú"
            >
              <span className="material-symbols-outlined text-xl leading-none">
                {isSidebarOpen ? 'menu_open' : 'menu'}
              </span>
            </button>
            <div className="text-left truncate">
              <p className="hidden md:block text-xs font-black text-slate-400 uppercase leading-none tracking-widest">Organización</p>
              <h2 className="text-sm font-black text-slate-900 uppercase truncate max-w-[140px] sm:max-w-xs md:max-w-none">
                {data.org?.company_name || 'Individual'}
              </h2>
            </div>
          </div>

          {/* DERECHA: acciones + perfil */}
          <div className="flex items-center gap-2 md:gap-4">
            {hasPermission(role, 'canFly') && (
              <div className="flex items-center gap-2">
                {activeFlight && (
                  <Link
                    href={`/dashboard/logbook/finalize?id=${activeFlight.id}`}
                    className="flex items-center gap-2 bg-slate-900 hover:bg-black text-white px-3 md:px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg border border-white/10 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-base text-orange-500">flight_land</span>
                    <span className="hidden sm:inline">Término de Vuelo</span>
                  </Link>
                )}
                <Link
                  href="/dashboard/logbook/new"
                  className="hidden sm:flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-3 md:px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  <span className="hidden sm:inline">Nueva Operación</span>
                </Link>
              </div>
            )}

            <Link
              href="/dashboard/settings/profile"
              className="flex items-center gap-3 border-l border-slate-100 pl-3 md:pl-5 group hover:opacity-80 transition-all"
            >
              <div className="hidden md:block text-right">
                <p className="text-xs font-black text-slate-900 leading-none group-hover:text-orange-600 transition-colors">
                  {data.profile?.full_name}
                </p>
                <p className="text-xs font-bold text-orange-500 uppercase mt-0.5">
                  {ROLE_LABELS[data.profile?.role] || data.profile?.role}
                </p>
              </div>
              <div className="size-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                {data.profile?.avatar_url ? (
                  <Image src={data.profile.avatar_url} alt="Avatar" width={40} height={40} className="object-cover w-full h-full" />
                ) : (
                  <span className="material-symbols-outlined text-slate-400 text-xl">person</span>
                )}
              </div>
            </Link>
          </div>
        </header>

        {/* CONTENIDO DE PÁGINA */}
        {/* pb-28 mobile = 7rem ≥ barra inferior (4rem) + safe-area máximo iPhone (2.125rem) + respiro */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 pb-28 lg:pb-10">
          {children}
        </div>
      </main>

      {/* ── BARRA DE NAVEGACIÓN INFERIOR — solo mobile ───────────────────── */}
      {/* safe-area-inset-bottom: padding dinámico para iPhone con home indicator */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[200] bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      >
        <div className="flex items-stretch h-16">

          {/* Inicio */}
          <BottomNavItem href="/dashboard" icon="dashboard" label="Inicio" active={pathname === '/dashboard'} />

          {/* Bitácora — todos los roles la tienen */}
          {filteredLinks.some(l => l.href === '/dashboard/logbook') && (
            <BottomNavItem href="/dashboard/logbook" icon="menu_book" label="Bitácora" active={pathname.startsWith('/dashboard/logbook')} />
          )}

          {/* FAB central: Nueva Operación */}
          {hasPermission(role, 'canFly') && (
            <div className="flex-1 flex items-center justify-center">
              <Link
                href="/dashboard/logbook/new"
                className="size-14 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-orange-500/30 active:scale-95 transition-all -mt-5 border-4 border-white"
                aria-label="Nueva operación"
              >
                <span className="material-symbols-outlined text-2xl">add</span>
                <span className="text-[9px] font-black uppercase leading-none mt-0.5 tracking-tight">Nuevo</span>
              </Link>
            </div>
          )}

          {/* Plan piloto (piloto autónomo): mostrar "Planear" en lugar de Tripulación */}
          {isPilotoPlan && filteredLinks.some(l => l.href === '/dashboard/plan-vuelo') && (
            <BottomNavItem href="/dashboard/plan-vuelo" icon="map" label="Planear" active={pathname.startsWith('/dashboard/plan-vuelo')} />
          )}

          {/* Tripulación — solo planes con organización (no piloto autónomo) */}
          {!isPilotoPlan && filteredLinks.some(l => l.href === '/dashboard/pilots') && (
            <BottomNavItem href="/dashboard/pilots" icon="group" label="Tripulación" active={pathname.startsWith('/dashboard/pilots')} />
          )}

          {/* Flota */}
          {filteredLinks.some(l => l.href === '/dashboard/fleet') && (
            <BottomNavItem href="/dashboard/fleet" icon="precision_manufacturing" label="Flota" active={pathname.startsWith('/dashboard/fleet')} />
          )}

        </div>
      </nav>
    </div>
  );
}

// ── Ítem de la barra de navegación inferior ───────────────────────────────────
function BottomNavItem({ href, icon, label, active }) {
  return (
    <Link
      href={href}
      className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 ${
        active ? 'text-orange-600' : 'text-slate-400'
      }`}
    >
      <span className={`material-symbols-outlined text-2xl leading-none ${active ? 'text-orange-600' : ''}`}>
        {icon}
      </span>
      <span className={`text-xs font-black uppercase tracking-tight leading-none ${active ? 'text-orange-600' : 'text-slate-400'}`}>
        {label}
      </span>
      {/* Indicador activo — requiere `relative` en el padre para posicionarse bien */}
      {active && <span className="absolute bottom-0 h-0.5 w-8 bg-orange-600 rounded-full" />}
    </Link>
  );
}