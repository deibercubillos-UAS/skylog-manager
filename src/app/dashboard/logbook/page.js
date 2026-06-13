'use client';
import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { PERMISSIONS } from '@/lib/roles';
import { useGracePeriod } from '@/lib/gracePeriodContext';
import dynamic from 'next/dynamic';

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

    const canEditPilot   = CAN_EDIT_PILOT.includes(userRole);
    const canDeleteEntry = PERMISSIONS.canDeleteLogbook.includes(userRole);
    const canViewReplay  = PERMISSIONS.canViewFlightReplay.includes(userRole) && !isGracePeriod;
    const [replayFlight, setReplayFlight] = useState(null); // { id, label, hasReplay }
    // Optimistic: track which flights tuvieron replay guardado en esta sesión
    const [savedReplays, setSavedReplays] = useState(() => new Set());

    const [filters, setFilters] = useState({
        date: '',
        mission_id: '',
        model: '',
        serial: '',
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
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) return;
            supabase.from('profiles').select('role').eq('id', session.user.id).single()
                .then(({ data }) => setUserRole(data?.role ?? null));
        });
        fetch('/api/pilots').then(r => { if (!r.ok) { console.warn('[fetch] /api/pilots failed:', r.status); return []; } return r.json(); }).then(data => setPilots(Array.isArray(data) ? data : []));
    }, []);

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
        if (filters.date)       result = result.filter(f => f.flight_date?.includes(filters.date));
        if (filters.mission_id) result = result.filter(f => f.mission_id?.toLowerCase().includes(filters.mission_id.toLowerCase()));
        if (filters.model)      result = result.filter(f => f.aircraft?.model === filters.model);
        if (filters.serial)     result = result.filter(f => f.aircraft?.serial_number?.toLowerCase().includes(filters.serial.toLowerCase()));
        if (filters.type)       result = result.filter(f => f.mission_type === filters.type);
        if (filters.condition)  result = result.filter(f => f.visual_condition === filters.condition);
        if (filters.pilot)      result = result.filter(f => f.pilots?.name === filters.pilot);
        return result;
    }, [filters, flights]);

    const clearFilters = () => {
        setFilters({ date: '', mission_id: '', model: '', serial: '', type: '', condition: '', pilot: '' });
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

    // Celda de piloto: editable para roles autorizados, solo lectura para el resto
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
                    // right-0 en mobile evita que el dropdown se salga del borde derecho de pantalla (375px)
                    // md:left-0 md:right-auto restaura el alineado izquierdo en desktop
                    <div className="absolute z-50 top-full mt-1 right-0 md:left-0 md:right-auto bg-white rounded-2xl shadow-2xl border border-slate-100 py-1 min-w-[200px] max-h-60 overflow-y-auto">
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
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b border-slate-200 pb-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900">Bitácora de Vuelo</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                        {filteredFlights.length} Registros encontrados
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    {!isGracePeriod && (
                        <button
                            onClick={() => setShowImport(v => !v)}
                            className={`flex items-center gap-2 px-4 py-3 text-xs font-black uppercase rounded-xl border transition-all ${
                                showImport
                                    ? 'bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-500/20'
                                    : 'text-orange-600 border-orange-300 hover:bg-orange-50'
                            }`}
                        >
                            <span className="material-symbols-outlined text-sm">upload_file</span>
                            {showImport ? 'Cerrar importación' : 'Importar vuelos'}
                        </button>
                    )}
                    <button
                        onClick={clearFilters}
                        className="flex-1 sm:flex-none px-4 py-3 text-xs font-black uppercase text-slate-400 hover:text-orange-600 transition-colors border border-slate-200 rounded-xl"
                    >Limpiar filtros</button>
                </div>
            </header>

            {/* Panel importación DJI / Excel — oculto en período de gracia */}
            {showImport && !isGracePeriod && (
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden p-6">
                    <DjiRcSync onImported={() => loadData(true)} onFlightImported={handleFlightImported} />
                </div>
            )}

            {/* Mobile: filtros simples */}
            <div className="md:hidden bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
                <input type="date" className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={filters.date} onChange={e => setFilters(f => ({...f, date: e.target.value}))} />
                <input placeholder="Buscar N° misión..." className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={filters.mission_id} onChange={e => setFilters(f => ({...f, mission_id: e.target.value}))} />
                <div className="grid grid-cols-2 gap-3">
                    <select aria-label="Filtrar por modelo de UAS" className="p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={filters.model} onChange={e => setFilters(f => ({...f, model: e.target.value}))}>
                        <option value="">Todos los UAS</option>
                        {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select aria-label="Filtrar por piloto" className="p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={filters.pilot} onChange={e => setFilters(f => ({...f, pilot: e.target.value}))}>
                        <option value="">Todos los pilotos</option>
                        {uniquePilots.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-100">
                    {filteredFlights.length === 0 ? (
                        <p className="py-16 text-center text-xs font-black text-slate-300 uppercase tracking-widest">Sin registros</p>
                    ) : filteredFlights.map(f => (
                        <div key={f.id} className="p-4 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <MissionCell flight={f} />
                                        {f.has_alerts && (
                                            <span
                                                title={`${(f.alerts_json ?? []).length} alerta(s) — ver Replay para detalles`}
                                                className={`inline-flex items-center justify-center w-4 h-4 rounded ${
                                                    (f.alerts_json ?? []).some(a => a.severity === 'critical')
                                                        ? 'bg-red-100 text-red-500'
                                                        : 'bg-orange-100 text-orange-500'
                                                }`}
                                            >
                                                <span className="material-symbols-outlined" style={{ fontSize: '12px', fontVariationSettings: "'FILL' 1" }}>warning</span>
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-bold text-slate-800 truncate">{f.aircraft?.model || 'UAS'}</p>
                                    <div className="text-xs text-slate-400 font-bold"><PilotCell flight={f} /></div>
                                </div>
                                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-black">{f.visual_condition}</span>
                                    <p className="text-xs font-black text-orange-600">{f.aircraft?.total_hours?.toFixed(2)}h</p>
                                    {canDeleteEntry && (
                                        <button
                                            onClick={() => deleteFlight(f.id)}
                                            aria-label="Eliminar registro"
                                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 hover:bg-red-600 hover:text-white transition-all active:scale-95 mt-1"
                                        >
                                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs text-slate-400">{f.flight_date} · <span className="uppercase">{f.mission_type}</span></p>
                        </div>
                    ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50 text-xs font-black uppercase text-slate-400 tracking-widest border-b">
                                <th className="px-4 py-4">Fecha</th>
                                <th className="px-4 py-4">N° Misión</th>
                                <th className="px-4 py-4">Modelo UAS</th>
                                <th className="px-4 py-4">Serie (S/N)</th>
                                <th className="px-4 py-4">Tipo Op</th>
                                <th className="px-4 py-4">Condición</th>
                                <th className="px-4 py-4">T.T Posterior</th>
                                <th className="px-4 py-4">Piloto (PIC)</th>
                                <th className="px-3 py-4 w-10" title="Alertas detectadas durante el vuelo">
                                    <span className="material-symbols-outlined text-base text-slate-400">warning</span>
                                </th>
                                {canViewReplay && <th className="px-4 py-4 w-16"></th>}
                                {canDeleteEntry && <th className="px-2 py-4 w-10"></th>}
                            </tr>
                            <tr className="bg-white border-b-2 border-slate-100">
                                <th className="px-2 py-2"><input type="date" aria-label="Filtrar por fecha" className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-orange-500" value={filters.date} onChange={e => setFilters(f => ({...f, date: e.target.value}))} /></th>
                                <th className="px-2 py-2"><input placeholder="Buscar..." aria-label="Buscar por número de misión" className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-orange-500" value={filters.mission_id} onChange={e => setFilters(f => ({...f, mission_id: e.target.value}))} /></th>
                                <th className="px-2 py-2"><select aria-label="Filtrar por modelo de UAS" className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-orange-500" value={filters.model} onChange={e => setFilters(f => ({...f, model: e.target.value}))}><option value="">TODOS</option>{uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}</select></th>
                                <th className="px-2 py-2"><input placeholder="S/N..." aria-label="Filtrar por número de serie" className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-orange-500" value={filters.serial} onChange={e => setFilters(f => ({...f, serial: e.target.value}))} /></th>
                                <th className="px-2 py-2"><select aria-label="Filtrar por tipo de misión" className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-orange-500" value={filters.type} onChange={e => setFilters(f => ({...f, type: e.target.value}))}><option value="">TODOS</option>{uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></th>
                                <th className="px-2 py-2"><select aria-label="Filtrar por condición visual" className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-orange-500" value={filters.condition} onChange={e => setFilters(f => ({...f, condition: e.target.value}))}><option value="">TODAS</option><option value="VMC">VMC</option><option value="IMC">IMC</option><option value="NIGHT">NOCTURNO</option></select></th>
                                <th className="px-2 py-2"></th>
                                <th className="px-2 py-2"><select aria-label="Filtrar por piloto" className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-orange-500" value={filters.pilot} onChange={e => setFilters(f => ({...f, pilot: e.target.value}))}><option value="">TODOS</option>{uniquePilots.map(p => <option key={p} value={p}>{p}</option>)}</select></th>
                                <th className="px-2 py-2"></th>
                                {canViewReplay && <th className="px-2 py-2"></th>}
                                {canDeleteEntry && <th className="px-2 py-2"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredFlights.map((f) => (
                                <tr key={f.id} className="hover:bg-orange-50/30 transition-all text-xs font-medium text-slate-700 cursor-pointer">
                                    <td className="px-4 py-4 whitespace-nowrap">{f.flight_date}</td>
                                    <td className="px-4 py-4"><MissionCell flight={f} /></td>
                                    <td className="px-4 py-4 font-bold text-slate-900">{f.aircraft?.model}</td>
                                    <td className="px-4 py-4 font-mono text-xs">{f.aircraft?.serial_number}</td>
                                    <td className="px-4 py-4 text-xs uppercase">{f.mission_type}</td>
                                    <td className="px-4 py-4"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-black">{f.visual_condition}</span></td>
                                    <td className="px-4 py-4 font-black">{f.aircraft?.total_hours?.toFixed(2)}h</td>
                                    <td className="px-4 py-4"><PilotCell flight={f} /></td>
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
