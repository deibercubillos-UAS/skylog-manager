'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AuthorizeFlightPage() {
    const [pilots, setPilots] = useState([]);
    const [drones, setDrones] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '' });

    useEffect(() => {
        async function load() {
            const { data: p } = await supabase.from('pilots').select('*').eq('is_active', true);
            const { data: d } = await supabase.from('aircraft').select('*').eq('status', 'Operativo');
            setPilots(p || []); setDrones(d || []);
        }
        load();
    }, []);

    const handleAuthorize = async (e) => {
        e.preventDefault();
        setLoading(true);
        const res = await fetch('/api/flights/authorize', {
            method: 'POST',
            body: JSON.stringify(form)
        });
        if (res.ok) {
            alert("✅ Vuelo Autorizado y Correo Enviado al Piloto.");
            setForm({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '' });
        }
        setLoading(false);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-10 text-left animate-in fade-in duration-500">
            <header>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Programar Misión</h2>
                <p className="text-slate-500 text-sm">Emisión de órdenes de vuelo y notificaciones automáticas.</p>
            </header>

            <form onSubmit={handleAuthorize} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl space-y-6">
                <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase text-[#ec5b13] tracking-widest">Asignación de Personal</label>
                    <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold"
                            value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                        <option value="">Seleccionar Piloto...</option>
                        {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    <label className="text-[10px] font-black uppercase text-[#ec5b13] tracking-widest block pt-4">Equipo Autorizado</label>
                    <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold"
                            value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                        <option value="">Seleccionar Drone...</option>
                        {drones.map(d => <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>)}
                    </select>

                    <label className="text-[10px] font-black uppercase text-[#ec5b13] tracking-widest block pt-4">Detalles de Tiempo y Lugar</label>
                    <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" placeholder="Lugar de la misión"
                           onChange={e => setForm({...form, location: e.target.value})} />
                    <input required type="datetime-local" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold"
                           onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                </div>

                <button disabled={loading} className="w-full py-5 bg-[#1A202C] text-white font-black rounded-2xl shadow-xl uppercase tracking-widest hover:bg-[#ec5b13] transition-all">
                    {loading ? 'AUTORIZANDO...' : 'Emitir Orden de Vuelo'}
                </button>
            </form>
        </div>
    );
}