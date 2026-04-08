'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function MissionControlPage() {
    const [missions, setMissions] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadData = async () => {
        try {
            const res = await fetch('/api/flights/authorize');
            if (!res.ok) throw new Error("Server Error");
            const data = await res.json();
            setMissions(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Fetch error:", err);
            setMissions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    if (loading) return <div className="p-20 text-center font-black animate-pulse">SINCRO...</div>;

    return (
        <div className="space-y-8 text-left">
            <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Programación de Vuelos</h2>
            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                        <tr>
                            <th className="p-5">ID Misión</th>
                            <th className="p-5">PIC</th>
                            <th className="p-5">Aeronave</th>
                            <th className="p-5">Fecha</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {missions.length > 0 ? missions.map(m => (
                            <tr key={m.id} className="text-sm">
                                <td className="p-5 font-mono font-bold text-orange-600">{m.mission_id || 'N/A'}</td>
                                <td className="p-5">{m.pilots?.name || 'N/R'}</td>
                                <td className="p-5">{m.aircraft?.model || 'N/R'}</td>
                                <td className="p-5 text-xs text-slate-500">{m.scheduled_at?.split('T')[0]}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan="4" className="p-10 text-center text-slate-400 italic">No hay misiones programadas.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}