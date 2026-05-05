'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function PilotHistoryPage() {
    const [pilots, setPilots] = useState([]);
    const [selectedPilotId, setSelectedPilotId] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterLoading, setFilterLoading] = useState(false);

    useEffect(() => {
        async function loadInitial() {
            const { data } = await supabase.from('pilots').select('*').eq('is_active', true);
            setPilots(data || []);
            setLoading(false);
            // Cargar historial general inicialmente
            fetchHistory('');
        }
        loadInitial();
    }, []);

    const fetchHistory = async (id) => {
        setFilterLoading(true);
        const res = await fetch(`/api/logbook/pilots?pilotId=${id}`);
        const data = await res.json();
        setHistory(Array.isArray(data) ? data : []);
        setFilterLoading(false);
    };

    const handlePilotChange = (id) => {
        setSelectedPilotId(id);
        fetchHistory(id);
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">CARGANDO HISTORIALES...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Historial de Vuelo Pilotos</h2>
                    <p className="text-slate-500 text-sm">Registro individual de experiencia y vigencia médica F-HUM-005.</p>
                </div>
                <div className="w-full md:w-72 space-y-1 text-left">
                    <label className="text-xs font-black uppercase text-slate-400 ml-2">Filtrar por Tripulante</label>
                    <select 
                        className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-black text-sm text-[#ec5b13] shadow-sm outline-none"
                        value={selectedPilotId} onChange={e => handlePilotChange(e.target.value)}
                    >
                        <option value="">-- Todos los Pilotos --</option>
                        {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
            </header>

            {/* TABLA DE EXPERIENCIA ACUMULADA */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-xs font-black text-slate-400 uppercase tracking-tighter">
                                <th className="px-6 py-5">Fecha</th>
                                <th className="px-6 py-5">Aeronave / SN</th>
                                <th className="px-6 py-5">PIC / CIPU</th>
                                <th className="px-6 py-5">Vence Médico</th>
                                <th className="px-6 py-5">Horas (D/A)</th>
                                <th className="px-6 py-5">Tiempo</th>
                                <th className="px-6 py-5">Tipo OP</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filterLoading ? (
                                <tr><td colSpan="7" className="p-10 text-center animate-pulse font-bold text-slate-400">Filtrando registros...</td></tr>
                            ) : history.length === 0 ? (
                                <tr><td colSpan="7" className="p-20 text-center italic text-slate-400">No se encontraron vuelos registrados para este criterio.</td></tr>
                            ) : history.map(v => {
                                const isExpired = new Date(v.pilots?.medical_expiry) < new Date();
                                return (
                                    <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-5 text-xs font-bold text-slate-700">{v.flight_date}</td>
                                        <td className="px-6 py-5">
                                            <p className="text-xs font-black text-slate-900">{v.aircraft?.model}</p>
                                            <p className="text-xs font-mono text-slate-400 uppercase">S/N: {v.aircraft?.serial_number}</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <p className="text-xs font-bold text-slate-700">{v.pilots?.name}</p>
                                            <p className="text-xs font-bold text-slate-400 uppercase">CIPU: {v.pilots?.cipu_number}</p>
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className={`px-2 py-1 rounded text-xs font-black uppercase ${isExpired ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                                {v.pilots?.medical_expiry || 'N/R'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-xs font-mono text-slate-500">
                                            {v.takeoff_time} / {v.landing_time}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="text-xs font-black text-[#ec5b13]">{v.total_time || v.duration || '0.0'}h</span>
                                        </td>
                                        <td className="px-6 py-5 text-xs font-bold text-slate-500 uppercase">
                                            {v.mission_type || 'General'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* RESUMEN DE EXPERIENCIA */}
            {selectedPilotId && !filterLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4">
                    <div className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white flex justify-between items-center">
                        <div>
                            <p className="text-xs font-black uppercase text-slate-500 tracking-widest">Total Horas Acumuladas</p>
                            <h3 className="text-4xl font-black text-[#ec5b13] mt-2">
                                {history.reduce((acc, curr) => acc + parseFloat(curr.total_time || 0), 0).toFixed(1)} h
                            </h3>
                        </div>
                        <span className="material-symbols-outlined text-5xl opacity-20">timer</span>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex justify-between items-center text-left">
                        <div>
                            <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Vuelos Registrados</p>
                            <h3 className="text-4xl font-black text-slate-900 mt-2">{history.length}</h3>
                        </div>
                        <span className="material-symbols-outlined text-5xl text-slate-100">assessment</span>
                    </div>
                </div>
            )}
        </div>
    );
}