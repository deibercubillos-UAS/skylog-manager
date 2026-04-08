'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function DailyFlightLog() {
    const [auths, setAuths] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedAuth, setSelectedAuth] = useState('');

    useEffect(() => {
        async function loadAuths() {
            const { data } = await supabase
                .from('flight_authorizations')
                .select('*, pilots(name), aircraft(model)')
                .eq('status', 'pendiente')
                .order('created_at', { ascending: false });
            setAuths(data || []);
            setLoading(false);
        }
        loadAuths();
    }, []);

    if (loading) return <div className="p-20 text-center font-black animate-pulse">CONECTANDO A TORRE...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-10 text-left">
            <header className="flex justify-between items-center border-b pb-4">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Formato de Vuelo Diario</h2>
                <span className="bg-orange-100 text-orange-600 px-4 py-1 rounded-full text-[10px] font-black">F-OPS-001</span>
            </header>

            <section className="bg-orange-50 p-8 rounded-[2.5rem] border border-orange-200">
                <h3 className="text-[10px] font-black text-orange-600 uppercase mb-4 tracking-widest">Órdenes de Vuelo Programadas</h3>
                <select className="w-full p-4 bg-white border-none rounded-2xl font-bold text-slate-700 shadow-sm"
                        value={selectedAuth} onChange={(e) => setSelectedAuth(e.target.value)}>
                    <option value="">-- Seleccionar Misión Pendiente --</option>
                    {auths.map(a => (
                        <option key={a.id} value={a.id}>{a.mission_id} - {a.pilots?.name} ({a.aircraft?.model})</option>
                    ))}
                </select>
                <p className="text-[10px] text-orange-400 mt-3 italic font-bold">Selecciona una misión para cargar los datos técnicos automáticamente.</p>
            </section>
            
            {/* El resto del formulario de vuelo diario continúa aquí... */}
        </div>
    );
}