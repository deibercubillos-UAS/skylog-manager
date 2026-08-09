'use client';
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { PERMISSIONS } from '@/lib/roles';
import { getOrgContext } from '@/lib/apiAuth';
import { useGracePeriod } from '@/lib/gracePeriodContext';
import { isPilotoIndependiente } from '@/lib/pilotoIndependiente';
import { generatePilotAllOrgsReport } from '@/lib/reportGenerators';
import dynamic from 'next/dynamic';
import PageHero from '@/components/PageHero';
import KPIStrip from '@/components/KPIStrip';

const FlightReplayModal = dynamic(() => import('@/components/FlightReplayModal'), { ssr: false });
const DjiRcSync         = dynamic(() => import('@/components/DjiRcSync'),         { ssr: false });

const CAN_EDIT_PILOT = ['superadmin', 'admin', 'jefe_pilotos'];

const PAGE_SIZE = 30;

export default function LogbookPage() {
    const { isGracePeriod } = useGracePeriod();
    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [userRole, setUserRole] = useState(null);
    const [pilots, setPilots] = useState([]);
    const [editingPilot, setEditingPilot] = useState(null); // flightId siendo editado
    const [savingPilot, setSavingPilot] = useState(null);
    const pilotDropdownRef = useRef(null);

    const [editingMission, setEditingMission] = useState(null); // flightId cuyo mission_id se edita
    const [missionDraft, setMissionDraft] = useState('');
    const [savingMission, setSavingMission] = useState(null);
    const missionInputRef = useRef(null);

    const [showImport, setShowImport] = useState(false);

    // Bitácora personal consolidada (piloto independiente, ver GET
    // /api/pilots/my-flights) — vuelos como PIC en cualquier organización.
    const [isPilotoPlan, setIsPilotoPlan] = useState(false);
    const [pilotFullName, setPilotFullName] = useState('');
    const [allOrgsFlights, setAllOrgsFlights] = useState([]);
    const [loadingAllOrgs, setLoadingAllOrgs] = useState(false);
    const [showAllOrgs, setShowAllOrgs] = useState(false);

    const canEditPilot   = CAN_EDIT_PILOT.includes(userRole);
    const canDeleteEntry = PERMISSIONS.canDeleteLogbook.includes(userRole);
    const canViewReplay  = PERMISSIONS.canViewFlightReplay.includes(userRole) && !isGracePeriod;
    const [replayFlight, setReplayFlight] = useState(null); // { id, label, hasReplay }
    // Optimistic: track which flights tuvieron replay guardado en esta sesión
    const [savedReplays, setSavedReplays] = useState(() => new Set());

    // Búsqueda unificada: misión, aeronave (modelo/serie) o piloto en un solo campo
    const [search, setSearch] = useState('');
    const [filters, setFilters] = useState({
        date: '',
        model: '',
        type: '',
        condition: '',
        pilot: ''
    });

    // Llamado por DjiRcSync tras cada vuelo importado con éxito.
    // Busca el vuelo recién insertado por ID y lo añade al tope de la lista.
    const handleFlightImported = async (importData) => {
        if (!importData?.flight_id) { loadData(true); return; }
        try {
            const res = await fetch(`/api/logbook?limit=1&id=${importData.flight_id}`);
            if (!res.ok) return;
            const rows = await res.json();
            const newFlight = Array.isArray(rows) ? rows[0] : null;
            if (!newFlight) return;
            setFlights(prev => {
                // Evitar duplicados (si ya existe, no añadir)
                if (prev.some(f => f.id === newFlight.id)) return prev;
                return [newFlight, ...prev];
            });
        } catch {
            // Fallback silencioso: no interrumpir la importación
        }
    };

    const loadData = async (reset = true) => {
        try {
            const currentOffset = reset ? 0 : offset;
            if (reset) setLoading(true);
            else setLoadingMore(true);

            const res = await fetch(`/api/logbook?limit=${PAGE_SIZE}&offset=${currentOffset}`);
            const data = await res.json();
            const rows = Array.isArray(data) ? data : [];

            if (reset) {
                setFlights(rows);
                setOffset(PAGE_SIZE);
            } else {
                setFlights(prev => [...prev, ...rows]);
                setOffset(currentOffset + PAGE_SIZE);
            }
            setHasMore(rows.length === PAGE_SIZE);
        } catch (e) {
            console.error("Error cargando bitácora");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    useEffect(() => {
        loadData(true);
        // Cargar rol del usuario y lista de pilotos en paralelo
        getOrgContext(supabase).then(ctx => {
            setUserRole(ctx.role ?? null);
            setPilotFullName(ctx.fullName || '');
            setIsPilotoPlan(isPilotoIndependiente({ role: ctx.role, plan: ctx.subscription_plan }));
        });
        fetch('/api/pilots').then(r => { if (!r.ok) { console.warn('[fetch] /api/pilots failed:', r.status); return []; } return r.json(); }).then(data => setPilots(Array.isArray(data) ? data : []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Solo para el piloto independiente: su historial completo en TODAS las
    // organizaciones donde ha volado — carga bajo demanda al abrir la sección.
    const loadAllOrgsFlights = async () => {
        setLoadingAllOrgs(true);
        try {
            const res = await fetch('/api/pilots/my-flights');
            const data = await res.json();
            setAllOrgsFlights(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error('Error cargando bitácora consolidada');
        } finally {
            setLoadingAllOrgs(false);
        }
    };

    const handleDownloadAllOrgs = () => {
        generatePilotAllOrgsReport(allOrgsFlights, {
            pilotName: pilotFullName,
            version: '1.0',
            reportDate: new Date().toLocaleDateString('es-CO'),
            downloadedAt: new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' }),
        });
    };

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handler = (e) => {
            if (pilotDropdownRef.current && !pilotDropdownRef.current.contains(e.target)) {
                setEditingPilot(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Valores únicos para selects — un solo recorrido del array para los tres sets
    const { uniqueModels, uniqueTypes, uniquePilots } = useMemo(() => {
        const models = new Set(), types = new Set(), pilotsSet = new Set();
        flights.forEach(f => {
            if (f.aircraft?.model) models.add(f.aircraft.model);
            if (f.mission_type)    types.add(f.mission_type);
            if (f.pilots?.name)    pilotsSet.add(f.pilots.name);
        });
        return { uniqueModels: [...models], uniqueTypes: [...types], uniquePilots: [...pilotsSet] };
    }, [flights]);

    // Filtrado en memoria — solo recalcula cuando cambian filtros o datos
    const filteredFlights = useMemo(() => {
        let result = flights;
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter(f =>
                f.mission_id?.toLowerCase().includes(q) ||
                f.aircraft?.model?.toLowerCase().includes(q) ||
                f.aircraft?.serial_number?.toLowerCase().includes(q) ||
                f.pilots?.name?.toLowerCase().includes(q)
            );
        }
        if (filters.date)       result = result.filter(f => f.flight_date?.includes(filters.date));
        if (filters.model)      result = result.filter(f => f.aircraft?.model === filters.model);
        if (filters.type)       result = result.filter(f => f.mission_type === filters.type);
        if (filters.condition)  result = result.filter(f => f.visual_condition === filters.condition);
        if (filters.pilot)      result = result.filter(f => f.pilots?.name === filters.pilot);
        return result;
    }, [search, filters, flights]);

    // KPIs derivados de los vuelos ya cargados (sin queries nuevas).
    const stats = useMemo(() => {
        const ym = new Date().toISOString().slice(0, 7); // YYYY-MM actual
        const totalHours = flights.reduce((sum, f) => {
            const tt = parseFloat(f.total_time);
            return sum + (!isNaN(tt) && tt > 0 ? tt : 0);
        }, 0);
        return {
            count: flights.length,
            hours: totalHours,
            thisMonth: flights.filter(f => f.flight_date?.startsWith(ym)).length,
            unassigned: flights.filter(f => !f.pilots?.name).length,
        };
    }, [flights]);

    const clearFilters = () => {
        setSearch('');
        setFilters({ date: '', model: '', type: '', condition: '', pilot: '' });
    };

    const deleteFlight = async (flightId) => {
        if (!window.confirm('¿Eliminar este registro de bitácora? Esta acción es irreversible.')) return;
        try {
            const res = await fetch(`/api/logbook/${flightId}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Error al eliminar el registro.');
                return;
            }
            setFlights(prev => prev.filter(f => f.id !== flightId));
        } catch {
            alert('Error de red al eliminar el registro.');
        }
    };

    const assignMission = async (flightId, newMissionId) => {
        const trimmed = newMissionId?.trim() || null;
        setSavingMission(flightId);
        setEditingMission(null);
        try {
            const res = await fetch(`/api/logbook/${flightId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mission_id: trimmed }),
            });
            const data = await res.json();
            if (res.ok) {
                setFlights(prev => prev.map(f =>
                    f.id === flightId ? { ...f, mission_id: data.flight.mission_id } : f
                ));
            }
        } finally {
            setSavingMission(null);
        }
    };

    const assignPilot = async (flightId, pilotId) => {
        setSavingPilot(flightId);
        setEditingPilot(null);
        try {
            const res = await fetch(`/api/logbook/${flightId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pilot_id: pilotId || null }),
            });
            const data = await res.json();
            if (res.ok) {
                setFlights(prev => prev.map(f =>
                    f.id === flightId ? { ...f, pilots: data.flight.pilots } : f
                ));
            }
        } finally {
            setSavingPilot(null);
        }
    };

    // Celda de alertas: muestra icono naranja/rojo con tooltip si el vuelo tuvo alertas
    const AlertsCell = ({ flight }) => {
        if (!flight.has_alerts) {
            return <td className="px-3 py-4"></td>;
        }
        const critical = (flight.alerts_json ?? []).some(a => a.severity === 'critical');
        const count    = (flight.alerts_json ?? []).length;
        return (
            <td className="px-3 py-4">
                <div className="group relative inline-flex">
                    <span
                        title={`${count} alerta${count !== 1 ? 's' : ''} durante el vuelo — abrir Replay para detalles`}
                        className={`flex items-center justify-center w-7 h-7 rounded-lg cursor-help transition-all hover:scale-110 ${
                            critical
                                ? 'bg-red-100 text-red-500 hover:bg-red-200'
                                : 'bg-orange-100 text-orange-500 hover:bg-orange-200'
                        }`}
                    >
                        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                            warning
                        </span>
                    </span>
                    {/* Tooltip con listado breve de alertas */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 w-56 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-2xl pointer-events-none">
                        <p className="font-black uppercase tracking-wider mb-1.5 text-orange-300">Alertas detectadas</p>
                        <ul className="space-y-1">
                            {(flight.alerts_json ?? []).slice(0, 5).map((a, i) => (
                                <li key={i} className={`flex items-start gap-1 ${a.severity === 'critical' ? 'text-red-300' : 'text-yellow-200'}`}>
                                    <span className="shrink-0 mt-0.5">•</span>
                                    <span>{a.label}</span>
                                </li>
                            ))}
                            {(flight.alerts_json ?? []).length > 5 && (
                                <li className="text-slate-400 text-xs">+{(flight.alerts_json ?? []).length - 5} más…</li>
                            )}
                        </ul>
                    </div>
                </div>
            </td>
        );
    };

    // Duración real del vuelo. Prefiere total_time (horas, double precision);
    // si no existe, la calcula desde takeoff/landing. NUNCA devuelve la hora de
    // despegue como duración — si no hay datos suficientes, retorna null → "—".
    const fmtMinutes = (mins) => {
        if (mins <= 0) return null;
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
    };
    const flightDuration = (flight) => {
        const tt = parseFloat(flight.total_time);
        if (!isNaN(tt) && tt > 0) return fmtMinutes(Math.round(tt * 60));
        const { takeoff_time: takeoff, landing_time: landing } = flight;
        if (!takeoff || !landing) return null;
        const [h1, m1] = takeoff.split(':').map(Number);
        const [h2, m2] = landing.split(':').map(Number);
        return fmtMinutes((h2 * 60 + m2) - (h1 * 60 + m1));
    };

    // Color semántico del badge de condición visual (patrón de status del sistema de diseño).
    const conditionBadge = (cond) => {
        switch (cond) {
            case 'VMC':   return 'bg-emerald-50 text-emerald-600';
            case 'IMC':   return 'bg-amber-50 text-amber-600';
            case 'NIGHT': return 'bg-slate-800 text-white';
            default:      return 'bg-slate-100 text-slate-500';
        }
    };

    const PilotCell = ({ flight }) => {
        const isEditing = editingPilot === flight.id;
        const isSaving  = savingPilot  === flight.id;
        const pilotName = flight.pilots?.name;

        if (!canEditPilot) {
            return <span className="text-slate-600">{pilotName || <span className="text-slate-300 italic">Sin asignar</span>}</span>;
        }

        return (
            <div className="relative" ref={isEditing ? pilotDropdownRef : null}>
                <button
                    onClick={() => setEditingPilot(isEditing ? null : flight.id)}
                    disabled={isSaving}
                    className={`flex items-center gap-1.5 group rounded-lg px-2 py-1 -mx-2 -my-1 transition-all ${
                        isSaving ? 'opacity-50' : 'hover:bg-orange-50'
                    }`}
                >
                    {isSaving
                        ? <span className="material-symbols-outlined text-sm text-orange-400 animate-spin">sync</span>
                        : <span className="material-symbols-outlined text-sm text-slate-300 group-hover:text-orange-400 transition-colors">edit</span>
                    }
                    <span className={pilotName ? 'text-slate-700 font-medium' : 'text-slate-300 italic text-xs'}>
                        {pilotName || 'Sin asignar'}
                    </span>
                </button>

                {isEditing && (
                    <div className="absolute z-50 top-full mt-1 left-0 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1 w-[220px] max-w-[calc(100vw-2rem)] max-h-60 overflow-y-auto">
                        <button
                            onClick={() => assignPilot(flight.id, null)}
                            className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-50 italic"
                        >
                            — Sin asignar
                        </button>
                        {pilots.map(p => (
                            <button
                                key={p.id}
                                onClick={() => assignPilot(flight.id, p.id)}
                                className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-orange-50 hover:text-orange-700 transition-colors ${
                                    flight.pilots?.name === p.name ? 'text-orange-600 bg-orange-50/50' : 'text-slate-700'
                                }`}
                            >
                                {p.name}
                                {p.pilot_role && <span className="ml-2 text-slate-400 font-normal">{p.pilot_role}</span>}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Celda de N° misión: editable inline para roles autorizados (mismo permiso que piloto)
    const MissionCell = ({ flight }) => {
        const isEditing = editingMission === flight.id;
        const isSaving  = savingMission  === flight.id;
        const current   = flight.mission_id || '';

        if (!canEditPilot) {
            return (
                <span className={current ? 'font-black font-mono text-orange-600' : 'text-slate-300 italic text-xs'}>
                    {current || 'N/A'}
                </span>
            );
        }

        if (isEditing) {
            return (
                <input
                    ref={missionInputRef}
                    autoFocus
                    type="text"
                    maxLength={100}
                    defaultValue={current}
                    placeholder="Ej: F-OPS-001"
                    className="w-28 px-2 py-1 text-xs font-mono font-bold border-2 border-orange-400 rounded-lg outline-none focus:ring-2 focus:ring-orange-200 bg-white"
                    onBlur={e  => assignMission(flight.id, e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter')  { e.target.blur(); }
                        if (e.key === 'Escape') { setEditingMission(null); }
                    }}
                />
            );
        }

        return (
            <button
                onClick={() => { setMissionDraft(current); setEditingMission(flight.id); }}
                disabled={isSaving}
                className={`flex items-center gap-1.5 group rounded-lg px-2 py-1 -mx-2 -my-1 transition-all ${
                    isSaving ? 'opacity-50' : 'hover:bg-orange-50'
                }`}
                title="Clic para editar el número de misión"
            >
                {isSaving
                    ? <span className="material-symbols-outlined text-sm text-orange-400 animate-spin">sync</span>
                    : <span className="material-symbols-outlined text-sm text-slate-300 group-hover:text-orange-400 transition-colors">edit</span>
                }
                <span className={current ? 'font-black font-mono text-orange-600' : 'text-slate-300 italic text-xs'}>
                    {current || 'N/A'}
                </span>
            </button>
        );
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">AUDITANDO REGISTROS...</div>;

    return (
        <>
        <div className="space-y-8 text-left animate-in fade-in duration-700 pb-20">
            <PageHero
                eyebrow="Operación"
                title="Bitácora de Vuelo"
                description="Registro RAC 100 de todas las misiones de la flota."
                right={
                    <div className="flex items-center gap-4 md:gap-6">
                        {stats.unassigned > 0 && (
                            <div className="hidden sm:flex flex-col justify-center pr-4 md:pr-6 border-r border-white/10">
                                <p className="text-xs font-black uppercase tracking-wide text-white/40">Sin piloto asignado</p>
                                <p className="text-sm font-black text-orange-400 mt-1 whitespace-nowrap">{stats.unassigned} bitácora{stats.unassigned !== 1 ? 's' : ''}</p>
                            </div>
                        )}
                        <Link
                            href="/dashboard/logbook/new"
                            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg shadow-orange-600/20 transition-all active:scale-95 shrink-0"
                        >
                            <span className="material-symbols-outlined text-base">add_circle</span>
                            Nuevo registro
                        </Link>
                    </div>
                }
            />

            <section aria-label="Indicadores de bitácora" className="bg-white rounded-[1.5rem] border border-slate-100 px-2 py-3 md:px-4">
                <KPIStrip variant="strip" items={[
                    { key: 'count', label: 'Vuelos registrados', value: stats.count, icon: 'menu_book', iconColor: '#ec5b13' },
                    { key: 'hours', label: 'Horas totales', value: stats.hours.toFixed(1), unit: 'h', icon: 'schedule', iconColor: '#ec5b13' },
                    { key: 'month', label: 'Este mes', value: stats.thisMonth, unit: 'vuelos', icon: 'flight_takeoff', iconColor: '#94a3b8' },
                    {
                        key: 'unassigned', label: 'Sin piloto', value: stats.unassigned, icon: 'person_off',
                        iconColor: stats.unassigned > 0 ? '#d97706' : '#94a3b8',
                        delta: stats.unassigned > 0 ? 'Requieren asignar PIC' : 'Todos con PIC asignado',
                        deltaTone: stats.unassigned > 0 ? 'neutral' : 'positive',
                    },
                ]} />
            </section>

            {/* Bitácora personal consolidada — solo piloto independiente. Vuelos como
                PIC en CUALQUIER organización donde haya volado, no solo la propia —
                ver GET /api/pilots/my-flights. Colapsada por defecto (carga bajo
                demanda) para no pagar el costo de la consulta cruzada en cada visita. */}
            {isPilotoPlan && (
                <section aria-label="Mi historial completo" className="bg-white rounded-2xl border border-orange-200 shadow-sm p-5 space-y-4">
                    <button
                        type="button"
                        onClick={() => { const next = !showAllOrgs; setShowAllOrgs(next); if (next && allOrgsFlights.length === 0) loadAllOrgsFlights(); }}
                        className="w-full flex items-center justify-between gap-3 text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-orange-600 text-xl" aria-hidden="true">travel_explore</span>
                            </div>
                            <div>
                                <h4 className="font-black text-slate-800 text-sm uppercase tracking-wide">Mi historial completo</h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Todos tus vuelos como PIC, en cualquier organización donde hayas volado — solo fecha, operación, tiempo de vuelo y organización.
                                </p>
                            </div>
                        </div>
                        <span className="material-symbols-outlined text-slate-400 shrink-0">{showAllOrgs ? 'expand_less' : 'expand_more'}</span>
                    </button>

                    {showAllOrgs && (
                        loadingAllOrgs ? (
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-center py-6">Cargando...</p>
                        ) : allOrgsFlights.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">Sin vuelos registrados todavía.</p>
                        ) : (
                            <>
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleDownloadAllOrgs}
                                        className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl font-black text-[10.5px] uppercase tracking-wider transition-all active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-sm">download</span>
                                        Descargar PDF
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="text-left text-slate-400 uppercase text-[9.5px] font-black tracking-widest border-b border-slate-100">
                                                <th className="py-2 pr-3">Fecha</th>
                                                <th className="py-2 pr-3">Operación</th>
                                                <th className="py-2 pr-3">Tiempo de vuelo</th>
                                                <th className="py-2 pr-3">Organización</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allOrgsFlights.map((f, i) => (
                                                <tr key={i} className="border-b border-slate-50">
                                                    <td className="py-2 pr-3 font-bold text-slate-700 whitespace-nowrap">{f.flight_date}</td>
                                                    <td className="py-2 pr-3 text-slate-600">{f.mission_type}</td>
                                                    <td className="py-2 pr-3 font-bold text-orange-600 whitespace-nowrap">{f.duration_hours.toFixed(2)} h</td>
                                                    <td className="py-2 pr-3 text-slate-600">{f.organization_name}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )
                    )}
                </section>
            )}

            {/* Barra de filtros unificada */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 min-w-0 md:max-w-xs">
                    <span className="material-symbols-outlined text-base text-slate-400 shrink-0">search</span>
                    <input
                        placeholder="Buscar por misión, aeronave, piloto…"
                        aria-label="Buscar en la bitácora"
                        className="flex-1 min-w-0 bg-transparent text-xs font-bold outline-none placeholder:text-slate-400"
                        value={search} onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                    <input type="date" aria-label="Filtrar por fecha" className="w-full sm:w-auto p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={filters.date} onChange={e => setFilters(f => ({...f, date: e.target.value}))} />
                    <select aria-label="Filtrar por modelo de UAS" className="w-full sm:w-auto p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={filters.model} onChange={e => setFilters(f => ({...f, model: e.target.value}))}>
                        <option value="">Todas las aeronaves</option>
                        {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select aria-label="Filtrar por tipo de misión" className="w-full sm:w-auto p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={filters.type} onChange={e => setFilters(f => ({...f, type: e.target.value}))}>
                        <option value="">Todos los tipos</option>
                        {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select aria-label="Filtrar por condición visual" className="w-full sm:w-auto p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={filters.condition} onChange={e => setFilters(f => ({...f, condition: e.target.value}))}>
                        <option value="">Todas las condiciones</option>
                        <option value="VMC">VMC</option><option value="IMC">IMC</option><option value="NIGHT">NOCTURNO</option>
                    </select>
                    <select aria-label="Filtrar por piloto" className="w-full sm:w-auto p-2.5 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={filters.pilot} onChange={e => setFilters(f => ({...f, pilot: e.target.value}))}>
                        <option value="">Todos los pilotos</option>
                        {uniquePilots.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button onClick={clearFilters} className="w-full sm:w-auto px-3 py-2.5 text-xs font-black uppercase text-slate-400 hover:text-orange-600 transition-colors border border-slate-200 rounded-xl">
                        Limpiar
                    </button>
                </div>
                {!isGracePeriod && (
                    <div className="flex gap-2 md:ml-auto">
                        <button
                            onClick={() => setShowImport(v => !v)}
                            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-black uppercase rounded-xl border transition-all ${
                                showImport
                                    ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-500/20'
                                    : 'text-orange-600 border-orange-300 hover:bg-orange-50'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">upload_file</span>
                            {showImport ? 'Cerrar' : 'Importar vuelos'}
                        </button>
                    </div>
                )}
            </div>

            {/* Panel importación DJI / Excel — oculto en período de gracia. Carga manual de vuelos (fuera de DJI): "Nuevo registro" en el hero → /dashboard/logbook/new */}
            {showImport && !isGracePeriod && (
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden p-6">
                    <DjiRcSync onImported={() => loadData(true)} onFlightImported={handleFlightImported} />
                </div>
            )}

            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                {filteredFlights.length} registro{filteredFlights.length !== 1 ? 's' : ''} encontrado{filteredFlights.length !== 1 ? 's' : ''}
            </p>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-100">
                    {filteredFlights.length === 0 ? (
                        <p className="py-16 text-center text-xs font-black text-slate-300 uppercase tracking-widest">Sin registros</p>
                    ) : filteredFlights.map(f => {
                        const dur = flightDuration(f);
                        return (
                        <div key={f.id} className="p-4 space-y-3">

                            {/* Fila superior: Fecha + condición + eliminar */}
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</p>
                                    <p className="text-xs font-black text-slate-900">
                                        {f.flight_date}
                                        {f.takeoff_time && <span className="text-slate-500 font-medium ml-1">· {f.takeoff_time}</span>}
                                    </p>
                                    <p className="text-[10px] text-slate-400 uppercase mt-0.5">{f.mission_type}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-black uppercase">{f.visual_condition}</span>
                                    {canDeleteEntry && (
                                        <button
                                            onClick={() => deleteFlight(f.id)}
                                            aria-label="Eliminar registro"
                                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-600 hover:text-white transition-all active:scale-95"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Grid 2×2: Misión · Duración / Equipo · Piloto */}
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Misión</p>
                                    <div className="flex items-center gap-1.5">
                                        <MissionCell flight={f} />
                                        {f.has_alerts && (
                                            <span
                                                title={`${(f.alerts_json ?? []).length} alerta(s)`}
                                                className={`inline-flex items-center justify-center w-4 h-4 rounded shrink-0 ${
                                                    (f.alerts_json ?? []).some(a => a.severity === 'critical')
                                                        ? 'bg-red-100 text-red-500'
                                                        : 'bg-orange-100 text-orange-500'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '11px', fontVariationSettings: "'FILL' 1" }}>warning</span>
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Duración</p>
                                    <p className="text-xs font-black text-orange-600">
                                        {dur || <span className="text-slate-300 font-normal italic">—</span>}
                                    </p>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Equipo</p>
                                    <p className="text-xs font-bold text-slate-800 truncate">{f.aircraft?.model || 'UAS'}</p>
                                </div>

                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Piloto</p>
                                    <PilotCell flight={f} />
                                </div>
                            </div>

                            {/* Replay button — si aplica */}
                            {canViewReplay && (() => {
                                const hasReplay = !!(f.replay_path || savedReplays.has(f.id));
                                return hasReplay ? (
                                    <button
                                        onClick={() => setReplayFlight({
                                            id: f.id,
                                            label: `${f.mission_id || f.flight_date} · ${f.aircraft?.model ?? ''}`,
                                            hasReplay: true,
                                            flightDate: f.flight_date,
                                            takeoffTime: f.takeoff_time,
                                        })}
                                        className="flex items-center gap-1.5 text-[10px] font-black text-orange-500 uppercase tracking-widest"
                                    >
                                        <span className="material-symbols-outlined text-sm">play_circle</span>
                                        Ver replay
                                    </button>
                                ) : null;
                            })()}
                        </div>
                        );
                    })}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50 text-xs font-black uppercase text-slate-400 tracking-widest border-b">
                                <th className="px-4 py-4">N° Misión</th>
                                <th className="px-4 py-4">Fecha</th>
                                <th className="px-4 py-4">Aeronave</th>
                                <th className="px-4 py-4">Piloto (PIC)</th>
                                <th className="px-4 py-4">Condición</th>
                                <th className="px-4 py-4">Duración</th>
                                <th className="px-3 py-4 w-10" title="Alertas detectadas durante el vuelo">
                                    <span className="material-symbols-outlined text-base text-slate-400">warning</span>
                                </th>
                                {canViewReplay && <th className="px-4 py-4 w-16"></th>}
                                {canDeleteEntry && <th className="px-2 py-4 w-10"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredFlights.map((f) => (
                                <tr key={f.id} className="hover:bg-orange-50/30 transition-all text-xs font-medium text-slate-700 cursor-pointer">
                                    <td className="px-4 py-4"><MissionCell flight={f} /></td>
                                    <td className="px-4 py-4 whitespace-nowrap text-slate-700">{f.flight_date}</td>
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-6 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                                                <span className="material-symbols-outlined text-sm text-slate-400">flight</span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-900 truncate">{f.aircraft?.model || '---'}</p>
                                                {f.aircraft?.serial_number && <p className="font-mono text-[10px] text-slate-400 truncate">S/N {f.aircraft.serial_number}</p>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4"><PilotCell flight={f} /></td>
                                    <td className="px-4 py-4">{f.visual_condition ? <span className={`px-2 py-0.5 rounded-full text-xs font-black uppercase ${conditionBadge(f.visual_condition)}`}>{f.visual_condition}</span> : <span className="text-slate-300">—</span>}</td>
                                    <td className="px-4 py-4 font-black text-orange-600 tabular-nums">{flightDuration(f) || <span className="text-slate-300 font-normal">—</span>}</td>
                                    <AlertsCell flight={f} />
                                    {canViewReplay && (() => {
                                        const hasReplay = !!(f.replay_path || savedReplays.has(f.id));
                                        return (
                                            <td className="px-2 py-3">
                                                <button
                                                    onClick={() => setReplayFlight({
                                                        id: f.id,
                                                        label: `${f.mission_id || f.flight_date} · ${f.aircraft?.model ?? ''}`,
                                                        hasReplay,
                                                        flightDate:   f.flight_date   ?? null,
                                                        takeoffTime:  f.takeoff_time  ?? null,
                                                    })}
                                                    aria-label={hasReplay ? `Ver Replay del vuelo ${f.mission_id || f.flight_date}` : `Subir log para Replay del vuelo ${f.mission_id || f.flight_date}`}
                                                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:scale-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:outline-none ${
                                                        hasReplay
                                                            ? 'bg-orange-100 hover:bg-orange-200 text-orange-500'
                                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600'
                                                    }`}
                                                >
                                                    <span
                                                        className="material-symbols-outlined text-base"
                                                        style={hasReplay ? undefined : { fontVariationSettings: "'FILL' 0" }}
                                                    >
                                                        play_circle
                                                    </span>
                                                </button>
                                            </td>
                                        );
                                    })()}
                                    {canDeleteEntry && (
                                        <td className="px-2 py-3">
                                            <button
                                                onClick={() => deleteFlight(f.id)}
                                                aria-label="Eliminar registro de bitácora"
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-600 hover:text-white transition-all hover:scale-110 active:scale-95"
                                            >
                                                <span className="material-symbols-outlined text-base">delete</span>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredFlights.length === 0 && (
                        <div className="p-20 text-center text-slate-400 italic font-bold uppercase text-xs tracking-widest">
                            No se encontraron registros con los criterios seleccionados
                        </div>
                    )}
                </div>
            </div>

            {/* Paginación — cargar más */}
            {hasMore && (
                <div className="flex justify-center pt-2">
                    <button
                        onClick={() => loadData(false)}
                        disabled={loadingMore}
                        className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-orange-600 hover:border-orange-300 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                    >
                        {loadingMore ? 'Cargando...' : `Cargar más registros`}
                    </button>
                </div>
            )}
        </div>

        {/* Modal Replay de Vuelo */}
        {canViewReplay && (
            <FlightReplayModal
                open={!!replayFlight}
                onClose={() => setReplayFlight(null)}
                flightId={replayFlight?.id}
                hasReplay={replayFlight?.hasReplay ?? false}
                flightLabel={replayFlight?.label}
                flightDate={replayFlight?.flightDate}
                takeoffTime={replayFlight?.takeoffTime}
                onReplaySaved={() => setSavedReplays(prev => {
                    const next = new Set(prev);
                    next.add(replayFlight?.id);
                    return next;
                })}
            />
        )}
        </>
    );
}
