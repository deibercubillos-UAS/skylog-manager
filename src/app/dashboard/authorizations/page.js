'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function MissionControlPage() {
    const [missions, setMissions] = useState([]);
    const [pilots, setPilots] = useState([]);
    const [drones, setDrones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '' });

    const loadData = async () => {
        const [mRes, pRes, dRes] = await Promise.all([
            fetch('/api/flights/authorize'),
            supabase.from('pilots').select('*').eq('is_active', true),
            supabase.from('aircraft').select('*').eq('status', 'Operativo')
        ]);
        const mData = await mRes.json();
        setMissions(Array.isArray(mData) ? mData : []);
        setPilots(pRes.data || []);
        setDrones(dRes.data || []);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/flights/authorize', {
            method: 'POST',
            body: JSON.stringify(form)
        });
        if (res.ok) {
            alert("🚀 Misión Autorizada.");
            setForm({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '' });
            loadData();
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase text-slate-300">Sincronizando Centro de Mando...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-12 text-left animate-in fade-in duration-500 pb-20">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Centro de Mando OPS</h2>
                    <p className="text-slate-500 text-sm">Programación y seguimiento de misiones autorizadas.</p>
                </div>
            </header>

            {/* FORMULARIO DE EMISIÓN RÁPIDA */}
            <section className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white shadow-2xl">
                <h3 className="text-[#ec5b13] text-[10px] font-black uppercase tracking-[0.2em] mb-6">Emitir Nueva Orden de Vuelo</h3>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Piloto</label>
                        <select required className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Aeronave</label>
                        <select required className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Lugar y Fecha</label>
                        <input required className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold" placeholder="Sitio" onChange={e => setForm({...form, location: e.target.value})} />
                    </div>
                    <button type="submit" className="bg-[#ec5b13] hover:bg-orange-600 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">Autorizar Misión</button>
                </form>
            </section>

            {/* TABLA DE SEGUIMIENTO */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden text-left">
                <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Tablero de Control de Misiones</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                <th className="px-8 py-4">ID Misión</th>
                                <th className="px-8 py-4">Piloto Autorizado</th>
                                <th className="px-8 py-4">Aeronave</th>
                                <th className="px-8 py-4">Ubicación</th>
                                <th className="px-8 py-4">Estado</th>
                                <th className="px-8 py-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {missions.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5 text-xs font-black text-[#ec5b13] font-mono">{m.mission_id}</td>
                                    <td className="px-8 py-5 text-sm font-bold text-slate-700">{m.pilots?.name}</td>
                                    <td className="px-8 py-5 text-[10px] text-slate-500 font-bold uppercase">{m.aircraft?.model}</td>
                                    <td className="px-8 py-5 text-xs text-slate-400">{m.location}</td>
                                    <td className="px-8 py-5">
                                        {m.is_completed ? (
                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase border border-emerald-100">Vuelo Realizado</span>
                                        ) : (
                                            <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[9px] font-black uppercase border border-orange-100">Pendiente</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="material-symbols-outlined text-slate-300 hover:text-blue-500 transition-colors">edit_square</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}