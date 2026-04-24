'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';


export default function LogbookPage() {
    const [flights, setFlights] = useState([]);
    const [filteredFlights, setFilteredFlights] = useState([]);
    const [loading, setLoading] = useState(true);

    // ESTADO DE FILTROS
    const [filters, setFilters] = useState({
        date: '',
        mission_id: '',
        model: '',
        serial: '',
        type: '',
        condition: '',
        pilot: ''
    });

    const loadData = async () => {
        try {
            const res = await fetch('/api/logbook');
            const data = await res.json();
            const validData = Array.isArray(data) ? data : [];
            setFlights(validData);
            setFilteredFlights(validData);
        } catch (e) {
            console.error("Error cargando bitácora");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // MOTOR DE FILTRADO EN TIEMPO REAL
    useEffect(() => {
        let result = flights;

        if (filters.date) result = result.filter(f => f.flight_date?.includes(filters.date));
        if (filters.mission_id) result = result.filter(f => f.mission_id?.toLowerCase().includes(filters.mission_id.toLowerCase()));
        if (filters.model) result = result.filter(f => f.aircraft?.model === filters.model);
        if (filters.serial) result = result.filter(f => f.aircraft?.serial_number?.toLowerCase().includes(filters.serial.toLowerCase()));
        if (filters.type) result = result.filter(f => f.mission_type === filters.type);
        if (filters.condition) result = result.filter(f => f.visual_condition === filters.condition);
        if (filters.pilot) result = result.filter(f => f.pilots?.name === filters.pilot);

        setFilteredFlights(result);
    }, [filters, flights]);

    // OBTENER VALORES ÚNICOS PARA LOS SELECTS
    const uniqueModels = [...new Set(flights.map(f => f.aircraft?.model).filter(Boolean))];
    const uniqueTypes = [...new Set(flights.map(f => f.mission_type).filter(Boolean))];
    const uniquePilots = [...new Set(flights.map(f => f.pilots?.name).filter(Boolean))];

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">AUDITANDO REGISTROS...</div>;

    return (
        <div className="space-y-8 text-left animate-in fade-in duration-700 pb-20">
            <header className="flex justify-between items-end border-b border-slate-200 pb-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Bitácora Oficial</h2>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
                        {filteredFlights.length} Registros encontrados
                    </p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setFilters({date:'', mission_id:'', model:'', serial:'', type:'', condition:'', pilot:''})}
                        className="px-4 py-2 text-[10px] font-black uppercase text-slate-400 hover:text-orange-600 transition-colors"
                    > Limpiar Filtros </button>
                </div>
            </header>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            {/* FILA 1: TÍTULOS */}
                            <tr className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b">
                                <th className="px-4 py-4">Fecha</th>
                                <th className="px-4 py-4">N° Misión</th>
                                <th className="px-4 py-4">Modelo UAS</th>
                                <th className="px-4 py-4">Serie (S/N)</th>
                                <th className="px-4 py-4">Tipo Op</th>
                                <th className="px-4 py-4">Condición</th>
                                <th className="px-4 py-4">T.T Posterior</th>
                                <th className="px-4 py-4">Piloto (PIC)</th>
                            </tr>
                            {/* FILA 2: INPUTS DE FILTRO */}
                            <tr className="bg-white border-b-2 border-slate-100">
                                <th className="px-2 py-2">
                                    <input type="date" className="w-full p-2 bg-slate-50 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-orange-500" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})} />
                                </th>
                                <th className="px-2 py-2">
                                    <input placeholder="Buscar..." className="w-full p-2 bg-slate-50 rounded-lg text-[10px] font-bold outline-none focus:ring-1 focus:ring-orange-500" value={filters.mission_id} onChange={e => setFilters({...filters, mission_id: e.target.value})} />
                                </th>
                                <th className="px-2 py-2">
                                    <select className="w-full p-2 bg-slate-50 rounded-lg text-[10px] font-bold outline-none" value={filters.model} onChange={e => setFilters({...filters, model: e.target.value})}>
                                        <option value="">TODOS</option>
                                        {uniqueModels.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </th>
                                <th className="px-2 py-2">
                                    <input placeholder="S/N..." className="w-full p-2 bg-slate-50 rounded-lg text-[10px] font-bold outline-none" value={filters.serial} onChange={e => setFilters({...filters, serial: e.target.value})} />
                                </th>
                                <th className="px-2 py-2">
                                    <select className="w-full p-2 bg-slate-50 rounded-lg text-[10px] font-bold outline-none" value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
                                        <option value="">TODOS</option>
                                        {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </th>
                                <th className="px-2 py-2">
                                    <select className="w-full p-2 bg-slate-50 rounded-lg text-[10px] font-bold outline-none" value={filters.condition} onChange={e => setFilters({...filters, condition: e.target.value})}>
                                        <option value="">TODAS</option>
                                        <option value="VMC">VMC</option><option value="IMC">IMC</option><option value="NIGHT">NOCTURNO</option>
                                    </select>
                                </th>
                                <th className="px-2 py-2"></th>
                                <th className="px-2 py-2">
                                    <select className="w-full p-2 bg-slate-50 rounded-lg text-[10px] font-bold outline-none" value={filters.pilot} onChange={e => setFilters({...filters, pilot: e.target.value})}>
                                        <option value="">TODOS</option>
                                        {uniquePilots.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredFlights.map((f) => (
                                <tr key={f.id} className="hover:bg-orange-50/30 transition-all text-xs font-medium text-slate-700">
                                    <td className="px-4 py-4 whitespace-nowrap">{f.flight_date}</td>
                                    <td className="px-4 py-4 font-black text-orange-600 font-mono">{f.mission_id || '---'}</td>
                                    <td className="px-4 py-4 font-bold text-slate-900">{f.aircraft?.model}</td>
                                    <td className="px-4 py-4 font-mono text-[10px]">{f.aircraft?.serial_number}</td>
                                    <td className="px-4 py-4 text-[10px] uppercase">{f.mission_type}</td>
                                    <td className="px-4 py-4">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-black">{f.visual_condition}</span>
                                    </td>
                                    <td className="px-4 py-4 font-black">{f.aircraft?.total_hours?.toFixed(2)}h</td>
                                    <td className="px-4 py-4">{f.pilots?.name}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredFlights.length === 0 && (
                    <div className="p-20 text-center text-slate-400 italic font-bold uppercase text-[10px] tracking-widest">
                        No se encontraron registros con los criterios seleccionados
                    </div>
                )}
            </div>
        </div>
    );
}