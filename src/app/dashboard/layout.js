"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ROLE_LABELS, PERMISSIONS, hasPermission } from '@/lib/roles';
import { GracePeriodContext } from '@/lib/gracePeriodContext';
import { getOrgPlan } from '@/lib/orgPlan';
import { isPilotoIndependiente } from '@/lib/pilotoIndependiente';
import { PLAN_CONFIG } from '@/lib/planLimits';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/components/NotificationBell';
import GlobalSearch from '@/components/GlobalSearch';
import { docOpenUrl } from '@/lib/docUrl';
import { toast } from '@/lib/toast';
import dynamic from 'next/dynamic';

const InstallAppPrompt = dynamic(() => import('@/components/InstallAppPrompt'), { ssr: false });
const AppUpdateBanner  = dynamic(() => import('@/components/AppUpdateBanner'),  { ssr: false });

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const [data, setData] = useState({ profile: null, org: null });
  const [aircraftCount, setAircraftCount] = useState(null); // null = aún cargando
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [activeFlight, setActiveFlight] = useState(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);
  const [accessExpired, setAccessExpired] = useState(false);
  const [gracePeriod, setGracePeriod]     = useState({ isGracePeriod: false, daysLeft: 0 });
  const [isSocio, setIsSocio]             = useState(false);
  // Organizaciones a las que pertenece la cuenta (Fase 5 multi-organización)
  // — el switcher solo se muestra si hay más de una.
  const [memberships, setMemberships]     = useState([]);
  const [switchingOrg, setSwitchingOrg]   = useState(false);
  const [orgMenuOpen, setOrgMenuOpen]     = useState(false);
  const orgMenuRef = useRef(null);
  // Grupos del sidebar contraídos por el usuario — persiste entre sesiones
  // (localStorage), igual que otras preferencias de UI de la app (ej. autosync DJI).
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const router = useRouter();

  // Sidebar abierto por defecto solo en desktop
  useEffect(() => { setSidebarOpen(window.innerWidth >= 1024); }, []);

  // Cargar preferencia de grupos contraídos (una sola vez, cliente)
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('bitafly_sidebar_collapsed') || '{}');
      setCollapsedGroups(stored);
    } catch { /* preferencia inválida — se ignora, todos quedan expandidos */ }
  }, []);

  const toggleGroup = (group) => {
    setCollapsedGroups(prev => {
      const next = { ...prev, [group]: !prev[group] };
      try { localStorage.setItem('bitafly_sidebar_collapsed', JSON.stringify(next)); } catch { /* no-op */ }
      return next;
    });
  };

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

        // Organizaciones a las que pertenece la cuenta — el switcher del popover
        // de cuenta solo se muestra si hay más de una (Fase 5 multi-organización).
        supabase.from('organization_members')
          .select('organization_id, role, organizations:organization_id(company_name)')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .then(({ data: mems }) => setMemberships(mems || []))
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
    setAccountMenuOpen(false);
  }, [pathname]);

  // Cierra el menú de cuenta al hacer click fuera de él
  useEffect(() => {
    const handler = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) setAccountMenuOpen(false);
      if (orgMenuRef.current && !orgMenuRef.current.contains(e.target)) setOrgMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cambiar la organización activa de la cuenta (Fase 5 multi-organización) —
  // una por cuenta, no por pestaña; recarga completa para que TODO el
  // contexto (RLS, getOrgContext, sidebar) quede consistente con la nueva org.
  const handleSwitchOrg = async (orgId) => {
    if (switchingOrg || orgId === data.profile?.organization_id) { setAccountMenuOpen(false); setOrgMenuOpen(false); return; }
    setSwitchingOrg(true);
    try {
      const res = await fetch('/api/org/switch-active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: orgId }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || 'Error al cambiar de organización');
      window.location.href = '/dashboard';
    } catch (e) {
      console.error('[switch-org]', e.message);
      toast.error(e.message || 'No se pudo cambiar de organización');
      setSwitchingOrg(false);
      setAccountMenuOpen(false);
      setOrgMenuOpen(false);
    }
  };

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
const isPilotoPlan = isPilotoIndependiente({ role, plan });

// Label visible del rol: piloto independiente (admin + plan piloto) → "Piloto Independiente"
const displayRole = (isPilotoPlan && role === 'admin')
  ? 'Piloto Independiente'
  : (ROLE_LABELS[role] || role);

// pilotHidden: true  → se oculta cuando el plan es 'piloto' (sin importar el rol)
// pilotOnly: true    → se muestra SOLO cuando el plan es 'piloto'
// group: solo se usa para agrupar visualmente el <nav> del sidebar (ver NAV_GROUPS).
// No participa en el filtrado por rol/plan — eso lo sigue haciendo filteredLinks abajo.
const navLinks = [
  { name: 'Dashboard',      icon: 'dashboard',               href: '/dashboard',                 group: 'Operación', roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  { name: 'Bitácora',       icon: 'menu_book',               href: '/dashboard/logbook',         group: 'Operación', roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  { name: 'Planear Vuelo',  icon: 'map',                     href: '/dashboard/plan-vuelo',      group: 'Operación', roles: ['superadmin', 'admin', 'jefe_pilotos', 'piloto'], pilotOnly: true },
  // Piloto dentro de una org: también puede planear vuelos (notifica al Jefe de Pilotos al guardar)
  { name: 'Planear Vuelo',  icon: 'map',                     href: '/dashboard/plan-vuelo',      group: 'Operación', roles: ['piloto'],                                         pilotHidden: true },
  // Programación Activa vive dentro de Programación ("Ver programación activa") — mismos roles, sin entrada propia en el sidebar.
  { name: 'Programación',   icon: 'event_available',         href: '/dashboard/authorizations',  group: 'Operación', roles: ['superadmin', 'admin', 'jefe_pilotos'],            pilotHidden: true },
  // Vista del piloto: solo sus misiones asignadas (solo-lectura, con KMZ/PDF)
  { name: 'Mis Vuelos',     icon: 'flight_takeoff',          href: '/dashboard/mis-vuelos',      group: 'Operación', roles: ['piloto'],                                         pilotHidden: true },
  { name: 'Meteorología',   icon: 'partly_cloudy_day',       href: '/dashboard/weather',         group: 'Operación', roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  { name: 'Flota',          icon: 'precision_manufacturing', href: '/dashboard/fleet',           group: 'Flota & Equipo', roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  { name: 'Baterías',       icon: 'battery_charging_full',   href: '/dashboard/batteries',       group: 'Flota & Equipo', roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  { name: 'Mantenimiento',  icon: 'build',                   href: '/dashboard/maintenance',     group: 'Flota & Equipo', roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  // Inventario de Operación: existencias de equipo + checklist de verificación
  // pre-misión. Vive aquí (no en Cumplimiento) porque ahora es también un
  // catálogo de equipo real, igual que Flota/Baterías/Mantenimiento. La edición
  // del checklist sigue en su propia página (gate propio, incluye jefe_pilotos) —
  // Protocolos solo tiene una tarjeta/enlace hacia acá (ver FormSettingsClient.js).
  { name: 'Inventario',     icon: 'inventory_2',             href: '/dashboard/inventory-checklist', group: 'Flota & Equipo', roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  // Mantenimiento Menor NO tiene entrada propia: su checklist se edita en
  // Protocolos y se diligencia dentro de /dashboard/maintenance (ver CLAUDE.md).
  { name: 'Tripulación',    icon: 'group',                   href: '/dashboard/pilots',          group: 'Flota & Equipo', roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'], pilotHidden: true },
  // Nombre alineado con el título real de la página (PageHero "Seguridad SMS" desde el rediseño de hub con tabs).
  { name: 'Seguridad SMS',  icon: 'health_and_safety',       href: '/dashboard/safety',          group: 'Documentación', roles: ['superadmin', 'admin', 'gerente_sms'],                    pilotHidden: true },
  // SORA ya está como tarjeta dentro de Seguridad SMS para quien ve esa página
  // (superadmin/admin org/gerente_sms). jefe_pilotos y piloto (org) no tienen esa página en
  // su nav, y el piloto independiente la tiene oculta (pilotHidden) — ambos necesitan entrada directa.
  { name: 'SORA',           icon: 'radar',                   href: '/dashboard/sora',            group: 'Documentación', roles: ['jefe_pilotos', 'piloto'] },
  { name: 'SORA',           icon: 'radar',                   href: '/dashboard/sora',            group: 'Documentación', roles: ['admin'],                                          pilotOnly: true },
  { name: 'Auditoría',      icon: 'fact_check',              href: '/dashboard/audit',           group: 'Documentación', roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'],   pilotHidden: true },
  { name: 'Reportes',       icon: 'assessment',              href: '/dashboard/reports',         group: 'Documentación', roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'],   pilotHidden: true },
  { name: 'Protocolos',     icon: 'rule',                    href: '/dashboard/settings/forms',  group: 'Documentación', roles: ['superadmin', 'admin', 'gerente_sms'] },
  // Proveedores: listado + checklist de auditoría (mismo split de permisos que
  // Manuales/Capacitación, ver canManageSuppliers en roles.js).
  { name: 'Proveedores',    icon: 'store',                   href: '/dashboard/suppliers',        group: 'Documentación', roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'] },
  // Capacitación: programas (Operaciones/Mantenimiento) + evaluaciones internas por
  // tripulante. Gestión GG+GSMS+JP (canManageTraining); visible a todos porque cualquiera
  // puede consultar el programa vigente (canViewTraining, incluye piloto).
  { name: 'Capacitación',   icon: 'school',                  href: '/dashboard/training',         group: 'Documentación', roles: ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos', 'piloto'] },
  // Manuales de la empresa: ahora se accede desde dentro de Protocolos (Listas de Chequeo,
  // "Ver manuales") para superadmin/admin/gerente_sms — misma página que ya veían.
  // jefe_pilotos y piloto (org) no tienen Protocolos en su nav, así que conservan entrada directa.
  // El piloto independiente sigue sin acceso (Manuales aplica solo a organizaciones).
  { name: 'Manuales',       icon: 'library_books',           href: '/dashboard/manuales',        group: 'Documentación', roles: ['jefe_pilotos', 'piloto'] },
];

// Orden de renderizado de los grupos del sidebar (solo presentación).
const NAV_GROUPS = ['Operación', 'Flota & Equipo', 'Documentación'];

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

        {/* NAV PRINCIPAL — agrupado en secciones (Operación / Flota & Equipo / Documentación).
            El agrupamiento es solo visual: filteredLinks ya trae la lista final por
            rol/plan/período de gracia, aquí solo se reparte por link.group. Cada grupo
            se puede contraer/expandir (preferencia en localStorage). */}
        <nav aria-label="Menú lateral" className="flex-1 p-3 space-y-3 mt-2 overflow-y-auto custom-scrollbar">
          {NAV_GROUPS.map(group => {
            const groupLinks = filteredLinks.filter(link => link.group === group);
            if (!groupLinks.length) return null;
            const isCollapsed = !!collapsedGroups[group];
            return (
              <div key={group} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(group)}
                  aria-expanded={!isCollapsed}
                  className="w-full flex items-center justify-between px-4 pb-1 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                >
                  <span>{group}</span>
                  <span className="material-symbols-outlined text-sm shrink-0">
                    {isCollapsed ? 'expand_more' : 'expand_less'}
                  </span>
                </button>
                {!isCollapsed && groupLinks.map(link => (
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
              </div>
            );
          })}
        </nav>

        {/* PIE DE SIDEBAR */}
        {/* pb-20 lg:pb-3 → en mobile la barra inferior (h-16) tapa este bloque; el padding extra lo empuja arriba */}
        <div className="p-3 pb-16 lg:pb-3 border-t border-white/5 bg-black/10 space-y-1 shrink-0">
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

          {/* WIDGET DE PLAN — mismo dueño de la suscripción que ya ve el link "Suscripción"
              en el menú de cuenta; oculto para Enterprise (no hay a qué mejorar). */}
          {footerLinks.some(l => l.href === '/dashboard/subscription') && plan !== 'enterprise' && (
            <Link
              href="/dashboard/subscription"
              className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl border-b border-white/10 hover:bg-white/5 transition-all group"
            >
              <div className="min-w-0">
                <p className="text-xs font-black text-slate-500 uppercase tracking-tight leading-none">
                  {PLAN_CONFIG[plan]?.name || 'Plan Piloto'}
                </p>
              </div>
              <span className="text-xs font-black text-orange-400 uppercase tracking-wide shrink-0 group-hover:text-orange-300">
                Mejorar
              </span>
            </Link>
          )}

          {/* MENÚ DE CUENTA — avatar + nombre + rol, click abre popup con
              Perfil/Organización/Suscripción (footerLinks) + Cerrar sesión.
              Un solo punto de entrada, en vez de 3 elementos sueltos. */}
          <div ref={accountMenuRef} className="relative pt-2">
            {accountMenuOpen && (
              <div className="absolute left-0 right-0 bottom-full mb-2 bg-[#242c3a] border border-white/10 rounded-2xl p-2 shadow-2xl z-30 space-y-0.5">
                {footerLinks.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      pathname === link.href ? 'text-orange-400 bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base shrink-0">{link.icon}</span>
                    {link.name}
                  </Link>
                ))}

                {/* Switcher de organizaciones (Fase 5 multi-organización) —
                    solo aparece si la cuenta tiene más de una. */}
                {memberships.length > 1 && (
                  <>
                    <div className="h-px bg-white/10 my-1 mx-1" />
                    <p className="px-3 pt-1 pb-0.5 text-[9.5px] font-black uppercase tracking-widest text-slate-500">Organizaciones</p>
                    {memberships.map(m => (
                      <button
                        key={m.organization_id}
                        onClick={() => handleSwitchOrg(m.organization_id)}
                        disabled={switchingOrg}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                          m.organization_id === data.profile?.organization_id ? 'text-orange-400 bg-white/5' : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base shrink-0">
                          {m.organization_id === data.profile?.organization_id ? 'radio_button_checked' : 'radio_button_unchecked'}
                        </span>
                        <span className="truncate flex-1 text-left">{m.organizations?.company_name || 'Organización'}</span>
                      </button>
                    ))}
                  </>
                )}

                <div className="h-px bg-white/10 my-1 mx-1" />
                <button
                  onClick={() => supabase.auth.signOut().then(() => (window.location.href = '/login'))}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  Cerrar sesión
                </button>
              </div>
            )}
            <button
              onClick={() => setAccountMenuOpen(v => !v)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="size-9 rounded-full bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {data.profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={docOpenUrl(data.profile.avatar_url)} alt="Avatar" className="object-cover w-full h-full" />
                ) : (
                  <span className="text-xs font-black text-white">
                    {(data.profile?.full_name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-black text-white truncate leading-none">
                  {data.profile?.full_name || 'Mi cuenta'}
                </p>
                <p className="text-xs font-bold text-slate-500 truncate mt-0.5">
                  {displayRole}
                </p>
              </div>
              <span className="material-symbols-outlined text-lg text-slate-500 shrink-0">
                {accountMenuOpen ? 'expand_more' : 'expand_less'}
              </span>
            </button>
          </div>
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
            {/* Nombre de la organización — si la cuenta pertenece a más de una,
                este bloque se vuelve el switcher principal (pedido explícito
                del usuario: cambiar de organización desde "la parte superior,
                donde aparece el nombre de la organización"). Cuenta de una
                sola org: mismo texto estático de siempre, sin cambio visual. */}
            {memberships.length > 1 ? (
              <div ref={orgMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setOrgMenuOpen(v => !v)}
                  disabled={switchingOrg}
                  className="flex items-center gap-1.5 text-left truncate rounded-lg px-1.5 -mx-1.5 py-1 hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  <div className="truncate">
                    <p className="hidden lg:block text-xs font-black text-slate-400 uppercase leading-none tracking-widest">Organización</p>
                    <h2 className="text-xs md:text-sm font-black text-slate-900 uppercase truncate max-w-[120px] sm:max-w-xs md:max-w-none">
                      {data.org?.company_name || 'Individual'}
                    </h2>
                  </div>
                  <span className="material-symbols-outlined text-base text-slate-400 shrink-0">
                    {orgMenuOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
                {orgMenuOpen && (
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-2xl p-2 shadow-2xl z-30 space-y-0.5">
                    <p className="px-3 pt-1 pb-1.5 text-[9.5px] font-black uppercase tracking-widest text-slate-400">Cambiar de organización</p>
                    {memberships.map(m => (
                      <button
                        key={m.organization_id}
                        onClick={() => handleSwitchOrg(m.organization_id)}
                        disabled={switchingOrg}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                          m.organization_id === data.profile?.organization_id ? 'text-orange-600 bg-orange-50' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base shrink-0">
                          {m.organization_id === data.profile?.organization_id ? 'radio_button_checked' : 'radio_button_unchecked'}
                        </span>
                        <span className="truncate flex-1 text-left">{m.organizations?.company_name || 'Organización'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-left truncate">
                <p className="hidden lg:block text-xs font-black text-slate-400 uppercase leading-none tracking-widest">Organización</p>
                <h2 className="text-xs md:text-sm font-black text-slate-900 uppercase truncate max-w-[120px] sm:max-w-xs md:max-w-none">
                  {data.org?.company_name || 'Individual'}
                </h2>
              </div>
            )}
            {/* Estado operativo — decorativo por ahora (sin fuente de datos de estado
                de operación); confirma visualmente que el sistema está activo. */}
            <div className="hidden md:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-full pl-2 pr-3 py-1 shrink-0">
              <span className="relative flex size-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" />
              </span>
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wide whitespace-nowrap">Operación normal</span>
            </div>
          </div>

          {/* CENTRO: búsqueda global (Fase 5.e) — endpoint /api/search acotado a la org */}
          <GlobalSearch />

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
        {/* Padding inferior extra SOLO hasta el breakpoint lg (barra de navegación inferior
            es lg:hidden) — 7rem ≥ barra inferior (4rem) + safe-area máximo iPhone (2.125rem) +
            respiro. En desktop (lg+) no hay barra inferior, así que no debe reservarse ese
            espacio: antes se aplicaba siempre vía inline style, sumando scroll innecesario. */}
        {/* id="main-content" — destino del skip link de accesibilidad */}
        <div
          id="main-content"
          className="flex-1 overflow-y-auto min-h-0 p-3 md:p-4 lg:p-6 pb-[max(6rem,calc(3rem+env(safe-area-inset-bottom,8px)+1rem))] lg:pb-6"
          style={{ WebkitOverflowScrolling: 'touch' }}
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

      {/* OTA updates: banner/modal de nueva versión del APK (solo Capacitor Android) */}
      <AppUpdateBanner />

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