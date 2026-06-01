'use client';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';

// Lazy: ExcelJS pesa ~250 KB. Solo carga cuando el usuario abre el panel de importación.
const LogbookImportPanel = dynamic(
  () => import('@/components/LogbookImportPanel'),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    ),
    ssr: false,
  }
);

const PAGE_SIZE = 30;

export default function LogbookPage() {
    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);
    const [showImport, setShowImport] = useState(false);

    const [filters, setFilters] = useState({
        date: '',
        mission_id: '',
        model: '',
        serial: '',
        type: '',
        condition: '',
        pilot: ''
    });

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

    useEffect(() => { loadData(true); }, []);

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

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">AUDITANDO REGISTROS...</div>;

    return (
        <>
        {showImport && (
            <LogbookImportPanel
                onClose={() => setShowImport(false)}
                onSuccess={() => { setShowImport(false); loadData(); }}
            />
        )}
        <div className="space-y-8 text-left animate-in fade-in duration-700 pb-20">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b border-slate-200 pb-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900">Bitácora Oficial</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
                        {filteredFlights.length} Registros encontrados
                    </p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={clearFilters}
                        className="flex-1 sm:flex-none px-4 py-3 text-xs font-black uppercase text-slate-400 hover:text-orange-600 transition-colors border border-slate-200 rounded-xl"
                    >Limpiar</button>
                    <button
                        onClick={() => setShowImport(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-navy text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm active:scale-95"
                    >
                        <span className="material-symbols-outlined text-sm">upload_file</span>
                        Importar
                    </button>
                </div>
            </header>

            {/* Mobile: filtros simples */}
            <div className="md:hidden bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-sm">
                <input type="date" className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={filters.date} onChange={e => setFilters(f => ({...f, date: e.target.value}))} />
                <input placeholder="Buscar N° misión..." className="w-full p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-orange-500" value={filters.mission_id} onChange={e => setFilters(f => ({...f, mission_id: e.target.value}))} />
                <div className="grid grid-cols-2 gap-3">
                    <select className="p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none" value={filters.model} onChange={e => setFilters(f => ({...f, model: e.target.value}))}>
                        <option value="">Todos los UAS</option>
                        {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select className="p-3 bg-slate-50 rounded-xl text-xs font-bold outline-none" value={filters.pilot} onChange={e => setFilters(f => ({...f, pilot: e.target.value}))}>
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
                                    <p className="text-xs font-black font-mono text-orange-600">{f.mission_id || 'N/A'}</p>
                                    <p className="text-xs font-bold text-slate-800 truncate">{f.aircraft?.model || 'UAS'}</p>
                                    <p className="text-xs text-slate-400 font-bold">{f.pilots?.name || '---'}</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-black">{f.visual_condition}</span>
                                    <p className="text-xs font-black text-orange-600 mt-1">{f.aircraft?.total_hours?.toFixed(2)}h</p>
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
                            </tr>
                            <tr className="bg-white border-b-2 border-slate-100">
                                <th className="px-2 py-2"><input type="date" className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-orange-500" value={filters.date} onChange={e => setFilters(f => ({...f, date: e.target.value}))} /></th>
                                <th className="px-2 py-2"><input placeholder="Buscar..." className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none focus:ring-1 focus:ring-orange-500" value={filters.mission_id} onChange={e => setFilters(f => ({...f, mission_id: e.target.value}))} /></th>
                                <th className="px-2 py-2"><select className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none" value={filters.model} onChange={e => setFilters(f => ({...f, model: e.target.value}))}><option value="">TODOS</option>{uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}</select></th>
                                <th className="px-2 py-2"><input placeholder="S/N..." className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none" value={filters.serial} onChange={e => setFilters(f => ({...f, serial: e.target.value}))} /></th>
                                <th className="px-2 py-2"><select className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none" value={filters.type} onChange={e => setFilters(f => ({...f, type: e.target.value}))}><option value="">TODOS</option>{uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></th>
                                <th className="px-2 py-2"><select className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none" value={filters.condition} onChange={e => setFilters(f => ({...f, condition: e.target.value}))}><option value="">TODAS</option><option value="VMC">VMC</option><option value="IMC">IMC</option><option value="NIGHT">NOCTURNO</option></select></th>
                                <th className="px-2 py-2"></th>
                                <th className="px-2 py-2"><select className="w-full p-2 bg-slate-50 rounded-lg text-xs font-bold outline-none" value={filters.pilot} onChange={e => setFilters(f => ({...f, pilot: e.target.value}))}><option value="">TODOS</option>{uniquePilots.map(p => <option key={p} value={p}>{p}</option>)}</select></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredFlights.map((f) => (
                                <tr key={f.id} className="hover:bg-orange-50/30 transition-all text-xs font-medium text-slate-700">
                                    <td className="px-4 py-4 whitespace-nowrap">{f.flight_date}</td>
                                    <td className="px-4 py-4 font-black text-orange-600 font-mono">{f.mission_id || '---'}</td>
                                    <td className="px-4 py-4 font-bold text-slate-900">{f.aircraft?.model}</td>
                                    <td className="px-4 py-4 font-mono text-xs">{f.aircraft?.serial_number}</td>
                                    <td className="px-4 py-4 text-xs uppercase">{f.mission_type}</td>
                                    <td className="px-4 py-4"><span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-black">{f.visual_condition}</span></td>
                                    <td className="px-4 py-4 font-black">{f.aircraft?.total_hours?.toFixed(2)}h</td>
                                    <td className="px-4 py-4">{f.pilots?.name}</td>
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
        </>
    );
}
