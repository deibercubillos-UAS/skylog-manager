'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function MissionControlPage() {
    const [missions, setMissions] = useState([]);
    const [pilots, setPilots] = useState([]);
    const [drones, setDrones] = useState([]);
    const [org, setOrg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '' });

    const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        
        const [mRes, pRes, dRes, oRes] = await Promise.all([
            fetch('/api/flights/authorize'),
            supabase.from('pilots').select('*').eq('organization_id', prof.organization_id).eq('is_active', true),
            supabase.from('aircraft').select('*').eq('organization_id', prof.organization_id).eq('status', 'Operativo'),
            supabase.from('organizations').select('*').eq('id', prof.organization_id).single()
        ]);
        
        setMissions(await mRes.json());
        setPilots(pRes.data || []);
        setDrones(dRes.data || []);
        setOrg(oRes.data);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const handlePrefixChange = async (e) => {
        const newPrefix = e.target.value.toUpperCase().substring(0, 3);
        setOrg({ ...org, flight_prefix: newPrefix }); // UI inmediata
        await supabase.from('organizations').update({ flight_prefix: newPrefix }).eq('id', org.id);
        // No recargamos todo para que el input no pierda el foco
    };

    const handleAuthorize = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/flights/authorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if (res.ok) {
            alert("✅ MISIÓN AUTORIZADA");
            setForm({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '' });
            loadData();
        }
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse">SINCRO...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 text-left pb-20">
            <header className="flex justify-between items-center">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Programación</h2>
                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Prefijo:</span>
                    <input 
                        className="w-16 p-1 text-center font-black bg-slate-100 rounded-lg text-orange-600 uppercase border-none focus:ring-2 focus:ring-orange-500" 
                        value={org?.flight_prefix || ''} 
                        onChange={handlePrefixChange} 
                    />
                </div>
            </header>

            <section className="bg-[#1A202C] p-8 rounded-[3rem] text-white shadow-2xl">
                <form onSubmit={handleAuthorize} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <select required className="w-full bg-slate-800 p-3 rounded-xl border-none text-white text-xs font-bold" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                        <option value="">PIC...</option>
                        {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select required className="w-full bg-slate-800 p-3 rounded-xl border-none text-white text-xs font-bold" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                        <option value="">UAS...</option>
                        {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
                    </select>
                    <input required className="w-full bg-slate-800 p-3 rounded-xl border-none text-white text-xs" placeholder="Lugar" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                    <input required type="date" className="w-full bg-slate-800 p-3 rounded-xl border-none text-white text-xs" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                    <button type="submit" className="bg-orange-600 p-3 rounded-xl font-black text-[10px]">AUTORIZAR</button>
                </form>
            </section>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                        <tr><th className="p-5">ID Misión</th><th className="p-5">PIC / UAS</th><th className="p-5">Estado</th></tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                        {missions.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50">
                                <td className="p-5 font-black text-orange-600 font-mono">{m.mission_id}</td>
                                <td className="p-5"><b>{m.pilots?.name}</b><br/><span className="text-[10px] text-slate-400 uppercase">{m.aircraft?.model}</span></td>
                                <td className="p-5">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${m.status === 'realizado' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                        {m.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}