'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AddMaintenancePanel from '@/components/AddMaintenancePanel';

export default function MaintenancePage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);

    const loadData = async () => {
        const res = await fetch('/api/maintenance');
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    if (loading) return <div className="p-20 text-center font-black animate-pulse">SINCRO TÉCNICA...</div>;

    return (
        <div className="space-y-10 text-left animate-in fade-in duration-700 pb-20">
            <header className="flex justify-between items-end border-b pb-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Libro de Mantenimiento</h2>
                    <p className="text-slate-500 text-sm">Registro de intervenciones y salud de flota.</p>
                </div>
                <button onClick={() => setShowAdd(true)} className="bg-orange-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-slate-900 transition-all">+ Nueva Intervención</button>
            </header>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                            <th className="px-6 py-5">Fecha</th>
                            <th className="px-6 py-5">Aeronave</th>
                            <th className="px-6 py-5">Tipo</th>
                            <th className="px-6 py-5">Horas</th>
                            <th className="px-6 py-5">Técnico</th>
                            <th className="px-6 py-5">Descripción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                        {logs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50 transition-all">
                                <td className="px-6 py-5 font-bold text-slate-700">{new Date(log.created_at).toLocaleDateString()}</td>
                                <td className="px-6 py-5 font-black text-slate-900 uppercase">{log.aircraft?.model}</td>
                                <td className="px-6 py-5">
                                    <span className={`px-2 py-1 rounded text-[8px] font-black uppercase ${log.maintenance_type === 'CORRECTIVO' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{log.maintenance_type}</span>
                                </td>
                                <td className="px-6 py-5 font-mono text-orange-600 font-bold">{log.hours_at_service}h</td>
                                <td className="px-6 py-5 font-medium">{log.technician_name}</td>
                                <td className="px-6 py-5 text-slate-400 italic text-xs">{log.description}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showAdd && <AddMaintenancePanel onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); loadData(); }} />}
        </div>
    );
}