'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function LogbookPage() {
    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const res = await fetch('/api/logbook');
            const data = await res.json();
            setFlights(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error("Error cargando bitácora");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">ABRIENDO ARCHIVOS DE VUELO...</div>;

    return (
        <div className="space-y-8 text-left animate-in fade-in duration-700 pb-20">
            <header className="flex justify-between items-end border-b border-slate-200 pb-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Bitácora de Vuelo</h2>
                    <p className="text-slate-500 text-sm">Registro histórico de operaciones de la flota.</p>
                </div>
                <Link href="/dashboard/logbook/new" className="bg-orange-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-slate-900 transition-all">
                    + Nuevo Registro
                </Link>
            </header>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                <th className="px-6 py-5">Fecha</th>
                                <th className="px-6 py-5">N° Vuelo</th>
                                <th className="px-6 py-5">Modelo UAS</th>
                                <th className="px-6 py-5">Serie (S/N)</th>
                                <th className="px-6 py-5">Tipo Operación</th>
                                <th className="px-6 py-5">Condición</th>
                                <th className="px-6 py-5">T.T Posterior</th>
                                <th className="px-6 py-5">Piloto (PIC)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {flights.length > 0 ? flights.map((f) => (
                                <tr key={f.id} className="hover:bg-slate-50 transition-all group">
                                    <td className="px-6 py-5 text-xs font-bold text-slate-700">{f.flight_date}</td>
                                    <td className="px-6 py-5">
                                        <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded font-mono text-[10px] font-black border border-orange-100">
                                            {f.mission_id || 'PTE'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5 text-xs font-black text-slate-900 uppercase">{f.aircraft?.model || 'N/R'}</td>
                                    <td className="px-6 py-5 text-[10px] font-mono font-bold text-slate-400 uppercase">{f.aircraft?.serial_number || '---'}</td>
                                    <td className="px-6 py-5">
                                        <p className="text-[10px] font-bold text-slate-600 uppercase">{f.mission_type || 'General'}</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${f.visual_condition === 'NIGHT' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-50 text-blue-600'}`}>
                                            {f.visual_condition || 'VMC'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-xs font-black text-slate-900">{f.aircraft?.total_hours?.toFixed(2) || '0.00'}h</p>
                                    </td>
                                    <td className="px-6 py-5">
                                        <p className="text-xs font-bold text-slate-700">{f.pilots?.name || 'Desconocido'}</p>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan="8" className="p-20 text-center text-slate-400 italic text-sm font-bold uppercase tracking-widest">
                                        No hay registros históricos en esta organización
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}