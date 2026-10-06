'use client';

// Skylog V2.0 — shell de navegación. Réplica visual del sidebar de v1
// (src/app/dashboard/layout.js: navy fijo, grupos contraíbles, menú de
// cuenta, barra inferior móvil) — pedido explícito del usuario: "replicar
// el frontend del main, pero que quede con las tablas de la versión 2.0".
// Solo incluye los módulos que YA existen en V2 hoy (people/accounts/
// memberships/flights/missions/duty/SMS/capacitación/aerocivil/organización)
// — nunca se fabrica un enlace a una página que V2 no ha construido
// todavía. Notificaciones y búsqueda global (v1) se omiten: dependen de
// tablas (`notifications`, etc.) que no existen en esta rama.

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { OnboardingTour } from './_components/OnboardingTour';

const ROLE_LABELS = {
  admin: 'Gerente General',
  superadmin: 'Superadmin',
  jefe_pilotos: 'Jefe de Pilotos',
  gerente_sms: 'Gerente SMS',
  piloto: 'Piloto',
};

// group: solo agrupa visualmente el sidebar (mismos 3 grupos que v1:
// Operación / Flota & Equipo / Documentación). managerOnly: oculta el
// enlace para rol `piloto` — mismo patrón `pilotHidden` de v1
// (dashboard/layout.js), aplicado solo a los 3 módulos cuya página
// completa ya bloquea a un no-gestor con "Solo un gestor puede..."
// (Reportes, Proveedores, Reporte Mensual SMS — verificado en código,
// no supuesto). El resto de módulos son de solo lectura para piloto
// (sin botones de crear/editar) pero SÍ tienen contenido real que
// mostrarle, así que permanecen visibles para todos los roles.
const NAV_LINKS = [
  { name: 'Dashboard', icon: 'dashboard', href: '/inicio', group: 'Operación' },
  { name: 'Centro de Control', icon: 'hub', href: '/operacion/centro-de-control', group: 'Operación' },
  { name: 'Bitácora', icon: 'menu_book', href: '/operacion/bitacora', group: 'Operación' },
  { name: 'Programación', icon: 'event_available', href: '/operacion/programacion', group: 'Operación' },
  { name: 'Meteorología', icon: 'partly_cloudy_day', href: '/operacion/meteorologia', group: 'Operación' },
  { name: 'Tiempo de servicio', icon: 'schedule', href: '/operacion/duty', group: 'Operación' },
  { name: 'Aeronaves', icon: 'flight', href: '/flota', group: 'Flota & Equipo' },
  { name: 'Baterías y Componentes', icon: 'battery_full', href: '/flota/baterias', group: 'Flota & Equipo' },
  { name: 'Tripulación', icon: 'groups', href: '/flota/tripulacion', group: 'Flota & Equipo' },
  { name: 'Mantenimiento', icon: 'build', href: '/flota/mantenimiento', group: 'Flota & Equipo' },
  { name: 'ETA', icon: 'dns', href: '/flota/eta', group: 'Flota & Equipo' },
  // SMS lista cada módulo real como enlace directo en vez de un solo enlace
  // a /sms (hub con tarjetas) — mismo criterio ya aplicado a Operación
  // (ver comentario en `operacion/layout.js`): el sidebar permanente ya
  // resuelve la navegación, una franja de pestañas interna duplicaría el
  // mismo camino. /sms sigue existiendo (como /operacion), solo deja de
  // estar en el sidebar.
  // Gobernanza, MSMS y Capacitación SMS ocultas del sidebar a pedido del
  // usuario (2026-10-01) — mismo criterio que Expediente Aerocivil abajo:
  // la página sigue intacta, solo se quita el enlace. Gobernanza: sin
  // reemplazo directo en el sidebar (política SMS/GSO). MSMS: ya existe
  // "Manuales" (publica ahí, decisión 135/146). Capacitación SMS: ya existe
  // "Capacitación" en Documentación (decisión 149, mismo tipo de duplicidad).
  // { name: 'Gobernanza', icon: 'gavel', href: '/sms/gobernanza', group: 'SMS' },
  { name: 'Objetivos SMS', icon: 'flag', href: '/sms/objetivos', group: 'SMS' },
  { name: 'Evaluación de Riesgo', icon: 'warning', href: '/sms/riesgos', group: 'SMS' },
  { name: 'Indicadores (SPI)', icon: 'monitoring', href: '/sms/indicadores', group: 'SMS' },
  { name: 'Mejora Continua', icon: 'fact_check', href: '/sms/mejora-continua', group: 'SMS' },
  { name: 'Reporte Mensual SMS', icon: 'summarize', href: '/sms/reporte-mensual', group: 'SMS', managerOnly: true },
  // { name: 'MSMS', icon: 'description', href: '/sms/msms', group: 'SMS' },
  { name: 'Reportes y casos', icon: 'report', href: '/sms/reportes', group: 'SMS' },
  // { name: 'Capacitación SMS', icon: 'event_repeat', href: '/sms/capacitacion', group: 'SMS' },
  { name: 'Asistente de implantación', icon: 'checklist', href: '/sms/asistente', group: 'SMS' },
  { name: 'Mapas', icon: 'map', href: '/sms/mapas', group: 'SMS' },
  { name: 'Capacitación', icon: 'school', href: '/capacitacion', group: 'Documentación' },
  { name: 'Listas de Chequeo', icon: 'checklist', href: '/listas-de-chequeo', group: 'Documentación' },
  { name: 'Proveedores', icon: 'storefront', href: '/proveedores', group: 'Documentación', managerOnly: true },
  { name: 'Pólizas', icon: 'verified_user', href: '/polizas', group: 'Documentación', managerOnly: true },
  { name: 'Reportes', icon: 'summarize', href: '/reportes', group: 'Documentación', managerOnly: true },
  { name: 'Manuales', icon: 'library_books', href: '/manuales', group: 'Documentación' },
  // Expediente Aerocivil oculto a pedido del usuario (2026-09-30) — la página
  // /aerocivil sigue intacta, solo se quita el enlace del sidebar.
  // { name: 'Expediente Aerocivil', icon: 'flight_takeoff', href: '/aerocivil', group: 'Documentación' },
];

// SMS sale de Documentación a su propio grupo exclusivo (2026-09-30, a
// pedido del usuario) — es el único módulo normativo con requisitos de
// implantación propios (RAC 219) y 4 submódulos reales (riesgos/
// indicadores/reportes/asistente), suficiente peso para no quedar
// mezclado entre Proveedores/Reportes/Manuales.
const NAV_GROUPS = ['Operación', 'Flota & Equipo', 'SMS', 'Documentación'];

// Un color de acento distinto por grupo — antes todo el sidebar usaba solo
// naranja de marca para el estado activo; variar el color por grupo ayuda a
// escanear visualmente en qué sección se está (pedido del usuario: "agrega
// los nuevos colores para que sea mejor en el UX"). SMS en rojo — mismo
// acento que ya usan sus propias tarjetas internas (riesgos/alertas).
const GROUP_COLORS = {
  Operación: { active: 'bg-primary shadow-primary-900/20', dot: 'bg-primary-400' },
  'Flota & Equipo': { active: 'bg-sky-500 shadow-sky-900/20', dot: 'bg-sky-400' },
  SMS: { active: 'bg-red-500 shadow-red-900/20', dot: 'bg-red-400' },
  Documentación: { active: 'bg-violet-500 shadow-violet-900/20', dot: 'bg-violet-400' },
};

const FOOTER_LINKS = [
  { name: 'Organización', icon: 'apartment', href: '/organizacion' },
  { name: 'Suscripción', icon: 'workspace_premium', href: '/suscripcion' },
  { name: 'Mi Perfil', icon: 'account_circle', href: '/perfil' },
];

const BOTTOM_NAV_LINKS = [
  { name: 'Inicio', icon: 'dashboard', href: '/inicio' },
  { name: 'Bitácora', icon: 'menu_book', href: '/operacion/bitacora' },
  { name: 'SMS', icon: 'health_and_safety', href: '/sms/reportes' },
  { name: 'Ajustes', icon: 'apartment', href: '/organizacion' },
];

export default function V2Layout({ children }) {
  const pathname = usePathname();
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [switchingOrg, setSwitchingOrg] = useState(false);
  const accountMenuRef = useRef(null);
  const orgMenuRef = useRef(null);

  useEffect(() => {
    setSidebarOpen(window.innerWidth >= 1024);
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('bitafly_v2_sidebar_collapsed') || '{}');
      setCollapsedGroups(stored);
    } catch {
      // preferencia inválida — se ignora, todos quedan expandidos
    }
  }, []);

  useEffect(() => {
    fetch('/api/duty/context')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setContext(data);
        setOrganizationId((prev) => prev || data.organizations?.[0]?.id || '');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
    setAccountMenuOpen(false);
    setOrgMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handler(e) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) setAccountMenuOpen(false);
      if (orgMenuRef.current && !orgMenuRef.current.contains(e.target)) setOrgMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function toggleGroup(group) {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [group]: !prev[group] };
      try {
        localStorage.setItem('bitafly_v2_sidebar_collapsed', JSON.stringify(next));
      } catch {
        // no-op
      }
      return next;
    });
  }

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;
  const role = currentOrg?.role;
  const displayRole = ROLE_LABELS[role] || role || '—';
  const initials = (context?.fullName || context?.organizations?.[0]?.name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Cambiar de organización activa — misma UX que v1 (recarga completa a
  // /inicio para que todo el contexto quede consistente con la nueva org).
  async function handleSwitchOrg(orgId) {
    if (switchingOrg || orgId === organizationId) {
      setAccountMenuOpen(false);
      setOrgMenuOpen(false);
      return;
    }
    setSwitchingOrg(true);
    setOrganizationId(orgId);
    setAccountMenuOpen(false);
    setOrgMenuOpen(false);
    setSwitchingOrg(false);
  }

  function handleLogout() {
    supabase.auth.signOut().then(() => {
      window.location.href = '/login';
    });
  }

  return (
    <div className="flex h-screen bg-[#f8f6f6] font-sans overflow-hidden text-left">
      <OnboardingTour />
      {/* ── SIDEBAR ───────────────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 z-[150] w-64 bg-gradient-to-b from-navy via-navy to-[#0f1420] text-white flex flex-col transition-transform duration-300 ease-in-out border-r border-white/5 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Link href="/inicio" className="flex items-center gap-3 px-5 py-4 border-b border-white/5 shrink-0 hover:bg-white/5 transition-colors group">
          {currentOrg?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentOrg.logoUrl}
              alt={currentOrg.name}
              className="size-9 rounded-xl object-contain bg-white shrink-0 shadow-lg shadow-primary-900/30 p-1"
            />
          ) : (
            <div className="size-9 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary-900/30 group-hover:bg-primary-500 transition-colors">
              <span className="material-symbols-outlined text-white text-lg">flight</span>
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-black text-white leading-none tracking-tight">BitaFly</p>
            <p className="text-xs text-primary-300 font-bold mt-0.5 truncate">{currentOrg?.name || 'Mi organización'}</p>
          </div>
        </Link>

        <nav aria-label="Menú lateral" className="flex-1 p-3 space-y-3 mt-2 overflow-y-auto">
          {NAV_GROUPS.map((group) => {
            const groupLinks = NAV_LINKS.filter((l) => l.group === group && (!l.managerOnly || isManager));
            if (!groupLinks.length) return null;
            const isCollapsed = !!collapsedGroups[group];
            const groupColor = GROUP_COLORS[group] || GROUP_COLORS.Operación;
            return (
              <div key={group} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleGroup(group)}
                  aria-expanded={!isCollapsed}
                  className="w-full flex items-center justify-between px-4 pb-1 text-[10px] font-black text-navy-300 uppercase tracking-widest hover:text-navy-100 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${groupColor.dot}`} />
                    {group}
                  </span>
                  <span className="material-symbols-outlined text-sm shrink-0">{isCollapsed ? 'expand_more' : 'expand_less'}</span>
                </button>
                {!isCollapsed &&
                  groupLinks.map((link) => {
                    // Comparación exacta, no por prefijo: con `startsWith`,
                    // "/flota" (Aeronaves) también se marcaría activo en
                    // "/flota/baterias" (Baterías y Componentes) — mismo
                    // problema que ya evitaba el caso especial de "/inicio".
                    const isActive = pathname === link.href;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                          isActive ? `${groupColor.active} text-white shadow-lg` : 'text-navy-300 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg shrink-0">{link.icon}</span>
                        <span className="flex-1 truncate">{link.name}</span>
                      </Link>
                    );
                  })}
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5 bg-black/10 space-y-1 shrink-0">
          <div ref={accountMenuRef} className="relative pt-1">
            {accountMenuOpen && (
              <div className="absolute left-0 right-0 bottom-full mb-2 bg-[#242c3a] border border-white/10 rounded-2xl p-2 shadow-2xl z-30 space-y-0.5">
                {FOOTER_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      pathname === link.href ? 'text-primary-300 bg-white/5' : 'text-navy-200 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base shrink-0">{link.icon}</span>
                    {link.name}
                  </Link>
                ))}
                <div className="h-px bg-white/10 my-1 mx-1" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  Cerrar sesión
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setAccountMenuOpen((v) => !v)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors"
            >
              <div className="size-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0 ring-2 ring-white/10">
                <span className="text-xs font-black text-white">{initials}</span>
              </div>
              <div className="min-w-0 flex-1 text-left">
                <p className="text-xs font-black text-white truncate leading-none">{context?.fullName || 'Mi cuenta'}</p>
                <p className="text-xs font-bold text-navy-300 truncate mt-0.5">{displayRole}</p>
              </div>
              <span className="material-symbols-outlined text-lg text-navy-300 shrink-0">{accountMenuOpen ? 'expand_more' : 'expand_less'}</span>
            </button>
          </div>
        </div>
      </aside>

      {isSidebarOpen && (
        <div
          role="button"
          aria-label="Cerrar menú"
          tabIndex={0}
          className="fixed inset-0 bg-black/60 z-[140] lg:hidden cursor-pointer"
          onClick={() => setSidebarOpen(false)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSidebarOpen(false)}
        />
      )}

      {/* ── CONTENIDO PRINCIPAL ──────────────────────────────────────────── */}
      <main className={`flex-1 flex flex-col overflow-hidden min-h-0 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}`}>
        <header className="h-14 lg:h-16 bg-white border-b border-navy-100 flex items-center justify-between px-3 md:px-6 lg:px-8 shrink-0 sticky top-0 z-[100]">
          <div className="flex items-center gap-2 md:gap-3 overflow-hidden">
            <button
              type="button"
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="size-10 lg:size-11 flex items-center justify-center rounded-xl bg-navy-50 text-navy-500 hover:bg-navy-100 active:scale-95 transition-all shrink-0"
              aria-label="Abrir menú"
            >
              <span className="material-symbols-outlined text-xl leading-none">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
            </button>

            {context?.organizations?.length > 1 ? (
              <div ref={orgMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setOrgMenuOpen((v) => !v)}
                  disabled={switchingOrg}
                  className="flex items-center gap-1.5 text-left truncate rounded-lg px-1.5 -mx-1.5 py-1 hover:bg-navy-50 transition-colors disabled:opacity-60"
                >
                  <div className="truncate">
                    <p className="hidden lg:block text-xs font-black text-navy-300 uppercase leading-none tracking-widest">Organización</p>
                    <h2 className="text-sm font-black text-navy uppercase truncate max-w-[140px] sm:max-w-xs">{currentOrg?.name || 'Individual'}</h2>
                  </div>
                  <span className="material-symbols-outlined text-base text-navy-300 shrink-0">{orgMenuOpen ? 'expand_less' : 'expand_more'}</span>
                </button>
                {orgMenuOpen && (
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white border border-navy-100 rounded-2xl p-2 shadow-2xl z-30 space-y-0.5">
                    <p className="px-3 pt-1 pb-1.5 text-[9.5px] font-black uppercase tracking-widest text-navy-300">Cambiar de organización</p>
                    {context.organizations.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => handleSwitchOrg(o.id)}
                        disabled={switchingOrg}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
                          o.id === organizationId ? 'text-primary-700 bg-primary-50' : 'text-navy-600 hover:bg-navy-50'
                        }`}
                      >
                        <span className="material-symbols-outlined text-base shrink-0">{o.id === organizationId ? 'radio_button_checked' : 'radio_button_unchecked'}</span>
                        <span className="truncate flex-1 text-left">{o.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-left truncate">
                <p className="hidden lg:block text-xs font-black text-navy-300 uppercase leading-none tracking-widest">Organización</p>
                <h2 className="text-sm font-black text-navy uppercase truncate max-w-[140px] sm:max-w-xs">{currentOrg?.name || 'Individual'}</h2>
              </div>
            )}
          </div>

          <Link href="/perfil" className="flex items-center gap-2 md:gap-3 border-l border-navy-100 pl-2 md:pl-3 lg:pl-5 group hover:opacity-80 transition-all">
            <div className="hidden lg:block text-right">
              <p className="text-xs font-black text-navy leading-none group-hover:text-primary-600 transition-colors">{context?.fullName || 'Mi cuenta'}</p>
              <p className="text-xs font-bold text-primary-500 uppercase mt-0.5">{displayRole}</p>
            </div>
            <div className="size-9 lg:size-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-white">{initials}</span>
            </div>
          </Link>
        </header>

        <div
          className="flex-1 overflow-y-auto min-h-0 p-3 md:p-4 lg:p-6 pb-[max(6rem,calc(3rem+env(safe-area-inset-bottom,8px)+1rem))] lg:pb-6"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>
      </main>

      {/* ── BARRA INFERIOR — solo mobile ─────────────────────────────────── */}
      <nav
        aria-label="Navegación principal"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-[200] bg-white border-t border-navy-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 8px)' }}
      >
        <div className="flex items-stretch h-14">
          {BOTTOM_NAV_LINKS.map((l) => (
            <BottomNavItem key={l.href} href={l.href} icon={l.icon} label={l.name} active={l.href === '/inicio' ? pathname === '/inicio' : pathname.startsWith(l.href)} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function BottomNavItem({ href, icon, label, active }) {
  return (
    <Link
      href={href}
      className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-90 ${active ? 'text-primary' : 'text-navy-300'}`}
    >
      <span className="material-symbols-outlined text-xl leading-none">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-tight leading-none">{label}</span>
      {active && <span className="absolute bottom-0 h-0.5 w-8 bg-primary rounded-full" />}
    </Link>
  );
}
