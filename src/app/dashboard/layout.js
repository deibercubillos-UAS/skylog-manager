"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ROLE_LABELS, PERMISSIONS, hasPermission } from '@/lib/roles';
import { GracePeriodContext } from '@/lib/gracePeriodContext';
import { getOrgPlan } from '@/lib/orgPlan';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/components/NotificationBell';
import { docOpenUrl } from '@/lib/docUrl';
import dynamic from 'next/dynamic';

const InstallAppPrompt = dynamic(() => import('@/components/InstallAppPrompt'), { ssr: false });

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [data, setData] = useState({ profile: null, org: null });
  const [aircraftCount, setAircraftCount] = useState(null); // null = aún cargando
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeFlight, setActiveFlight] = useState(null);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [accessExpired, setAccessExpired] = useState(false);
  const [gracePeriod, setGracePeriod]     = useState({ isGracePeriod: false, daysLeft: 0 });
  const [isSocio, setIsSocio]             = useState(false);
  const router = useRouter();

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

        // ── Verificar período de gracia / acceso expirado ───────────────────
        // Solo aplica a usuarios con cuenta en una org ajena (no pilotos independientes).
        if (prof.subscription_plan !== 'piloto' && prof.organization_id) {
          const { data: deactivatedPilot } = await supabase
            .from('pilots')
            .select('deactivated_at')
            .eq('organization_id', prof.organization_id)
            .eq('owner_id', user.id)
            .eq('is_active', false)
            .not('deactivated_at', 'is', null)
            .maybeSingle();

          if (deactivatedPilot?.deactivated_at) {
            const deactivatedMs = new Date(deactivatedPilot.deactivated_at).getTime();
            const elapsedDays   = (Date.now() - deactivatedMs) / (1000 * 60 * 60 * 24);

            if (elapsedDays >= 30) {
              // Acceso completamente expirado
              setAccessExpired(true);
              setLoading(false);
              return;
            } else {
              // Período de gracia: solo Dashboard + Bitácora, sin acciones
              const daysLeft = Math.ceil(30 - elapsedDays);
              setGracePeriod({ isGracePeriod: true, daysLeft });
            }
          }
        }

        // Cargar organización EN PARALELO con el primer vuelo activo, count de
        // aeronaves y el plan efectivo de la org.
        // ⚠️ organizations NO tiene columna subscription_plan — seleccionarla
        // hacía fallar TODA la consulta (error 42703) y dejaba org=null
        // (nombre/NIT/logo no cargaban). El plan se deriva del perfil del admin.
        const [orgRes, flightRes, acCountRes, orgPlan] = await Promise.all([
          supabase
            .from('organizations')
            .select('id,company_name,unique_code,tax_id,logo_url')
            .eq('id', prof.organization_id)
            .single(),
          supabase
            .from('flights')
            .select('id')
            .eq('organization_id', prof.organization_id)
            .is('landing_time', null)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('aircraft')
            .select('id', { count: 'exact', head: true })
            .eq('organization_id', prof.organization_id),
          getOrgPlan(supabase, prof.organization_id, prof.subscription_plan || 'piloto'),
        ]);

        setData({ profile: prof, org: orgRes.data, orgPlan });
        setAircraftCount(acCountRes.count ?? 0);
        setActiveFlight(flightRes.data);

        // ¿El usuario es miembro de un socio (escuela/asesor)? → mostrar acceso al panel
        supabase.from('partner_members').select('id').eq('profile_id', user.id).limit(1)
          .then(({ data: pm }) => setIsSocio(!!pm?.length))
          .catch(() => {});

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

  // EFECTO 3: Redirigir a /dashboard si intenta navegar fuera de las rutas permitidas en período de gracia
  useEffect(() => {
    if (!gracePeriod.isGracePeriod) return;
    const allowed = ['/dashboard', '/dashboard/logbook'];
    const isAllowed = allowed.some(r => pathname === r || pathname.startsWith(r + '/'));
    // Excepción: /dashboard/logbook/new está bloqueado (no puede crear vuelos)
    const isBlocked = pathname.startsWith('/dashboard/logbook/new');
    if (!isAllowed || isBlocked) {
      router.replace('/dashboard');
    }
  }, [pathname, gracePeriod.isGracePeriod, router]);

  // Cierra el menú automáticamente al navegar en móviles
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#1A202C] text-white font-black animate-pulse">CARGANDO BITAFLY...</div>;

  if (accessExpired) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f8fa] px-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-10 text-center space-y-6">
        <div className="size-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-4xl text-slate-400">lock</span>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Acceso expirado</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Han pasado más de 30 días desde que fuiste dado de baja de tu organización.
            Tu historial de vuelos permanece seguro en la organización, pero ya no puedes acceder a él desde esta cuenta.
          </p>
        </div>
        <div className="border-t border-slate-100" />
        <div className="space-y-3">
          <p className="text-sm font-black text-slate-700 uppercase tracking-widest">¿Quieres seguir volando?</p>
          <p className="text-sm text-slate-500 leading-relaxed">
            Crea tu cuenta de <strong>Piloto Independiente</strong> — es gratuita. Tendrás tu propia bitácora,
            flota y planeaciones de vuelo desde el primer día.
          </p>
          <ul className="text-left space-y-2 pt-1">
            {['1 aeronave registrada','Hasta 3 baterías y 3 payloads','Bitácora de vuelos propia',
              'Mantenimiento de aeronaves','Replay GPS de tus últimos 10 vuelos'].map(item => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                <span className="material-symbols-outlined text-sm text-emerald-500 shrink-0">check_circle</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <a href="/registro?tipo=solo"
           className="block w-full py-4 bg-[#ec5b13] text-white text-sm font-black uppercase tracking-widest rounded-2xl hover:bg-orange-600 transition-all text-center">
          Crear mi cuenta gratuita
        </a>
        <button
          onClick={async () => { const { supabase: sb } = await import('@/lib/supabase'); await sb.auth.signOut(); window.location.href = '/login'; }}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline">
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  const role = data.profile?.role;

// Plan efectivo de la org (derivado del perfil del admin); fallback al del propio perfil
const plan = data.orgPlan || data.profile?.subscription_plan || 'piloto';
const isPaidPlan  = !['piloto', null, undefined, ''].includes(plan);
// Piloto autónomo = dueño de su propia org (role 'admin') en plan piloto.
// Los miembros de una org (piloto/jefe/gsms) tienen profile.subscription_plan='piloto'
// pero NO son autónomos — no deben heredar la navegación del piloto independiente.
const isPilotoPlan = plan === 'piloto' && role === 'admin';

// Label visible del rol: piloto independiente (admin + plan piloto) → "Piloto Independiente"
const displayRole = (isPilotoPlan && role === 'admin')
  ? 'Piloto Independiente'
  : (ROLE_LABELS[role] || role);

// pilotHidden: true  → se oculta cuando el plan es 'piloto' (sin importar el rol)
// pilotOnly: true    → se muestra SOLO cuando el plan es 'piloto'
const navLinks = [
  { name: 'Dashboard',      icon: 'dashboard',               href: '/dashboard',                 roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  { name: 'Mi Flota',       icon: 'precision_manufacturing', href: '/dashboard/fleet',           roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  { name: 'Tripulación',    icon: 'group',                   href: '/dashboard/pilots',          roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'], pilotHidden: true },
  { name: 'Mantenimiento',  icon: 'build',                   href: '/dashboard/maintenance',     roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  { name: 'Planear Vuelo',  icon: 'map',                     href: '/dashboard/plan-vuelo',      roles: ['superadmin', 'admin', 'jefe_pilotos', 'piloto'], pilotOnly: true },
  // Piloto dentro de una org: también puede planear vuelos (notifica al Jefe de Pilotos al guardar)
  { name: 'Planear Vuelo',  icon: 'map',                     href: '/dashboard/plan-vuelo',      roles: ['piloto'],                                         pilotHidden: true },
  { name: 'Programación',   icon: 'event_available',         href: '/dashboard/authorizations',  roles: ['superadmin', 'admin', 'jefe_pilotos'],            pilotHidden: true },
  { name: 'Programación Activa', icon: 'flight_takeoff',     href: '/dashboard/programacion-activa', roles: ['superadmin', 'admin', 'jefe_pilotos'],      pilotHidden: true },
  // Vista del piloto: solo sus misiones asignadas (solo-lectura, con KMZ/PDF)
  { name: 'Mis Vuelos',     icon: 'flight_takeoff',          href: '/dashboard/mis-vuelos',      roles: ['piloto'],                                         pilotHidden: true },
  { name: 'Bitácora',       icon: 'menu_book',               href: '/dashboard/logbook',         roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  { name: 'Reportes',       icon: 'assessment',              href: '/dashboard/reports',         roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'],   pilotHidden: true },
  { name: 'Seguridad Operacional', icon: 'health_and_safety', href: '/dashboard/safety',          roles: ['superadmin', 'admin', 'gerente_sms'],                    pilotHidden: true },
  { name: 'SORA',           icon: 'radar',                   href: '/dashboard/sora',            roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  { name: 'Auditoría',      icon: 'fact_check',              href: '/dashboard/audit',           roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'],   pilotHidden: true },
  { name: 'Listas de Chequeo', icon: 'rule',                 href: '/dashboard/settings/forms',  roles: ['superadmin', 'admin', 'gerente_sms'] },
  // Manuales de la empresa: lectura para todos; gestión solo GG/GSMS/JP (gated en la página).
  // pilotHidden: aplica a organizaciones, no al piloto independiente.
  { name: 'Manuales',       icon: 'library_books',           href: '/dashboard/manuales',        roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'], pilotHidden: true },
];

// FILTRAR por rol, plan y flags pilotOnly / pilotHidden
// En período de gracia: solo Dashboard y Bitácora
const GRACE_ALLOWED_HREFS = ['/dashboard', '/dashboard/logbook'];
const filteredLinks = navLinks.filter(link => {
  if (gracePeriod.isGracePeriod) return GRACE_ALLOWED_HREFS.includes(link.href);
  return (
    link.roles.includes(role) &&
    (!link.paidOnly     || isPaidPlan) &&
    (!link.pilotHidden  || !isPilotoPlan) &&
    (!link.pilotOnly    || isPilotoPlan)
  );
});

const footerLinksAll = [
    { name: 'Configurar Organización', icon: 'settings',        href: '/dashboard/settings',          roles: ['superadmin', 'admin'] },
    { name: 'Gestión de Usuarios',     icon: 'groups',          href: '/dashboard/users',             roles: ['superadmin', 'admin'], paidOnly: true },
    { name: 'Mi Perfil',               icon: 'account_circle',  href: '/dashboard/settings/profile',  roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
    // Solo el dueño de la cuenta gestiona la suscripción (admin = Gerente General
    // o Piloto Independiente). Los tripulantes de una org (piloto/jefe/gsms) no la ven.
    { name: 'Suscripción',             icon: 'payments',        href: '/dashboard/subscription', roles: ['superadmin', 'admin'] },
];
const footerLinks = footerLinksAll.filter(link =>
  link.roles.includes(role) &&
  (!link.paidOnly    || isPaidPlan) &&
  (!link.pilotHidden || !isPilotoPlan)
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

      {/* Skip to main content — accesibilidad teclado */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-orange-600 focus:text-white focus:font-black focus:text-xs focus:uppercase focus:rounded-xl focus:shadow-lg"
      >
        Ir al contenido principal
      </a>

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
              {plan || 'piloto'}
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
        <nav aria-label="Menú lateral" className="flex-1 p-3 space-y-0.5 mt-2 overflow-y-auto custom-scrollbar">
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
              <span className="flex-1 truncate">{link.name}</span>
              {link.devBadge && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 uppercase tracking-wide shrink-0">DEV</span>
              )}
            </Link>
          ))}
        </nav>

        {/* PIE DE SIDEBAR */}
        {/* pb-20 lg:pb-3 → en mobile la barra inferior (h-16) tapa este bloque; el padding extra lo empuja arriba */}
        <div className="p-3 pb-16 lg:pb-3 border-t border-white/5 bg-black/10 space-y-1 shrink-0">
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
          role="button"
          aria-label="Cerrar menú"
          tabIndex={0}
          className="fixed inset-0 bg-black/60 z-[140] lg:hidden cursor-pointer"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && setSidebarOpen(false)}
        />
      )}

      {/* ── CONTENIDO PRINCIPAL ──────────────────────────────────────────── */}
      <main className={`flex-1 flex flex-col overflow-hidden min-h-0 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>

        {/* HEADER — h-12 en RC Plus (md), h-16 en desktop (lg) */}
        <header className="h-12 md:h-14 lg:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 md:px-6 lg:px-8 shrink-0 sticky top-0 z-[100]">

          {/* IZQUIERDA: hamburguesa + empresa */}
          <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
            <button
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="size-9 md:size-10 lg:size-11 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all shrink-0"
              aria-label="Abrir menú"
            >
              <span className="material-symbols-outlined text-lg md:text-xl leading-none">
                {isSidebarOpen ? 'menu_open' : 'menu'}
              </span>
            </button>
            <div className="text-left truncate">
              <p className="hidden lg:block text-xs font-black text-slate-400 uppercase leading-none tracking-widest">Organización</p>
              <h2 className="text-xs md:text-sm font-black text-slate-900 uppercase truncate max-w-[120px] sm:max-w-xs md:max-w-none">
                {data.org?.company_name || 'Individual'}
              </h2>
            </div>
          </div>

          {/* DERECHA: acciones + perfil */}
          <div className="flex items-center gap-1.5 md:gap-3 lg:gap-4">
            {hasPermission(role, 'canFly') && (
              <div className="flex items-center gap-1.5 md:gap-2">
                {activeFlight && (
                  <Link
                    href={`/dashboard/logbook/finalize?id=${activeFlight.id}`}
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-2.5 md:px-4 lg:px-5 py-2 md:py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg border border-white/10 transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm md:text-base text-orange-500">flight_land</span>
                    <span className="hidden sm:inline">Término de Vuelo</span>
                  </Link>
                )}
                <Link
                  href="/dashboard/logbook/new"
                  className="hidden sm:flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-2.5 md:px-4 lg:px-5 py-2 md:py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 transition-all active:scale-95"
                >
                  <span className="material-symbols-outlined text-sm md:text-base">add_circle</span>
                  <span className="hidden sm:inline">Nueva Operación</span>
                </Link>
              </div>
            )}

            {isSocio && (
              <Link
                href="/socio"
                title="Panel de socio"
                className="flex items-center gap-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 px-2.5 md:px-3 lg:px-4 py-2 md:py-2.5 rounded-xl font-black text-xs uppercase tracking-wider border border-orange-200 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm md:text-base">handshake</span>
                <span className="hidden lg:inline">Panel Socio</span>
              </Link>
            )}

            <NotificationBell canAnnounce={hasPermission(role, 'canSendAnnouncements')} />

            <Link
              href="/dashboard/settings/profile"
              className="flex items-center gap-2 md:gap-3 border-l border-slate-100 pl-2 md:pl-3 lg:pl-5 group hover:opacity-80 transition-all"
            >
              <div className="hidden lg:block text-right">
                <p className="text-xs font-black text-slate-900 leading-none group-hover:text-orange-600 transition-colors">
                  {data.profile?.full_name}
                </p>
                <p className="text-xs font-bold text-orange-500 uppercase mt-0.5">
                  {displayRole}
                </p>
              </div>
              <div className="size-8 md:size-9 lg:size-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                {data.profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={docOpenUrl(data.profile.avatar_url)} alt="Avatar" width={40} height={40} className="object-cover w-full h-full" />
                ) : (
                  <span className="material-symbols-outlined text-slate-400 text-lg md:text-xl">person</span>
                )}
              </div>
            </Link>
          </div>
        </header>

        {/* CONTENIDO DE PÁGINA */}
        {/* pb-28 mobile = 7rem ≥ barra inferior (4rem) + safe-area máximo iPhone (2.125rem) + respiro */}
        {/* id="main-content" — destino del skip link de accesibilidad */}
        <div
          id="main-content"
          className="flex-1 overflow-y-auto min-h-0 p-3 md:p-4 lg:p-10 lg:pb-10"
          style={{ WebkitOverflowScrolling: 'touch', paddingBottom: 'max(6rem, calc(3rem + env(safe-area-inset-bottom, 8px) + 1rem))' }}
        >
          {/* Banner período de gracia */}
          {gracePeriod.isGracePeriod && (
            <div className="mb-6 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
              <span className="material-symbols-outlined text-amber-500 text-xl shrink-0 mt-0.5">schedule</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-amber-800">
                  Acceso de solo lectura — {gracePeriod.daysLeft} día{gracePeriod.daysLeft !== 1 ? 's' : ''} restante{gracePeriod.daysLeft !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                  Fuiste dado de baja de tu organización. Solo puedes ver el Dashboard y la Bitácora.
                  Crea una cuenta de Piloto Independiente para seguir registrando tus vuelos.
                </p>
              </div>
              <a href="/registro?tipo=solo"
                 className="shrink-0 px-3 py-1.5 bg-amber-500 text-white text-xs font-black uppercase tracking-wide rounded-xl hover:bg-amber-600 transition-colors whitespace-nowrap">
                Crear cuenta
              </a>
            </div>
          )}
          <GracePeriodContext.Provider value={gracePeriod}>
            {children}
          </GracePeriodContext.Provider>
        </div>
      </main>

      {/* Banner de instalación PWA (Android/escritorio: botón; iOS: instrucciones) */}
      <InstallAppPrompt />

      {/* ── BARRA DE NAVEGACIÓN INFERIOR — solo mobile ───────────────────── */}
      {/* safe-area-inset-bottom: padding dinámico para iPhone con home indicator */}
      <nav
        aria-label="Navegación principal"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[200] bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      >
        <div className="flex items-stretch h-12 md:h-14 lg:h-16">

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
                className="size-11 md:size-12 lg:size-14 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl flex flex-col items-center justify-center shadow-lg shadow-orange-500/30 active:scale-95 transition-all -mt-3 md:-mt-4 lg:-mt-5 border-4 border-white"
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
      <span className={`material-symbols-outlined text-xl md:text-2xl leading-none ${active ? 'text-orange-600' : ''}`}>
        {icon}
      </span>
      <span className={`text-[10px] md:text-xs font-black uppercase tracking-tight leading-none ${active ? 'text-orange-600' : 'text-slate-400'}`}>
        {label}
      </span>
      {/* Indicador activo — requiere `relative` en el padre para posicionarse bien */}
      {active && <span className="absolute bottom-0 h-0.5 w-8 bg-orange-600 rounded-full" />}
    </Link>
  );
}