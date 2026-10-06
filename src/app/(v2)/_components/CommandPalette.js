'use client';

// Skylog V2.0 — paleta de comandos (⌘K / Ctrl+K, o el botón de lupa del encabezado, que es lo único que hay en un
// celular). Tres tipos de resultado: páginas a las que puede ir este rol, acciones frecuentes (que llevan a la
// pantalla donde se hacen) y datos de la organización (aeronaves, misiones próximas, personas). Los datos se
// piden una sola vez, al abrir, con los mismos endpoints que ya usan esas pantallas — nada nuevo en el servidor.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { rankItems } from '@skylog/domain';

const ACTIONS = [
  { id: 'a-dispatch', title: 'Despachar un vuelo', subtitle: 'Verificaciones, listas de chequeo y riesgos', href: '/operacion/despacho', icon: 'rocket_launch', keywords: 'iniciar volar misión' },
  { id: 'a-mission', title: 'Programar una misión', subtitle: 'Piloto, aeronave, zona y fecha', href: '/operacion/programacion', icon: 'event_available', keywords: 'agendar planear nueva', managerOnly: true },
  { id: 'a-flight', title: 'Registrar un vuelo en la bitácora', href: '/operacion/bitacora', icon: 'menu_book', keywords: 'cargar manual importar log dji' },
  { id: 'a-report', title: 'Reportar un suceso', subtitle: 'VOR o MOR', href: '/sms/reportes', icon: 'report', keywords: 'incidente accidente novedad' },
  { id: 'a-maint', title: 'Registrar un mantenimiento', href: '/flota/mantenimiento', icon: 'build', keywords: 'evento servicio reparación' },
  { id: 'a-duty', title: 'Ver mi tiempo de servicio', subtitle: 'Límites de §100.540', href: '/operacion/duty', icon: 'schedule', keywords: 'horas descanso jornada' },
  { id: 'a-change', title: 'Registrar un cambio (gestión del cambio)', href: '/sms/cambios', icon: 'published_with_changes', keywords: 'nuevo cambio sms', managerOnly: true },
  { id: 'a-policy', title: 'Agregar una póliza', href: '/polizas', icon: 'verified_user', keywords: 'seguro rce', managerOnly: true },
  { id: 'a-aerocivil', title: 'Preparar una solicitud de autorización', subtitle: 'Expediente Aerocivil', href: '/aerocivil', icon: 'flight_takeoff', keywords: 'radicar aerocivil expediente', managerOnly: true },
];

const GROUP_LABEL = { actions: 'Acciones', pages: 'Ir a', data: 'Datos' };

function iso(d) {
  return d.toISOString();
}

export default function CommandPalette({ open, onClose, links, organizationId, isManager }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [data, setData] = useState({ aircraft: [], members: [], missions: [], loadedFor: null });

  // Datos de la organización: una vez por apertura/organización.
  useEffect(() => {
    if (!open || !organizationId || data.loadedFor === organizationId) return;
    let cancelled = false;
    (async () => {
      const from = new Date(Date.now() - 7 * 86_400_000);
      const to = new Date(Date.now() + 30 * 86_400_000);
      const get = async (url) => {
        try {
          const res = await fetch(url);
          return res.ok ? await res.json() : {};
        } catch {
          return {};
        }
      };
      const [a, m, ms] = await Promise.all([
        get(`/api/flota/aircraft?organizationId=${organizationId}`),
        get(`/api/organizacion/members?organizationId=${organizationId}`),
        get(`/api/missions?organizationId=${organizationId}&from=${iso(from)}&to=${iso(to)}`),
      ]);
      if (!cancelled) setData({ aircraft: a.aircraft || [], members: m.members || [], missions: (ms.missions || []).filter((x) => x.status !== 'cancelada'), loadedFor: organizationId });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, organizationId, data.loadedFor]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const groups = useMemo(() => {
    const actionItems = ACTIONS.filter((a) => !a.managerOnly || isManager).map((a) => ({ ...a, group: 'actions' }));
    const pageItems = (links || []).map((l) => ({ id: `p-${l.href}`, title: l.name, subtitle: l.group, href: l.href, icon: l.icon, group: 'pages' }));
    const dataItems = [
      ...data.aircraft.map((a) => ({ id: `ac-${a.id}`, title: `${a.model?.brand || ''} ${a.model?.model || ''}`.trim() || 'Aeronave', subtitle: `Aeronave · serie ${a.serial_number}`, keywords: a.ruas_number, href: '/flota', icon: 'flight', group: 'data' })),
      ...data.missions.map((m) => ({ id: `ms-${m.id}`, title: m.name || 'Misión', subtitle: `Misión · ${new Date(m.scheduled_at).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short' })} · ${m.zone}`, keywords: m.pic?.full_name, href: '/operacion/programacion', icon: 'event', group: 'data' })),
      ...data.members.map((p) => ({ id: `pe-${p.person_id}`, title: p.people?.full_name || 'Persona', subtitle: `Persona · ${p.role}`, href: '/flota/tripulacion', icon: 'person', group: 'data' })),
    ];
    const q = query.trim();
    // Sin consulta: acciones primero y un puñado de páginas; con consulta: lo mejor de cada grupo.
    return {
      actions: rankItems(actionItems, q, q ? 5 : 6),
      pages: rankItems(pageItems, q, q ? 6 : 5),
      data: q ? rankItems(dataItems, q, 6) : [],
    };
  }, [links, isManager, data, query]);

  const flat = useMemo(() => ['actions', 'pages', 'data'].flatMap((g) => groups[g]), [groups]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  const go = useCallback(
    (item) => {
      onClose();
      router.push(item.href);
    },
    [onClose, router]
  );

  function onKeyDown(e) {
    if (e.key === 'Escape') return onClose();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && flat[active]) {
      e.preventDefault();
      go(flat[active]);
    }
  }

  if (!open) return null;
  let index = -1;

  return (
    <div className="fixed inset-0 z-[400] flex items-start justify-center bg-black/50 px-3 pt-[8vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div role="dialog" aria-modal="true" aria-label="Paleta de comandos" onKeyDown={onKeyDown} className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center gap-3 px-4 border-b border-navy-100">
          <span className="material-symbols-outlined text-navy-300">search</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busca una página, una acción, una aeronave o una persona…"
            aria-label="Buscar"
            className="flex-1 min-h-[52px] bg-transparent text-base text-navy placeholder:text-navy-300 focus:outline-none"
          />
          <button type="button" onClick={onClose} className="text-xs font-semibold text-navy-400 px-2 min-h-[44px]">Esc</button>
        </div>

        <div className="overflow-y-auto p-2" role="listbox">
          {flat.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-navy-400">Sin resultados para «{query}».</p>
          ) : (
            ['actions', 'pages', 'data'].map((g) =>
              groups[g].length === 0 ? null : (
                <div key={g} className="mb-1">
                  <p className="px-3 pt-2 pb-1 text-[11px] font-black uppercase tracking-widest text-navy-300">{GROUP_LABEL[g]}</p>
                  {groups[g].map((item) => {
                    index += 1;
                    const i = index;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        role="option"
                        aria-selected={i === active}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(item)}
                        className={`w-full flex items-center gap-3 px-3 min-h-[48px] rounded-xl text-left transition-colors ${i === active ? 'bg-primary-50' : 'hover:bg-navy-50'}`}
                      >
                        <span className={`material-symbols-outlined text-xl shrink-0 ${i === active ? 'text-primary-600' : 'text-navy-300'}`}>{item.icon}</span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-navy truncate">{item.title}</span>
                          {item.subtitle && <span className="block text-xs text-navy-400 truncate">{item.subtitle}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )
            )
          )}
        </div>
        <div className="hidden md:flex items-center gap-4 px-4 py-2 border-t border-navy-50 text-[11px] text-navy-300">
          <span>↑↓ moverse</span>
          <span>↵ abrir</span>
          <span>Esc cerrar</span>
        </div>
      </div>
    </div>
  );
}
