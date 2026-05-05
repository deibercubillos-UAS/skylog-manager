'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { hasPermission } from '@/lib/roles';
import AddMaintenancePanel from '@/components/AddMaintenancePanel';

export default function MaintenancePage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [userRole, setUserRole] = useState(null);

    const loadData = async () => {
        // Carga perfil (para rol) y logs en paralelo
        const { data: { user } } = await supabase.auth.getUser();
        const [profRes, logsRes] = await Promise.all([
            supabase.from('profiles').select('role').eq('id', user.id).single(),
            fetch('/api/maintenance').then(r => r.json())
        ]);
        setUserRole(profRes.data?.role || null);
        setLogs(Array.isArray(logsRes) ? logsRes : []);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const canManage = hasPermission(userRole, 'canManageOps');

    if (loading) return <div className="p-20 text-center font-black animate-pulse">SINCRO TÉCNICA...</div>;

    return (
        <div className="space-y-10 text-left animate-in fade-in duration-700 pb-20">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b pb-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Libro de Mantenimiento</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase mt-1">Registro de intervenciones y salud de flota.</p>
                </div>
                {canManage && (
                    <button onClick={() => setShowAdd(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-600 text-white px-6 py-3 rounded-xl font-black text-xs uppercase shadow-lg hover:bg-slate-900 transition-all active:scale-95">
                        <span className="material-symbols-outlined text-sm">build</span>
                        Nueva Intervención
                    </button>
                )}
            </header>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">

                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-100">
                    {logs.length === 0 ? (
                        <p className="py-16 text-center text-xs font-black text-slate-300 uppercase tracking-widest">Sin registros técnicos</p>
                    ) : logs.map(log => (
                        <div key={log.id} className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-slate-900 uppercase truncate">{log.aircraft?.model || 'UAS'}</p>
                                    <p className="text-xs text-slate-400 font-bold mt-0.5">{new Date(log.created_at).toLocaleDateString()} · {log.technician_name}</p>
                                </div>
                                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-black uppercase ${log.maintenance_type === 'CORRECTIVO' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {log.maintenance_type}
                                </span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-black font-mono text-orange-600">{log.hours_at_service}h</span>
                                {log.description && <p className="text-xs text-slate-400 italic truncate">{log.description}</p>}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-xs font-black uppercase text-slate-400 tracking-widest">
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
                                        <span className={`px-2 py-1 rounded text-xs font-black uppercase ${log.maintenance_type === 'CORRECTIVO' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>{log.maintenance_type}</span>
                                    </td>
                                    <td className="px-6 py-5 font-mono text-orange-600 font-bold">{log.hours_at_service}h</td>
                                    <td className="px-6 py-5 font-medium">{log.technician_name}</td>
                                    <td className="px-6 py-5 text-slate-400 italic text-xs">{log.description}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAdd && canManage && <AddMaintenancePanel onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); loadData(); }} />}
        </div>
    );
}